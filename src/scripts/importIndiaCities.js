import "dotenv/config";
import dns from "node:dns";
import { readFile } from "node:fs/promises";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import State from "../models/cities/State.js";
import City from "../models/cities/City.js";

const dnsServers = process.env.DNS_SERVERS?.split(",").map((s) => s.trim()).filter(Boolean);
if (dnsServers?.length) dns.setServers(dnsServers);

// Open-data urban local bodies derived from India's Local Government Directory.
// Source: https://github.com/kalyangupta12/indian-cities-data (MIT).
// Pin a revision via INDIA_CITIES_DATA_URL for repeatable imports or use a local JSON file.
const DEFAULT_URL = "https://raw.githubusercontent.com/kalyangupta12/indian-cities-data/main/data/generated/urban_local_bodies.json";
const aliases = new Map([
  ["andaman and nicobar islands", "Andaman and Nicobar Islands"],
  ["the dadra and nagar haveli and daman and diu", "Dadra and Nagar Haveli and Daman and Diu"],
  ["dadra and nagar haveli and daman and diu", "Dadra and Nagar Haveli and Daman and Diu"],
  ["jammu and kashmir", "Jammu and Kashmir"],
  ["nct of delhi", "Delhi"],
  ["orissa", "Odisha"],
  ["pondicherry", "Puducherry"],
]);
const norm = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
const slug = (value) => String(value).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
async function loadRows() {
  if (process.env.INDIA_CITIES_FILE) return JSON.parse(await readFile(process.env.INDIA_CITIES_FILE, "utf8"));
  const response = await fetch(process.env.INDIA_CITIES_DATA_URL || DEFAULT_URL, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`City dataset download failed: HTTP ${response.status}. Set INDIA_CITIES_FILE to a downloaded JSON file if needed.`);
  return response.json();
}
async function main() {
  const rows = await loadRows();
  if (!Array.isArray(rows) || rows.length < 1000) throw new Error("Dataset is missing or unexpectedly small. No database changes made.");
  // Connect before any Mongoose query, including --dry-run (which reads but never writes).
  await connectDB();
  const states = await State.find({ isActive: true }).lean();
  if (states.length !== 36) throw new Error(`Expected 36 states/UTs; found ${states.length}. Run seedIndiaStates.js first.`);
  const stateByName = new Map(states.map((s) => [norm(s.name), s]));
  const mapped = [];
  const unmatched = new Map();
  for (const row of rows) {
    const name = String(row.name || "").trim();
    const stateName = aliases.get(norm(row.stateName)) || row.stateName;
    const state = stateByName.get(norm(stateName));
    if (!state) { unmatched.set(row.stateName, (unmatched.get(row.stateName) || 0) + 1); continue; }
    if (!name || !slug(name)) continue;
    mapped.push({ name, state, code: String(row.code || "") });
  }
  if (unmatched.size) throw new Error(`Unmapped state names; no changes made: ${JSON.stringify([...unmatched])}`);
  // The source has no Lakshadweep urban local bodies; include Kavaratti explicitly.
  const lakshadweep = stateByName.get("lakshadweep");
  if (lakshadweep && !mapped.some((row) => String(row.state._id) === String(lakshadweep._id))) mapped.push({ name: "Kavaratti", state: lakshadweep, code: "lakshadweep-kavaratti" });
  const covered = new Set(mapped.map((row) => String(row.state._id)));
  if (covered.size !== 36) throw new Error(`Only ${covered.size}/36 states/UTs have urban local bodies. No changes made; review dataset coverage.`);
  const existing = await City.find({}).select("_id name slug state stateId").lean();
  const usedSlugs = new Set(existing.map((c) => c.slug));
  const existingByKey = new Map(existing.map((c) => [`${norm(c.state)}|${norm(c.name)}`, c]));
  const planned = new Set();
  const operations = [];
  let skipped = 0, linked = 0, inserted = 0;
  for (const { name, state, code } of mapped) {
    const key = `${norm(state.name)}|${norm(name)}`;
    if (planned.has(key)) { skipped++; continue; }
    planned.add(key);
    const old = existingByKey.get(key);
    if (old) {
      if (!old.stateId || String(old.stateId) !== String(state._id)) {
        operations.push({ updateOne: { filter: { _id: old._id }, update: { $set: { stateId: state._id } } } });
        linked++;
      }
      continue;
    }
    const base = slug(name);
    let candidate = base;
    if (usedSlugs.has(candidate)) candidate = `${base}-${slug(state.name)}`;
    if (usedSlugs.has(candidate)) candidate = `${base}-${slug(state.name)}-${code || inserted}`;
    let suffix = 2;
    while (usedSlugs.has(candidate)) candidate = `${base}-${slug(state.name)}-${code || "city"}-${suffix++}`;
    usedSlugs.add(candidate);
    operations.push({ insertOne: { document: { name, slug: candidate, state: state.name, stateId: state._id, country: "India", isActive: true, isPopular: false } } });
    inserted++;
  }
  console.log(`Source records: ${rows.length}; mapped: ${mapped.length}; to insert: ${inserted}; to link: ${linked}; duplicate rows: ${skipped}`);
  if (process.argv.includes("--dry-run")) { console.log("Dry run: no database writes."); return; }
  for (let i = 0; i < operations.length; i += 300) {
    await City.bulkWrite(operations.slice(i, i + 300), { ordered: true });
    console.log(`Imported ${Math.min(i + 300, operations.length)}/${operations.length} operations`);
  }
  console.log("India urban local bodies import completed; existing city IDs preserved.");
}
main().catch((error) => { console.error("India cities import failed:", error); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
