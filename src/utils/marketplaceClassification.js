export const MARKETPLACE_LISTING_TYPES = Object.freeze({
  gym: {
    label: "Gym",
    modelType: "gym",
    providerTypes: ["gym_owner"],
    includesLegacy: true,
  },
  fitness_centre: {
    label: "Fitness Centre",
    modelType: "gym",
    providerTypes: ["fitness_centre_owner"],
  },
  wellness_centre: {
    label: "Wellness Centre",
    modelType: "gym",
    providerTypes: ["wellness_centre_owner"],
  },
  sports_academy: {
    label: "Sports Academy",
    modelType: "gym",
    providerTypes: ["sports_academy_owner"],
  },
  studio: {
    label: "Studio",
    modelType: "gym",
    providerTypes: ["studio_owner"],
  },
  trainer: {
    label: "Trainer",
    modelType: "trainer",
    providerTypes: ["trainer"],
    includesLegacy: true,
  },
  coach: {
    label: "Coach",
    modelType: "trainer",
    providerTypes: ["coach"],
  },
  nutritionist: {
    label: "Nutritionist",
    modelType: "nutritionist",
    providerTypes: ["nutritionist"],
  },
});

const GYM_PROVIDER_MAIN_CATEGORY = Object.freeze({
  gym_owner: "fitness",
  fitness_centre_owner: "fitness",
  wellness_centre_owner: "wellness",
  sports_academy_owner: "sports",
});

const GYM_PROVIDER_LISTING_TYPE = Object.freeze({
  gym_owner: "gym",
  fitness_centre_owner: "fitness_centre",
  wellness_centre_owner: "wellness_centre",
  sports_academy_owner: "sports_academy",
  studio_owner: "studio",
});

const MARKETPLACE_CATEGORIES = ["fitness", "wellness", "sports"];

const normalizeCategory = (value) => {
  if (typeof value !== "string") return null;

  const normalized = value.trim().toLowerCase();

  return MARKETPLACE_CATEGORIES.includes(normalized) ? normalized : null;
};

export function getMarketplaceClassification(doc, modelType) {
  const providerType = doc?.owner?.providerType;

  const listingType =
    modelType === "nutritionist"
      ? "nutritionist"
      : modelType === "trainer"
        ? providerType === "coach"
          ? "coach"
          : "trainer"
        : GYM_PROVIDER_LISTING_TYPE[providerType] || "gym";

  let mainCategory = null;

  if (modelType === "nutritionist") {
    mainCategory = "wellness";
  } else if (modelType === "trainer") {
    mainCategory = doc?.category || null;
  } else {
    mainCategory =
      normalizeCategory(doc?.marketplaceCategory) ||
      normalizeCategory(doc?.category) ||
      GYM_PROVIDER_MAIN_CATEGORY[providerType] ||
      null;
  }

  return {
    listingType,
    mainCategory,
  };
}

export function buildMarketplaceListingTypeFilter({
  listingType,
  modelType,
  ownerIdsByProviderType = {},
  recognizedOwnerIdsByModel = {},
}) {
  if (!listingType) return {};

  const config = MARKETPLACE_LISTING_TYPES[listingType];

  if (!config || config.modelType !== modelType) {
    return null;
  }

  if (modelType === "nutritionist") {
    return {};
  }

  const exactOwnerIds = config.providerTypes.flatMap(
    (providerType) => ownerIdsByProviderType[providerType] || [],
  );

  if (!config.includesLegacy) {
    return {
      owner: { $in: exactOwnerIds },
    };
  }

  return {
    $or: [
      { owner: { $in: exactOwnerIds } },
      { owner: null },
      {
        owner: {
          $nin: recognizedOwnerIdsByModel[modelType] || [],
        },
      },
    ],
  };
}

export function combineMarketplaceFilters(...filters) {
  const activeFilters = filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  );

  if (activeFilters.length === 0) {
    return {};
  }

  if (activeFilters.length === 1) {
    return activeFilters[0];
  }

  return {
    $and: activeFilters,
  };
}

export function buildMarketplaceTaxonomyFilter({
  modelType,
  categorySlug,
  mainCategory,
  selectedSubcategory,
  activeMainCategories = [],
  ownerIdsByProviderType = {},
}) {
  if (!categorySlug) return {};

  const canonicalNames = activeMainCategories.map((item) => item.name);

  const canonicalSlugs = activeMainCategories.map((item) => item.slug);

  // Preserve the existing unclassified filter,
  // while excluding explicitly classified venues.
  if (categorySlug === "unclassified") {
    if (modelType === "nutritionist") {
      return null;
    }

    const categoryFilter = {
      category: {
        $nin: modelType === "gym" ? canonicalNames : canonicalSlugs,
      },
    };

    if (modelType !== "gym") {
      return categoryFilter;
    }

    const classifiedOwnerIds = [
      "gym_owner",
      "fitness_centre_owner",
      "wellness_centre_owner",
      "sports_academy_owner",
    ].flatMap((providerType) => ownerIdsByProviderType[providerType] || []);

    return {
      $and: [
        categoryFilter,
        {
          marketplaceCategory: {
            $in: [null, ""],
          },
        },
        ...(classifiedOwnerIds.length
          ? [
              {
                owner: {
                  $nin: classifiedOwnerIds,
                },
              },
            ]
          : []),
      ],
    };
  }

  // Nutritionist classification.
  if (modelType === "nutritionist") {
    if (mainCategory.slug !== "wellness") {
      return null;
    }

    if (selectedSubcategory && selectedSubcategory.slug !== "nutrition") {
      return null;
    }

    return {};
  }

  // Trainer classification.
  if (modelType === "trainer") {
    const filter = {
      category: mainCategory.slug,
    };

    if (
      selectedSubcategory &&
      mainCategory.slug === "fitness" &&
      selectedSubcategory.slug === "personal-trainers"
    ) {
      const trainerOwnerIds = ownerIdsByProviderType.trainer || [];

      const recognizedProfessionalOwnerIds = [
        ...trainerOwnerIds,
        ...(ownerIdsByProviderType.coach || []),
      ];

      return {
        $and: [
          filter,
          {
            $or: [
              {
                owner: {
                  $in: trainerOwnerIds,
                },
              },
              { owner: null },
              {
                owner: {
                  $nin: recognizedProfessionalOwnerIds,
                },
              },
            ],
          },
        ],
      };
    }

    if (selectedSubcategory) {
      filter.role = selectedSubcategory.name;
    }

    return filter;
  }

  // Gym-model marketplace classification.
  const fallbackProviderTypes =
    {
      fitness: ["gym_owner", "fitness_centre_owner"],
      wellness: ["wellness_centre_owner"],
      sports: ["sports_academy_owner"],
    }[mainCategory.slug] || [];

  const fallbackOwnerIds = fallbackProviderTypes.flatMap(
    (providerType) => ownerIdsByProviderType[providerType] || [],
  );

  const legacyMainFilter = {
    $or: [
      // Legacy records using canonical main-category names.
      {
        category: mainCategory.name,
      },

      // Legacy records classified through their provider.
      {
        category: {
          $nin: canonicalNames,
        },
        owner: {
          $in: fallbackOwnerIds,
        },
      },

      // Older fitness venues may have descriptive business
      // categories rather than the canonical "Fitness" value.
      // Match only recognizable gym category names.
      ...(mainCategory.slug === "fitness"
        ? [
            {
              category: {
                $regex:
                  /^(?:24\s*\/\s*7\s+)?(?:gym|gyms|fitness\s+(?:gym|centre|center|club)|health\s+club|weightlifting\s+gym)$/i,
              },
            },
          ]
        : []),
    ],
  };

  const explicitMainFilter = {
    marketplaceCategory: mainCategory.slug,
  };

  const legacyClassificationCondition = {
    $or: [
      {
        marketplaceCategory: {
          $exists: false,
        },
      },
      {
        marketplaceCategory: null,
      },
      {
        marketplaceCategory: "",
      },
    ],
  };

  const legacyMainCategoryFilter = {
    $and: [legacyClassificationCondition, legacyMainFilter],
  };

  // Main category only.
  if (!selectedSubcategory) {
    return {
      $or: [explicitMainFilter, legacyMainCategoryFilter],
    };
  }

  const subcategorySlug = selectedSubcategory.slug;

  // Explicitly classified listings must match
  // both the main category and subcategory.
  const explicitSubcategoryFilter = {
    $and: [
      explicitMainFilter,
      {
        marketplaceSubcategories: subcategorySlug,
      },
    ],
  };

  // Preserve legacy Fitness > Gyms behavior.
  // Other legacy subcategories continue to use tags.
  let legacySubcategoryCondition;

  if (mainCategory.slug === "fitness" && subcategorySlug === "gyms") {
    const recognizedVenueOwnerIds = [
      "gym_owner",
      "fitness_centre_owner",
      "wellness_centre_owner",
      "sports_academy_owner",
      "studio_owner",
    ].flatMap((providerType) => ownerIdsByProviderType[providerType] || []);

    legacySubcategoryCondition = {
      $or: [
        {
          owner: {
            $in: fallbackOwnerIds,
          },
        },
        {
          owner: null,
        },
        {
          owner: {
            $nin: recognizedVenueOwnerIds,
          },
        },
      ],
    };
  } else {
    legacySubcategoryCondition = {
      tags: selectedSubcategory.name,
    };
  }

  const legacySubcategoryFilter = {
    $and: [legacyMainCategoryFilter, legacySubcategoryCondition],
  };

  return {
    $or: [explicitSubcategoryFilter, legacySubcategoryFilter],
  };
}
