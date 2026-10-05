import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Gym from "../src/models/gyms/Gym.js";
import {
  geoPointFromLegacyCoordinates,
  normalizeCoordinateWrite,
} from "../src/utils/geoCoordinates.js";
import {
  GEOLOCATION_CLASSIFICATIONS,
  MISSING_GEO_LOCATION_FILTER,
  assertProductionWriteAllowed,
  backfillGymGeoLocation,
  classifyGymGeoLocation,
} from "../src/scripts/backfillGymGeoLocation.js";
import { summarizeGymGeoLocation } from "../src/scripts/auditGymGeoLocation.js";
import { buildNearbyPipeline } from "../src/controllers/discovery/discovery.controller.js";

test("coordinate normalization accepts valid pairs, numeric strings, and zero", () => {
  assert.deepEqual(normalizeCoordinateWrite({ latitude: 12.9784, longitude: 77.6408 }), {
    supplied: true,
    coordinates: { lat: 12.9784, lng: 77.6408 },
    geoLocation: { type: "Point", coordinates: [77.6408, 12.9784] },
  });
  assert.deepEqual(normalizeCoordinateWrite({ lat: "0", lng: "0" }).geoLocation.coordinates, [0, 0]);
  assert.deepEqual(geoPointFromLegacyCoordinates({ lat: 0, lng: 0 }), { type: "Point", coordinates: [0, 0] });
});

test("coordinate normalization rejects malformed, partial, ambiguous, and out-of-range writes", () => {
  for (const input of [
    [12, 77],
    { latitude: 12 },
    { longitude: 77 },
    { latitude: "north", longitude: 77 },
    { latitude: 91, longitude: 77 },
    { latitude: 12, longitude: 181 },
    { lat: 12, latitude: 12, lng: 77 },
    { lat: 12, lng: 77, altitude: 1 },
  ]) {
    assert.ok(normalizeCoordinateWrite(input).errors, JSON.stringify(input));
  }
  assert.ok(normalizeCoordinateWrite({ lat: null }, { existing: { lat: 12, lng: 77 } }).errors);
});

test("coordinate updates can merge a numeric component but clearing requires a complete pair", () => {
  assert.deepEqual(
    normalizeCoordinateWrite({ longitude: 0 }, { existing: { lat: 12, lng: 77 } }).coordinates,
    { lat: 12, lng: 0 },
  );
  assert.deepEqual(normalizeCoordinateWrite({ latitude: null, longitude: null }), {
    supplied: true,
    coordinates: { lat: null, lng: null },
    geoLocation: undefined,
  });
});

test("Gym defines one canonical 2dsphere index and validates GeoJSON ordering/ranges", async () => {
  const geoIndexes = Gym.schema.indexes().filter(([fields]) => fields.geoLocation === "2dsphere");
  assert.equal(geoIndexes.length, 1);

  const valid = new Gym({
    name: "Geo Gym",
    slug: "geo-gym",
    category: "Fitness",
    city: new mongoose.Types.ObjectId(),
    geoLocation: { type: "Point", coordinates: [180, 90] },
  });
  await valid.validate();

  const invalid = new Gym({
    name: "Invalid Geo Gym",
    slug: "invalid-geo-gym",
    category: "Fitness",
    city: new mongoose.Types.ObjectId(),
    geoLocation: { type: "Point", coordinates: [181, 0] },
  });
  await assert.rejects(() => invalid.validate(), (error) => Boolean(error.errors["geoLocation.coordinates"]));
});

test("nearby pipeline starts with indexed geoNear and applies bounds, filters, sorting, and pagination", () => {
  const filter = { isActive: true, moderationStatus: { $nin: ["pending", "rejected"] }, category: "Fitness" };
  const pipeline = buildNearbyPipeline({
    filter,
    latitude: 12,
    longitude: 77,
    radiusKm: 5,
    sort: "recommended",
    explicitSort: false,
    skip: 20,
    limit: 10,
  });
  assert.deepEqual(pipeline[0], {
    $geoNear: {
      near: { type: "Point", coordinates: [77, 12] },
      key: "geoLocation",
      distanceField: "distanceMeters",
      maxDistance: 5000,
      spherical: true,
      query: filter,
    },
  });
  assert.deepEqual(pipeline[1], { $sort: { distanceMeters: 1, _id: 1 } });
  assert.deepEqual(pipeline[2].$facet.docs, [{ $skip: 20 }, { $limit: 10 }]);
});

test("Gym GeoJSON backfill is dry-run by default, explicit, idempotent, and reports skips", async () => {
  const validId = new mongoose.Types.ObjectId();
  const invalidId = new mongoose.Types.ObjectId();
  const canonicalId = new mongoose.Types.ObjectId();
  const candidates = [
    { _id: validId, slug: "valid", coordinates: { lat: 12, lng: 77 } },
    { _id: invalidId, slug: "invalid", coordinates: { lat: null, lng: 77 } },
    { _id: canonicalId, slug: "canonical", coordinates: { lat: 0, lng: 0 }, geoLocation: { type: "Point", coordinates: [0, 0] } },
  ];
  const writes = [];
  const GymModel = {
    find(filter) {
      assert.deepEqual(filter, {});
      return {
        select(selection) {
          assert.match(selection, /geoLocation/);
          return { lean: async () => candidates };
        },
      };
    },
    async updateOne(filter, update, options) {
      writes.push({ filter, update, options });
      return { modifiedCount: 1 };
    },
  };

  const dryRun = await backfillGymGeoLocation({ GymModel });
  assert.deepEqual({ ...dryRun, skipped: undefined }, {
    mode: "dry-run", examined: 3, eligible: 1, updated: 0,
    classifications: {
      [GEOLOCATION_CLASSIFICATIONS.CANONICAL]: 1,
      [GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE]: 1,
      [GEOLOCATION_CLASSIFICATIONS.MISSING]: 0,
      [GEOLOCATION_CLASSIFICATIONS.INCOMPLETE]: 1,
      [GEOLOCATION_CLASSIFICATIONS.INVALID_LEGACY]: 0,
      [GEOLOCATION_CLASSIFICATIONS.INVALID_CANONICAL]: 0,
      [GEOLOCATION_CLASSIFICATIONS.CONFLICT]: 0,
    },
    eligibleRecords: [{ id: String(validId), slug: "valid" }], conflicts: [], skipped: undefined,
  });
  assert.equal(dryRun.skipped.length, 1);
  assert.equal(writes.length, 0);

  const applied = await backfillGymGeoLocation({ GymModel, apply: true });
  assert.equal(applied.updated, 1);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].update, { $set: { geoLocation: { type: "Point", coordinates: [77, 12] } } });
  assert.deepEqual(writes[0].options, { runValidators: true, timestamps: false });
  assert.deepEqual(writes[0].filter, { _id: validId, "coordinates.lat": 12, "coordinates.lng": 77, ...MISSING_GEO_LOCATION_FILTER });
});

test("geolocation classification detects zero, missing, partial, invalid, canonical, tolerance, and conflicts", () => {
  const classify = (coordinates, geoLocation) => classifyGymGeoLocation({ coordinates, geoLocation });
  assert.equal(classify({ lat: 0, lng: 0 }), GEOLOCATION_CLASSIFICATIONS.BACKFILLABLE);
  assert.equal(classify({ lat: null, lng: null }), GEOLOCATION_CLASSIFICATIONS.MISSING);
  assert.equal(classify({ lat: 12, lng: null }), GEOLOCATION_CLASSIFICATIONS.INCOMPLETE);
  assert.equal(classify({ lat: 91, lng: 77 }), GEOLOCATION_CLASSIFICATIONS.INVALID_LEGACY);
  assert.equal(classify({ lat: 12, lng: 77 }, { type: "Point", coordinates: [77, 12] }), GEOLOCATION_CLASSIFICATIONS.CANONICAL);
  assert.equal(classify({ lat: 12, lng: 77 }, { type: "Point", coordinates: [77 + 1e-8, 12] }), GEOLOCATION_CLASSIFICATIONS.CANONICAL);
  assert.equal(classify({ lat: 12, lng: 77 }, { type: "Point", coordinates: [78, 12] }), GEOLOCATION_CLASSIFICATIONS.CONFLICT);
  assert.equal(classify({ lat: 12, lng: 77 }, { type: "Point", coordinates: [181, 12] }), GEOLOCATION_CLASSIFICATIONS.INVALID_CANONICAL);
});

test("backfill never overwrites canonical conflicts and reruns make no writes", async () => {
  const conflictId = new mongoose.Types.ObjectId();
  const gyms = [{ _id: conflictId, slug: "conflict", coordinates: { lat: 12, lng: 77 }, geoLocation: { type: "Point", coordinates: [78, 12] } }];
  let writes = 0;
  const GymModel = { find: () => ({ select: () => ({ lean: async () => gyms }) }), updateOne: async () => { writes += 1; return { modifiedCount: 1 }; } };
  const result = await backfillGymGeoLocation({ GymModel, apply: true });
  assert.equal(result.eligible, 0); assert.equal(result.updated, 0); assert.equal(writes, 0);
  assert.deepEqual(result.conflicts, [{ id: String(conflictId), slug: "conflict" }]);
});

test("production apply requires the explicit production override", () => {
  assert.throws(() => assertProductionWriteAllowed({ apply: true, nodeEnv: "production", argv: ["node", "script"] }), /Production writes are blocked/);
  assert.doesNotThrow(() => assertProductionWriteAllowed({ apply: true, nodeEnv: "production", argv: ["node", "script", "--allow-production"] }));
  assert.doesNotThrow(() => assertProductionWriteAllowed({ apply: false, nodeEnv: "production", argv: ["node", "script"] }));
});

test("backfill surfaces write failures without continuing silently", async () => {
  const GymModel = {
    find: () => ({ select: () => ({ lean: async () => [{ _id: new mongoose.Types.ObjectId(), slug: "write-failure", coordinates: { lat: 12, lng: 77 } }] }) }),
    updateOne: async () => { throw new Error("write failed"); },
  };
  await assert.rejects(() => backfillGymGeoLocation({ GymModel, apply: true }), /write failed/);
});

test("read-only audit reports publication, ownership, breakdowns, unresolved records, and exact coverage", () => {
  const cityId = new mongoose.Types.ObjectId();
  const gyms = [
    { _id: new mongoose.Types.ObjectId(), slug: "canonical", category: "Fitness", city: cityId, owner: null, isActive: true, moderationStatus: "approved", coordinates: { lat: 12, lng: 77 }, geoLocation: { type: "Point", coordinates: [77, 12] } },
    { _id: new mongoose.Types.ObjectId(), slug: "legacy", category: "Fitness", city: cityId, owner: new mongoose.Types.ObjectId(), isActive: true, moderationStatus: undefined, coordinates: { lat: 13, lng: 78 } },
    { _id: new mongoose.Types.ObjectId(), slug: "pending", category: "Wellness", city: cityId, owner: null, isActive: true, moderationStatus: "pending", coordinates: { lat: null, lng: null } },
  ];
  const summary = summarizeGymGeoLocation(gyms, new Map([[String(cityId), "Bengaluru"]]));
  assert.equal(summary.total, 3); assert.equal(summary.active, 3); assert.equal(summary.published, 2);
  assert.equal(summary.ownerless, 2); assert.equal(summary.providerOwned, 1);
  assert.deepEqual(summary.coverage, { canonicalPublished: 1, totalPublished: 2, percentage: 50 });
  assert.equal(summary.byCategory.Fitness.backfillable, 1); assert.equal(summary.byCity.Bengaluru.total, 3);
  assert.equal(summary.unresolved[0].slug, "pending");
});
