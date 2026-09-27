import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  createAdminProviderAvatarHandlers,
} from "../src/controllers/admin/adminProviderAvatar.controller.js";
import { getAdminProviderById } from "../src/controllers/admin/admin.controller.js";
import {
  PROVIDER_AVATAR_MAX_BYTES,
  providerAvatarFileFilter,
} from "../src/middleware/uploads/providerAvatarUpload.js";
import User from "../src/models/users/User.js";
import ProviderProfile from "../src/models/providers/ProviderProfile.js";

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

function request(id, file = undefined) {
  return { params: { id: id.toString() }, file };
}

function provider(id) {
  return { _id: id, name: "Asha Provider", role: "business" };
}

const uploaded = {
  url: "https://res.cloudinary.com/demo/image/upload/avatar.webp",
  publicId: "gymssy/providers/avatars/new-avatar",
  width: 800,
  height: 800,
  format: "webp",
};

test("uploads a valid avatar and safely upserts a missing profile", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  mock(User, "findOne", async () => provider(id));
  mock(ProviderProfile, "findOne", async () => null);
  let updateCall;
  mock(ProviderProfile, "findOneAndUpdate", async (...args) => {
    updateCall = args;
    return { user: id, avatar: { url: uploaded.url, publicId: uploaded.publicId } };
  });
  let uploadOptions;
  const handlers = createAdminProviderAvatarHandlers({
    uploadImage: async (_buffer, options) => { uploadOptions = options; return uploaded; },
    deleteImage: async () => {},
  });
  const res = response();

  await handlers.uploadProviderAvatar(
    request(id, { buffer: Buffer.from("image"), mimetype: "image/png" }),
    res,
  );

  assert.equal(res.statusCode, 200);
  assert.equal(uploadOptions.folder, "gymssy/providers/avatars");
  assert.match(uploadOptions.publicId, new RegExp(`^${id}-`));
  assert.deepEqual(updateCall[1].$set.avatar, {
    url: uploaded.url,
    publicId: uploaded.publicId,
    alt: "Asha Provider profile picture",
  });
  assert.equal(updateCall[2].upsert, true);
  assert.equal(res.body.data.profileExists, true);
});

test("rejects a missing avatar file", { concurrency: false }, async () => {
  const handlers = createAdminProviderAvatarHandlers();
  const res = response();
  await handlers.uploadProviderAvatar(request(new mongoose.Types.ObjectId()), res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Avatar image is required");
});

test("returns 404 when the target provider does not exist", { concurrency: false }, async () => {
  mock(User, "findOne", async () => null);
  const handlers = createAdminProviderAvatarHandlers({ uploadImage: async () => uploaded });
  const res = response();
  await handlers.uploadProviderAvatar(
    request(new mongoose.Types.ObjectId(), { buffer: Buffer.from("image") }),
    res,
  );
  assert.equal(res.statusCode, 404);
});

test("replacement stores the new avatar before cleaning up the old managed image", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  mock(User, "findOne", async () => provider(id));
  mock(ProviderProfile, "findOne", async () => ({
    avatar: { url: "https://old.example/avatar.jpg", publicId: "managed-old" },
  }));
  const order = [];
  mock(ProviderProfile, "findOneAndUpdate", async () => {
    order.push("database");
    return { avatar: uploaded };
  });
  const handlers = createAdminProviderAvatarHandlers({
    uploadImage: async () => { order.push("upload"); return uploaded; },
    deleteImage: async (publicId) => { order.push(`delete:${publicId}`); },
  });
  const res = response();

  await handlers.uploadProviderAvatar(
    request(id, { buffer: Buffer.from("image") }),
    res,
  );

  assert.deepEqual(order, ["upload", "database", "delete:managed-old"]);
  assert.equal(res.statusCode, 200);
});

test("replacement does not delete an old URL-only avatar", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  mock(User, "findOne", async () => provider(id));
  mock(ProviderProfile, "findOne", async () => ({
    avatar: { url: "https://external.example/avatar.jpg", publicId: "" },
  }));
  mock(ProviderProfile, "findOneAndUpdate", async () => ({ avatar: uploaded }));
  let deleteCalls = 0;
  const handlers = createAdminProviderAvatarHandlers({
    uploadImage: async () => uploaded,
    deleteImage: async () => { deleteCalls += 1; },
  });
  const res = response();

  await handlers.uploadProviderAvatar(
    request(id, { buffer: Buffer.from("image") }),
    res,
  );

  assert.equal(deleteCalls, 0);
});

test("remove clears avatar fields and deletes a managed image", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  mock(User, "findOne", async () => provider(id));
  mock(ProviderProfile, "findOne", async () => ({ avatar: { publicId: "managed-old" } }));
  let update;
  mock(ProviderProfile, "findOneAndUpdate", async (_filter, value) => {
    update = value;
    return { avatar: { url: "", alt: "", publicId: "" } };
  });
  const deleted = [];
  const handlers = createAdminProviderAvatarHandlers({
    deleteImage: async (publicId) => deleted.push(publicId),
  });
  const res = response();

  await handlers.removeProviderAvatar(request(id), res);

  assert.deepEqual(update.$set.avatar, { url: "", alt: "", publicId: "" });
  assert.deepEqual(deleted, ["managed-old"]);
  assert.equal(res.statusCode, 200);
});

test("remove clears an external URL-only avatar without Cloudinary deletion", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  mock(User, "findOne", async () => provider(id));
  mock(ProviderProfile, "findOne", async () => ({ avatar: { url: "https://external.example/a.jpg" } }));
  mock(ProviderProfile, "findOneAndUpdate", async () => ({ avatar: {} }));
  let deleteCalls = 0;
  const handlers = createAdminProviderAvatarHandlers({
    deleteImage: async () => { deleteCalls += 1; },
  });
  const res = response();
  await handlers.removeProviderAvatar(request(id), res);
  assert.equal(res.statusCode, 200);
  assert.equal(deleteCalls, 0);
});

test("admin provider detail returns an existing ProviderProfile avatar URL", { concurrency: false }, async () => {
  const id = new mongoose.Types.ObjectId();
  const user = { _id: id, name: "Asha", role: "business", providerType: "trainer" };
  const profile = { avatar: { url: "https://example.com/existing.jpg", alt: "Existing" } };
  mock(User, "findOne", () => ({ select: () => ({ lean: async () => user }) }));
  mock(ProviderProfile, "findOne", () => ({ select: () => ({ lean: async () => profile }) }));
  const res = response();

  await getAdminProviderById(request(id), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.profile.avatar.url, profile.avatar.url);
});

test("avatar file filter accepts JPEG, PNG, and WebP and rejects other MIME types", () => {
  for (const mimetype of ["image/jpeg", "image/png", "image/webp"]) {
    let accepted = false;
    providerAvatarFileFilter({}, { mimetype }, (error, value) => {
      assert.equal(error, null);
      accepted = value;
    });
    assert.equal(accepted, true);
  }

  providerAvatarFileFilter({}, { mimetype: "image/svg+xml" }, (error) => {
    assert.equal(error.statusCode, 400);
  });
  assert.equal(PROVIDER_AVATAR_MAX_BYTES, 4 * 1024 * 1024);
});
