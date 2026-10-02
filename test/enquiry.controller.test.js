import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Enquiry from "../src/models/enquiries/Enquiry.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import { createEnquiry, getMyEnquiries } from "../src/controllers/enquiries/enquiry.controller.js";
import authorizeRoles from "../src/middleware/auth/roleMiddleware.js";

const originals = [];
const mock = (target, key, value) => { originals.push([target, key, target[key]]); target[key] = value; };
afterEach(() => { while (originals.length) { const [target, key, value] = originals.pop(); target[key] = value; } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const chain = (value) => ({ select() { return this; }, populate() { return this; }, sort() { return this; }, skip() { return this; }, limit() { return this; }, lean: async () => value });
const customerId = new mongoose.Types.ObjectId();
const providerId = new mongoose.Types.ObjectId();

function validBody(overrides = {}) {
  return { targetType: "gym", targetId: String(new mongoose.Types.ObjectId()), intent: "general", message: "Please share more information.", contact: { name: "Customer", email: "CUSTOMER@example.com", phone: " 9999999999 " }, ...overrides };
}

function published(model, targetType, { owner = { _id: providerId, role: "business", isActive: true, providerType: targetType === "trainer" ? "trainer" : "gym_owner" }, moderationStatus = "approved", isActive = true } = {}) {
  const id = new mongoose.Types.ObjectId();
  const listing = { _id: id, name: `${targetType} listing`, slug: `${targetType}-listing`, owner, moderationStatus, isActive, images: { cover: "gym.jpg" }, image: { src: "pro.jpg" } };
  mock(model, "findOne", (filter) => { assert.equal(filter.isActive, true); assert.deepEqual(filter.moderationStatus, { $nin: ["pending", "rejected"] }); return chain(listing); });
  return listing;
}

test("enquiries role boundary accepts only authenticated customers", () => {
  const middleware = authorizeRoles("user");
  for (const [user, status] of [[undefined, 401], [{ role: "business" }, 403], [{ role: "admin" }, 403]]) {
    const res = response(); let next = false; middleware({ user }, res, () => { next = true; }); assert.equal(res.statusCode, status); assert.equal(next, false);
  }
  let next = false; middleware({ user: { role: "user" } }, response(), () => { next = true; }); assert.equal(next, true);
});

for (const scenario of [
  ["Gym membership", Gym, "gym", "membership", { membershipName: "Annual Membership" }, "gym"],
  ["Gym class", Gym, "gym", "class", { className: "HIIT" }, "gym"],
  ["Gym trial", Gym, "gym", "trial", {}, "gym"],
  ["Trainer training", Trainer, "trainer", "training", {}, "trainer"],
  ["Coach-backed Trainer", Trainer, "trainer", "training", {}, "coach"],
  ["Nutritionist consultation", Nutritionist, "nutritionist", "consultation", {}, "nutritionist"],
]) {
  const [label, Model, targetType, intent, context, entityType] = scenario;
  test(`creates valid ${label} enquiry with safe ownership and snapshot`, { concurrency: false }, async () => {
    const owner = entityType === "coach" ? { _id: providerId, role: "business", isActive: true, providerType: "coach" } : undefined;
    const listing = published(Model, targetType, owner ? { owner } : {}); let created;
    mock(Enquiry, "create", async (value) => { created = { _id: new mongoose.Types.ObjectId(), ...value, status: "submitted", createdAt: new Date(), updatedAt: new Date() }; return { ...created, toObject: () => created }; });
    const res = response(); await createEnquiry({ user: { id: customerId }, body: validBody({ targetType, targetId: String(listing._id), intent, context }) }, res);
    assert.equal(res.statusCode, 201); assert.equal(String(created.customer), String(customerId)); assert.equal(String(created.provider), String(providerId)); assert.equal(created.listingSnapshot.entityType, entityType); assert.equal(res.body.data.status, "submitted");
    assert.equal("provider" in res.body.data, false); assert.equal("customer" in res.body.data, false); assert.equal(created.contact.email, "customer@example.com");
  });
}

test("ownerless legacy published listing is accepted with null provider", { concurrency: false }, async () => {
  const listing = published(Gym, "gym", { owner: null, moderationStatus: undefined }); let created;
  mock(Enquiry, "create", async (value) => { created = { _id: new mongoose.Types.ObjectId(), ...value, status: "submitted" }; return { ...created, toObject: () => created }; });
  const res = response(); await createEnquiry({ user: { id: customerId }, body: validBody({ targetId: String(listing._id) }) }, res);
  assert.equal(res.statusCode, 201); assert.equal(created.provider, null);
});

test("validation rejects identity injection, unsupported nested fields, invalid IDs/email and oversized messages", { concurrency: false }, async () => {
  const cases = [
    validBody({ targetType: "coach" }), validBody({ targetId: "bad" }), validBody({ customerId: String(customerId) }), validBody({ provider: String(providerId) }),
    validBody({ contact: { name: "Customer", email: "bad" } }), validBody({ contact: { name: "Customer", email: "a@b.com", admin: true } }),
    validBody({ context: { price: 2999 } }), validBody({ message: "x".repeat(2001) }),
  ];
  for (const body of cases) { const res = response(); await createEnquiry({ user: { id: customerId }, body }, res); assert.equal(res.statusCode, 400); }
});

test("intent compatibility rejects nonsensical combinations and missing context", { concurrency: false }, async () => {
  for (const body of [validBody({ targetType: "nutritionist", intent: "membership" }), validBody({ targetType: "trainer", intent: "membership" }), validBody({ intent: "training" }), validBody({ intent: "membership", context: {} }), validBody({ intent: "class", context: {} })]) {
    const res = response(); await createEnquiry({ user: { id: customerId }, body }, res); assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field.startsWith("intent") || res.body.errors[0].field.startsWith("context"), true);
  }
});

test("inactive, pending, rejected, and nonexistent targets are not accepted", { concurrency: false }, async () => {
  mock(Gym, "findOne", () => chain(null));
  for (const body of [validBody(), validBody({ targetId: String(new mongoose.Types.ObjectId()) })]) { const res = response(); await createEnquiry({ user: { id: customerId }, body }, res); assert.equal(res.statusCode, 404); }
});

test("customer history is scoped, newest-first, paginated, private, and preserves unavailable snapshots", { concurrency: false }, async () => {
  const target = new mongoose.Types.ObjectId(); let findFilter; let sort;
  const item = { _id: new mongoose.Types.ObjectId(), customer: customerId, provider: providerId, targetType: "gym", target, intent: "general", status: "submitted", message: "Hello", contact: { name: "C", email: "c@example.com", phone: "" }, context: {}, listingSnapshot: { name: "Old Gym", slug: "old-gym", entityType: "gym", imageUrl: "old.jpg", href: "/gym-detail/old-gym" }, createdAt: new Date(), updatedAt: new Date() };
  mock(Enquiry, "find", (filter) => { findFilter = filter; const result = chain([item]); result.sort = (value) => { sort = value; return result; }; return result; });
  mock(Enquiry, "countDocuments", async () => 1); mock(Gym, "find", () => chain([]));
  const res = response(); await getMyEnquiries({ user: { id: customerId }, query: { page: "1", limit: "10" } }, res);
  assert.equal(String(findFilter.customer), String(customerId)); assert.deepEqual(sort, { createdAt: -1, _id: -1 }); assert.equal(res.body.data[0].listing.available, false); assert.equal(res.body.data[0].listing.href, null);
  assert.equal("provider" in res.body.data[0], false); assert.equal("customer" in res.body.data[0], false); assert.deepEqual(res.body.pagination, { page: 1, limit: 10, total: 1, totalPages: 1 });
});
