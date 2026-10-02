import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import app from "../src/app.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import {
  getFeaturedGyms,
  getGymBySlug,
  getGyms,
  getGymsByCategory,
} from "../src/controllers/gyms/gym.controller.js";
import {
  getFeaturedTrainers,
  getTrainerBySlug,
} from "../src/controllers/trainers/trainer.controller.js";
import {
  getFeaturedNutritionists,
  getNutritionistBySlug,
  getNutritionists,
} from "../src/controllers/nutritionists/nutritionist.controller.js";
import {
  isPubliclyVisibleListing,
  withPublicListingVisibility,
} from "../src/utils/publicListing.js";

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

function listQuery(value) {
  return {
    sort() { return this; },
    limit() { return this; },
    lean: async () => value,
  };
}

const professionalFixture = {
  _id: new mongoose.Types.ObjectId(),
  id: "PRO-001",
  name: "Safe Professional",
  slug: "safe-professional",
  category: "sports",
  role: "Coach",
  specialty: "Boxing",
  experience: "8 years",
  sessions: "900+",
  rating: 4.9,
  reviews: 120,
  clients: "300+",
  certifications: ["Certified"],
  specializations: ["Strength"],
  bio: "Public biography",
  available: true,
  featured: true,
  image: { src: "photo.jpg", srcSet: "photo-2x.jpg 2x", sizes: "100vw", alt: "Portrait" },
  social: { instagram: "https://instagram.com/safe" },
  href: "/trainers/safe-professional",
  isVerified: false,
  isActive: true,
  moderationStatus: "approved",
  moderationNote: "private note",
  rejectionReason: "private reason",
  reviewedAt: new Date(),
  reviewedBy: new mongoose.Types.ObjectId(),
  owner: new mongoose.Types.ObjectId(),
  createdAt: new Date(),
  updatedAt: new Date(),
  __v: 4,
};

const internalFields = [
  "owner", "isActive", "moderationStatus", "moderationNote",
  "rejectionReason", "reviewedAt", "reviewedBy", "__v",
];

function assertVisibilityFilter(filter) {
  assert.equal(filter.isActive, true);
  assert.deepEqual(filter.moderationStatus, { $nin: ["pending", "rejected"] });
  assert.equal("isVerified" in filter, false);
}

test("public publication policy preserves approved and legacy records only when active", () => {
  const cases = [
    [{ isActive: true, moderationStatus: "approved" }, true],
    [{ isActive: true, moderationStatus: "pending" }, false],
    [{ isActive: true, moderationStatus: "rejected" }, false],
    [{ isActive: false, moderationStatus: "approved" }, false],
    [{ isActive: true }, true],
  ];
  for (const [listing, expected] of cases) {
    assert.equal(isPubliclyVisibleListing(listing), expected);
  }
  assertVisibilityFilter(withPublicListingVisibility({ slug: "legacy" }));
});

test("all public Gym collection and detail queries use the publication boundary", { concurrency: false }, async () => {
  const seen = [];
  mock(Gym, "find", (filter) => { seen.push(filter); return listQuery([]); });
  mock(Gym, "findOne", (filter) => { seen.push(filter); return { lean: async () => null }; });

  await getFeaturedGyms({ query: {} }, response());
  await getGymsByCategory({ params: { category: "boxing" } }, response());
  await getGyms({ query: {} }, response());
  await getGymBySlug({ params: { slug: "hidden" } }, response());

  assert.equal(seen.length, 4);
  seen.forEach(assertVisibilityFilter);
});

test("Trainer public collection/detail are publication-safe and serialized", { concurrency: false }, async () => {
  const seen = [];
  mock(Trainer, "find", (filter) => { seen.push(filter); return listQuery([professionalFixture]); });
  mock(Trainer, "findOne", (filter) => { seen.push(filter); return { lean: async () => professionalFixture }; });

  const collection = response();
  await getFeaturedTrainers({ query: {} }, collection);
  const detail = response();
  await getTrainerBySlug({ params: { slug: professionalFixture.slug } }, detail);

  seen.forEach(assertVisibilityFilter);
  assert.equal(seen[0].featured, true);
  for (const value of [collection.body.data[0], detail.body.data]) {
    assert.equal(value.name, professionalFixture.name);
    assert.equal(value.category, "sports");
    assert.deepEqual(value.image, professionalFixture.image);
    assert.deepEqual(value.social, professionalFixture.social);
    assert.deepEqual(value.certifications, professionalFixture.certifications);
    internalFields.forEach((field) => assert.equal(field in value, false));
  }
});

test("Nutritionist public list/featured/detail are publication-safe and serialized", { concurrency: false }, async () => {
  const seen = [];
  mock(Nutritionist, "find", (filter) => { seen.push(filter); return listQuery([professionalFixture]); });
  mock(Nutritionist, "findOne", (filter) => { seen.push(filter); return { lean: async () => professionalFixture }; });

  const list = response();
  await getNutritionists({}, list);
  const featured = response();
  await getFeaturedNutritionists({}, featured);
  const detail = response();
  await getNutritionistBySlug({ params: { slug: professionalFixture.slug } }, detail);

  seen.forEach(assertVisibilityFilter);
  assert.equal(seen[0].featured, undefined);
  assert.equal(seen[1].featured, true);
  for (const value of [list.body.data[0], featured.body.data[0], detail.body.data]) {
    assert.equal(value.name, professionalFixture.name);
    assert.equal("category" in value, false);
    assert.deepEqual(value.specializations, professionalFixture.specializations);
    assert.deepEqual(value.image, professionalFixture.image);
    internalFields.forEach((field) => assert.equal(field in value, false));
  }
});

test("featured semantics remain backward compatible and documented by query", { concurrency: false }, async () => {
  let gymFilter;
  let trainerFilter;
  let nutritionistFilter;
  mock(Gym, "find", (filter) => { gymFilter = filter; return listQuery([]); });
  mock(Trainer, "find", (filter) => { trainerFilter = filter; return listQuery([]); });
  mock(Nutritionist, "find", (filter) => { nutritionistFilter = filter; return listQuery([]); });

  await getFeaturedGyms({ query: {} }, response());
  await getFeaturedTrainers({ query: {} }, response());
  await getFeaturedNutritionists({}, response());

  assert.equal(gymFilter.featured, undefined, "Gym keeps its compatibility ranking behavior");
  assert.equal(trainerFilter.featured, true);
  assert.equal(nutritionistFilter.featured, true);
});

test("health endpoint reports status without requiring a database write", async () => {
  const server = app.listen(0);
  try {
    const address = server.address();
    const result = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    const body = await result.json();
    assert.equal(result.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.status.server, "up");
    assert.ok(["connected", "disconnected"].includes(body.status.database));
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
