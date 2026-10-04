import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const SENSITIVE_TEMPLATE_VARIABLES = ["GEOAPIFY_API_KEY"];

test("sensitive environment template variables remain empty placeholders", async () => {
  const template = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  const lines = template.split(/\r?\n/);

  for (const variable of SENSITIVE_TEMPLATE_VARIABLES) {
    const assignments = lines.filter((line) => line.startsWith(`${variable}=`));
    assert.equal(assignments.length, 1, `${variable} must appear exactly once in .env.example`);
    assert.ok(assignments[0] === `${variable}=`, `${variable} must remain an empty placeholder`);
  }
});

test("the local .env file remains explicitly ignored", async () => {
  const gitignore = await readFile(new URL("../.gitignore", import.meta.url), "utf8");
  const rules = gitignore.split(/\r?\n/).map((line) => line.trim());
  assert.ok(rules.includes(".env"), ".gitignore must explicitly ignore .env");
});
