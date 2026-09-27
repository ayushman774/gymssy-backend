import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { getAdminListingById } from "../src/controllers/admin/admin.controller.js";
import Gym from "../src/models/gyms/Gym.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function queryResult(doc) { return { populate() { return this; }, lean: async () => doc }; }

test("admin Gym detail normalizes populated City and owner context", { concurrency: false }, async () => {
  const ownerId = new mongoose.Types.ObjectId();
  const cityId = new mongoose.Types.ObjectId();
  const doc = {
    _id: new mongoose.Types.ObjectId(), name: "Admin Gym", slug: "admin-gym", category: "Fitness",
    city: { _id: cityId, name: "Gurugram", slug: "gurugram", state: "Haryana", country: "India" },
    owner: { _id: ownerId, name: "Owner", email: "owner@example.com", providerType: "gym_owner", isActive: true },
    tags: ["Gyms"], location: { address: "1 Main Road", city: "Display City" }, coordinates: { lat: 12, lng: 77 },
    phone: "123", email: "gym@example.com", website: "https://gym.example.com", description: "Full description", highlights: ["24/7"],
    facilities: [{ name: "Pool", available: true }], memberships: [{ name: "Annual", price: 100, features: [{ text: "Pool", included: true }] }],
    trainers: [{ name: "Alex", certifications: ["CPT"] }], classes: [{ name: "HIIT", spots: 12, spotsLeft: 4 }], timings: [{ day: "Monday", open: "06:00", close: "22:00", isOpen: true }],
    rating: 4.8, reviewCount: 1248, reviews: [{ user: { name: "Karthik", initials: "KR" }, rating: 5, text: "Complete review" }], ratingBreakdown: [{ stars: 5, percentage: 80 }],
    images: { cover: "cover.jpg", coverMeta: { publicId: "secret-cover" }, gallery: [{ url: "one.jpg", alt: "One", category: "gym", publicId: "secret-gallery" }] },
  };
  mock(Gym, "findById", () => queryResult(doc));
  const res = response(); await getAdminListingById({ params: { type: "gym", id: doc._id.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.city, { id: cityId, name: "Gurugram", slug: "gurugram", state: "Haryana", country: "India" });
  assert.deepEqual(res.body.data.owner, { id: ownerId, name: "Owner", email: "owner@example.com", providerType: "gym_owner", isActive: true });
  for (const field of ["location", "coordinates", "phone", "email", "website", "description", "highlights", "facilities", "memberships", "trainers", "classes", "timings", "rating", "reviewCount", "reviews", "ratingBreakdown"]) assert.ok(field in res.body.data, `${field} should be returned`);
  assert.deepEqual(res.body.data.memberships[0].features, [{ text: "Pool", included: true }]);
  assert.deepEqual(res.body.data.trainers[0].certifications, ["CPT"]);
  assert.equal(res.body.data.images.coverManaged, true);
  assert.equal(res.body.data.images.gallery[0].managed, true);
  assert.equal("publicId" in res.body.data.images.gallery[0], false);
});

test("admin Gym detail safely supports legacy null City and owner", { concurrency: false }, async () => {
  const doc = { _id: new mongoose.Types.ObjectId(), name: "Legacy Gym", city: null, owner: null };
  mock(Gym, "findById", () => queryResult(doc));
  const res = response(); await getAdminListingById({ params: { type: "gym", id: doc._id.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.city, null);
  assert.equal(res.body.data.owner, null);
});
