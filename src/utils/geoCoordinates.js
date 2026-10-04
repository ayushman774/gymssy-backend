const LATITUDE_MIN = -90;
const LATITUDE_MAX = 90;
const LONGITUDE_MIN = -180;
const LONGITUDE_MAX = 180;

const own = (value, field) => Object.prototype.hasOwnProperty.call(value, field);

function finiteNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function geoPointFromLegacyCoordinates(coordinates) {
  const latitude = finiteNumber(coordinates?.lat);
  const longitude = finiteNumber(coordinates?.lng);
  if (
    latitude === null || longitude === null ||
    latitude < LATITUDE_MIN || latitude > LATITUDE_MAX ||
    longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX
  ) return null;
  return { type: "Point", coordinates: [longitude, latitude] };
}

export function normalizeCoordinateWrite(input, { existing = null } = {}) {
  if (input === undefined) return { supplied: false };
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { supplied: true, errors: [{ field: "coordinates", message: "coordinates must be an object" }] };
  }

  const allowed = new Set(["lat", "lng", "latitude", "longitude"]);
  const unsupported = Object.keys(input).filter((field) => !allowed.has(field));
  if (unsupported.length) {
    return {
      supplied: true,
      errors: unsupported.map((field) => ({ field: `coordinates.${field}`, message: `coordinates.${field} is not supported` })),
    };
  }
  if ((own(input, "lat") && own(input, "latitude")) || (own(input, "lng") && own(input, "longitude"))) {
    return { supplied: true, errors: [{ field: "coordinates", message: "Use either lat/lng or latitude/longitude, not both" }] };
  }

  const latitudeSupplied = own(input, "latitude") || own(input, "lat");
  const longitudeSupplied = own(input, "longitude") || own(input, "lng");
  if (!latitudeSupplied && !longitudeSupplied) {
    return { supplied: true, errors: [{ field: "coordinates", message: "coordinates must include latitude and longitude" }] };
  }

  const latitudeRaw = own(input, "latitude") ? input.latitude : input.lat;
  const longitudeRaw = own(input, "longitude") ? input.longitude : input.lng;
  const existingLatitude = finiteNumber(existing?.lat);
  const existingLongitude = finiteNumber(existing?.lng);
  const clearingLatitude = latitudeSupplied && latitudeRaw === null;
  const clearingLongitude = longitudeSupplied && longitudeRaw === null;

  if (clearingLatitude || clearingLongitude) {
    if (!(latitudeSupplied && longitudeSupplied && clearingLatitude && clearingLongitude)) {
      return { supplied: true, errors: [{ field: "coordinates", message: "latitude and longitude must be cleared together" }] };
    }
    return { supplied: true, coordinates: { lat: null, lng: null }, geoLocation: undefined };
  }

  const latitude = latitudeSupplied ? finiteNumber(latitudeRaw) : existingLatitude;
  const longitude = longitudeSupplied ? finiteNumber(longitudeRaw) : existingLongitude;
  const errors = [];
  if (latitude === null) errors.push({ field: "coordinates.latitude", message: "latitude must be a finite number" });
  else if (latitude < LATITUDE_MIN || latitude > LATITUDE_MAX) errors.push({ field: "coordinates.latitude", message: "latitude must be between -90 and 90" });
  if (longitude === null) errors.push({ field: "coordinates.longitude", message: "longitude must be a finite number" });
  else if (longitude < LONGITUDE_MIN || longitude > LONGITUDE_MAX) errors.push({ field: "coordinates.longitude", message: "longitude must be between -180 and 180" });
  if (errors.length) return { supplied: true, errors };

  return {
    supplied: true,
    coordinates: { lat: latitude, lng: longitude },
    geoLocation: { type: "Point", coordinates: [longitude, latitude] },
  };
}

export const GEO_COORDINATE_LIMITS = Object.freeze({
  latitude: [LATITUDE_MIN, LATITUDE_MAX],
  longitude: [LONGITUDE_MIN, LONGITUDE_MAX],
});
