import dotenv from "dotenv";
import mongoose from "mongoose";
import { pathToFileURL } from "node:url";

import connectDB from "../config/db.js";
import City from "../models/cities/City.js";
import Gym from "../models/gyms/Gym.js";
import { GEOLOCATION_CLASSIFICATIONS, classifyGymGeoLocation } from "./backfillGymGeoLocation.js";

const isPublished = (gym) => gym.isActive === true && !["pending", "rejected"].includes(gym.moderationStatus);
const emptyBreakdown = () => ({ total: 0, published: 0, canonical: 0, backfillable: 0, unresolved: 0 });

function addBreakdown(target, key, gym, classification) {
  const bucket = target[key] ||= emptyBreakdown();
  bucket.total += 1;
  if (isPublished(gym)) bucket.published += 1;
  if (classification === GEOLOCATION_CLASSIFICATIONS.CANONICAL) bucket.canonical += 1;
  if (classification === GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE) bucket.backfillable += 1;
  if (![GEOLOCATION_CLASSIFICATIONS.CANONICAL, GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE].includes(classification)) bucket.unresolved += 1;
}

export function summarizeGymGeoLocation(gyms, cityNames = new Map()) {
  const classifications = Object.fromEntries(Object.values(GEOLOCATION_CLASSIFICATIONS).map((value) => [value, 0]));
  const summary = {
    total: gyms.length, active: 0, published: 0, ownerless: 0, providerOwned: 0,
    canonicalPublished: 0, backfillablePublished: 0, classifications,
    unsuitableForAutomaticMigration: 0, byCategory: {}, byCity: {}, unresolved: [],
  };
  for (const gym of gyms) {
    const classification = classifyGymGeoLocation(gym);
    classifications[classification] += 1;
    if (gym.isActive === true) summary.active += 1;
    if (isPublished(gym)) summary.published += 1;
    if (gym.owner) summary.providerOwned += 1; else summary.ownerless += 1;
    if (isPublished(gym) && classification === GEOLOCATION_CLASSIFICATIONS.CANONICAL) summary.canonicalPublished += 1;
    if (isPublished(gym) && classification === GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE) summary.backfillablePublished += 1;
    if (![GEOLOCATION_CLASSIFICATIONS.CANONICAL, GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE].includes(classification)) {
      summary.unsuitableForAutomaticMigration += 1;
      summary.unresolved.push({ id: String(gym._id), slug: gym.slug || null, reason: classification });
    }
    addBreakdown(summary.byCategory, gym.category || "Uncategorized", gym, classification);
    const cityId = gym.city ? String(gym.city) : "Unassigned";
    addBreakdown(summary.byCity, cityNames.get(cityId) || cityId, gym, classification);
  }
  summary.coverage = {
    canonicalPublished: summary.canonicalPublished,
    totalPublished: summary.published,
    percentage: summary.published ? Math.round((summary.canonicalPublished / summary.published) * 10000) / 100 : 100,
  };
  return summary;
}

export async function auditGymGeoLocation({ GymModel = Gym, CityModel = City } = {}) {
  const gyms = await GymModel.find({}).select("+geoLocation slug category city owner isActive moderationStatus coordinates").lean();
  const cityIds = [...new Set(gyms.map((gym) => gym.city && String(gym.city)).filter(Boolean))];
  const cities = cityIds.length ? await CityModel.find({ _id: { $in: cityIds } }).select("name").lean() : [];
  return summarizeGymGeoLocation(gyms, new Map(cities.map((city) => [String(city._id), city.name])));
}

async function runAudit() {
  dotenv.config();
  try {
    await connectDB();
    console.log(JSON.stringify(await auditGymGeoLocation(), null, 2));
  } finally {
    await mongoose.connection.close();
  }
}

const isDirectExecution = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) runAudit().catch((error) => { console.error(error.message); process.exitCode = 1; });
