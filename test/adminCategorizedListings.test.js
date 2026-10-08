import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_LISTING_TYPES,
  buildAdminListingTaxonomyFilter,
  buildAdminListingTypeFilter,
  combineAdminListingFilters,
  normalizeAdminListing,
} from "../src/controllers/admin/admin.controller.js";

const fitness = {
  name: "Fitness",
  slug: "fitness",
};

const wellness = {
  name: "Wellness",
  slug: "wellness",
};

const sports = {
  name: "Sports",
  slug: "sports",
};

const mains = [fitness, wellness, sports];

const yoga = {
  name: "Yoga",
  slug: "yoga",
};

const gyms = {
  name: "Gyms",
  slug: "gyms",
};

const nutrition = {
  name: "Nutrition",
  slug: "nutrition",
};

function taxonomy(options) {
  return buildAdminListingTaxonomyFilter(options);
}

function assertExplicitSubcategory(filter, category, subcategory) {
  assert.deepEqual(filter.$or[0], {
    $and: [
      { marketplaceCategory: category },
      { marketplaceSubcategories: subcategory },
    ],
  });
}

function assertLegacyFallback(filter, categoryName, tagName) {
  const legacy = filter.$or[1];

  assert.ok(legacy);
  assert.ok(Array.isArray(legacy.$and));

  assert.deepEqual(legacy.$and[1], {
    tags: tagName,
  });

  const legacyMain = legacy.$and[0];

  assert.ok(Array.isArray(legacyMain.$and));

  const serialized = JSON.stringify(legacyMain);

  assert.ok(serialized.includes("marketplaceCategory"));

  assert.ok(serialized.includes(categoryName));
}

test("categorized filters support explicit and legacy taxonomy", () => {
  const gymFilter = taxonomy({
    listingType: "gym",
    categorySlug: "fitness",
    mainCategory: fitness,
    selectedSubcategory: yoga,
  });

  assertExplicitSubcategory(gymFilter, "fitness", "yoga");

  assertLegacyFallback(gymFilter, "Fitness", "Yoga");

  assert.deepEqual(
    taxonomy({
      listingType: "trainer",
      categorySlug: "fitness",
      mainCategory: fitness,
      selectedSubcategory: yoga,
    }),
    {
      category: "fitness",
      role: "Yoga",
    },
  );

  assert.equal(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "fitness",
      mainCategory: fitness,
    }),
    null,
  );
});

test("unclassified filters exclude explicitly classified Gyms", () => {
  const gymFilter = taxonomy({
    listingType: "gym",
    categorySlug: "unclassified",
    activeMainCategories: [fitness, wellness],
  });

  assert.deepEqual(gymFilter, {
    $and: [
      {
        category: {
          $nin: ["Fitness", "Wellness"],
        },
      },
      {
        marketplaceCategory: {
          $in: [null, ""],
        },
      },
    ],
  });

  assert.deepEqual(
    taxonomy({
      listingType: "trainer",
      categorySlug: "unclassified",
      activeMainCategories: [fitness, wellness],
    }),
    {
      category: {
        $nin: ["fitness", "wellness"],
      },
    },
  );

  assert.equal(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "unclassified",
      activeMainCategories: [fitness, wellness],
    }),
    null,
  );
});

test("Fitness Personal Trainers retain their provider classification", () => {
  const personalTrainers = {
    name: "Personal Trainers",
    slug: "personal-trainers",
  };

  assert.deepEqual(
    taxonomy({
      listingType: "trainer",
      categorySlug: "fitness",
      mainCategory: fitness,
      selectedSubcategory: personalTrainers,
      ownerIdsByProviderType: {
        trainer: ["trainer-owner"],
        coach: ["coach-owner"],
      },
    }),
    {
      $and: [
        {
          category: "fitness",
        },
        {
          $or: [
            {
              owner: {
                $in: ["trainer-owner"],
              },
            },
            {
              owner: null,
            },
            {
              owner: {
                $nin: ["trainer-owner", "coach-owner"],
              },
            },
          ],
        },
      ],
    },
  );

  assert.deepEqual(
    taxonomy({
      listingType: "trainer",
      categorySlug: "fitness",
      mainCategory: fitness,
      selectedSubcategory: {
        name: "HIIT",
        slug: "hiit",
      },
    }),
    {
      category: "fitness",
      role: "HIIT",
    },
  );
});

test("Nutritionists remain fixed to Wellness and Nutrition", () => {
  assert.deepEqual(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "wellness",
      mainCategory: wellness,
    }),
    {},
  );

  assert.deepEqual(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "wellness",
      mainCategory: wellness,
      selectedSubcategory: nutrition,
    }),
    {},
  );

  assert.equal(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "wellness",
      mainCategory: wellness,
      selectedSubcategory: yoga,
    }),
    null,
  );
});

test("Gym main-category filters prioritize explicit taxonomy and retain provider fallback", () => {
  const filter = taxonomy({
    listingType: "gym",
    categorySlug: "wellness",
    mainCategory: wellness,
    activeMainCategories: mains,
    ownerIdsByProviderType: {
      wellness_centre_owner: ["wellness-owner"],
    },
  });

  assert.deepEqual(filter.$or[0], {
    marketplaceCategory: "wellness",
  });

  const legacy = filter.$or[1];

  assert.deepEqual(legacy.$and[1], {
    $or: [
      {
        category: "Wellness",
      },
      {
        category: {
          $nin: ["Fitness", "Wellness", "Sports"],
        },
        owner: {
          $in: ["wellness-owner"],
        },
      },
    ],
  });

  assert.ok(JSON.stringify(legacy.$and[0]).includes("marketplaceCategory"));
});

test("admin normalization retains existing review and subcategory fields", () => {
  const gym = normalizeAdminListing(
    {
      _id: "gym-1",
      name: "Gym",
      category: "Fitness",
      tags: ["Yoga"],
      rating: 4.2,
      reviews: 8,
    },
    "gym",
  );

  const trainer = normalizeAdminListing(
    {
      _id: "trainer-1",
      name: "Coach",
      category: "fitness",
      role: "Yoga",
    },
    "trainer",
  );

  assert.deepEqual(gym.subcategoryValues, ["Yoga"]);

  assert.equal(gym.reviewCount, 8);

  assert.deepEqual(trainer.subcategoryValues, ["Yoga"]);

  assert.equal(trainer.reviewCount, 0);
});

test("providerType determines listing type independently of marketplace taxonomy", () => {
  assert.equal(
    normalizeAdminListing(
      {
        owner: {
          providerType: "sports_academy_owner",
        },
      },
      "gym",
    ).listingType,
    "sports_academy",
  );

  assert.equal(
    normalizeAdminListing(
      {
        owner: {
          providerType: "coach",
        },
      },
      "trainer",
    ).listingType,
    "coach",
  );

  assert.equal(
    normalizeAdminListing({ owner: null }, "gym").listingType,
    "gym",
  );

  assert.equal(
    normalizeAdminListing({ owner: null }, "trainer").listingType,
    "trainer",
  );

  assert.equal(ADMIN_LISTING_TYPES.nutritionist.modelType, "nutritionist");
});

test("listing type filters remain server-side and preserve legacy records", () => {
  const ownerIdsByProviderType = {
    coach: ["coach-owner"],
    gym_owner: ["gym-owner"],
  };

  const recognizedOwnerIdsByModel = {
    trainer: ["coach-owner"],
    gym: ["gym-owner"],
  };

  assert.deepEqual(
    buildAdminListingTypeFilter({
      listingType: "coach",
      modelType: "trainer",
      ownerIdsByProviderType,
      recognizedOwnerIdsByModel,
    }),
    {
      owner: {
        $in: ["coach-owner"],
      },
    },
  );

  assert.deepEqual(
    buildAdminListingTypeFilter({
      listingType: "gym",
      modelType: "gym",
      ownerIdsByProviderType,
      recognizedOwnerIdsByModel,
    }),
    {
      $or: [
        {
          owner: {
            $in: ["gym-owner"],
          },
        },
        {
          owner: null,
        },
        {
          owner: {
            $nin: ["gym-owner"],
          },
        },
      ],
    },
  );

  assert.equal(
    buildAdminListingTypeFilter({
      listingType: "coach",
      modelType: "gym",
      ownerIdsByProviderType,
      recognizedOwnerIdsByModel,
    }),
    null,
  );
});

test("Gym type and taxonomy filters remain independent", () => {
  const taxonomyFilter = taxonomy({
    listingType: "gym",
    categorySlug: "fitness",
    mainCategory: fitness,
    activeMainCategories: [fitness, wellness],
    ownerIdsByProviderType: {
      gym_owner: ["gym-owner"],
      fitness_centre_owner: ["centre-owner"],
    },
  });

  const typeFilter = buildAdminListingTypeFilter({
    listingType: "gym",
    modelType: "gym",
    ownerIdsByProviderType: {
      gym_owner: ["gym-owner"],
    },
    recognizedOwnerIdsByModel: {
      gym: ["gym-owner", "centre-owner"],
    },
  });

  assert.deepEqual(combineAdminListingFilters(taxonomyFilter, typeFilter), {
    $and: [taxonomyFilter, typeFilter],
  });

  assert.deepEqual(typeFilter.$or, [
    {
      owner: {
        $in: ["gym-owner"],
      },
    },
    {
      owner: null,
    },
    {
      owner: {
        $nin: ["gym-owner", "centre-owner"],
      },
    },
  ]);
});

test("Wellness supports multiple canonical subcategories", () => {
  const base = {
    listingType: "gym",
    categorySlug: "wellness",
    mainCategory: wellness,
    activeMainCategories: mains,
    ownerIdsByProviderType: {
      wellness_centre_owner: ["wellness-owner"],
    },
  };

  const yogaFilter = taxonomy({
    ...base,
    selectedSubcategory: yoga,
  });

  const meditationFilter = taxonomy({
    ...base,
    selectedSubcategory: {
      name: "Meditation",
      slug: "meditation",
    },
  });

  assertExplicitSubcategory(yogaFilter, "wellness", "yoga");

  assertExplicitSubcategory(meditationFilter, "wellness", "meditation");

  assertLegacyFallback(yogaFilter, "Wellness", "Yoga");

  assertLegacyFallback(meditationFilter, "Wellness", "Meditation");

  assert.deepEqual(yogaFilter.$or[1].$and[0], meditationFilter.$or[1].$and[0]);
});

test("Wellness Nutrition includes classified venues and Nutritionists", () => {
  const gymFilter = taxonomy({
    listingType: "gym",
    categorySlug: "wellness",
    mainCategory: wellness,
    selectedSubcategory: nutrition,
    activeMainCategories: [fitness, wellness],
  });

  assertExplicitSubcategory(gymFilter, "wellness", "nutrition");

  assertLegacyFallback(gymFilter, "Wellness", "Nutrition");

  assert.deepEqual(
    taxonomy({
      listingType: "nutritionist",
      categorySlug: "wellness",
      mainCategory: wellness,
      selectedSubcategory: nutrition,
    }),
    {},
  );
});

test("Fitness Gyms use explicit classification and preserve legacy owner matching", () => {
  const filter = taxonomy({
    listingType: "gym",
    categorySlug: "fitness",
    mainCategory: fitness,
    selectedSubcategory: gyms,
    activeMainCategories: mains,
    ownerIdsByProviderType: {
      gym_owner: ["gym-owner"],
      fitness_centre_owner: ["centre-owner"],
      sports_academy_owner: ["sports-owner"],
      wellness_centre_owner: ["wellness-owner"],
    },
  });

  assertExplicitSubcategory(filter, "fitness", "gyms");

  const legacy = filter.$or[1];

  assert.ok(Array.isArray(legacy.$and));

  const serialized = JSON.stringify(legacy);

  assert.ok(serialized.includes("gym-owner"));

  assert.ok(serialized.includes("centre-owner"));

  assert.ok(serialized.includes("sports-owner"));

  assert.ok(serialized.includes("wellness-owner"));
});

test("Sports subcategories require the Sports marketplace classification", () => {
  const boxing = {
    name: "Boxing",
    slug: "boxing",
  };

  const filter = taxonomy({
    listingType: "gym",
    categorySlug: "sports",
    mainCategory: sports,
    selectedSubcategory: boxing,
    activeMainCategories: mains,
    ownerIdsByProviderType: {
      sports_academy_owner: ["sports-owner"],
    },
  });

  assertExplicitSubcategory(filter, "sports", "boxing");

  assertLegacyFallback(filter, "Sports", "Boxing");
});
