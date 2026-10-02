import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Category from "../src/models/categories/Category.js";
import City from "../src/models/cities/City.js";
import { getCategories, getCategoryBySlug } from "../src/controllers/categories/category.controller.js";
import { getActiveCities, getPopularCities } from "../src/controllers/cities/city.controller.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function sortedLean(value) { return { sort() { return this; }, lean: async () => value }; }

test("public Categories contract remains active-only and hierarchically nested", { concurrency: false }, async () => {
  const main = { _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness", type: "main", parentCategory: null, isActive: true };
  const sub = { _id: new mongoose.Types.ObjectId(), name: "Gyms", slug: "gyms", type: "subcategory", parentCategory: main._id, isActive: true };
  const filters = [];
  mock(Category, "find", (filter) => { filters.push(filter); return sortedLean(filters.length === 1 ? [main] : [sub]); });
  const res = response(); await getCategories({}, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.count, 1); assert.equal(res.body.data[0].subcategories[0].slug, "gyms");
  assert.equal(filters[0].isActive, true); assert.equal(filters[1].isActive, true);
});

test("public Category detail keeps its response wrapper and active subcategory filter", { concurrency: false }, async () => {
  const main = { _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness", type: "main", isActive: true };
  let detailFilter; let childFilter;
  mock(Category, "findOne", (filter) => { detailFilter = filter; return { lean: async () => main }; });
  mock(Category, "find", (filter) => { childFilter = filter; return sortedLean([]); });
  const res = response(); await getCategoryBySlug({ params: { slug: "fitness" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data.slug, "fitness"); assert.deepEqual(res.body.data.subcategories, []);
  assert.deepEqual(detailFilter, { slug: "fitness", isActive: true }); assert.equal(childFilter.isActive, true);
});

test("public Popular Cities keeps its shape, order and live publishable Gym count", { concurrency: false }, async () => {
  let pipeline;
  mock(City, "aggregate", async (value) => { pipeline = value; return [{ _id: new mongoose.Types.ObjectId(), name: "Pune", slug: "pune", state: "Maharashtra", country: "India", image: {}, gymCount: 3 }]; });
  const res = response(); await getPopularCities({}, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data[0].gymCount, "3+");
  assert.deepEqual(pipeline[0].$match, { isActive: true, isPopular: true });
  const gymMatch = pipeline[1].$lookup.pipeline[0].$match;
  assert.equal(gymMatch.isActive, true); assert.deepEqual(gymMatch.moderationStatus, { $nin: ["pending", "rejected"] });
  assert.deepEqual(pipeline[3].$sort, { order: 1 });
});

test("active City reference endpoint supports Admin and Provider Gym selectors", { concurrency: false }, async () => {
  let filter; let selection;
  mock(City, "find", (value) => { filter = value; return { sort() { return this; }, select(valueToSelect) { selection = valueToSelect; return this; }, lean: async () => [{ _id: new mongoose.Types.ObjectId(), name: "Pune", slug: "pune" }] }; });
  const res = response(); await getActiveCities({}, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data[0].name, "Pune");
  assert.deepEqual(filter, { isActive: true }); assert.match(selection, /name slug state/);
});
