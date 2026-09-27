import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import connectDB from "../config/db.js";
import Gym from "../models/gyms/Gym.js";
import Trainer from "../models/trainers/Trainer.js";
import Nutritionist from "../models/nutritionists/Nutritionist.js";

const MISSING_STATUS_FILTER = {
  moderationStatus: { $exists: false },
};

const APPROVED_STATUS_UPDATE = {
  $set: { moderationStatus: "approved" },
};

export async function backfillListingModerationStatus({
  GymModel = Gym,
  TrainerModel = Trainer,
  NutritionistModel = Nutritionist,
} = {}) {
  const models = [
    ["Gym", GymModel],
    ["Trainer", TrainerModel],
    ["Nutritionist", NutritionistModel],
  ];
  const results = {};

  for (const [name, Model] of models) {
    const result = await Model.updateMany(
      MISSING_STATUS_FILTER,
      APPROVED_STATUS_UPDATE,
    );
    results[name] = {
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
    };
  }

  return results;
}

async function runManualBackfill() {
  dotenv.config();

  if (!process.argv.includes("--confirm")) {
    throw new Error(
      "Backfill not started. Re-run with --confirm after verifying MONGO_URI targets the intended non-production database.",
    );
  }

  if (
    process.env.NODE_ENV === "production" &&
    !process.argv.includes("--allow-production")
  ) {
    throw new Error(
      "Production backfill blocked. Use --allow-production only after an explicit production migration review.",
    );
  }

  try {
    await connectDB();
    const results = await backfillListingModerationStatus();

    console.log("Listing moderation status backfill completed:");
    for (const [name, counts] of Object.entries(results)) {
      console.log(
        `${name}: matched ${counts.matchedCount}, modified ${counts.modifiedCount}`,
      );
    }
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
