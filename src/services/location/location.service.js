const GEOAPIFY_BASE_URL = "https://api.geoapify.com/v1/geocode";
const INDIA_FILTER = "countrycode:in";
const REQUEST_TIMEOUT_MS = 5000;
const CACHE_MAX_ENTRIES = 200;
const AUTOCOMPLETE_CACHE_TTL_MS = 5 * 60 * 1000;
const GEOCODE_CACHE_TTL_MS = 30 * 60 * 1000;

const responseCache = new Map();

export class LocationServiceError extends Error {
  constructor(code, message, { upstreamStatus = null } = {}) {
    super(message);
    this.name = "LocationServiceError";
    this.code = code;
    this.upstreamStatus = upstreamStatus;
  }
}

function normalizeText(value) {
  return String(value).trim().replace(/\s+/g, " ");
}

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const number = Number(value.trim());
  return Number.isFinite(number) ? number : null;
}

function nullableText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeLocationResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) return null;
  const id = nullableText(result.place_id);
  if (!id) return null;

  const latitude = finiteNumber(result.lat);
  const longitude = finiteNumber(result.lon);
  return {
    id,
    label: nullableText(result.formatted),
    name: nullableText(result.name) || nullableText(result.suburb) || nullableText(result.district) || nullableText(result.city) || nullableText(result.postcode),
    area: nullableText(result.suburb) || nullableText(result.district) || nullableText(result.city_district),
    city: nullableText(result.city) || nullableText(result.town) || nullableText(result.village) || nullableText(result.municipality),
    state: nullableText(result.state),
    country: nullableText(result.country),
    postcode: nullableText(result.postcode),
    latitude,
    longitude,
    type: nullableText(result.result_type),
  };
}

function cacheKey(operation, { query, limit, bias }) {
  return [
    operation,
    normalizeText(query).toLocaleLowerCase("en-IN"),
    limit,
    bias ? `${bias.longitude},${bias.latitude}` : "",
  ].join("|");
}

function readCache(key, now = Date.now()) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    responseCache.delete(key);
    return null;
  }
  responseCache.delete(key);
  responseCache.set(key, cached);
  return cached.value;
}

function writeCache(key, value, ttlMs, now = Date.now()) {
  responseCache.delete(key);
  responseCache.set(key, { value, expiresAt: now + ttlMs });
  while (responseCache.size > CACHE_MAX_ENTRIES) {
    responseCache.delete(responseCache.keys().next().value);
  }
}

export function clearLocationServiceCache() {
  responseCache.clear();
}

async function requestGeoapify(path, params, {
  fetchImpl = globalThis.fetch,
  apiKey = process.env.GEOAPIFY_API_KEY,
  timeoutMs = REQUEST_TIMEOUT_MS,
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new LocationServiceError("CONFIGURATION", "Location service is not configured");
  }
  if (typeof fetchImpl !== "function") {
    throw new LocationServiceError("INTERNAL", "Location service HTTP client is unavailable");
  }

  const url = new URL(`${GEOAPIFY_BASE_URL}/${path}`);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(name, String(value));
  }
  url.searchParams.set("apiKey", apiKey.trim());

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === "AbortError" || controller.signal.aborted) {
      throw new LocationServiceError("TIMEOUT", "Location provider timed out");
    }
    throw new LocationServiceError("NETWORK", "Location provider is unavailable");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new LocationServiceError(
      response.status === 429 ? "RATE_LIMITED" : "UPSTREAM",
      "Location provider request failed",
      { upstreamStatus: response.status },
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new LocationServiceError("MALFORMED_RESPONSE", "Location provider returned an invalid response");
  }
  if (!payload || typeof payload !== "object" || !Array.isArray(payload.results)) {
    throw new LocationServiceError("MALFORMED_RESPONSE", "Location provider returned an invalid response");
  }
  const resultLimit = Number.isSafeInteger(Number(params.limit)) ? Number(params.limit) : payload.results.length;
  return payload.results.slice(0, resultLimit).map(normalizeLocationResult).filter(Boolean);
}

async function resolveLocations(operation, { query, limit, bias = null }, options = {}) {
  const key = cacheKey(operation, { query, limit, bias });
  const cached = readCache(key);
  if (cached) return cached;

  const results = await requestGeoapify(
    operation === "autocomplete" ? "autocomplete" : "search",
    {
      text: normalizeText(query),
      format: "json",
      filter: INDIA_FILTER,
      lang: "en",
      limit,
      bias: bias ? `proximity:${bias.longitude},${bias.latitude}` : undefined,
    },
    options,
  );
  writeCache(
    key,
    results,
    operation === "autocomplete" ? AUTOCOMPLETE_CACHE_TTL_MS : GEOCODE_CACHE_TTL_MS,
  );
  return results;
}

export async function reverseGeocodeLocation({ latitude, longitude }, options = {}) {
  const key = `reverse|${latitude.toFixed(4)}|${longitude.toFixed(4)}`;
  const cached = readCache(key);
  if (cached) return cached;
  const results = await requestGeoapify("reverse", {
    lat: latitude,
    lon: longitude,
    format: "json",
    lang: "en",
    limit: 1,
  }, options);
  const location = results[0] || null;
  if (location) writeCache(key, location, GEOCODE_CACHE_TTL_MS);
  return location;
}

export function autocompleteLocations(input, options) {
  return resolveLocations("autocomplete", input, options);
}

export function geocodeLocation(input, options) {
  return resolveLocations("geocode", input, options);
}

export const LOCATION_SERVICE_LIMITS = Object.freeze({
  timeoutMs: REQUEST_TIMEOUT_MS,
  cacheMaxEntries: CACHE_MAX_ENTRIES,
  autocompleteCacheTtlMs: AUTOCOMPLETE_CACHE_TTL_MS,
  geocodeCacheTtlMs: GEOCODE_CACHE_TTL_MS,
});
