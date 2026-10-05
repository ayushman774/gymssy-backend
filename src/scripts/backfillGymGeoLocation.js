import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import connectDB from "../config/db.js";
import Gym from "../models/gyms/Gym.js";
import { geoPointFromLegacyCoordinates } from "../utils/geoCoordinates.js";

export const MISSING_GEO_LOCATION_FILTER = {
  $or: [
    { geoLocation: { $exists: false } },
    { geoLocation: null },
  ],
};

export const GEOLOCATION_CLASSIFICATIONS = Object.freeze({
  CANONICAL: "already canonical",
  BACKFILLABLE: "valid legacy coordinates missing canonical GeoJSON",
  MISSING: "missing coordinates",
  INCOMPLETE: "incomplete coordinate pair",
  INVALID_LEGACY: "invalid legacy coordinates",
  INVALID_CANONICAL: "invalid canonical GeoJSON",
  CONFLICT: "coordinate conflict — manual review required",
});

const COORDINATE_TOLERANCE = 1e-7;
const own = (value, field) => Object.prototype.hasOwnProperty.call(value || {}, field);
const finite = (value) => typeof value === "number" && Number.isFinite(value);

function validCanonicalPoint(value) {
  const coordinates = value?.coordinates;
  return value?.type === "Point" && Array.isArray(coordinates) && coordinates.length === 2
    && finite(coordinates[0]) && coordinates[0] >= -180 && coordinates[0] <= 180
    && finite(coordinates[1]) && coordinates[1] >= -90 && coordinates[1] <= 90;
}

export function classifyGymGeoLocation(gym, tolerance = COORDINATE_TOLERANCE) {
  const hasLatitude = own(gym?.coordinates, "lat") && gym.coordinates.lat !== null && gym.coordinates.lat !== "";
  const hasLongitude = own(gym?.coordinates, "lng") && gym.coordinates.lng !== null && gym.coordinates.lng !== "";
  const legacyPoint = geoPointFromLegacyCoordinates(gym?.coordinates);
  const hasCanonical = gym?.geoLocation !== null && gym?.geoLocation !== undefined;
  const canonicalValid = validCanonicalPoint(gym?.geoLocation);

  if (hasCanonical) {
    if (!canonicalValid) return GEOLOCATION_CLASSIFICATIONS.INVALID_CANONICAL;
    if (legacyPoint) {
      const [canonicalLongitude, canonicalLatitude] = gym.geoLocation.coordinates;
      const [legacyLongitude, legacyLatitude] = legacyPoint.coordinates;
      if (Math.abs(canonicalLongitude - legacyLongitude) > tolerance || Math.abs(canonicalLatitude - legacyLatitude) > tolerance) {
        return GEOLOCATION_CLASSIFICATIONS.CONFLICT;
      }
    }
    return GEOLOCATION_CLASSIFICATIONS.CANONICAL;
  }
  if (!hasLatitude && !hasLongitude) return GEOLOCATION_CLASSIFICATIONS.MISSING;
  if (hasLatitude !== hasLongitude) return GEOLOCATION_CLASSIFICATIONS.INCOMPLETE;
  if (!legacyPoint) return GEOLOCATION_CLASSIFICATIONS.INVALID_LEGACY;
  return GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE;
}

export function assertProductionWriteAllowed({ apply, nodeEnv = process.env.NODE_ENV, argv = process.argv } = {}) {
  if (apply && nodeEnv === "production" && !argv.includes("--allow-production")) {
    throw new Error("Production writes are blocked. Review the dry run first and pass --allow-production only during an approved migration.");
  }
}

function safeIdentifier(gym) {
  return { id: String(gym._id), slug: gym.slug || null };
}

export async function backfillGymGeoLocation({ GymModel = Gym, apply = false } = {}) {
  const gyms = await GymModel.find({})
    .select("+geoLocation name slug coordinates")
    .lean();
  const summary = {
    mode: apply ? "apply" : "dry-run",
    examined: gyms.length,
    eligible: 0,
    updated: 0,
    classifications: Object.fromEntries(Object.values(GEOLOCATION_CLASSIFICATIONS).map((classification) => [classification, 0])),
    eligibleRecords: [],
    conflicts: [],
    skipped: [],
  };

  for (const gym of gyms) {
    const classification = classifyGymGeoLocation(gym);
    summary.classifications[classification] += 1;
    if (classification === GEOLOCATION_CLASSIFICATIONS.CONFLICT) summary.conflicts.push(safeIdentifier(gym));
    if (classification !== GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE) {
      if (classification !== GEOLOCATION_CLASSIFICATIONS.CANONICAL) summary.skipped.push({ ...safeIdentifier(gym), reason: classification });
      continue;
    }

    const geoLocation = geoPointFromLegacyCoordinates(gym.coordinates);
    summary.eligible += 1;
    summary.eligibleRecords.push(safeIdentifier(gym));
    if (!apply) continue;

    const result = await GymModel.updateOne(
      { _id: gym._id, "coordinates.lat": gym.coordinates.lat, "coordinates.lng": gym.coordinates.lng, ...MISSING_GEO_LOCATION_FILTER },
      { $set: { geoLocation } },
      { runValidators: true, timestamps: false },
    );
    summary.updated += result.modifiedCount ?? 0;
  }

  return summary;
}

async function runManualBackfill() {
  dotenv.config();
  const apply = process.argv.includes("--apply");
  assertProductionWriteAllowed({ apply });

  try {
    await connectDB();
    const summary = await backfillGymGeoLocation({ apply });
    console.log(JSON.stringify(summary, null, 2));
    if (!apply) console.log("Dry run only. Re-run with --apply to write eligible records.");
  } finally {
    await mongoose.connection.close();
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  runManualBackfill().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
