import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  createProviderListing,
  updateMyProviderListing,
  deleteMyProviderListing,
} from "../src/controllers/providers/providerListing.controller.js";
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

function request(providerType, body = {}, params = {}) {
  return {
    body,
    params,
    user: {
      id: new mongoose.Types.ObjectId(),
      role: "business",
      providerType,
    },
  };
}

function stubSuccessfulCreate(model, extra = {}) {
  mock(model, "exists", async () => false);
  mock(model, "create", async (data) => ({ _id: new mongoose.Types.ObjectId(), ...data }));
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => [{ name: "Strength Coach" }] }));
  for (const [target, property, value] of extra.mocks || []) {
    mock(target, property, value);
  }
}

const professionalBody = {
  name: "  Alex Example  ",
  slug: "  Alex-Example  ",
  role: "  Strength Coach  ",
  specialty: "  Strength  ",
  experience: "  8 years  ",
  sessions: "  500+  ",
  clients: "  120  ",
};

test("creates a Gym with validated city and forced system defaults", { concurrency: false }, async () => {
  stubSuccessfulCreate(Gym, { mocks: [[City, "exists", async () => true]] });
  const city = new mongoose.Types.ObjectId().toString();
  const req = request("gym_owner", {
    name: "  Elite Gym  ",
    slug: "  Elite-Gym  ",
    category: "  Fitness  ",
    city,
  });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.listing.name, "Elite Gym");
  assert.equal(res.body.data.listing.slug, "elite-gym");
  assert.equal(res.body.data.listing.category, "Fitness");
  assert.equal(res.body.data.listing.owner, req.user.id);
  assert.equal(res.body.data.listing.verified, false);
  assert.equal(res.body.data.listing.featured, false);
  assert.equal(res.body.data.listing.isActive, true);
  assert.equal(res.body.data.listing.moderationStatus, "pending");
});

for (const providerType of ["trainer", "coach"]) {
  test(`creates a ${providerType} Trainer listing`, { concurrency: false }, async () => {
    stubSuccessfulCreate(Trainer);
    const req = request(providerType, { ...professionalBody });
    const res = response();

    await createProviderListing(req, res);

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.type, "trainer");
    assert.equal(res.body.data.providerType, providerType);
    assert.match(res.body.data.listing.id, /^trainer-[0-9a-f-]{36}$/);
    assert.equal(res.body.data.listing.slug, "alex-example");
    assert.equal(res.body.data.listing.role, "Strength Coach");
    assert.equal(res.body.data.listing.isVerified, false);
    assert.equal(res.body.data.listing.featured, false);
    assert.equal(res.body.data.listing.isActive, true);
    assert.equal(res.body.data.listing.moderationStatus, "pending");
  });
}

test("creates a Nutritionist listing", { concurrency: false }, async () => {
  stubSuccessfulCreate(Nutritionist);
  const req = request("nutritionist", { ...professionalBody });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.type, "nutritionist");
  assert.match(res.body.data.listing.id, /^nutritionist-[0-9a-f-]{36}$/);
  assert.equal(res.body.data.listing.moderationStatus, "pending");
  assert.equal(res.body.data.listing.isVerified, false);
  assert.equal(res.body.data.listing.featured, false);
  assert.equal(res.body.data.listing.isActive, true);
});

test("returns field-level errors for missing professional fields", { concurrency: false }, async () => {
  const req = request("trainer", { name: "Alex", slug: "alex" });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(
    res.body.errors.map(({ field }) => field),
    ["role", "specialty", "experience", "sessions", "clients"],
  );
});

test("rejects unsupported fields instead of silently discarding them", { concurrency: false }, async () => {
  const req = request("nutritionist", { ...professionalBody, description: "Not bio" });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, ["description"]);
});

test("rejects provider writes to system-controlled fields", { concurrency: false }, async () => {
  const req = request("trainer", {
    ...professionalBody,
    owner: new mongoose.Types.ObjectId(),
    isVerified: true,
    featured: true,
    rating: 5,
    reviews: 10,
    isActive: false,
    createdAt: new Date().toISOString(),
  });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, [
    "owner",
    "isVerified",
    "featured",
    "rating",
    "reviews",
    "isActive",
    "createdAt",
  ]);
});

test("rejects moderation fields during provider creation", { concurrency: false }, async () => {
  const req = request("trainer", {
    ...professionalBody,
    moderationStatus: "approved",
    rejectionReason: "Provider supplied",
    moderationNote: "Provider supplied",
    reviewedAt: new Date().toISOString(),
    reviewedBy: new mongoose.Types.ObjectId().toString(),
  });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, [
    "moderationStatus",
    "rejectionReason",
    "moderationNote",
    "reviewedAt",
    "reviewedBy",
  ]);
});

test("rejects an invalid Gym city id", { concurrency: false }, async () => {
  mock(Gym, "exists", async () => false);
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => [] }));
  const req = request("gym_owner", {
    name: "Gym",
    slug: "gym",
    category: "fitness",
    city: "not-an-object-id",
  });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errors[0].field, "city");
});

test("rejects a nonexistent Gym city", { concurrency: false }, async () => {
  mock(City, "exists", async () => null);
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => [] }));
  const req = request("gym_owner", {
    name: "Gym",
    slug: "gym",
    category: "fitness",
    city: new mongoose.Types.ObjectId().toString(),
  });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errors[0].message, "Referenced city does not exist");
});

test("returns 409 for a duplicate slug", { concurrency: false }, async () => {
  mock(Trainer, "exists", async () => true);
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Fitness", slug: "fitness" }) }));
  mock(Category, "find", () => ({ lean: async () => [{ name: "Strength Coach" }] }));
  const req = request("trainer", { ...professionalBody });
  const res = response();

  await createProviderListing(req, res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.field, "slug");
});

test("prevents updating a listing not owned by the provider", { concurrency: false }, async () => {
  mock(Trainer, "findOne", async () => null);
  const req = request("trainer", { bio: "Updated" }, { id: new mongoose.Types.ObjectId().toString() });
  const res = response();

  await updateMyProviderListing(req, res);

  assert.equal(res.statusCode, 404);
});

test("rejects professional id changes", { concurrency: false }, async () => {
  const req = request("trainer", { id: "replacement-id" }, { id: new mongoose.Types.ObjectId().toString() });
  const res = response();

  await updateMyProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, ["id"]);
});

test("rejects moderation fields during provider update", { concurrency: false }, async () => {
  const req = request(
    "nutritionist",
    {
      moderationStatus: "approved",
      rejectionReason: "Provider supplied",
      moderationNote: "Provider supplied",
      reviewedAt: new Date().toISOString(),
      reviewedBy: new mongoose.Types.ObjectId().toString(),
    },
    { id: new mongoose.Types.ObjectId().toString() },
  );
  const res = response();

  await updateMyProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body.unsupportedFields, [
    "moderationStatus",
    "rejectionReason",
    "moderationNote",
    "reviewedAt",
    "reviewedBy",
  ]);
});

test("performs a successful partial update", { concurrency: false }, async () => {
  const listing = {
    _id: new mongoose.Types.ObjectId(),
    ...professionalBody,
    name: "Alex Example",
    slug: "alex-example",
    async save() {},
  };
  mock(Trainer, "findOne", async () => listing);
  const req = request("trainer", { bio: "  Updated biography  " }, { id: listing._id.toString() });
  const res = response();

  await updateMyProviderListing(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.listing.bio, "  Updated biography  ");
});

test("provider Gym JSON media updates cannot forge managed metadata", { concurrency: false }, async () => {
  const listing = {
    _id: new mongoose.Types.ObjectId(), name: "Gym", slug: "gym", category: "Fitness", city: new mongoose.Types.ObjectId(),
    images: { cover: "legacy-old.jpg", coverMeta: { publicId: "", width: null }, gallery: [] }, async save() {},
  };
  mock(Gym, "findOne", async () => listing);
  const req = request("gym_owner", { images: {
    cover: "legacy-new.jpg", coverMeta: { publicId: "forged-cover" },
    gallery: [{ id: "forged-id", url: "legacy-gallery.jpg", alt: "A", category: "gym", publicId: "forged-gallery", width: 999 }],
  } }, { id: listing._id.toString() });
  const res = response(); await updateMyProviderListing(req, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(listing.images.coverMeta, { publicId: "", width: null, height: null, format: "" });
  assert.deepEqual(listing.images.gallery, [{ url: "legacy-gallery.jpg", alt: "A", category: "gym" }]);
});

test("provider Gym JSON updates cannot replace existing managed media", { concurrency: false }, async () => {
  const listing = { _id: new mongoose.Types.ObjectId(), name: "Gym", slug: "gym", category: "Fitness", city: new mongoose.Types.ObjectId(), images: { cover: "managed.jpg", coverMeta: { publicId: "managed-cover" }, gallery: [{ url: "gallery.jpg", publicId: "managed-gallery" }] }, async save() {} };
  mock(Gym, "findOne", async () => listing);
  let req = request("gym_owner", { images: { cover: "replacement.jpg" } }, { id: listing._id.toString() }); let res = response(); await updateMyProviderListing(req, res); assert.equal(res.statusCode, 400); assert.equal(res.body.field, "images.cover");
  req = request("gym_owner", { images: { gallery: [] } }, { id: listing._id.toString() }); res = response(); await updateMyProviderListing(req, res); assert.equal(res.statusCode, 400); assert.equal(res.body.field, "images.gallery");
});

test("rejects blanking a required field during update", { concurrency: false }, async () => {
  const listing = {
    _id: new mongoose.Types.ObjectId(),
    ...professionalBody,
    name: "Alex Example",
    slug: "alex-example",
    async save() {},
  };
  mock(Trainer, "findOne", async () => listing);
  const req = request("trainer", { specialty: "   " }, { id: listing._id.toString() });
  const res = response();

  await updateMyProviderListing(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.errors[0].field, "specialty");
});

test("deactivates an owned provider listing", { concurrency: false }, async () => {
  let saved = false;
  const listing = {
    _id: new mongoose.Types.ObjectId(),
    isActive: true,
    async save() {
      saved = true;
    },
  };
  mock(Gym, "findOne", async () => listing);
  const req = request("gym_owner", {}, { id: listing._id.toString() });
  const res = response();

  await deleteMyProviderListing(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(listing.isActive, false);
  assert.equal(saved, true);
});
