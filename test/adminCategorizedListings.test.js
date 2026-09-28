import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_LISTING_TYPES, buildAdminListingTaxonomyFilter, buildAdminListingTypeFilter, normalizeAdminListing } from "../src/controllers/admin/admin.controller.js";

const fitness = { name: "Fitness", slug: "fitness" };
const wellness = { name: "Wellness", slug: "wellness" };
const yoga = { name: "Yoga", slug: "yoga" };

test("categorized filters use each model's canonical taxonomy storage", () => {
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: yoga }), { category: "Fitness", tags: "Yoga" });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: yoga }), { category: "fitness", role: "Yoga" });
  assert.equal(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "fitness", mainCategory: fitness }), null);
});

test("unclassified filters retain legacy records and all Nutritionists", () => {
  const activeMainCategories = [fitness, wellness];
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "unclassified", activeMainCategories }), { category: { $nin: ["Fitness", "Wellness"] } });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "unclassified", activeMainCategories }), { category: { $nin: ["fitness", "wellness"] } });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "unclassified", activeMainCategories }), {});
});

test("admin list normalization exposes consistent subcategory and review fields", () => {
  const gym = normalizeAdminListing({ _id: "gym-1", name: "Gym", category: "Fitness", tags: ["Yoga"], rating: 4.2, reviews: 8 }, "gym");
  const trainer = normalizeAdminListing({ _id: "trainer-1", name: "Coach", category: "fitness", role: "Yoga" }, "trainer");
  assert.deepEqual(gym.subcategoryValues, ["Yoga"]);
  assert.equal(gym.reviewCount, 8);
  assert.deepEqual(trainer.subcategoryValues, ["Yoga"]);
  assert.equal(trainer.reviewCount, 0);
});

test("providerType authoritatively normalizes Gym-model and Trainer-model listing types", () => {
  assert.equal(normalizeAdminListing({ owner: { providerType: "sports_academy_owner" } }, "gym").listingType, "sports_academy");
  assert.equal(normalizeAdminListing({ owner: { providerType: "coach" } }, "trainer").listingType, "coach");
  assert.equal(normalizeAdminListing({ owner: null }, "gym").listingType, "gym");
  assert.equal(normalizeAdminListing({ owner: null }, "trainer").listingType, "trainer");
  assert.equal(ADMIN_LISTING_TYPES.nutritionist.modelType, "nutritionist");
});

test("listing type filters are server-side owner filters and preserve legacy generic records", () => {
  const ownerIdsByProviderType = { coach: ["coach-owner"], gym_owner: ["gym-owner"] };
  const recognizedOwnerIdsByModel = { trainer: ["coach-owner"], gym: ["gym-owner"] };
  assert.deepEqual(buildAdminListingTypeFilter({ listingType: "coach", modelType: "trainer", ownerIdsByProviderType, recognizedOwnerIdsByModel }), { owner: { $in: ["coach-owner"] } });
  assert.deepEqual(buildAdminListingTypeFilter({ listingType: "gym", modelType: "gym", ownerIdsByProviderType, recognizedOwnerIdsByModel }), { $or: [{ owner: { $in: ["gym-owner"] } }, { owner: null }, { owner: { $nin: ["gym-owner"] } }] });
  assert.equal(buildAdminListingTypeFilter({ listingType: "coach", modelType: "gym", ownerIdsByProviderType, recognizedOwnerIdsByModel }), null);
});
