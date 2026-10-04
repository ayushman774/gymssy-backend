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

export async function backfillGymGeoLocation({ GymModel = Gym, apply = false } = {}) {
  const candidates = await GymModel.find(MISSING_GEO_LOCATION_FILTER)
    .select("+geoLocation name slug coordinates")
    .lean();
  const summary = {
    mode: apply ? "apply" : "dry-run",
    examined: candidates.length,
    eligible: 0,
    updated: 0,
    skipped: [],
  };

  for (const gym of candidates) {
    const geoLocation = geoPointFromLegacyCoordinates(gym.coordinates);
    if (!geoLocation) {
      summary.skipped.push({
        id: String(gym._id),
        slug: gym.slug || null,
        reason: "missing or invalid legacy coordinates",
      });
      continue;
    }

    summary.eligible += 1;
    if (!apply) continue;

    const result = await GymModel.updateOne(
      { _id: gym._id, ...MISSING_GEO_LOCATION_FILTER },
      { $set: { geoLocation } },
      { runValidators: true },
    );
    summary.updated += result.modifiedCount ?? 0;
  }

  return summary;
}

async function runManualBackfill() {
  dotenv.config();
  const apply = process.argv.includes("--apply");

  if (apply && process.env.NODE_ENV === "production" && !process.argv.includes("--allow-production")) {
    throw new Error(
      "Production writes are blocked. Review the dry run first and pass --allow-production only during an approved migration.",
    );
  }

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
