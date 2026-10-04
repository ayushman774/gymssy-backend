import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import mongoose from "mongoose";
import User from "../src/models/users/User.js";
import { createAdmin } from "../src/controllers/auth/auth.controller.js";
import adminMiddleware from "../src/middleware/auth/adminMiddleware.js";
import { createAuthLimiter } from "../src/middleware/authRateLimit.middleware.js";
import { readFile } from "node:fs/promises";

const originals = [];
const mock = (target, key, value) => {
  originals.push([target, key, target[key]]);
  target[key] = value;
};
afterEach(() => {
  while (originals.length) {
    const [target, key, value] = originals.pop();
    target[key] = value;
  }
});

const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

test("Admin creation route requires authentication and Admin authorization", async () => {
  const source = await readFile(new URL("../src/routes/auth/auth.routes.js", import.meta.url), "utf8");
  assert.match(source, /"\/create-admin",\s*authMiddleware,\s*adminMiddleware,\s*adminCreationRateLimiter,\s*createAdmin/s);

  for (const role of [undefined, "user", "business"]) {
    const res = response();
    let next = false;
    adminMiddleware(role ? { user: { role } } : {}, res, () => { next = true; });
    assert.equal(next, false);
    assert.equal(res.statusCode, role ? 403 : 401);
  }

  let next = false;
  adminMiddleware({ user: { role: "admin" } }, response(), () => { next = true; });
  assert.equal(next, true);
});

test("Admin creation forces safe account state and never returns password or token", { concurrency: false }, async () => {
  let created;
  mock(User, "findOne", async () => null);
  mock(User, "create", async (value) => (created = {
    _id: new mongoose.Types.ObjectId(),
    avatar: {},
    ...value,
  }));

  const res = response();
  await createAdmin({
    user: { role: "admin" },
    body: {
      name: " New Admin ",
      email: "ADMIN@EXAMPLE.COM ",
      password: "password",
      phone: " 9999999999 ",
    },
  }, res);

  assert.equal(res.statusCode, 201);
  assert.equal(created.role, "admin");
  assert.equal(created.providerType, null);
  assert.equal(created.isActive, true);
  assert.equal(created.email, "admin@example.com");
  assert.equal("password" in res.body.data.user, false);
  assert.equal("token" in res.body.data, false);
});

test("shared secret and protected-field injection are rejected", async () => {
  for (const body of [
    { name: "Admin", email: "admin@example.com", password: "password", adminSecret: "old-secret" },
    { name: "Admin", email: "admin@example.com", password: "password", role: "user" },
    { name: "Admin", email: "admin@example.com", password: "password", isActive: false },
  ]) {
    const res = response();
    await createAdmin({ user: { role: "admin" }, body }, res);
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.unsupportedFields.length > 0);
  }
});

test("Admin creation validates required fields and duplicate emails", { concurrency: false }, async () => {
  let res = response();
  await createAdmin({ body: { name: " ", email: "bad", password: "123" } }, res);
  assert.equal(res.statusCode, 400);

  mock(User, "findOne", async () => ({ _id: new mongoose.Types.ObjectId() }));
  res = response();
  await createAdmin({ body: { name: "Admin", email: "admin@example.com", password: "password" } }, res);
  assert.equal(res.statusCode, 409);
});

test("auth limiter allows normal traffic, returns 429 at the threshold, and leaves unrelated routes alone", async (t) => {
  const app = express();
  const limiter = createAuthLimiter({ windowMs: 60_000, limit: 2 });
  app.get("/sensitive", limiter, (_req, res) => res.status(401).json({ success: false }));
  app.get("/unrelated", (_req, res) => res.status(200).json({ success: true }));

  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const { port } = server.address();

  assert.equal((await fetch(`http://127.0.0.1:${port}/sensitive`)).status, 401);
  assert.equal((await fetch(`http://127.0.0.1:${port}/sensitive`)).status, 401);
  assert.equal((await fetch(`http://127.0.0.1:${port}/sensitive`)).status, 429);
  assert.equal((await fetch(`http://127.0.0.1:${port}/unrelated`)).status, 200);
});
