import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { updateAdminListingContent } from "../src/controllers/admin/admin.controller.js";
import Gym from "../src/models/gyms/Gym.js";
import City from "../src/models/cities/City.js";
import Category from "../src/models/categories/Category.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function queryResult(doc) { return { populate() { return this; }, lean: async () => doc }; }

const cityId = new mongoose.Types.ObjectId();
const ownerId = new mongoose.Types.ObjectId();
function gym(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(), owner: ownerId, name: "Old Gym", slug: "old-gym", category: "Fitness", city: cityId,
    tags: ["old"], phone: "1", email: "old@example.com", website: "https://old.example.com", description: "Old",
    highlights: ["Old"], location: { address: "A", area: "Area", city: "Display", state: "State", pincode: "1", landmark: "Landmark", parking: "Yes" },
    coordinates: { lat: 12, lng: 77 }, priceFrom: 100, timings: [{ day: "Monday", open: "06:00", close: "22:00", isOpen: true }],
    rating: 4.8, reviewCount: 9, reviews: [{ text: "Keep" }], ratingBreakdown: [{ stars: 5, percentage: 80 }],
    verified: true, featured: true, isActive: true, moderationStatus: "approved", openNow: true,
    images: { cover: "keep.jpg", gallery: [] }, facilities: [{ name: "Keep" }], memberships: [{ name: "Keep" }], trainers: [{ name: "Keep" }], classes: [{ name: "Keep" }],
    async save() {}, ...overrides,
  };
}
function stubUpdate(listing, populatedOverrides = {}) {
  let calls = 0;
  mock(Gym, "findById", () => {
    calls += 1;
    return calls === 1 ? Promise.resolve(listing) : queryResult({ ...listing, city: { _id: listing.city, name: "Bengaluru", slug: "bengaluru", state: "Karnataka", country: "India" }, owner: listing.owner ? { _id: listing.owner, name: "Owner" } : null, ...populatedOverrides });
  });
  mock(Gym, "exists", async () => false);
  mock(City, "exists", async () => true);
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => ["strength", "cardio", "24/7"].map((name) => ({ name })) }));
}
async function update(listing, body) {
  stubUpdate(listing);
  const res = response();
  await updateAdminListingContent({ params: { type: "gym", id: listing._id.toString() }, body }, res);
  return res;
}

test("Admin Gym Phase A edits every allowed field and preserves system, customer, and advanced state", { concurrency: false }, async () => {
  const listing = gym();
  const preserved = Object.fromEntries(["owner", "rating", "reviewCount", "reviews", "ratingBreakdown", "verified", "featured", "isActive", "moderationStatus", "openNow", "images", "facilities", "memberships", "trainers", "classes"].map((field) => [field, listing[field]]));
  const nextCity = new mongoose.Types.ObjectId();
  const res = await update(listing, {
    name: " New Gym ", slug: " NEW-GYM ", category: "Fitness", tags: [" strength ", "cardio"],
    phone: "2", email: "new@example.com", website: "https://new.example.com", description: "New", highlights: [" 24/7 "],
    city: nextCity.toString(), location: { address: "B", area: "New Area", city: "New Display", state: "New State", pincode: "2", landmark: "New", parking: "Free" },
    coordinates: { lat: -90, lng: 180 }, priceFrom: 0,
    timings: [{ day: " Monday ", open: "05:30", close: "23:00", isOpen: true }, { day: "Sunday", open: "", close: "", isOpen: false }],
  });
  assert.equal(res.statusCode, 200);
  assert.equal(listing.name, "New Gym"); assert.equal(listing.slug, "new-gym"); assert.equal(listing.city, nextCity.toString());
  assert.deepEqual(listing.tags, ["strength", "cardio"]); assert.deepEqual(listing.highlights, ["24/7"]);
  assert.deepEqual(listing.coordinates, { lat: -90, lng: 180 }); assert.equal(listing.priceFrom, 0);
  assert.deepEqual(listing.timings[1], { day: "Sunday", open: "", close: "", isOpen: false });
  for (const [field, value] of Object.entries(preserved)) assert.deepEqual(listing[field], value);
});

test("Admin Gym Phase A rejects every protected field", { concurrency: false }, async () => {
  const fields = ["_id", "owner", "distance", "rating", "reviewCount", "reviews", "ratingBreakdown", "openNow", "images", "facilities", "memberships", "trainers", "classes", "verified", "isVerified", "featured", "isActive", "moderationStatus", "rejectionReason", "moderationNote", "reviewedAt", "reviewedBy", "createdAt", "updatedAt", "__v"];
  const listing = gym(); const res = await update(listing, Object.fromEntries(fields.map((field) => [field, "x"])));
  assert.equal(res.statusCode, 400); assert.deepEqual(res.body.unsupportedFields, fields);
});

test("Admin Gym Phase A required, slug, and City validation", { concurrency: false }, async (t) => {
  for (const field of ["name", "slug", "category"]) await t.test(`rejects blank ${field}`, async () => {
    const listing = gym(); const res = await update(listing, { [field]: " " }); assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field, field);
  });
  await t.test("rejects blank and invalid City", async () => {
    const listing = gym(); let res = await update(listing, { city: "" }); assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field, "city");
    res = await update(listing, { city: "not-an-id" }); assert.equal(res.statusCode, 400); assert.match(res.body.errors[0].message, /ObjectId/);
  });
  await t.test("rejects nonexistent City", async () => {
    const listing = gym(); stubUpdate(listing); mock(City, "exists", async () => false); const res = response();
    await updateAdminListingContent({ params: { type: "gym", id: listing._id.toString() }, body: { city: new mongoose.Types.ObjectId().toString() } }, res);
    assert.equal(res.statusCode, 400); assert.match(res.body.errors[0].message, /does not exist/);
  });
  await t.test("normalizes slug and rejects conflicts", async () => {
    const listing = gym(); stubUpdate(listing); mock(Gym, "exists", async () => true); const res = response();
    await updateAdminListingContent({ params: { type: "gym", id: listing._id.toString() }, body: { slug: " DUPLICATE " } }, res);
    assert.equal(res.statusCode, 409);
  });
});

test("Admin Gym Phase A preserves nested siblings and accepts paired coordinate clearing", { concurrency: false }, async () => {
  const listing = gym(); const res = await update(listing, { location: { landmark: "" }, coordinates: { lat: null, lng: null }, tags: [], highlights: [] });
  assert.equal(res.statusCode, 200); assert.equal(listing.location.landmark, ""); assert.equal(listing.location.area, "Area");
  assert.deepEqual(listing.coordinates, { lat: null, lng: null }); assert.equal(listing.geoLocation, undefined); assert.deepEqual(listing.tags, []); assert.deepEqual(listing.highlights, []);
});

test("Admin Gym Phase A validates coordinate ranges and longitude-only merging", { concurrency: false }, async (t) => {
  await t.test("longitude only", async () => { const listing = gym(); const res = await update(listing, { coordinates: { lng: -180 } }); assert.equal(res.statusCode, 200); assert.deepEqual(listing.coordinates, { lat: 12, lng: -180 }); });
  await t.test("preferred aliases and numeric strings normalize", async () => { const listing = gym(); const res = await update(listing, { coordinates: { latitude: "0", longitude: "0" } }); assert.equal(res.statusCode, 200); assert.deepEqual(listing.coordinates, { lat: 0, lng: 0 }); assert.deepEqual(listing.geoLocation, { type: "Point", coordinates: [0, 0] }); });
  await t.test("partial clearing is rejected", async () => { const listing = gym(); const res = await update(listing, { coordinates: { lat: null } }); assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field, "coordinates"); });
  for (const [field, value, errorField] of [["lat", 90.01, "coordinates.latitude"], ["lat", -91, "coordinates.latitude"], ["lng", 180.01, "coordinates.longitude"], ["lng", -181, "coordinates.longitude"], ["lat", "north", "coordinates.latitude"]]) await t.test(`rejects ${field} ${value}`, async () => {
    const listing = gym(); const res = await update(listing, { coordinates: { [field]: value } }); assert.equal(res.statusCode, 400); assert.equal(res.body.errors[0].field, errorField);
  });
});

test("Admin Gym Phase A timing validation", { concurrency: false }, async (t) => {
  for (const [name, timings, field] of [
    ["malformed time", [{ day: "Monday", open: "6am", close: "22:00", isOpen: true }], "timings.0.open"],
    ["duplicate day", [{ day: "Monday", open: "06:00", close: "22:00", isOpen: true }, { day: " monday ", open: "", close: "", isOpen: false }], "timings.1.day"],
    ["blank day", [{ day: " ", open: "", close: "", isOpen: false }], "timings.0.day"],
    ["nonboolean isOpen", [{ day: "Monday", open: "06:00", close: "22:00", isOpen: "yes" }], "timings.0.isOpen"],
  ]) await t.test(name, async () => { const listing = gym(); const res = await update(listing, { timings }); assert.equal(res.statusCode, 400); assert.ok(res.body.errors.some((error) => error.field === field)); });
});

test("Admin can edit a legacy owner-null Gym", { concurrency: false }, async () => {
  const listing = gym({ owner: null }); const res = await update(listing, { description: "Legacy updated" });
  assert.equal(res.statusCode, 200); assert.equal(listing.description, "Legacy updated"); assert.equal(res.body.data.owner, null);
});
