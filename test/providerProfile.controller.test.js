import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { updateMyProviderProfile } from "../src/controllers/providers/provider.controller.js";
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
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test("updates account phone and public profile phone independently", async () => {
  const user = { _id: new mongoose.Types.ObjectId(), name: "Asha", email: "asha@example.com", phone: "old-account", role: "business", providerType: "trainer", isActive: true, isEmailVerified: false, avatar: null, async save() {} };
  const profile = { phone: "old-public", async save() {} };
  mock(User, "findById", async () => user);
  mock(ProviderProfile, "findOne", async () => profile);
  const req = { user: { id: user._id, role: "business" }, body: { phone: " 1111111111 ", profilePhone: " 2222222222 " } };
  const res = response();

  await updateMyProviderProfile(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(user.phone, "1111111111");
  assert.equal(profile.phone, "2222222222");
  assert.equal(res.body.data.providerProfile.phone, "2222222222");
});
