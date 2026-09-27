import test from "node:test";
import assert from "node:assert/strict";

import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import Nutritionist from "../src/models/nutritionists/Nutritionist.js";
import { backfillListingModerationStatus } from "../src/scripts/backfillListingModerationStatus.js";

for (const [name, Model] of [
  ["Gym", Gym],
  ["Trainer", Trainer],
  ["Nutritionist", Nutritionist],
]) {
  test(`${name} new documents default to approved moderation`, () => {
    const document = new Model();
    assert.equal(document.moderationStatus, "approved");
    assert.equal(document.rejectionReason, "");
    assert.equal(document.moderationNote, "");
    assert.equal(document.reviewedAt, null);
    assert.equal(document.reviewedBy, null);
  });

  test(`${name} rejects an invalid moderation status`, async () => {
    const document = new Model({ moderationStatus: "draft" });
    await assert.rejects(document.validate(), (error) => {
      assert.equal(error.errors.moderationStatus.kind, "enum");
      return true;
    });
  });

  test(`${name} hydration default does not mark a missing database field as persisted`, () => {
    const databaseRecord = { name: `Legacy ${name}` };
    assert.equal(databaseRecord.moderationStatus, undefined);

    const hydrated = Model.hydrate(databaseRecord);
    assert.equal(hydrated.moderationStatus, "approved");
    assert.equal(hydrated.isModified("moderationStatus"), false);
    assert.equal(databaseRecord.moderationStatus, undefined);
  });
}

function createInMemoryModel(records, calls) {
  return {
    async updateMany(filter, update) {
      calls.push({ filter, update });
      const targets = records.filter(
        (record) => !("moderationStatus" in record),
      );
      for (const record of targets) {
        record.moderationStatus = update.$set.moderationStatus;
      }
      return {
        matchedCount: targets.length,
        modifiedCount: targets.length,
      };
    },
  };
}

test("moderation backfill targets only missing statuses and is idempotent", async () => {
  const collections = {
    Gym: [
      { name: "Legacy Gym" },
      { name: "Pending Gym", moderationStatus: "pending" },
    ],
    Trainer: [
      { name: "Legacy Trainer" },
      { name: "Rejected Trainer", moderationStatus: "rejected" },
    ],
    Nutritionist: [
      { name: "Legacy Nutritionist" },
      { name: "Approved Nutritionist", moderationStatus: "approved" },
    ],
  };
  const calls = [];
  const models = {
    GymModel: createInMemoryModel(collections.Gym, calls),
    TrainerModel: createInMemoryModel(collections.Trainer, calls),
    NutritionistModel: createInMemoryModel(collections.Nutritionist, calls),
  };

  const first = await backfillListingModerationStatus(models);
  const second = await backfillListingModerationStatus(models);

  assert.deepEqual(first, {
    Gym: { matchedCount: 1, modifiedCount: 1 },
    Trainer: { matchedCount: 1, modifiedCount: 1 },
    Nutritionist: { matchedCount: 1, modifiedCount: 1 },
  });
  assert.deepEqual(second, {
    Gym: { matchedCount: 0, modifiedCount: 0 },
    Trainer: { matchedCount: 0, modifiedCount: 0 },
    Nutritionist: { matchedCount: 0, modifiedCount: 0 },
  });
  assert.equal(collections.Gym[1].moderationStatus, "pending");
  assert.equal(collections.Trainer[1].moderationStatus, "rejected");
  assert.equal(collections.Nutritionist[1].moderationStatus, "approved");

  for (const call of calls) {
    assert.deepEqual(call.filter, {
      moderationStatus: { $exists: false },
    });
    assert.deepEqual(call.update, {
      $set: { moderationStatus: "approved" },
    });
  }
});
