import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { getAdminListingById, updateAdminListingContent } from "../src/controllers/admin/admin.controller.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const ownerId = new mongoose.Types.ObjectId();
const owner = { _id: ownerId, name: "Rahul", email: "rahul@example.com", providerType: "trainer", isActive: true };
const complete = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(), id: "trainer-005", owner, name: "Dex Williams", slug: "dex-williams", category: "fitness",
  role: "Director", specialty: "Performance", experience: "14 Years", sessions: "2,800+", clients: "400+",
  rating: 4.9, reviews: 201, certifications: ["NSCA-CSCS"], specializations: ["Speed"], bio: "Bio", available: true,
  featured: true, image: { src: "one.jpg", srcSet: "one 1x", sizes: "100vw", alt: "Dex" },
  social: { instagram: "ig", twitter: "tw", linkedin: "li", youtube: "yt" }, href: "/trainers/dex-williams",
  isVerified: false, isActive: true, moderationStatus: "approved", rejectionReason: "", moderationNote: "", reviewedAt: null,
  createdAt: new Date(), updatedAt: new Date(), ...overrides,
});
function queryResult(doc) { return { populate() { return this; }, lean: async () => doc }; }

for (const [type, Model] of [["trainer", Trainer], ["nutritionist", Nutritionist]]) {
  test(`returns complete ${type} detail with normalized owner context`, { concurrency: false }, async () => {
    const doc = complete(type === "nutritionist" ? { id: "nutritionist-1", category: undefined } : {});
    mock(Model, "findById", () => queryResult(doc));
    const res = response();
    await getAdminListingById({ params: { type, id: doc._id.toString() } }, res);
    assert.equal(res.statusCode, 200);
    for (const field of ["name", "slug", "role", "specialty", "experience", "sessions", "clients", "certifications", "specializations", "bio", "available", "image", "social", "href", "rating", "reviews", "isVerified", "isActive", "featured"]) assert.ok(field in res.body.data);
    assert.deepEqual(res.body.data.owner, { id: ownerId, name: "Rahul", email: "rahul@example.com", providerType: "trainer", isActive: true });
  });
}

test("loads a legacy owner-null professional listing", { concurrency: false }, async () => {
  const doc = complete({ owner: null });
  mock(Trainer, "findById", () => queryResult(doc));
  const res = response();
  await getAdminListingById({ params: { type: "trainer", id: doc._id.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.owner, null);
});

test("admin edits professional content while preserving protected state and nested siblings", { concurrency: false }, async () => {
  const state = complete();
  const listing = { ...state, image: { ...state.image }, social: { ...state.social }, async save() {} };
  let calls = 0;
  mock(Trainer, "findById", () => {
    calls += 1;
    if (calls === 1) return Promise.resolve(listing);
    return queryResult(listing);
  });
  mock(Trainer, "exists", async () => false);
  const res = response();
  await updateAdminListingContent({ params: { type: "coach", id: listing._id.toString() }, body: {
    name: " Updated Dex ", slug: " UPDATED-DEX ", category: "sports", role: "Coach", specialty: "Speed",
    experience: "15 Years", sessions: "3,000+", clients: "500+", certifications: ["A", "B"],
    specializations: ["Power"], bio: "Updated", available: false, image: { src: "two.jpg" }, social: { instagram: "new-ig" }, href: "/trainers/updated-dex",
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(listing.slug, "updated-dex");
  assert.equal(listing.image.alt, "Dex");
  assert.equal(listing.social.twitter, "tw");
  assert.deepEqual(listing.certifications, ["A", "B"]);
  for (const field of ["owner", "rating", "reviews", "isActive", "isVerified", "featured", "moderationStatus"]) assert.deepEqual(listing[field], state[field]);
});

test("admin content edit rejects every protected field", { concurrency: false }, async () => {
  const listing = complete();
  const res = response();
  const fields = ["owner", "id", "rating", "reviews", "reviewCount", "isActive", "isVerified", "verified", "featured", "moderationStatus", "rejectionReason", "moderationNote", "reviewedAt", "reviewedBy", "createdAt", "updatedAt"];
  await updateAdminListingContent({ params: { type: "trainer", id: listing._id.toString() }, body: Object.fromEntries(fields.map((field) => [field, "x"])) }, res);
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, fields);
});

test("admin professional edit validates required fields and duplicate slugs", { concurrency: false }, async (t) => {
  await t.test("blank required", async () => {
    const listing = complete(); mock(Trainer, "findById", async () => listing);
    const res = response(); await updateAdminListingContent({ params: { type: "trainer", id: listing._id.toString() }, body: { role: " " } }, res);
    assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field, "role");
  });
  await t.test("duplicate slug", async () => {
    const listing = complete(); mock(Trainer, "findById", async () => listing); mock(Trainer, "exists", async () => true);
    const res = response(); await updateAdminListingContent({ params: { type: "trainer", id: listing._id.toString() }, body: { slug: " duplicate " } }, res);
    assert.equal(res.statusCode, 409);
  });
});
