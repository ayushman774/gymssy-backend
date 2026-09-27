import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Gym from "../src/models/gyms/Gym.js";
import { createAdminGymMediaHandlers } from "../src/controllers/admin/adminGymMedia.controller.js";
import { GYM_GALLERY_MAX_ITEMS, ensureGymGalleryIds, toAdminGymImages } from "../src/utils/gymMedia.js";
import { GYM_MEDIA_MAX_BYTES, gymMediaFileFilter } from "../src/middleware/uploads/gymMediaUpload.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
function response() { return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
const uploaded = { url: "https://res.cloudinary.com/demo/new.webp", publicId: "gymssy/gyms/id/new", width: 1600, height: 900, format: "webp" };
function gym(overrides = {}) { return { _id: new mongoose.Types.ObjectId(), images: { cover: "https://legacy/cover.jpg", coverMeta: { publicId: "" }, gallery: [] }, async save() {}, ...overrides }; }
function request(gym, extra = {}) { return { params: { id: gym._id.toString(), ...(extra.params || {}) }, file: extra.file, body: extra.body || {} }; }
function handlers(gym, options = {}) { mock(Gym, "findById", async () => gym); return createAdminGymMediaHandlers({ uploadImage: options.uploadImage || (async () => uploaded), deleteImage: options.deleteImage || (async () => {}), getDetail: async () => ({ _id: gym._id, images: toAdminGymImages(gym) }) }); }

test("Gym schema remains compatible with legacy and managed media", async () => {
  const legacy = new Gym({ name: "Legacy", slug: "legacy", category: "Fitness", city: new mongoose.Types.ObjectId(), images: { cover: "https://legacy", gallery: [{ url: "https://legacy/g.jpg", alt: "A", category: "gym" }] } });
  assert.equal(legacy.images.cover, "https://legacy"); assert.equal(legacy.images.gallery[0].url, "https://legacy/g.jpg");
  const managed = new Gym({ name: "Managed", slug: "managed", category: "Fitness", city: new mongoose.Types.ObjectId(), images: { cover: uploaded.url, coverMeta: uploaded, gallery: [{ id: "item-1", ...uploaded, alt: "A", category: "inside" }] } });
  assert.equal(managed.images.coverMeta.publicId, uploaded.publicId); assert.equal(managed.images.gallery[0].publicId, uploaded.publicId);
});

test("cover upload persists new media before deleting an old managed cover", { concurrency: false }, async () => {
  const listing = gym({ images: { cover: "old", coverMeta: { publicId: "managed-old" }, gallery: [] } }); const order = [];
  listing.save = async () => order.push("save");
  const h = handlers(listing, { uploadImage: async (_buffer, options) => { order.push("upload"); assert.match(options.folder, new RegExp(`${listing._id}/cover$`)); assert.equal(options.transformation[0].width, 1600); return uploaded; }, deleteImage: async (id) => order.push(`delete:${id}`) });
  const res = response(); await h.uploadCover(request(listing, { file: { buffer: Buffer.from("image") } }), res);
  assert.equal(res.statusCode, 200); assert.deepEqual(order, ["upload", "save", "delete:managed-old"]); assert.equal(listing.images.cover, uploaded.url); assert.equal(res.body.data.images.coverManaged, true);
});

test("cover replacement never deletes legacy URLs and cleans a new upload after DB failure", { concurrency: false }, async (t) => {
  await t.test("legacy", async () => { const listing = gym(); let deletes = 0; const h = handlers(listing, { deleteImage: async () => { deletes += 1; } }); const res = response(); await h.uploadCover(request(listing, { file: { buffer: Buffer.from("x") } }), res); assert.equal(res.statusCode, 200); assert.equal(deletes, 0); });
  await t.test("failed save", async () => { const listing = gym(); listing.save = async () => { throw new Error("db"); }; const deleted = []; const h = handlers(listing, { deleteImage: async (id) => deleted.push(id) }); const res = response(); await h.uploadCover(request(listing, { file: { buffer: Buffer.from("x") } }), res); assert.equal(res.statusCode, 500); assert.deepEqual(deleted, [uploaded.publicId]); });
  await t.test("old cleanup failure", async () => { const listing = gym({ images: { cover: "old", coverMeta: { publicId: "old-managed" }, gallery: [] } }); const h = handlers(listing, { deleteImage: async () => { throw new Error("cleanup"); } }); const res = response(); await h.uploadCover(request(listing, { file: { buffer: Buffer.from("x") } }), res); assert.equal(res.statusCode, 200); assert.equal(listing.images.cover, uploaded.url); });
});

test("cover removal clears persistence before managed deletion and is safe for legacy/no-cover", { concurrency: false }, async (t) => {
  for (const [name, publicId, expectedDeletes] of [["managed", "managed-old", 1], ["legacy", "", 0], ["empty", "", 0]]) await t.test(name, async () => {
    const listing = gym({ images: { cover: name === "empty" ? "" : "old", coverMeta: { publicId }, gallery: [] } }); const order = []; listing.save = async () => order.push("save"); const h = handlers(listing, { deleteImage: async () => order.push("delete") }); const res = response(); await h.removeCover(request(listing), res);
    assert.equal(res.statusCode, 200); assert.equal(listing.images.cover, ""); assert.equal(order.filter((item) => item === "delete").length, expectedDeletes); if (expectedDeletes) assert.deepEqual(order, ["save", "delete"]);
  });
});

test("cover upload validates ID, missing file, and missing Gym", { concurrency: false }, async () => {
  const listing = gym(); const h = handlers(listing); let res = response(); await h.uploadCover({ params: { id: "bad" } }, res); assert.equal(res.statusCode, 400);
  res = response(); await h.uploadCover(request(listing), res); assert.equal(res.statusCode, 400);
  mock(Gym, "findById", async () => null); res = response(); await h.uploadCover(request(listing, { file: { buffer: Buffer.from("x") } }), res); assert.equal(res.statusCode, 404);
});

test("gallery upload assigns stable metadata, preserves legacy items, and enforces limit", { concurrency: false }, async () => {
  const listing = gym({ images: { cover: "", coverMeta: {}, gallery: [{ url: "legacy", alt: "Legacy", category: "gym" }] } }); const h = handlers(listing); const res = response(); await h.uploadGallery(request(listing, { file: { buffer: Buffer.from("x") }, body: { alt: " New ", category: " Interior " } }), res);
  assert.equal(res.statusCode, 200); assert.equal(listing.images.gallery.length, 2); assert.match(listing.images.gallery[0].id, /^legacy-/); assert.ok(listing.images.gallery[1].id); assert.equal(listing.images.gallery[1].publicId, uploaded.publicId); assert.equal(listing.images.gallery[1].alt, "New");
  listing.images.gallery = Array.from({ length: GYM_GALLERY_MAX_ITEMS }, (_, index) => ({ id: `id-${index}`, url: `${index}` })); const limited = response(); await h.uploadGallery(request(listing, { file: { buffer: Buffer.from("x") } }), limited); assert.equal(limited.statusCode, 400);
});

test("legacy gallery ID assignment is stable, idempotent, and order-preserving", () => {
  const listing = gym({ images: { gallery: [{ url: "one" }, { id: "existing", url: "two" }] } }); assert.equal(ensureGymGalleryIds(listing), true); const ids = listing.images.gallery.map((item) => item.id); assert.equal(ensureGymGalleryIds(listing), false); assert.deepEqual(listing.images.gallery.map((item) => item.id), ids); assert.equal(ids[1], "existing");
});

test("gallery metadata permits only alt/category", { concurrency: false }, async () => {
  const listing = gym({ images: { gallery: [{ id: "one", url: "one", alt: "", category: "gym" }] } }); const h = handlers(listing); let res = response(); await h.updateGalleryMetadata(request(listing, { params: { galleryId: "one" }, body: { alt: " New ", category: " Room " } }), res); assert.equal(res.statusCode, 200); assert.equal(listing.images.gallery[0].alt, "New");
  res = response(); await h.updateGalleryMetadata(request(listing, { params: { galleryId: "one" }, body: { publicId: "forged", url: "x", id: "x" } }), res); assert.equal(res.statusCode, 400); assert.deepEqual(res.body.unsupportedFields, ["publicId", "url", "id"]);
});

test("gallery removal deletes only the exact managed item after save", { concurrency: false }, async () => {
  const listing = gym({ images: { gallery: [{ id: "legacy", url: "one" }, { id: "managed", url: "two", publicId: "managed-two" }, { id: "three", url: "three" }] } }); const order = []; listing.save = async () => order.push("save"); const h = handlers(listing, { deleteImage: async (id) => order.push(`delete:${id}`) }); let res = response(); await h.removeGallery(request(listing, { params: { galleryId: "managed" } }), res); assert.equal(res.statusCode, 200); assert.deepEqual(order, ["save", "delete:managed-two"]); assert.deepEqual(listing.images.gallery.map((item) => item.id), ["legacy", "three"]);
  res = response(); await h.removeGallery(request(listing, { params: { galleryId: "unknown" } }), res); assert.equal(res.statusCode, 404);
});

test("gallery ordering requires every unique current ID and changes only order", { concurrency: false }, async () => {
  const listing = gym({ images: { gallery: [{ id: "a", url: "A" }, { id: "b", url: "B" }, { id: "c", url: "C" }] } }); const h = handlers(listing); let res = response(); await h.reorderGallery(request(listing, { body: { galleryIds: ["c", "a", "b"] } }), res); assert.equal(res.statusCode, 200); assert.deepEqual(listing.images.gallery.map((item) => item.url), ["C", "A", "B"]);
  for (const ids of [["a", "a", "c"], ["a", "b"], ["a", "b", "unknown"]]) { res = response(); await h.reorderGallery(request(listing, { body: { galleryIds: ids } }), res); assert.equal(res.statusCode, 400); }
});

test("Gym media upload filter accepts safe formats and uses the 4 MB serverless limit", () => {
  for (const mimetype of ["image/jpeg", "image/png", "image/webp"]) gymMediaFileFilter({}, { mimetype }, (error, accepted) => { assert.equal(error, null); assert.equal(accepted, true); });
  gymMediaFileFilter({}, { mimetype: "image/svg+xml" }, (error) => assert.equal(error.statusCode, 400)); assert.equal(GYM_MEDIA_MAX_BYTES, 4 * 1024 * 1024);
});
