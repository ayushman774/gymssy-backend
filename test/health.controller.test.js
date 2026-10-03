import assert from "node:assert/strict";
import test from "node:test";

import { createHealthHandler } from "../src/controllers/health.controller.js";

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

test("health connects through the normal database path before reporting ready", async () => {
  const connection = { readyState: 0 };
  let attempts = 0;
  const handler = createHealthHandler({
    connection,
    connect: async () => {
      attempts += 1;
      connection.readyState = 1;
    },
  });
  const res = response();

  await handler({}, res);

  assert.equal(attempts, 1);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.status, { server: "up", database: "connected" });
});

test("health returns a sanitized 503 when the database cannot connect", async () => {
  const handler = createHealthHandler({
    connection: { readyState: 0 },
    connect: async () => {
      throw new Error("mongodb://secret-host/internal-details");
    },
  });
  const res = response();

  await handler({}, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.success, false);
  assert.deepEqual(res.body.status, { server: "up", database: "disconnected" });
  assert.equal(JSON.stringify(res.body).includes("secret-host"), false);
});

test("health does not report success while the connection is still unavailable", async () => {
  const handler = createHealthHandler({
    connection: { readyState: 2 },
    connect: async () => {},
  });
  const res = response();

  await handler({}, res);

  assert.equal(res.statusCode, 503);
  assert.equal(res.body.status.database, "disconnected");
});
