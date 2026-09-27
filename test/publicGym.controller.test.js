import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { getFeaturedGyms, getGymBySlug, getGyms, getGymsByCategory } from "../src/controllers/gyms/gym.controller.js";
import Gym from "../src/models/gyms/Gym.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
function listQuery(value) { return { sort() { return this; }, limit() { return this; }, lean: async () => value }; }

const fixture = {
  _id: new mongoose.Types.ObjectId(), name: "Public Gym", slug: "public-gym", verified: true,
  category: "Fitness", tags: ["strength"], location: { area: "Central" }, coordinates: { lat: 1, lng: 2 },
  phone: "123", email: "gym@example.com", website: "https://example.com", description: "Description",
  highlights: ["24/7"], rating: 4.8, reviewCount: 42, priceFrom: 999, openNow: true,
  images: { cover: "cover.jpg", coverMeta: { publicId: "private-cover", width: 1600 }, gallery: [{ id: "private-id", url: "gallery.jpg", alt: "Gallery", category: "gym", publicId: "private-gallery", width: 1200 }] }, facilities: [], memberships: [], trainers: [], classes: [], timings: [],
  reviews: [], ratingBreakdown: [], isActive: true, featured: true, city: new mongoose.Types.ObjectId(),
  owner: new mongoose.Types.ObjectId(), moderationStatus: "approved", rejectionReason: "private",
  moderationNote: "private", reviewedAt: new Date(), reviewedBy: new mongoose.Types.ObjectId(), __v: 7,
};

function assertPublicShape(gym) {
  for (const field of ["name", "slug", "verified", "category", "location", "coordinates", "facilities", "memberships", "trainers", "classes", "timings", "featured", "city"]) assert.deepEqual(gym[field], fixture[field]);
  assert.deepEqual(gym.images, { cover: "cover.jpg", gallery: [{ url: "gallery.jpg", alt: "Gallery", category: "gym" }] });
  for (const field of ["owner", "moderationStatus", "rejectionReason", "moderationNote", "reviewedAt", "reviewedBy", "isActive", "__v"]) assert.equal(field in gym, false);
}

test("all public Gym endpoints apply the safe response contract", { concurrency: false }, async (t) => {
  await t.test("featured", async () => {
    mock(Gym, "find", () => listQuery([fixture]));
    const res = response(); await getFeaturedGyms({ query: {} }, res);
    assert.equal(res.statusCode, 200); assertPublicShape(res.body.data[0]);
  });
  await t.test("detail", async () => {
    mock(Gym, "findOne", () => ({ lean: async () => fixture }));
    const res = response(); await getGymBySlug({ params: { slug: "PUBLIC-GYM" } }, res);
    assert.equal(res.statusCode, 200); assertPublicShape(res.body.data);
  });
  await t.test("category", async () => {
    mock(Gym, "find", () => listQuery([fixture]));
    const res = response(); await getGymsByCategory({ params: { category: "fitness" } }, res);
    assert.equal(res.statusCode, 200); assertPublicShape(res.body.data[0]);
  });
  await t.test("list", async () => {
    mock(Gym, "find", () => listQuery([fixture]));
    const res = response(); await getGyms({ query: {} }, res);
    assert.equal(res.statusCode, 200); assertPublicShape(res.body.data[0]);
  });
});

test("category filtering escapes regex metacharacters without changing ordinary input", { concurrency: false }, async (t) => {
  await t.test("route parameter", async () => {
    let filter;
    mock(Gym, "find", (value) => { filter = value; return listQuery([]); });
    const res = response(); await getGymsByCategory({ params: { category: "C++.(test)*[x]" } }, res);
    assert.equal(filter.$or[0].category.$regex, "^C\\+\\+\\.\\(test\\)\\*\\[x\\]$");
    assert.equal(filter.$or[1].tags.$regex, "C\\+\\+\\.\\(test\\)\\*\\[x\\]");
  });
  await t.test("query string and ordinary category", async () => {
    let filter;
    mock(Gym, "find", (value) => { filter = value; return listQuery([]); });
    const res = response(); await getGyms({ query: { category: "boxing" } }, res);
    assert.equal(filter.$or[0].category.$regex, "^boxing$");
    assert.equal(filter.$or[1].tags.$regex, "boxing");
  });
});
