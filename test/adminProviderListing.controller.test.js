import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { createAdminProviderListing } from "../src/controllers/admin/adminProviderListing.controller.js";
import { getAdminProviderById } from "../src/controllers/admin/admin.controller.js";
import User from "../src/models/users/User.js";
import ProviderProfile from "../src/models/providers/ProviderProfile.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import City from "../src/models/cities/City.js";
import Category from "../src/models/categories/Category.js";

const originals = [];
function mock(target, property, value) {
  originals.push([target, property, target[property]]);
  target[property] = value;
}
afterEach(() => {
  while (originals.length) {
    const [target, property, value] = originals.pop();
    target[property] = value;
  }
});

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const professionalBody = {
  name: "  Alex Example  ", slug: "  Alex-Example  ",
  role: "  Strength Coach  ", specialty: "  Strength  ",
  experience: "  8 years  ", sessions: "  500+  ", clients: "  120  ",
};

async function runCreate(providerType, body, { isActive = true } = {}) {
  const providerId = new mongoose.Types.ObjectId();
  mock(User, "findById", async () => ({ _id: providerId, role: "business", providerType, isActive }));
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => [{ name: "Strength Coach" }] }));
  const res = response();
  await createAdminProviderListing({ params: { providerId: providerId.toString() }, body }, res);
  return { res, providerId };
}

for (const [providerType, Model, expectedType, idPrefix] of [
  ["trainer", Trainer, "trainer", "trainer-"],
  ["coach", Trainer, "trainer", "trainer-"],
  ["nutritionist", Nutritionist, "nutritionist", "nutritionist-"],
]) {
  test(`admin creates a provider-owned ${providerType} listing`, { concurrency: false }, async () => {
    mock(Model, "exists", async () => false);
    let created;
    mock(Model, "create", async (data) => { created = data; return { _id: new mongoose.Types.ObjectId(), ...data }; });
    const { res, providerId } = await runCreate(providerType, { ...professionalBody });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.type, expectedType);
    assert.equal(created.owner.toString(), providerId.toString());
    assert.match(created.id, new RegExp(`^${idPrefix}`));
    assert.equal(created.moderationStatus, "pending");
    assert.equal(created.isActive, true);
    assert.equal(created.isVerified, false);
    assert.equal(created.featured, false);
  });
}

test("admin creates a provider-owned Gym with a real City reference", { concurrency: false }, async () => {
  const city = new mongoose.Types.ObjectId();
  mock(City, "exists", async () => true);
  mock(Gym, "exists", async () => false);
  let created;
  mock(Gym, "create", async (data) => { created = data; return data; });
  const { res, providerId } = await runCreate("gym_owner", {
    name: " Gym ", slug: " Gym ", category: " Fitness ", city: city.toString(),
    coordinates: { latitude: 0, longitude: 0 },
  });
  assert.equal(res.statusCode, 201);
  assert.equal(created.owner.toString(), providerId.toString());
  assert.equal(created.verified, false);
  assert.equal(created.slug, "gym");
  assert.deepEqual(created.coordinates, { lat: 0, lng: 0 });
  assert.deepEqual(created.geoLocation, { type: "Point", coordinates: [0, 0] });
});

test("admin Gym creation rejects partial coordinates with a field-level 400", { concurrency: false }, async () => {
  const city = new mongoose.Types.ObjectId();
  mock(City, "exists", async () => true);
  mock(Gym, "exists", async () => false);
  const { res } = await runCreate("gym_owner", {
    name: "Gym", slug: "gym", category: "Fitness", city: city.toString(),
    coordinates: { latitude: 12 },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errors[0].field, "coordinates.longitude");
});

for (const [name, providerValues, status] of [
  ["missing", null, 404],
  ["non-business", { role: "user", providerType: null, isActive: true }, 404],
  ["inactive", { role: "business", providerType: "trainer", isActive: false }, 409],
  ["unsupported", { role: "business", providerType: "other", isActive: true }, 400],
]) {
  test(`rejects a ${name} provider target`, { concurrency: false }, async () => {
    const id = new mongoose.Types.ObjectId();
    const provider = providerValues ? { _id: id, ...providerValues } : null;
    mock(User, "findById", async () => provider);
    const res = response();
    await createAdminProviderListing({ params: { providerId: id.toString() }, body: professionalBody }, res);
    assert.equal(res.statusCode, status);
  });
}

test("rejects owner, system, and moderation fields instead of accepting client ownership", { concurrency: false }, async () => {
  const { res } = await runCreate("trainer", {
    ...professionalBody,
    owner: new mongoose.Types.ObjectId(), featured: true, isActive: false,
    verified: true, isVerified: true, id: "client-id", moderationStatus: "approved",
  });
  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, ["owner", "featured", "isActive", "verified", "isVerified", "id", "moderationStatus"]);
});

test("returns required-field and duplicate-slug contract errors", { concurrency: false }, async (t) => {
  await t.test("required fields", async () => {
    const { res } = await runCreate("trainer", { name: "Alex", slug: "alex" });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.errors.some((error) => error.field === "role"));
  });
  await t.test("duplicate slug", async () => {
    mock(Trainer, "exists", async () => true);
    const { res } = await runCreate("trainer", professionalBody);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.field, "slug");
  });
});

test("provider detail returns only owner-filtered listings and a summary", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  const provider = { _id: providerId, name: "Provider", role: "business", providerType: "trainer", isActive: true };
  mock(User, "findOne", () => ({ select: () => ({ lean: async () => provider }) }));
  mock(ProviderProfile, "findOne", () => ({ select: () => ({ lean: async () => null }) }));
  const filters = [];
  const stubFind = (docs) => (filter) => { filters.push(filter); return { lean: async () => docs }; };
  mock(Gym, "find", stubFind([{ _id: new mongoose.Types.ObjectId(), name: "Gym", owner: providerId, isActive: false, createdAt: new Date(1) }]));
  mock(Trainer, "find", stubFind([{ _id: new mongoose.Types.ObjectId(), name: "Trainer", owner: providerId, isActive: true, createdAt: new Date(2) }]));
  mock(Nutritionist, "find", stubFind([]));
  const res = response();
  await getAdminProviderById({ params: { id: providerId.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.listingSummary, { total: 2, active: 1, inactive: 1 });
  assert.deepEqual(res.body.data.listings.map((item) => item.type), ["trainer", "gym"]);
  assert.ok(filters.every((filter) => filter.owner.toString() === providerId.toString()));
});
