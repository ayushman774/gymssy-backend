import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import router from "../src/routes/admin/admin.routes.js";
import authMiddleware from "../src/middleware/auth.middleware.js";
import adminMiddleware from "../src/middleware/auth/adminMiddleware.js";
import Category from "../src/models/categories/Category.js";
import City from "../src/models/cities/City.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Experience from "../src/models/experiences/Experience.js";
import {
  createAdminCategory,
  createAdminCity,
  deleteAdminCategory,
  deleteAdminCity,
  getAdminCategories,
  getAdminCities,
  updateAdminCategory,
  updateAdminCity,
} from "../src/controllers/admin/adminMarketplaceSetup.controller.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function sortedLean(value) { return { sort() { return this; }, lean: async () => value }; }

function document(values) {
  return { ...values, async save() { this.saved = true; return this; }, async deleteOne() { this.deleted = true; } };
}

test("Marketplace Setup routes require existing auth and Admin middleware", () => {
  const setupLayers = router.stack.filter((layer) => layer.route && ["/categories", "/categories/:id", "/cities", "/cities/:id"].includes(layer.route.path));
  assert.equal(setupLayers.length, 10);
  for (const layer of setupLayers) {
    const handlers = layer.route.stack.map((item) => item.handle);
    assert.equal(handlers[0], authMiddleware);
    assert.equal(handlers[1], adminMiddleware);
  }
});

test("Admin Category list returns a hierarchy including inactive records", { concurrency: false }, async () => {
  const mainId = new mongoose.Types.ObjectId();
  mock(Category, "find", () => sortedLean([
    { _id: mainId, name: "Fitness", type: "main", parentCategory: null, isActive: true },
    { _id: new mongoose.Types.ObjectId(), name: "Gyms", type: "subcategory", parentCategory: mainId, isActive: false },
  ]));
  const res = response(); await getAdminCategories({}, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.count, 2);
  assert.equal(res.body.data[0].subcategories[0].name, "Gyms");
  assert.equal(res.body.data[0].subcategories[0].isActive, false);
});

test("Admin creates normalized Categories and rejects unsupported fields", { concurrency: false }, async (t) => {
  mock(Category, "exists", async () => null);
  let created;
  mock(Category, "create", async (payload) => { created = payload; return payload; });
  await t.test("create", async () => {
    const res = response(); await createAdminCategory({ body: { name: "  Recovery  ", slug: "  RECOVERY  ", type: "main", description: "  Restore  " } }, res);
    assert.equal(res.statusCode, 201); assert.equal(created.slug, "recovery"); assert.equal(created.name, "Recovery"); assert.equal(created.parentCategory, null);
  });
  await t.test("unsupported", async () => {
    const res = response(); await createAdminCategory({ body: { name: "X", slug: "x", type: "main", createdAt: "forged" } }, res);
    assert.equal(res.statusCode, 400); assert.deepEqual(res.body.unsupportedFields, ["createdAt"]);
  });
});

test("Category duplicate slugs and referenced identity changes are blocked", { concurrency: false }, async (t) => {
  const id = new mongoose.Types.ObjectId();
  await t.test("duplicate", async () => {
    mock(Category, "exists", async () => ({ _id: new mongoose.Types.ObjectId() }));
    const res = response(); await createAdminCategory({ body: { name: "Yoga", slug: "yoga", type: "main" } }, res);
    assert.equal(res.statusCode, 409); assert.equal(res.body.field, "slug");
  });
  await t.test("referenced rename", async () => {
    const item = document({ _id: id, name: "Fitness", slug: "fitness", type: "main" });
    mock(Category, "findById", async () => item); mock(Category, "exists", async () => null);
    mock(Gym, "countDocuments", async () => 2); mock(Trainer, "countDocuments", async () => 1); mock(Category, "countDocuments", async () => 3);
    const res = response(); await updateAdminCategory({ params: { id: String(id) }, body: { name: "Movement" } }, res);
    assert.equal(res.statusCode, 409); assert.equal(res.body.references.total, 6); assert.equal(item.saved, undefined);
  });
});

test("Category metadata edits are safe and referenced deletion is blocked", { concurrency: false }, async (t) => {
  const id = new mongoose.Types.ObjectId();
  await t.test("metadata", async () => {
    const item = document({ _id: id, name: "Fitness", slug: "fitness", type: "main", description: "Old" });
    mock(Category, "findById", async () => item);
    const res = response(); await updateAdminCategory({ params: { id: String(id) }, body: { description: " Updated ", isActive: false, order: 4 } }, res);
    assert.equal(res.statusCode, 200); assert.equal(item.description, "Updated"); assert.equal(item.isActive, false); assert.equal(item.saved, true);
  });
  await t.test("delete conflict", async () => {
    const item = document({ _id: id, name: "Boxing", slug: "boxing", type: "subcategory" });
    mock(Category, "findById", async () => item); mock(Gym, "countDocuments", async () => 1); mock(Trainer, "countDocuments", async () => 0); mock(Experience, "countDocuments", async () => 2);
    const res = response(); await deleteAdminCategory({ params: { id: String(id) } }, res);
    assert.equal(res.statusCode, 409); assert.equal(res.body.references.total, 3); assert.equal(item.deleted, undefined);
  });
});

test("Admin City list exposes live Gym counts and create normalizes identity", { concurrency: false }, async (t) => {
  await t.test("list", async () => {
    mock(City, "aggregate", async (pipeline) => { assert.equal(pipeline[0].$lookup.from, "gyms"); return [{ name: "Pune", gymCount: 4 }]; });
    const res = response(); await getAdminCities({}, res); assert.equal(res.statusCode, 200); assert.equal(res.body.data[0].gymCount, 4);
  });
  await t.test("create", async () => {
    mock(City, "exists", async () => null); let created;
    mock(City, "create", async (payload) => { created = payload; return payload; });
    const res = response(); await createAdminCity({ body: { name: "  New Delhi ", slug: " NEW-DELHI ", state: " Delhi ", country: " India ", isPopular: true } }, res);
    assert.equal(res.statusCode, 201); assert.equal(created.slug, "new-delhi"); assert.equal(created.state, "Delhi");
  });
});

test("referenced City slug changes/deletion are blocked while metadata and status remain editable", { concurrency: false }, async (t) => {
  const id = new mongoose.Types.ObjectId();
  await t.test("slug", async () => {
    const item = document({ _id: id, name: "Pune", slug: "pune", state: "Maharashtra" });
    mock(City, "findById", async () => item); mock(City, "exists", async () => null); mock(Gym, "countDocuments", async () => 5);
    const res = response(); await updateAdminCity({ params: { id: String(id) }, body: { slug: "pune-city" } }, res);
    assert.equal(res.statusCode, 409); assert.equal(res.body.references.gyms, 5);
  });
  await t.test("metadata", async () => {
    const item = document({ _id: id, name: "Pune", slug: "pune", state: "Maharashtra" });
    mock(City, "findById", async () => item);
    const res = response(); await updateAdminCity({ params: { id: String(id) }, body: { isPopular: false, isActive: false, order: 9 } }, res);
    assert.equal(res.statusCode, 200); assert.equal(item.isActive, false); assert.equal(item.saved, true);
  });
  await t.test("delete", async () => {
    const item = document({ _id: id, name: "Pune", slug: "pune" });
    mock(City, "findById", async () => item); mock(Gym, "countDocuments", async () => 5);
    const res = response(); await deleteAdminCity({ params: { id: String(id) } }, res);
    assert.equal(res.statusCode, 409); assert.equal(item.deleted, undefined);
  });
});

test("unreferenced Category and City can be deleted without cascading", { concurrency: false }, async () => {
  const categoryId = new mongoose.Types.ObjectId(); const cityId = new mongoose.Types.ObjectId();
  const category = document({ _id: categoryId, name: "Unused", slug: "unused", type: "subcategory" });
  const city = document({ _id: cityId, name: "Unused City", slug: "unused-city" });
  mock(Category, "findById", async () => category); mock(City, "findById", async () => city);
  mock(Gym, "countDocuments", async () => 0); mock(Trainer, "countDocuments", async () => 0); mock(Experience, "countDocuments", async () => 0);
  let res = response(); await deleteAdminCategory({ params: { id: String(categoryId) } }, res); assert.equal(res.statusCode, 200); assert.equal(category.deleted, true);
  res = response(); await deleteAdminCity({ params: { id: String(cityId) } }, res); assert.equal(res.statusCode, 200); assert.equal(city.deleted, true);
});
