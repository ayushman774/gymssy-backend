import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../src/models/users/User.js";
import { getCurrentUser, loginUser, registerUser } from "../src/controllers/auth/auth.controller.js";
import authMiddleware from "../src/middleware/auth.middleware.js";

const originals = [];
const mock = (target, key, value) => { originals.push([target, key, target[key]]); target[key] = value; };
afterEach(() => { while (originals.length) { const [target, key, value] = originals.pop(); target[key] = value; } });
const response = () => ({ statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });

test("customer registration owns role assignment and never returns password", { concurrency: false }, async () => {
  process.env.JWT_SECRET = "customer-auth-test-secret";
  let created;
  mock(User, "findOne", async () => null);
  mock(User, "create", async (value) => (created = { _id: new mongoose.Types.ObjectId(), avatar: {}, ...value }));
  const res = response();
  await registerUser({ body: { name: " Customer ", email: "USER@EXAMPLE.COM ", password: "password", role: "admin", providerType: "trainer" } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.role, "user");
  assert.equal(created.providerType, null);
  assert.equal(res.body.data.user.role, "user");
  assert.equal("password" in res.body.data.user, false);
  assert.ok(res.body.data.token);
});

test("business registration remains explicit and role injection cannot bypass it", { concurrency: false }, async () => {
  process.env.JWT_SECRET = "customer-auth-test-secret";
  let created;
  mock(User, "findOne", async () => null);
  mock(User, "create", async (value) => (created = { _id: new mongoose.Types.ObjectId(), avatar: {}, ...value }));
  const res = response();
  await registerUser({ body: { name: "Provider", email: "provider@example.com", password: "password", role: "admin", accountType: "business", providerType: "trainer" } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(created.role, "business");
  assert.equal(created.providerType, "trainer");
});

test("registration rejects duplicate, malformed email, short password, and invalid account type", { concurrency: false }, async () => {
  mock(User, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
  let res = response();
  await registerUser({ body: { name: "A", email: "a@example.com", password: "password" } }, res);
  assert.equal(res.statusCode, 409);
  for (const body of [
    { name: "A", email: "invalid", password: "password" },
    { name: "A", email: "a@example.com", password: "123" },
    { name: "A", email: "a@example.com", password: "password", accountType: { role: "admin" } },
  ]) {
    mock(User, "findOne", async () => null);
    res = response(); await registerUser({ body }, res); assert.equal(res.statusCode, 400);
  }
});

test("login returns customer contract and rejects invalid credentials/inactive accounts", { concurrency: false }, async () => {
  process.env.JWT_SECRET = "customer-auth-test-secret";
  const password = await bcrypt.hash("password", 4);
  const user = { _id: new mongoose.Types.ObjectId(), name: "Customer", email: "c@example.com", password, role: "user", providerType: null, avatar: {}, isActive: true };
  mock(User, "findOne", () => ({ select: async () => user }));
  let res = response(); await loginUser({ body: { email: "c@example.com", password: "password" } }, res);
  assert.equal(res.statusCode, 200); assert.equal(res.body.data.user.role, "user"); assert.equal("password" in res.body.data.user, false);
  res = response(); await loginUser({ body: { email: "c@example.com", password: "wrong" } }, res); assert.equal(res.statusCode, 401);
  user.isActive = false; res = response(); await loginUser({ body: { email: "c@example.com", password: "password" } }, res); assert.equal(res.statusCode, 403);
});

test("auth middleware handles missing, malformed, deleted, inactive, and valid tokens", { concurrency: false }, async () => {
  process.env.JWT_SECRET = "customer-auth-test-secret";
  let res = response(); await authMiddleware({ headers: {} }, res, () => {}); assert.equal(res.statusCode, 401);
  res = response(); await authMiddleware({ headers: { authorization: "Bearer broken" } }, res, () => {}); assert.equal(res.statusCode, 401);
  const token = jwt.sign({ id: new mongoose.Types.ObjectId() }, process.env.JWT_SECRET, { expiresIn: "1h" });
  mock(User, "findById", () => ({ select: async () => null }));
  res = response(); await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, () => {}); assert.equal(res.statusCode, 401);
  const user = { _id: new mongoose.Types.ObjectId(), role: "user", isActive: false };
  mock(User, "findById", () => ({ select: async () => user }));
  res = response(); await authMiddleware({ headers: { authorization: `Bearer ${token}` } }, res, () => {}); assert.equal(res.statusCode, 403);
  user.isActive = true; let next = false; const req = { headers: { authorization: `Bearer ${token}` } };
  res = response(); await authMiddleware(req, res, () => { next = true; }); assert.equal(next, true); assert.equal(req.user.role, "user");
});

test("current user response remains password-free", { concurrency: false }, async () => {
  mock(User, "findById", () => ({ select: async () => ({ _id: new mongoose.Types.ObjectId(), name: "Customer", email: "c@example.com", role: "user", providerType: null, isActive: true }) }));
  const res = response(); await getCurrentUser({ user: { id: new mongoose.Types.ObjectId() } }, res);
  assert.equal(res.statusCode, 200); assert.equal("password" in res.body.data.user, false);
});
