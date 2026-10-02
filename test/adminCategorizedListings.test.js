import test from "node:test";
import assert from "node:assert/strict";
import { ADMIN_LISTING_TYPES, buildAdminListingTaxonomyFilter, buildAdminListingTypeFilter, combineAdminListingFilters, normalizeAdminListing } from "../src/controllers/admin/admin.controller.js";

const fitness = { name: "Fitness", slug: "fitness" };
const wellness = { name: "Wellness", slug: "wellness" };
const yoga = { name: "Yoga", slug: "yoga" };

test("categorized filters use each model's canonical taxonomy storage", () => {
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: yoga }), { $and: [{ category: "Fitness" }, { tags: "Yoga" }] });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: yoga }), { category: "fitness", role: "Yoga" });
  assert.equal(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "fitness", mainCategory: fitness }), null);
});

test("unclassified filters retain legacy records and all Nutritionists", () => {
  const activeMainCategories = [fitness, wellness];
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "unclassified", activeMainCategories }), { category: { $nin: ["Fitness", "Wellness"] } });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "unclassified", activeMainCategories }), { category: { $nin: ["fitness", "wellness"] } });
  assert.equal(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "unclassified", activeMainCategories }), null);
});

test("Fitness Personal Trainers classifies Fitness Trainer documents independently of role", () => {
  const personalTrainers = { name: "Personal Trainers", slug: "personal-trainers" };
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: personalTrainers, ownerIdsByProviderType: { trainer: ["trainer-owner"], coach: ["coach-owner"] } }), { $and: [{ category: "fitness" }, { $or: [{ owner: { $in: ["trainer-owner"] } }, { owner: null }, { owner: { $nin: ["trainer-owner", "coach-owner"] } }] }] });
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "trainer", categorySlug: "fitness", mainCategory: fitness, selectedSubcategory: { name: "HIIT", slug: "hiit" } }), { category: "fitness", role: "HIIT" });
});

test("Nutritionists have a fixed validated Wellness and Nutrition classification", () => {
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "wellness", mainCategory: wellness }), {});
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "wellness", mainCategory: wellness, selectedSubcategory: { name: "Nutrition", slug: "nutrition" } }), {});
  assert.equal(buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "wellness", mainCategory: wellness, selectedSubcategory: { name: "Yoga", slug: "yoga" } }), null);
});

test("Gym main-category query gives canonical category precedence with provider fallback", () => {
  const activeMainCategories = [fitness, wellness, { name: "Sports", slug: "sports" }];
  assert.deepEqual(buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "wellness", mainCategory: wellness, activeMainCategories, ownerIdsByProviderType: { wellness_centre_owner: ["wellness-owner"] } }), {
    $or: [{ category: "Wellness" }, { category: { $nin: ["Fitness", "Wellness", "Sports"] }, owner: { $in: ["wellness-owner"] } }],
  });
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

test("Gym type and main-category filters retain both independent OR clauses", () => {
  const taxonomyFilter = buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "fitness", mainCategory: fitness, activeMainCategories: [fitness, wellness], ownerIdsByProviderType: { gym_owner: ["gym-owner"], fitness_centre_owner: ["centre-owner"] } });
  const typeFilter = buildAdminListingTypeFilter({ listingType: "gym", modelType: "gym", ownerIdsByProviderType: { gym_owner: ["gym-owner"] }, recognizedOwnerIdsByModel: { gym: ["gym-owner", "centre-owner"] } });
  assert.deepEqual(combineAdminListingFilters(taxonomyFilter, typeFilter), { $and: [taxonomyFilter, typeFilter] });
  assert.deepEqual(typeFilter.$or, [{ owner: { $in: ["gym-owner"] } }, { owner: null }, { owner: { $nin: ["gym-owner", "centre-owner"] } }]);
});

test("Wellness Gym tags are many-to-many canonical subcategory associations", () => {
  const mains = [fitness, wellness, { name: "Sports", slug: "sports" }];
  const base = { listingType: "gym", categorySlug: "wellness", mainCategory: wellness, activeMainCategories: mains, ownerIdsByProviderType: { wellness_centre_owner: ["wellness-owner"] } };
  const yoga = buildAdminListingTaxonomyFilter({ ...base, selectedSubcategory: { name: "Yoga", slug: "yoga" } });
  const meditation = buildAdminListingTaxonomyFilter({ ...base, selectedSubcategory: { name: "Meditation", slug: "meditation" } });
  assert.deepEqual(yoga.$and[1], { tags: "Yoga" });
  assert.deepEqual(meditation.$and[1], { tags: "Meditation" });
  assert.deepEqual(yoga.$and[0], meditation.$and[0]);
});

test("Wellness Nutrition permits tagged Gym listings and fixed Nutritionists in the same model plan", () => {
  const nutrition = { name: "Nutrition", slug: "nutrition" };
  const gymFilter = buildAdminListingTaxonomyFilter({ listingType: "gym", categorySlug: "wellness", mainCategory: wellness, selectedSubcategory: nutrition, activeMainCategories: [fitness, wellness] });
  const nutritionistFilter = buildAdminListingTaxonomyFilter({ listingType: "nutritionist", categorySlug: "wellness", mainCategory: wellness, selectedSubcategory: nutrition });
  assert.deepEqual(gymFilter, { $and: [{ category: "Wellness" }, { tags: "Nutrition" }] });
  assert.deepEqual(nutritionistFilter, {});
});
