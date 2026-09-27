import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import Category from "../src/models/categories/Category.js";
import City from "../src/models/cities/City.js";
import Gym from "../src/models/gyms/Gym.js";
import Trainer from "../src/models/trainers/Trainer.js";
import { prepareListingContentUpdate, prepareProviderOwnedListing } from "../src/controllers/providers/providerListing.controller.js";

const originals = [];
function mock(target, property, value) { originals.push([target, property, target[property]]); target[property] = value; }
afterEach(() => { while (originals.length) { const [target, property, value] = originals.pop(); target[property] = value; } });
const mainId = new mongoose.Types.ObjectId();
function taxonomy(name = "Fitness", slug = "fitness", subs = ["Gyms", "HIIT", "Personal Trainers"]) {
  mock(Category, "findOne", () => ({ lean: async () => ({ _id: mainId, name, slug }) }));
  mock(Category, "find", () => ({ lean: async () => subs.map((subName) => ({ name: subName })) }));
}
function missingMain() { mock(Category, "findOne", () => ({ lean: async () => null })); }
const gymListing = (overrides = {}) => ({ _id: new mongoose.Types.ObjectId(), name: "Gym", slug: "gym", category: "Fitness", tags: ["Gyms"], city: new mongoose.Types.ObjectId(), ...overrides });
const trainerListing = (overrides = {}) => ({ _id: new mongoose.Types.ObjectId(), name: "Trainer", slug: "trainer", category: "fitness", role: "Personal Trainers", specialty: "Strength", experience: "5", sessions: "10", clients: "5", ...overrides });

test("Gym taxonomy accepts main names and multiple belonging subcategory names", async () => {
  taxonomy(); const updates = await prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { category: "Fitness", tags: ["Gyms", "HIIT"] } });
  assert.deepEqual(updates.tags, ["Gyms", "HIIT"]); assert.equal(updates.category, "Fitness");
});
test("Gym taxonomy rejects invalid categories, duplicate tags, cross-category tags, and incompatible retained tags", async (t) => {
  await t.test("invalid category", async () => { missingMain(); await assert.rejects(() => prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { category: "Arbitrary" } }), (error) => error.statusCode === 400 && error.payload.errors[0].field === "category"); });
  await t.test("duplicates", async () => { taxonomy(); await assert.rejects(() => prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { tags: ["Gyms", "Gyms"] } }), /taxonomy/); });
  await t.test("foreign tag", async () => { taxonomy(); await assert.rejects(() => prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { tags: ["Swimming"] } }), /taxonomy/); });
  await t.test("category change retains incompatible tag", async () => { taxonomy("Sports", "sports", ["Swimming"]); await assert.rejects(() => prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { category: "Sports" } }), /taxonomy/); });
});
test("Gym simultaneous category and tags change succeeds, while unrelated legacy edits remain allowed", async () => {
  taxonomy("Sports", "sports", ["Swimming"]); const updates = await prepareListingContentUpdate({ model: Gym, type: "gym", listing: gymListing(), body: { category: "Sports", tags: ["Swimming"] } }); assert.deepEqual(updates, { category: "Sports", tags: ["Swimming"] });
  let taxonomyCalls = 0; mock(Category, "findOne", () => { taxonomyCalls += 1; }); const legacy = gymListing({ category: "Legacy", tags: ["Old"] }); const unrelated = await prepareListingContentUpdate({ model: Gym, type: "gym", listing: legacy, body: { description: "Updated" } }); assert.equal(unrelated.description, "Updated"); assert.equal(taxonomyCalls, 0);
});
test("Trainer taxonomy uses main slug and requires a role belonging to that main category", async () => {
  taxonomy(); let updates = await prepareListingContentUpdate({ model: Trainer, type: "trainer", listing: trainerListing(), body: { category: "fitness", role: "HIIT" } }); assert.equal(updates.category, "fitness"); assert.equal(updates.role, "HIIT");
  taxonomy("Sports", "sports", ["Swimming"]); await assert.rejects(() => prepareListingContentUpdate({ model: Trainer, type: "trainer", listing: trainerListing(), body: { category: "sports" } }), /taxonomy/);
});
test("Trainer rejects invalid/foreign roles but permits unrelated edits on legacy classification", async () => {
  taxonomy(); await assert.rejects(() => prepareListingContentUpdate({ model: Trainer, type: "trainer", listing: trainerListing(), body: { role: "Arbitrary" } }), /taxonomy/);
  missingMain(); await assert.rejects(() => prepareListingContentUpdate({ model: Trainer, type: "trainer", listing: trainerListing(), body: { category: "arbitrary", role: "Anything" } }), /taxonomy/);
  const updates = await prepareListingContentUpdate({ model: Trainer, type: "trainer", listing: trainerListing({ category: "legacy", role: "Legacy Role" }), body: { bio: "Updated" } }); assert.equal(updates.bio, "Updated");
});
test("Provider create validates Gym and Trainer classification through the shared contract", async () => {
  taxonomy(); mock(City, "exists", async () => true); mock(Gym, "exists", async () => false); mock(Trainer, "exists", async () => false);
  const gym = await prepareProviderOwnedListing({ providerType: "gym_owner", ownerId: new mongoose.Types.ObjectId(), body: { name: "Gym", slug: "gym", category: "Fitness", tags: ["Gyms"], city: new mongoose.Types.ObjectId().toString() } }); assert.equal(gym.listingData.category, "Fitness");
  const trainer = await prepareProviderOwnedListing({ providerType: "trainer", ownerId: new mongoose.Types.ObjectId(), body: { name: "T", slug: "t", category: "fitness", role: "Personal Trainers", specialty: "S", experience: "1", sessions: "1", clients: "1" } }); assert.equal(trainer.listingData.role, "Personal Trainers");
});
