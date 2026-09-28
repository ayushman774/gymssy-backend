import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/app.js";

async function withServer(run) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test("public Category preflight is origin-independent and non-credentialed", async () => {
  await withServer(async (baseUrl) => {
    for (const origin of ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:5173"]) {
      const response = await fetch(`${baseUrl}/api/categories`, { method: "OPTIONS", headers: { Origin: origin, "Access-Control-Request-Method": "GET" } });
      assert.equal(response.status, 204);
      assert.equal(response.headers.get("access-control-allow-origin"), "*");
      assert.equal(response.headers.get("access-control-allow-credentials"), null);
      assert.equal(response.headers.get("cache-control"), "no-store");
    }
  });
});

test("protected API preflight remains restricted and credential-aware", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/admin/listings`, { method: "OPTIONS", headers: { Origin: "http://localhost:5173", "Access-Control-Request-Method": "GET" } });
    assert.equal(response.status, 204);
    assert.equal(response.headers.get("access-control-allow-origin"), "http://localhost:5173");
    assert.equal(response.headers.get("access-control-allow-credentials"), "true");
  });
});
