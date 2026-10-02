import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Favorite from "../src/models/favorites/Favorite.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import User from "../src/models/users/User.js";
import Category from "../src/models/categories/Category.js";
import { createFavorite, deleteFavorite, getFavoriteIds, getFavorites } from "../src/controllers/favorites/favorite.controller.js";
import authorizeRoles from "../src/middleware/auth/roleMiddleware.js";

const originals = [];
const mock = (target, key, value) => { originals.push([target, key, target[key]]); target[key] = value; };
afterEach(() => { while (originals.length) { const [target, key, value] = originals.pop(); target[key] = value; } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const chain = (value) => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value });
const userId = new mongoose.Types.ObjectId();

test("Favorites role boundary rejects unauthenticated, business, and admin identities", () => {
  const middleware = authorizeRoles("user");
  for (const [user, status] of [[undefined, 401], [{ role: "business" }, 403], [{ role: "admin" }, 403]]) {
    const res = response(); let next = false; middleware({ user }, res, () => { next = true; }); assert.equal(res.statusCode, status); assert.equal(next, false);
  }
  const res = response(); let next = false; middleware({ user: { role: "user" } }, res, () => { next = true; }); assert.equal(next, true);
});

for (const [targetType, Model] of [["gym", Gym], ["trainer", Trainer], ["nutritionist", Nutritionist]]) {
  test(`customer saves ${targetType} idempotently with publication filter`, { concurrency: false }, async () => {
    const targetId = new mongoose.Types.ObjectId(); let targetFilter; let ownerFilter;
    mock(Model, "findOne", (filter) => { targetFilter = filter; return chain({ _id: targetId }); });
    mock(Favorite, "findOneAndUpdate", (filter) => { ownerFilter = filter; return chain({ _id: new mongoose.Types.ObjectId(), createdAt: new Date() }); });
    const res = response(); await createFavorite({ user: { id: userId }, body: { targetType, targetId: String(targetId) } }, res);
    assert.equal(res.statusCode, 200); assert.equal(targetFilter.isActive, true); assert.deepEqual(targetFilter.moderationStatus, { $nin: ["pending", "rejected"] }); assert.equal(String(ownerFilter.user), String(userId));
  });
}

test("create rejects unsupported fields, target types, malformed IDs, and unavailable targets", { concurrency: false }, async () => {
  for (const body of [
    { targetType: "coach", targetId: String(new mongoose.Types.ObjectId()) },
    { targetType: "gym", targetId: "bad" },
    { targetType: "gym", targetId: String(new mongoose.Types.ObjectId()), userId: String(userId) },
  ]) { const res = response(); await createFavorite({ user: { id: userId }, body }, res); assert.equal(res.statusCode, 400); }
  mock(Gym, "findOne", () => chain(null)); const res = response(); await createFavorite({ user: { id: userId }, body: { targetType: "gym", targetId: String(new mongoose.Types.ObjectId()) } }, res); assert.equal(res.statusCode, 404);
});

test("IDs endpoint returns only the authenticated customer's bounded identities", { concurrency: false }, async () => {
  let filter; mock(Favorite, "find", (value) => { filter = value; return chain([{ targetType: "trainer", target: new mongoose.Types.ObjectId() }]); });
  const res = response(); await getFavoriteIds({ user: { id: userId } }, res);
  assert.equal(String(filter.user), String(userId)); assert.equal(res.body.data.length, 1); assert.equal(res.body.data[0].targetType, "trainer"); assert.equal(res.body.limit, 1000);
});

test("delete is idempotent and scoped to authenticated ownership", { concurrency: false }, async () => {
  const targetId = new mongoose.Types.ObjectId(); let filter; mock(Favorite, "deleteOne", async (value) => { filter = value; return { deletedCount: 0 }; });
  const res = response(); await deleteFavorite({ user: { id: userId }, params: { targetType: "gym", targetId: String(targetId) } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.removed, false); assert.equal(String(filter.user), String(userId));
});

test("mixed favorites preserve classification, order, pagination, and omit unavailable targets", { concurrency: false }, async () => {
  const gymId = new mongoose.Types.ObjectId(); const trainerId = new mongoose.Types.ObjectId(); const ownerId = new mongoose.Types.ObjectId();
  const favorites = [
    { _id: new mongoose.Types.ObjectId(), targetType: "trainer", target: trainerId, createdAt: new Date(2) },
    { _id: new mongoose.Types.ObjectId(), targetType: "gym", target: gymId, createdAt: new Date(1) },
    { _id: new mongoose.Types.ObjectId(), targetType: "nutritionist", target: new mongoose.Types.ObjectId(), createdAt: new Date(0) },
  ];
  mock(Favorite, "find", (filter) => { assert.equal(String(filter.user), String(userId)); return chain(favorites); });
  mock(Favorite, "countDocuments", async () => 3);
  mock(User, "find", () => chain([{ _id: ownerId, role: "business", providerType: "coach" }]));
  mock(Category, "find", () => chain([]));
  mock(Gym, "find", () => chain([{ _id: gymId, name: "Legacy Gym", slug: "legacy-gym", owner: null, isActive: true, moderationStatus: "approved" }]));
  mock(Trainer, "find", () => chain([{ _id: trainerId, name: "Coach", slug: "coach", owner: { _id: ownerId, providerType: "coach" }, role: "Boxing", specialty: "Combat", isActive: true, moderationStatus: "approved" }]));
  mock(Nutritionist, "find", () => chain([]));
  const res = response(); await getFavorites({ user: { id: userId }, query: { page: "1", limit: "20" } }, res);
  assert.equal(res.statusCode, 200); assert.deepEqual(res.body.data.map((item) => item.listing.entityType), ["coach", "gym"]); assert.deepEqual(res.body.pagination, { page: 1, limit: 20, total: 3, totalPages: 1 });
  assert.equal("owner" in res.body.data[0].listing, false); assert.equal("moderationStatus" in res.body.data[0].listing, false);
});
