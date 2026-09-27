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
  };
  mock(Gym, "findById", () => queryResult(doc));
  const res = response(); await getAdminListingById({ params: { type: "gym", id: doc._id.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.data.city, { id: cityId, name: "Gurugram", slug: "gurugram", state: "Haryana", country: "India" });
  assert.deepEqual(res.body.data.owner, { id: ownerId, name: "Owner", email: "owner@example.com", providerType: "gym_owner", isActive: true });
});

test("admin Gym detail safely supports legacy null City and owner", { concurrency: false }, async () => {
  const doc = { _id: new mongoose.Types.ObjectId(), name: "Legacy Gym", city: null, owner: null };
  mock(Gym, "findById", () => queryResult(doc));
  const res = response(); await getAdminListingById({ params: { type: "gym", id: doc._id.toString() } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.city, null);
  assert.equal(res.body.data.owner, null);
});
