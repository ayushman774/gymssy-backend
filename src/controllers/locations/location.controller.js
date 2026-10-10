import { normalizeCoordinateWrite } from "../../utils/geoCoordinates.js";
import {
  LocationServiceError,
  autocompleteLocations,
  geocodeLocation,
  reverseGeocodeLocation,
} from "../../services/location/location.service.js";

const AUTOCOMPLETE_FIELDS = new Set(["q", "limit", "lat", "lng"]);
const GEOCODE_FIELDS = new Set(["q", "limit"]);
const AUTOCOMPLETE_LIMITS = Object.freeze({ minQueryLength: 2, maxQueryLength: 120, defaultLimit: 5, maxLimit: 10 });
const GEOCODE_LIMITS = Object.freeze({ minQueryLength: 3, maxQueryLength: 250, defaultLimit: 1, maxLimit: 5 });

function validationError(res, field, message, details = {}) {
  return res.status(400).json({ success: false, message: "Location request validation failed", errors: [{ field, message }], ...details });
}

function validateQuery(req, res, { allowedFields, limits, allowBias }) {
  const unsupportedFields = Object.keys(req.query || {}).filter((field) => !allowedFields.has(field));
  if (unsupportedFields.length) {
    validationError(res, "query", "Unsupported location query fields were submitted", { unsupportedFields });
    return null;
  }

  if (Array.isArray(req.query?.q) || typeof req.query?.q !== "string") {
    validationError(res, "q", "q is required and must be a string");
    return null;
  }
  const query = req.query.q.trim().replace(/\s+/g, " ");
  if (query.length < limits.minQueryLength || query.length > limits.maxQueryLength) {
    validationError(res, "q", `q must be between ${limits.minQueryLength} and ${limits.maxQueryLength} characters`);
    return null;
  }

  let limit = limits.defaultLimit;
  if (req.query.limit !== undefined && req.query.limit !== "") {
    if (Array.isArray(req.query.limit) || !/^\d+$/.test(String(req.query.limit))) {
      validationError(res, "limit", `limit must be an integer between 1 and ${limits.maxLimit}`);
      return null;
    }
    limit = Number(req.query.limit);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > limits.maxLimit) {
      validationError(res, "limit", `limit must be an integer between 1 and ${limits.maxLimit}`);
      return null;
    }
  }

  let bias = null;
  if (allowBias) {
    const hasLatitude = req.query.lat !== undefined && req.query.lat !== "";
    const hasLongitude = req.query.lng !== undefined && req.query.lng !== "";
    if (hasLatitude !== hasLongitude) {
      validationError(res, hasLatitude ? "lng" : "lat", "lat and lng must be supplied together");
      return null;
    }
    if (hasLatitude) {
      const normalized = normalizeCoordinateWrite({ latitude: req.query.lat, longitude: req.query.lng });
      if (normalized.errors) {
        const error = normalized.errors[0];
        const field = error.field.endsWith("latitude") ? "lat" : error.field.endsWith("longitude") ? "lng" : "coordinates";
        validationError(res, field, error.message.replace("latitude", "lat").replace("longitude", "lng"));
        return null;
      }
      bias = { latitude: normalized.coordinates.lat, longitude: normalized.coordinates.lng };
    }
  }

  return { query, limit, bias };
}

function serviceErrorResponse(error, res, operation) {
  if (!(error instanceof LocationServiceError)) return false;
  const unavailable = ["CONFIGURATION", "TIMEOUT", "NETWORK", "RATE_LIMITED"].includes(error.code);
  console.error("Location service request failed", {
    operation,
    category: error.code,
    upstreamStatus: error.upstreamStatus,
  });
  res.status(unavailable ? 503 : error.code === "INTERNAL" ? 500 : 502).json({
    success: false,
    message: error.code === "CONFIGURATION"
      ? "Location service is temporarily unavailable"
      : "Location provider is temporarily unavailable",
  });
  return true;
}

export const autocompleteLocation = async (req, res) => {
  const input = validateQuery(req, res, {
    allowedFields: AUTOCOMPLETE_FIELDS,
    limits: AUTOCOMPLETE_LIMITS,
    allowBias: true,
  });
  if (!input) return;
  try {
    const data = await autocompleteLocations(input);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (serviceErrorResponse(error, res, "autocomplete")) return;
    console.error("Location service request failed", { operation: "autocomplete", category: "INTERNAL" });
    return res.status(500).json({ success: false, message: "Failed to autocomplete locations" });
  }
};

export const geocodeLocationQuery = async (req, res) => {
  const input = validateQuery(req, res, {
    allowedFields: GEOCODE_FIELDS,
    limits: GEOCODE_LIMITS,
    allowBias: false,
  });
  if (!input) return;
  try {
    const data = await geocodeLocation(input);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (serviceErrorResponse(error, res, "geocode")) return;
    console.error("Location service request failed", { operation: "geocode", category: "INTERNAL" });
    return res.status(500).json({ success: false, message: "Failed to geocode location" });
  }
};

export const reverseLocation = async (req, res) => {
  const keys = Object.keys(req.query || {});
  if (keys.some((key) => !["lat", "lng"].includes(key))) {
    return validationError(res, "query", "Only lat and lng are supported");
  }
  const latitude = Number(req.query.lat);
  const longitude = Number(req.query.lng);
  if (
    typeof req.query.lat !== "string" ||
    typeof req.query.lng !== "string" ||
    !req.query.lat.trim() ||
    !req.query.lng.trim() ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) return validationError(res, "coordinates", "Valid lat and lng are required");

  try {
    const data = await reverseGeocodeLocation({ latitude, longitude });
    return res.status(200).json({ success: true, data });
  } catch (error) {
    if (serviceErrorResponse(error, res, "reverse")) return;
    console.error("Location reverse geocoding failed", { category: "INTERNAL" });
    return res.status(500).json({ success: false, message: "Failed to resolve location address" });
  }
};

export const LOCATION_REQUEST_LIMITS = Object.freeze({ autocomplete: AUTOCOMPLETE_LIMITS, geocode: GEOCODE_LIMITS });
