import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Review from "../src/models/reviews/Review.js";
import Gym from "../src/models/gyms/Gym.js";
import { upsertReview, updateReview, deleteReview, listReviews } from "../src/controllers/reviews/review.controller.js";
import { moderateReview } from "../src/controllers/admin/adminReview.controller.js";

const originals = [];
function mock(target, key, value) { originals.push([target, key, target[key]]); target[key] = value; }
afterEach(() => { while (originals.length) { const [target, key, value] = originals.pop(); target[key] = value; } });
const listingId = new mongoose.Types.ObjectId().toString();
const userId = new mongoose.Types.ObjectId().toString();
const request = (body = {}) => ({ body, params: { type: "gym", id: listingId }, user: { id: userId, role: "user" } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
function visible() { mock(Gym, "findOne", () => ({ select: () => ({ lean: async () => ({ _id: listingId }) }) })); }

test("rejects invalid rating without writing", { concurrency: false }, async () => {
  visible();
  const res = response();
  await upsertReview(request({ rating: 6, text: "Helpful guidance" }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Rating/);
});

test("rejects unexpected review fields", { concurrency: false }, async () => {
  visible();
  const res = response();
  await upsertReview(request({ rating: 5, text: "Helpful guidance", status: "published" }), res);
  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Unsupported/);
});

test("prevents duplicate customer reviews", { concurrency: false }, async () => {
  visible();
  mock(Review, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
  const res = response();
  await upsertReview(request({ rating: 5, text: "Helpful guidance" }), res);
  assert.equal(res.statusCode, 409);
});

test("creates review without modifying listing rating fields", { concurrency: false }, async () => {
  visible();
  mock(Review, "findOne", async () => null);
  mock(Review, "create", async (data) => ({ _id: new mongoose.Types.ObjectId(), ...data }));
  const res = response();
  await upsertReview(request({ rating: 5, text: "Helpful guidance" }), res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.rating, 5);
});

test("customer edits cannot set hidden review to published", { concurrency: false }, async () => {
  visible();
  mock(Review, "findOneAndUpdate", async (_filter, update) => {
    assert.equal(update.$set.status, undefined);
    return { _id: new mongoose.Types.ObjectId(), rating: 4, title: "", text: "Updated feedback", status: "hidden" };
  });
  const res = response();
  await updateReview(request({ rating: 4, text: "Updated feedback" }), res);
  assert.equal(res.statusCode, 200);
});

test("customer can delete only own review", { concurrency: false }, async () => {
  mock(Review, "findOneAndDelete", async (filter) => {
    assert.equal(String(filter.user), userId);
    return { _id: new mongoose.Types.ObjectId() };
  });
  const res = response();
  await deleteReview(request(), res);
  assert.equal(res.statusCode, 200);
});

test("admin moderation rejects invalid status", { concurrency: false }, async () => {
  const res = response();
  await moderateReview({ params: { id: listingId }, body: { status: "removed" } }, res);
  assert.equal(res.statusCode, 400);
});
