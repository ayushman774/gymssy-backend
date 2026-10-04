import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import Gym from "../src/models/gyms/Gym.js";
import {
  geoPointFromLegacyCoordinates,
  normalizeCoordinateWrite,
} from "../src/utils/geoCoordinates.js";
import {
  MISSING_GEO_LOCATION_FILTER,
  backfillGymGeoLocation,
} from "../src/scripts/backfillGymGeoLocation.js";
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
  const candidates = [
    { _id: validId, slug: "valid", coordinates: { lat: 12, lng: 77 } },
    { _id: invalidId, slug: "invalid", coordinates: { lat: null, lng: 77 } },
  ];
  const writes = [];
  const GymModel = {
    find(filter) {
      assert.deepEqual(filter, MISSING_GEO_LOCATION_FILTER);
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
    mode: "dry-run", examined: 2, eligible: 1, updated: 0, skipped: undefined,
  });
  assert.equal(dryRun.skipped.length, 1);
  assert.equal(writes.length, 0);

  const applied = await backfillGymGeoLocation({ GymModel, apply: true });
  assert.equal(applied.updated, 1);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].update, { $set: { geoLocation: { type: "Point", coordinates: [77, 12] } } });
  assert.deepEqual(writes[0].options, { runValidators: true });
  assert.deepEqual(writes[0].filter, { _id: validId, ...MISSING_GEO_LOCATION_FILTER });
});
