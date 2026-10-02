import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { getDiscoveryListings } from "../src/controllers/discovery/discovery.controller.js";
import Category from "../src/models/categories/Category.js";
import City from "../src/models/cities/City.js";
import Gym from "../src/models/gyms/Gym.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import Trainer from "../src/models/trainers/Trainer.js";
import User from "../src/models/users/User.js";

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

const oid = () => new mongoose.Types.ObjectId();
const fitness = { _id: oid(), name: "Fitness", slug: "fitness", type: "main", parentCategory: null, isActive: true };
const wellness = { _id: oid(), name: "Wellness", slug: "wellness", type: "main", parentCategory: null, isActive: true };
const sports = { _id: oid(), name: "Sports", slug: "sports", type: "main", parentCategory: null, isActive: true };
const sub = (parent, name, slug) => ({ _id: oid(), name, slug, type: "subcategory", parentCategory: parent._id, isActive: true });
const categories = [
  fitness, wellness, sports,
  sub(fitness, "Gyms", "gyms"), sub(fitness, "Personal Trainers", "personal-trainers"), sub(fitness, "HIIT", "hiit"),
  sub(wellness, "Yoga", "yoga"), sub(wellness, "Meditation", "meditation"), sub(wellness, "Nutrition", "nutrition"),
  sub(sports, "Boxing", "boxing"), sub(sports, "Sports Academies", "sports-academies"),
];
const delhi = { _id: oid(), name: "Delhi", slug: "delhi", state: "Delhi", country: "India", isActive: true };
const inactiveCity = { _id: oid(), name: "Old City", slug: "old-city", state: "State", country: "India", isActive: false };

const ownerTypes = ["gym_owner", "fitness_centre_owner", "wellness_centre_owner", "sports_academy_owner", "studio_owner", "trainer", "coach", "nutritionist"];
const owners = Object.fromEntries(ownerTypes.map((providerType) => [providerType, { _id: oid(), role: "business", providerType }]));
const date = (day) => new Date(`2026-01-${String(day).padStart(2, "0")}T00:00:00.000Z`);

const base = (name, owner, day, overrides = {}) => ({
  _id: oid(), name, slug: name.toLowerCase().replaceAll(" ", "-"), owner, isActive: true,
  moderationStatus: "approved", featured: false, rating: 4, createdAt: date(day), ...overrides,
});

let gyms;
let trainers;
let nutritionists;

function valueAt(document, path) {
  return path.split(".").reduce((value, key) => value?.[key], document);
}

function scalar(value) {
  if (value && typeof value === "object" && value._id) return value._id;
  return value;
}

function same(left, right) {
  return String(scalar(left)) === String(scalar(right));
}

function matchesCondition(actual, expected) {
  const values = Array.isArray(actual) ? actual : [actual];
  if (expected instanceof RegExp) return values.some((value) => expected.test(String(value ?? "")));
  if (expected && typeof expected === "object" && !Array.isArray(expected) && !(expected instanceof mongoose.Types.ObjectId)) {
    if (expected.$in) return values.some((value) => expected.$in.some((candidate) => same(value, candidate)));
    if (expected.$nin) return values.every((value) => expected.$nin.every((candidate) => !same(value, candidate)));
  }
  return values.some((value) => same(value, expected));
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([field, expected]) => {
    if (field === "$and") return expected.every((item) => matches(document, item));
    if (field === "$or") return expected.some((item) => matches(document, item));
    return matchesCondition(valueAt(document, field), expected);
  });
}

function queryFor(documents, filter) {
  let result = documents.filter((document) => matches(document, filter));
  return {
    populate() { return this; },
    select() { return this; },
    sort(specification) {
      result = [...result].sort((left, right) => {
        for (const [field, direction] of Object.entries(specification)) {
          const a = scalar(valueAt(left, field)) ?? 0;
          const b = scalar(valueAt(right, field)) ?? 0;
          if (String(a) === String(b)) continue;
          return a > b ? direction : -direction;
        }
        return 0;
      });
      return this;
    },
    limit(amount) { result = result.slice(0, amount); return this; },
    lean: async () => result,
  };
}

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function discover(query = {}) {
  const res = response();
  await getDiscoveryListings({ query }, res);
  return res;
}

beforeEach(() => {
  gyms = [
    base("Alpha Gym", owners.gym_owner, 10, { category: "Fitness", tags: ["Gyms", "HIIT"], city: delhi, location: { area: "Saket", state: "Delhi" }, images: { cover: "alpha.jpg" }, priceFrom: 1000, reviewCount: 50, featured: true, verified: true }),
    base("Fit Centre", owners.fitness_centre_owner, 9, { category: "Fitness", tags: ["Gyms"], city: delhi, reviewCount: 20 }),
    base("Calm Wellness", owners.wellness_centre_owner, 8, { category: "Wellness", tags: ["Yoga", "Meditation", "Nutrition"], city: delhi, description: "Holistic recovery", reviewCount: 30 }),
    base("Elite Sports", owners.sports_academy_owner, 7, { category: "Sports", tags: ["Boxing", "Sports Academies"], city: delhi, reviewCount: 40 }),
    base("Legacy Gym", null, 6, { category: "Fitness", tags: ["Gyms"], city: delhi, reviewCount: 5 }),
    base("Hidden Pending", owners.gym_owner, 5, { category: "Fitness", tags: ["Gyms"], city: delhi, moderationStatus: "pending" }),
    base("Hidden Rejected", owners.gym_owner, 4, { category: "Fitness", tags: ["Gyms"], city: delhi, moderationStatus: "rejected" }),
    base("Hidden Inactive", owners.gym_owner, 3, { category: "Fitness", tags: ["Gyms"], city: delhi, isActive: false }),
    base("Legacy Published", owners.gym_owner, 2, { category: "Fitness", tags: ["Gyms"], city: delhi, moderationStatus: undefined }),
  ];
  trainers = [
    base("Asha Trainer", owners.trainer, 12, { category: "fitness", role: "Personal Trainer", specialty: "Strength", specializations: ["Mobility"], bio: "Safe coaching", reviews: 60, isVerified: true }),
    base("Elite Coach", owners.coach, 11, { category: "sports", role: "Boxing", specialty: "Combat", reviews: 70 }),
    base("Yoga Professional", owners.trainer, 1, { category: "wellness", role: "Yoga", specialty: "Breathwork", reviews: 10 }),
  ];
  nutritionists = [base("Nina Nutrition", owners.nutritionist, 13, { role: "Nutritionist", specialty: "Clinical Nutrition", reviews: 80, image: { src: "nina.jpg", alt: "Nina" } })];

  mock(User, "find", (filter) => queryFor(Object.values(owners), filter));
  mock(Category, "find", (filter) => queryFor(categories, filter));
  mock(City, "findOne", (filter) => ({ lean: async () => [delhi, inactiveCity].find((city) => matches(city, filter)) || null }));
  for (const [Model, getDocuments] of [[Gym, () => gyms], [Trainer, () => trainers], [Nutritionist, () => nutritionists]]) {
    mock(Model, "find", (filter) => queryFor(getDocuments(), filter));
    mock(Model, "countDocuments", async (filter) => getDocuments().filter((document) => matches(document, filter)).length);
  }
});

test("default discovery returns only active approved/legacy records and a safe normalized card contract", async () => {
  const res = await discover();
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.pagination.total, 10);
  assert.ok(res.body.data.some((item) => item.name === "Legacy Published"));
  assert.ok(!res.body.data.some((item) => item.name.startsWith("Hidden")));
  const gym = res.body.data.find((item) => item.name === "Alpha Gym");
  assert.deepEqual(gym.subcategories, ["gyms", "hiit"]);
  assert.equal(gym.entityType, "gym");
  assert.equal(gym.location.city.slug, "delhi");
  assert.equal(gym.href, "/gym-detail/alpha-gym");
  for (const field of ["owner", "isActive", "moderationStatus", "moderationNote", "reviewedBy", "__v"]) assert.equal(field in gym, false);
});

test("Fitness taxonomy includes Gyms, the Personal Trainers class, and normal tag associations", async () => {
  const gymsResult = await discover({ category: "fitness", subcategory: "gyms" });
  assert.deepEqual(gymsResult.body.data.map((item) => item.name).sort(), ["Alpha Gym", "Fit Centre", "Legacy Gym", "Legacy Published"].sort());
  const professionals = await discover({ category: "fitness", subcategory: "personal-trainers" });
  assert.deepEqual(professionals.body.data.map((item) => item.name), ["Asha Trainer"]);
  const typed = await discover({ category: "fitness", subcategory: "personal-trainers", type: "trainer" });
  assert.deepEqual(typed.body.data.map((item) => item.entityType), ["trainer"]);
  const hiit = await discover({ category: "fitness", subcategory: "hiit" });
  assert.deepEqual(hiit.body.data.map((item) => item.name), ["Alpha Gym"]);
});

test("Wellness taxonomy includes tagged businesses and fixed Nutritionists without over-classifying professionals", async () => {
  assert.deepEqual((await discover({ category: "wellness", subcategory: "yoga" })).body.data.map((item) => item.name).sort(), ["Calm Wellness", "Yoga Professional"].sort());
  assert.deepEqual((await discover({ category: "wellness", subcategory: "meditation" })).body.data.map((item) => item.name), ["Calm Wellness"]);
  assert.deepEqual((await discover({ category: "wellness", subcategory: "nutrition" })).body.data.map((item) => item.name).sort(), ["Calm Wellness", "Nina Nutrition"].sort());
  assert.deepEqual((await discover({ category: "wellness", subcategory: "nutrition", type: "nutritionist" })).body.data.map((item) => item.name), ["Nina Nutrition"]);
  assert.deepEqual((await discover({ category: "wellness", subcategory: "yoga", type: "wellness_centre" })).body.data.map((item) => item.name), ["Calm Wellness"]);
});

test("Sports taxonomy and authoritative Coach/Sports Academy types intersect correctly", async () => {
  assert.deepEqual((await discover({ category: "sports", subcategory: "boxing" })).body.data.map((item) => item.name).sort(), ["Elite Coach", "Elite Sports"].sort());
  assert.deepEqual((await discover({ category: "sports", subcategory: "boxing", type: "coach" })).body.data.map((item) => item.name), ["Elite Coach"]);
  assert.deepEqual((await discover({ category: "sports", subcategory: "sports-academies", type: "sports_academy" })).body.data.map((item) => item.name), ["Elite Sports"]);
});

test("all listing type filters use owner/provider classification and generic Gym retains ownerless legacy data", async () => {
  const expected = {
    gym: ["Alpha Gym", "Legacy Gym", "Legacy Published"], fitness_centre: ["Fit Centre"], wellness_centre: ["Calm Wellness"],
    sports_academy: ["Elite Sports"], studio: [], trainer: ["Asha Trainer", "Yoga Professional"], coach: ["Elite Coach"], nutritionist: ["Nina Nutrition"],
  };
  for (const [type, names] of Object.entries(expected)) {
    assert.deepEqual((await discover({ type })).body.data.map((item) => item.name).sort(), names.sort(), type);
  }
});

test("venue entity returns every publishable Gym-model business while preserving type semantics", async () => {
  const venue = await discover({ entity: "venue" });
  assert.deepEqual(
    [...new Set(venue.body.data.map((item) => item.entityType))].sort(),
    ["fitness_centre", "gym", "sports_academy", "wellness_centre"].sort(),
  );
  assert.ok(venue.body.data.every((item) => ["gym", "fitness_centre", "wellness_centre", "sports_academy", "studio"].includes(item.entityType)));
  assert.ok(!venue.body.data.some((item) => ["trainer", "coach", "nutritionist"].includes(item.entityType)));
  assert.deepEqual((await discover({ entity: "venue", type: "gym" })).body.data.map((item) => item.name).sort(), ["Alpha Gym", "Legacy Gym", "Legacy Published"].sort());
  assert.equal((await discover({ entity: "venue", type: "trainer" })).statusCode, 400);
  assert.equal((await discover({ entity: "professional" })).statusCode, 400);
});

test("search is case-insensitive, regex-safe, model-aware, and intersects independent filters", async () => {
  assert.deepEqual((await discover({ search: "ALPHA" })).body.data.map((item) => item.name), ["Alpha Gym"]);
  assert.deepEqual((await discover({ search: "Saket" })).body.data.map((item) => item.name), ["Alpha Gym"]);
  assert.deepEqual((await discover({ search: "HIIT" })).body.data.map((item) => item.name), ["Alpha Gym"]);
  assert.deepEqual((await discover({ search: "clinical" })).body.data.map((item) => item.name), ["Nina Nutrition"]);
  assert.equal((await discover({ search: ".*" })).body.pagination.total, 0);
  assert.deepEqual((await discover({ search: "elite", category: "sports", subcategory: "boxing", type: "coach" })).body.data.map((item) => item.name), ["Elite Coach"]);
});

test("City uses canonical active slugs, filters only Gym-model records, and rejects unsupported professional combinations", async () => {
  const city = await discover({ city: "delhi" });
  assert.ok(city.body.data.length > 0);
  assert.ok(city.body.data.every((item) => ["gym", "fitness_centre", "wellness_centre", "sports_academy", "studio"].includes(item.entityType)));
  assert.equal((await discover({ city: "unknown" })).statusCode, 400);
  assert.equal((await discover({ city: "old-city" })).statusCode, 400);
  assert.equal((await discover({ city: "delhi", type: "trainer" })).statusCode, 400);
  assert.deepEqual((await discover({ city: "delhi", category: "sports", subcategory: "boxing" })).body.data.map((item) => item.name), ["Elite Sports"]);
});

test("invalid taxonomy/type combinations and malformed query values return field-level 400 responses", async () => {
  for (const query of [
    { category: "missing" }, { subcategory: "missing" }, { category: "fitness", subcategory: "boxing" },
    { category: "fitness", type: "nutritionist" }, { sort: "price_low" }, { page: "0" }, { limit: "51" },
    { search: "x".repeat(101) }, { unknown: "value" },
  ]) {
    const res = await discover(query);
    assert.equal(res.statusCode, 400, JSON.stringify(query));
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors?.[0]?.field);
  }
});

test("global mixed-model pagination has correct totals, stable order, and no duplicate IDs", async () => {
  const first = await discover({ page: "1", limit: "3", sort: "newest" });
  const second = await discover({ page: "2", limit: "3", sort: "newest" });
  assert.deepEqual(first.body.pagination, { page: 1, limit: 3, total: 10, totalPages: 4 });
  assert.deepEqual(first.body.data.map((item) => item.name), ["Nina Nutrition", "Asha Trainer", "Elite Coach"]);
  assert.deepEqual(second.body.data.map((item) => item.name), ["Alpha Gym", "Fit Centre", "Calm Wellness"]);
  const ids = [...first.body.data, ...second.body.data].map((item) => item.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual((await discover({ page: "1", limit: "3", sort: "newest" })).body.data.map((item) => item.id), first.body.data.map((item) => item.id));
});

test("every supported sort uses deterministic cross-model semantics", async () => {
  for (const sort of ["recommended", "rating", "reviews", "newest"]) {
    const one = await discover({ sort });
    const two = await discover({ sort });
    assert.deepEqual(one.body.data.map((item) => item.id), two.body.data.map((item) => item.id), sort);
    assert.equal(new Set(one.body.data.map((item) => item.id)).size, one.body.data.length);
  }
});

test("the production customer-search contract accepts explicit recommended sorting at limit 20", async () => {
  const res = await discover({ search: "gym", sort: "recommended", page: "1", limit: "20" });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length <= 20);
  assert.deepEqual(res.body.pagination, {
    page: 1,
    limit: 20,
    total: res.body.data.length,
    totalPages: res.body.data.length > 0 ? 1 : 0,
  });
});

test("legacy optional fields and missing provider records remain safe for every sort", async () => {
  gyms.push(base("Legacy Search Gym", null, 14, {
    featured: undefined,
    rating: null,
    reviewCount: null,
    createdAt: undefined,
    images: undefined,
    location: undefined,
  }));
  trainers.push(base("Orphan Trainer", { _id: oid() }, 15, {
    featured: undefined,
    rating: null,
    reviews: null,
    createdAt: undefined,
    image: undefined,
    role: undefined,
    specialty: undefined,
    experience: undefined,
  }));
  nutritionists.push(base("Legacy Nutritionist", null, 16, {
    featured: undefined,
    rating: null,
    reviews: null,
    createdAt: undefined,
    image: undefined,
    role: undefined,
    specialty: undefined,
    experience: undefined,
  }));

  for (const sort of ["recommended", "rating", "reviews", "newest"]) {
    const first = await discover({ sort, page: "1", limit: "20" });
    const second = await discover({ sort, page: "1", limit: "20" });
    assert.equal(first.statusCode, 200, sort);
    assert.equal(first.body.success, true, sort);
    assert.ok(first.body.data.length <= 20, sort);
    assert.deepEqual(first.body.data.map((item) => item.id), second.body.data.map((item) => item.id), sort);
    assert.ok(first.body.data.some((item) => item.name === "Legacy Search Gym"), sort);
    assert.ok(first.body.data.some((item) => item.name === "Orphan Trainer"), sort);
    assert.ok(first.body.data.some((item) => item.name === "Legacy Nutritionist"), sort);
  }
});
