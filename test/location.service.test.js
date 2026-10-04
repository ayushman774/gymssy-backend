import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  LocationServiceError,
  autocompleteLocations,
  clearLocationServiceCache,
  geocodeLocation,
  normalizeLocationResult,
  LOCATION_SERVICE_LIMITS,
} from "../src/services/location/location.service.js";
import {
  autocompleteLocation,
  geocodeLocationQuery,
} from "../src/controllers/locations/location.controller.js";
import locationRoutes from "../src/routes/locations/location.routes.js";
import { LOCATION_RATE_LIMIT_POLICY } from "../src/middleware/locationRateLimit.middleware.js";

const originalApiKey = process.env.GEOAPIFY_API_KEY;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearLocationServiceCache();
  process.env.GEOAPIFY_API_KEY = "test-location-key";
});

afterEach(() => {
  clearLocationServiceCache();
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GEOAPIFY_API_KEY;
  else process.env.GEOAPIFY_API_KEY = originalApiKey;
});

function upstreamResult(overrides = {}) {
  return {
    place_id: "geoapify-place-1",
    formatted: "Indiranagar, Bengaluru, Karnataka, India",
    name: "Indiranagar",
    suburb: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postcode: "560038",
    lat: 12.9784,
    lon: 77.6408,
    result_type: "suburb",
    datasource: { raw: "not public" },
    ...overrides,
  };
}

function okResponse(results = [upstreamResult()]) {
  return { ok: true, status: 200, json: async () => ({ results }) };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function runController(controller, query) {
  const res = response();
  await controller({ query }, res);
  return res;
}

test("normalizes Geoapify results into the stable Gymssy contract", () => {
  assert.deepEqual(normalizeLocationResult(upstreamResult()), {
    id: "geoapify-place-1",
    label: "Indiranagar, Bengaluru, Karnataka, India",
    name: "Indiranagar",
    area: "Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    postcode: "560038",
    latitude: 12.9784,
    longitude: 77.6408,
    type: "suburb",
  });
  assert.equal(normalizeLocationResult({ formatted: "No identity" }), null);
});

test("normalization safely preserves missing optional address fields as null", () => {
  const normalized = normalizeLocationResult({
    place_id: "minimal",
    formatted: "India",
    country: "India",
    lat: 0,
    lon: 0,
  });
  assert.deepEqual(normalized, {
    id: "minimal", label: "India", name: null, area: null, city: null,
    state: null, country: "India", postcode: null, latitude: 0,
    longitude: 0, type: null,
  });
  assert.equal(normalizeLocationResult({ place_id: "null-coordinates", lat: null, lon: null }).latitude, null);
});

test("autocomplete sends only normalized allowlisted Geoapify parameters with India restriction and optional bias", async () => {
  let requestedUrl;
  const fetchImpl = async (url) => { requestedUrl = url; return okResponse(); };
  const results = await autocompleteLocations(
    { query: "  Indiranagar   & apiKey=attacker ", limit: 7, bias: { latitude: 12.9, longitude: 77.6 } },
    { fetchImpl, apiKey: "server-secret" },
  );

  assert.equal(results.length, 1);
  assert.equal(requestedUrl.origin, "https://api.geoapify.com");
  assert.equal(requestedUrl.pathname, "/v1/geocode/autocomplete");
  assert.equal(requestedUrl.searchParams.get("text"), "Indiranagar & apiKey=attacker");
  assert.equal(requestedUrl.searchParams.get("filter"), "countrycode:in");
  assert.equal(requestedUrl.searchParams.get("bias"), "proximity:77.6,12.9");
  assert.equal(requestedUrl.searchParams.get("format"), "json");
  assert.equal(requestedUrl.searchParams.get("lang"), "en");
  assert.equal(requestedUrl.searchParams.get("limit"), "7");
  assert.equal(requestedUrl.searchParams.get("apiKey"), "server-secret");
  assert.deepEqual([...requestedUrl.searchParams.keys()].sort(), ["apiKey", "bias", "filter", "format", "lang", "limit", "text"].sort());
});

test("autocomplete cache is normalized, bounded in lifetime, and avoids duplicate upstream calls", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return okResponse(); };
  await autocompleteLocations({ query: "Indiranagar", limit: 5 }, { fetchImpl, apiKey: "key-a" });
  await autocompleteLocations({ query: "  INDIRANAGAR  ", limit: 5 }, { fetchImpl, apiKey: "key-a" });
  assert.equal(calls, 1);
});

test("location cache and rate-limit policies are explicitly bounded", async () => {
  assert.deepEqual(LOCATION_RATE_LIMIT_POLICY, { windowMs: 60000, limit: 60 });
  assert.equal(LOCATION_SERVICE_LIMITS.cacheMaxEntries, 200);
  let calls = 0;
  const options = { apiKey: "key", fetchImpl: async () => { calls += 1; return okResponse(); } };
  for (let index = 0; index <= LOCATION_SERVICE_LIMITS.cacheMaxEntries; index += 1) {
    await autocompleteLocations({ query: `place-${index}`, limit: 5 }, options);
  }
  await autocompleteLocations({ query: "place-0", limit: 5 }, options);
  assert.equal(calls, LOCATION_SERVICE_LIMITS.cacheMaxEntries + 2);
});

test("autocomplete and geocoding return empty arrays for empty upstream results", async () => {
  const options = { fetchImpl: async () => okResponse([]), apiKey: "key" };
  assert.deepEqual(await autocompleteLocations({ query: "unknown", limit: 5 }, options), []);
  assert.deepEqual(await geocodeLocation({ query: "unknown address", limit: 1 }, options), []);
});

test("upstream output remains bounded even if the provider returns more than requested", async () => {
  const results = await autocompleteLocations(
    { query: "Bengaluru", limit: 2 },
    { apiKey: "key", fetchImpl: async () => okResponse([upstreamResult({ place_id: "1" }), upstreamResult({ place_id: "2" }), upstreamResult({ place_id: "3" })]) },
  );
  assert.deepEqual(results.map((item) => item.id), ["1", "2"]);
});

test("forward geocoding uses the search endpoint and normalized results", async () => {
  let requestedUrl;
  const data = await geocodeLocation(
    { query: "100 Feet Road, Indiranagar", limit: 1 },
    { apiKey: "key", fetchImpl: async (url) => { requestedUrl = url; return okResponse(); } },
  );
  assert.equal(requestedUrl.pathname, "/v1/geocode/search");
  assert.equal(requestedUrl.searchParams.get("filter"), "countrycode:in");
  assert.equal(data[0].id, "geoapify-place-1");
  assert.equal("datasource" in data[0], false);
});

test("missing configuration fails safely without exposing the API key", async () => {
  await assert.rejects(
    () => autocompleteLocations({ query: "Indiranagar", limit: 5 }, { apiKey: "", fetchImpl: async () => okResponse() }),
    (error) => error instanceof LocationServiceError && error.code === "CONFIGURATION" && !error.message.includes("test-location-key"),
  );
});

test("upstream timeout and network failure are distinguished", async (t) => {
  await t.test("timeout", async () => {
    const fetchImpl = (_url, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    });
    await assert.rejects(
      () => autocompleteLocations({ query: "Indiranagar", limit: 5 }, { fetchImpl, apiKey: "key", timeoutMs: 5 }),
      (error) => error.code === "TIMEOUT",
    );
  });
  await t.test("network", async () => {
    await assert.rejects(
      () => autocompleteLocations({ query: "Indiranagar", limit: 5 }, { fetchImpl: async () => { throw new Error("socket details"); }, apiKey: "key" }),
      (error) => error.code === "NETWORK" && !error.message.includes("socket details"),
    );
  });
});

test("provider 4xx, 429, 5xx, and malformed JSON are translated without raw payload leakage", async () => {
  for (const [status, code] of [[400, "UPSTREAM"], [429, "RATE_LIMITED"], [500, "UPSTREAM"]]) {
    clearLocationServiceCache();
    await assert.rejects(
      () => autocompleteLocations({ query: `query-${status}`, limit: 5 }, { apiKey: "key", fetchImpl: async () => ({ ok: false, status }) }),
      (error) => error.code === code && error.upstreamStatus === status,
    );
  }
  await assert.rejects(
    () => autocompleteLocations({ query: "malformed", limit: 5 }, { apiKey: "key", fetchImpl: async () => ({ ok: true, status: 200, json: async () => { throw new Error("raw body"); } }) }),
    (error) => error.code === "MALFORMED_RESPONSE" && !error.message.includes("raw body"),
  );
});

test("autocomplete controller validates trimming, lengths, limits, unsupported fields, and bias", async () => {
  const invalidCases = [
    [{}, "q"],
    [{ q: "a" }, "q"],
    [{ q: "x".repeat(121) }, "q"],
    [{ q: "Indira", limit: "0" }, "limit"],
    [{ q: "Indira", limit: "11" }, "limit"],
    [{ q: "Indira", limit: "many" }, "limit"],
    [{ q: "Indira", lat: "12" }, "lng"],
    [{ q: "Indira", lat: "91", lng: "77" }, "lat"],
    [{ q: "Indira", providerUrl: "https://attacker.example" }, "query"],
  ];
  for (const [query, field] of invalidCases) {
    const res = await runController(autocompleteLocation, query);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
    assert.equal(res.body.errors[0].field, field);
  }
});

test("autocomplete controller applies default and maximum result limits and accepts valid zero bias", async () => {
  const urls = [];
  globalThis.fetch = async (url) => { urls.push(url); return okResponse(); };
  let res = await runController(autocompleteLocation, { q: "  Indiranagar  ", lat: "0", lng: "0" });
  assert.equal(res.statusCode, 200);
  assert.equal(urls[0].searchParams.get("text"), "Indiranagar");
  assert.equal(urls[0].searchParams.get("limit"), "5");
  assert.equal(urls[0].searchParams.get("bias"), "proximity:0,0");

  clearLocationServiceCache();
  res = await runController(autocompleteLocation, { q: "Koramangala", limit: "10" });
  assert.equal(res.statusCode, 200);
  assert.equal(urls[1].searchParams.get("limit"), "10");
});

test("controllers return safe configuration and upstream error envelopes", async () => {
  delete process.env.GEOAPIFY_API_KEY;
  let res = await runController(autocompleteLocation, { q: "Indiranagar" });
  assert.equal(res.statusCode, 503);
  assert.equal(JSON.stringify(res.body).includes("apiKey"), false);

  process.env.GEOAPIFY_API_KEY = "secret-not-for-response";
  globalThis.fetch = async () => ({ ok: false, status: 500 });
  res = await runController(geocodeLocationQuery, { q: "Indiranagar Bengaluru" });
  assert.equal(res.statusCode, 502);
  assert.equal(JSON.stringify(res.body).includes("secret-not-for-response"), false);
});

test("geocoding controller validates its smaller public surface and returns normalized data", async () => {
  globalThis.fetch = async () => okResponse();
  const valid = await runController(geocodeLocationQuery, { q: "  Indiranagar, Bengaluru  ", limit: "1" });
  assert.equal(valid.statusCode, 200);
  assert.equal(valid.body.data[0].city, "Bengaluru");

  const unsupported = await runController(geocodeLocationQuery, { q: "Indiranagar", lat: "12", lng: "77" });
  assert.equal(unsupported.statusCode, 400);
  assert.deepEqual(unsupported.body.unsupportedFields, ["lat", "lng"]);
});

test("location routes keep autocomplete public and protect geocoding with auth and role middleware", () => {
  const autocompleteLayer = locationRoutes.stack.find((layer) => layer.route?.path === "/autocomplete");
  const geocodeLayer = locationRoutes.stack.find((layer) => layer.route?.path === "/geocode");
  assert.equal(autocompleteLayer.route.stack.at(-1).handle.name, "autocompleteLocation");
  assert.deepEqual(geocodeLayer.route.stack.map((layer) => layer.handle.name), [
    "", "authMiddleware", "", "geocodeLocationQuery",
  ]);
});
