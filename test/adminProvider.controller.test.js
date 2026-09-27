import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  updateProviderProfile,
  updateProviderStatus,
  updateProviderVerification,
} from "../src/controllers/admin/admin.controller.js";
import User from "../src/models/users/User.js";
import ProviderProfile from "../src/models/providers/ProviderProfile.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";

const originals = [];

function mock(target, property, value) {
  originals.push([target, property, target[property]]);
  target[property] = value;
}

afterEach(() => {
  while (originals.length > 0) {
    const [target, property, value] = originals.pop();
    target[property] = value;
  }
});

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function request(id, body) {
  return { params: { id: id.toString() }, body };
}

function mockBusinessProvider(providerId) {
  const provider = {
    _id: providerId,
    name: "Provider",
    email: "provider@example.com",
    phone: "1111111111",
    role: "business",
    providerType: "trainer",
    isActive: true,
  };
  mock(User, "findOne", async () => provider);
  return provider;
}

test("admin updates only allowed ProviderProfile fields and preserves nested values", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  mockBusinessProvider(providerId);
  let updateCall;
  mock(ProviderProfile, "findOneAndUpdate", async (...args) => {
    updateCall = args;
    return {
      user: providerId,
      businessName: "New Business",
      location: { address: "New address", area: "Existing area" },
      socialLinks: { facebook: "https://facebook.com/new", instagram: "existing-instagram" },
    };
  });

  const res = response();
  await updateProviderProfile(
    request(providerId, {
      businessName: "  New Business  ",
      location: { address: "  New address  " },
      socialLinks: { facebook: "  https://facebook.com/new  " },
    }),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.deepEqual(updateCall[0], { user: providerId });
  assert.deepEqual(updateCall[1].$set, {
    businessName: "New Business",
    "location.address": "New address",
    "socialLinks.facebook": "https://facebook.com/new",
  });
  assert.equal(updateCall[1].$set["socialLinks.instagram"], undefined);
  assert.equal(updateCall[1].$set["location.area"], undefined);
  assert.equal(updateCall[2].upsert, true);
  assert.equal(res.body.data.profileExists, true);
});

for (const field of ["email", "phone", "role", "providerType"]) {
  test(`admin profile update rejects ${field}`, { concurrency: false }, async () => {
    const providerId = new mongoose.Types.ObjectId();
    const res = response();

    await updateProviderProfile(request(providerId, { [field]: "changed" }), res);

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body.unsupportedFields, [field]);
  });
}

test("admin profile update rejects Instagram and avatar rather than erasing them", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  const res = response();

  await updateProviderProfile(
    request(providerId, {
      avatar: { url: "replacement" },
      socialLinks: { instagram: "replacement" },
    }),
    res,
  );

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, ["avatar", "socialLinks.instagram"]);
});

test("admin update safely creates a missing ProviderProfile", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  mockBusinessProvider(providerId);
  let options;
  mock(ProviderProfile, "findOneAndUpdate", async (_filter, _update, receivedOptions) => {
    options = receivedOptions;
    return { user: providerId, businessName: "Created by admin" };
  });
  const res = response();

  await updateProviderProfile(
    request(providerId, { businessName: "Created by admin" }),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(options.upsert, true);
  assert.equal(options.setDefaultsOnInsert, true);
  assert.equal(res.body.data.profile.businessName, "Created by admin");
});

test("provider verification uses the dedicated admin contract", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  mockBusinessProvider(providerId);
  let update;
  mock(ProviderProfile, "findOneAndUpdate", async (_filter, receivedUpdate) => {
    update = receivedUpdate;
    return { user: providerId, isVerified: true };
  });
  const res = response();

  await updateProviderVerification(request(providerId, { isVerified: true }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(update.$set, { isVerified: true });
  assert.equal(res.body.data.profile.isVerified, true);

  const profileRes = response();
  await updateProviderProfile(
    request(providerId, { isVerified: false }),
    profileRes,
  );
  assert.equal(profileRes.statusCode, 400);
  assert.deepEqual(profileRes.body.unsupportedFields, ["isVerified"]);
});

test("deactivating a provider deactivates only listings with that owner", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  const provider = { _id: providerId, isActive: false };
  mock(User, "findOneAndUpdate", () => ({ select: async () => provider }));
  const calls = [];
  for (const model of [Gym, Trainer, Nutritionist]) {
    mock(model, "updateMany", async (filter, update) => {
      calls.push({ filter, update });
      return { modifiedCount: 1 };
    });
  }
  const res = response();

  await updateProviderStatus(request(providerId, { isActive: false }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.affectedListings, 3);
  assert.equal(calls.length, 3);
  for (const call of calls) {
    assert.deepEqual(call.filter, { owner: providerId.toString() });
    assert.deepEqual(call.update, { isActive: false });
    assert.notDeepEqual(call.filter, { owner: null });
  }
});

test("reactivating a provider does not reactivate listings", { concurrency: false }, async () => {
  const providerId = new mongoose.Types.ObjectId();
  const provider = { _id: providerId, isActive: true };
  mock(User, "findOneAndUpdate", () => ({ select: async () => provider }));
  let listingUpdates = 0;
  for (const model of [Gym, Trainer, Nutritionist]) {
    mock(model, "updateMany", async () => {
      listingUpdates += 1;
      return { modifiedCount: 0 };
    });
  }
  const res = response();

  await updateProviderStatus(request(providerId, { isActive: true }), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.affectedListings, 0);
  assert.equal(listingUpdates, 0);
});
