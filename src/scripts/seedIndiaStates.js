import "dotenv/config";
import connectDB from "../config/db.js";
import State from "../models/cities/State.js";
import City from "../models/cities/City.js";
import { INDIA_STATES } from "../data/indiaStates.js";

// Safe, repeatable migration: never delete cities or replace existing ObjectIds.
async function run() {
  await connectDB();
  const operations = INDIA_STATES.map(({ name, code, type }) => ({
    updateOne: { filter: { code }, update: { $set: { name, type, country: "India", isActive: true } }, upsert: true },
  }));
  await State.bulkWrite(operations, { ordered: false });
  const states = await State.find({ code: { $in: INDIA_STATES.map((s) => s.code) } }).lean();
  const byName = new Map(states.map((s) => [s.name.toLowerCase(), s]));
  const existingCities = await City.find({ stateId: null }).select("_id state").lean();
  const cityUpdates = existingCities.flatMap((city) => {
    const state = byName.get(String(city.state || "").trim().toLowerCase());
    return state ? [{ updateOne: { filter: { _id: city._id, stateId: null }, update: { $set: { stateId: state._id } } } }] : [];
  });
  if (cityUpdates.length) await City.bulkWrite(cityUpdates, { ordered: false });
  console.log(`States/UTs upserted: ${states.length}; existing cities linked: ${cityUpdates.length}; unresolved: ${existingCities.length - cityUpdates.length}`);
  process.exit(0);
}
run().catch((error) => { console.error("India states seed failed:", error); process.exit(1); });
