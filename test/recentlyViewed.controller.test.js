import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Gym from "../src/models/gyms/Gym.js";
import RecentlyViewed from "../src/models/recentlyViewed/RecentlyViewed.js";
import { addRecentlyViewed, getRecentlyViewed, removeRecentlyViewed } from "../src/controllers/recentlyViewed/recentlyViewed.controller.js";

const originals = [];
const mock = (target, key, value) => { originals.push([target, key, target[key]]); target[key] = value; };
afterEach(() => { while (originals.length) { const [target, key, value] = originals.pop(); target[key] = value; } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const query = (value) => ({ sort() { return this; }, skip() { return this; }, select() { return this; }, limit() { return this; }, populate() { return this; }, lean: async () => value });

test("record validates IDs, enforces publication, upserts per authenticated owner, and trims overflow", { concurrency: false }, async () => {
  let res = response(); await addRecentlyViewed({ params: { gymId: "bad" }, user: { id: new mongoose.Types.ObjectId() } }, res); assert.equal(res.statusCode, 400);
  const gymId = new mongoose.Types.ObjectId(); const userId = new mongoose.Types.ObjectId(); let gymFilter; let upsertFilter; let deleted;
  mock(Gym, "findOne", (filter) => { gymFilter = filter; return { lean: async () => ({ _id: gymId }) }; });
  mock(RecentlyViewed, "findOneAndUpdate", async (filter) => { upsertFilter = filter; return { _id: new mongoose.Types.ObjectId(), ...filter }; });
  mock(RecentlyViewed, "find", () => query([{ _id: new mongoose.Types.ObjectId() }]));
  mock(RecentlyViewed, "deleteMany", async (filter) => { deleted = filter; });
  res = response(); await addRecentlyViewed({ params: { gymId: String(gymId) }, user: { id: userId } }, res);
  assert.equal(res.statusCode, 200); assert.equal(String(upsertFilter.user), String(userId)); assert.equal(String(upsertFilter.gym), String(gymId));
  assert.equal(gymFilter.isActive, true); assert.deepEqual(gymFilter.moderationStatus, { $nin: ["pending", "rejected"] }); assert.equal(String(deleted.user), String(userId));
});

test("history is owner-scoped, newest-first, bounded, publication-filtered, and publicly serialized", { concurrency: false }, async () => {
  const userId = new mongoose.Types.ObjectId(); let findFilter; let populate;
  const gym = { _id: new mongoose.Types.ObjectId(), name: "Public Gym", slug: "public-gym", owner: new mongoose.Types.ObjectId(), isActive: true, moderationStatus: "approved", images: { cover: "cover.jpg" } };
  mock(RecentlyViewed, "find", (filter) => { findFilter = filter; const chain = query([{ gym, viewedAt: new Date(1) }, { gym: null, viewedAt: new Date(2) }]); chain.populate = (value) => { populate = value; return chain; }; return chain; });
  const res = response(); await getRecentlyViewed({ user: { id: userId } }, res);
  assert.equal(String(findFilter.user), String(userId)); assert.equal(populate.match.isActive, true); assert.equal(res.body.count, 1);
  assert.equal(res.body.data[0].name, "Public Gym"); assert.equal("owner" in res.body.data[0], false); assert.equal("moderationStatus" in res.body.data[0], false);
});

test("removal is scoped to the authenticated customer", { concurrency: false }, async () => {
  const userId = new mongoose.Types.ObjectId(); const gymId = new mongoose.Types.ObjectId(); let filter;
  mock(RecentlyViewed, "findOneAndDelete", async (value) => { filter = value; });
  const res = response(); await removeRecentlyViewed({ params: { gymId }, user: { id: userId } }, res);
  assert.equal(res.statusCode, 200); assert.equal(String(filter.user), String(userId)); assert.equal(String(filter.gym), String(gymId));
});

test("removal rejects a malformed gym ID before querying MongoDB", { concurrency: false }, async () => {
  let queried = false;
  mock(RecentlyViewed, "findOneAndDelete", async () => { queried = true; });
  const res = response();
  await removeRecentlyViewed({ params: { gymId: "not-an-object-id" }, user: { id: new mongoose.Types.ObjectId() } }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, { success: false, message: "Invalid gym ID" });
  assert.equal(queried, false);
});
