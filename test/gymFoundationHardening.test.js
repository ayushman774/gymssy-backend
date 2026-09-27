import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { prepareListingContentUpdate } from "../src/controllers/providers/providerListing.controller.js";
import Gym from "../src/models/gyms/Gym.js";

const baseListing = (overrides = {}) => ({
  _id: new mongoose.Types.ObjectId(),
  name: "Foundation Gym",
  slug: "foundation-gym",
  category: "Fitness",
  city: new mongoose.Types.ObjectId(),
  location: {
    area: "Sector 1", city: "Gurugram", state: "Haryana", pincode: "122001",
    address: "1 Main Road", landmark: "Clock Tower", parking: "Available",
  },
  coordinates: { lat: 28.4595, lng: 77.0266 },
  images: { cover: "cover-old.jpg", gallery: [{ url: "gallery-old.jpg", alt: "Old" }] },
  tags: ["old-tag"],
  highlights: ["old-highlight"],
  facilities: [{ name: "Old facility" }],
  memberships: [{ name: "Old plan", price: 1000 }],
  trainers: [{ name: "Old trainer" }],
  classes: [{ name: "Old class" }],
  timings: [{ day: "Monday" }],
  ...overrides,
});

test("Gym nested partial updates preserve omitted sibling fields", async () => {
  const listing = baseListing();
  const updates = await prepareListingContentUpdate({
    model: Gym,
    type: "gym",
    listing,
    body: {
      location: { area: "Sector 2" },
      coordinates: { lat: 28.5 },
      images: { cover: "cover-new.jpg" },
    },
  });

  assert.deepEqual(updates.location, { ...listing.location, area: "Sector 2" });
  assert.deepEqual(updates.coordinates, { lat: 28.5, lng: 77.0266 });
  assert.equal(updates.images.cover, "cover-new.jpg");
  assert.deepEqual(updates.images.gallery, listing.images.gallery);
  assert.deepEqual(updates.images.coverMeta, { publicId: "", width: null, height: null, format: "" });
});

test("Gym coordinate longitude-only updates preserve latitude", async () => {
  const listing = baseListing();
  const updates = await prepareListingContentUpdate({
    model: Gym,
    type: "gym",
    listing,
    body: { coordinates: { lng: 77.1 } },
  });

  assert.deepEqual(updates.coordinates, { lat: 28.4595, lng: 77.1 });
});

test("Gym nested partial updates support intentional empty-string and empty-array clearing", async () => {
  const listing = baseListing();
  const updates = await prepareListingContentUpdate({
    model: Gym,
    type: "gym",
    listing,
    body: { location: { landmark: "" }, images: { gallery: [] } },
  });

  assert.equal(updates.location.landmark, "");
  assert.equal(updates.location.address, listing.location.address);
  assert.equal(updates.images.cover, listing.images.cover);
  assert.deepEqual(updates.images.gallery, []);
});

test("Gym omitted nested objects remain untouched and supplied top-level arrays replace", async () => {
  const listing = baseListing();
  const replacements = {
    tags: ["new-tag"],
    highlights: [],
    facilities: [{ name: "New facility" }],
    memberships: [{ name: "New plan", price: 2000 }],
    trainers: [],
    classes: [{ name: "New class" }],
    timings: [{ day: "Tuesday" }],
  };
  const updates = await prepareListingContentUpdate({ model: Gym, type: "gym", listing, body: replacements });

  assert.equal("location" in updates, false);
  assert.equal("coordinates" in updates, false);
  assert.equal("images" in updates, false);
  for (const [field, value] of Object.entries(replacements)) assert.deepEqual(updates[field], value);
});
