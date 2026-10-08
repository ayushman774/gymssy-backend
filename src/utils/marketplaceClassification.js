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
  coach: { label: "Coach", modelType: "trainer", providerTypes: ["coach"] },
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
  const mainCategory =
    modelType === "nutritionist"
      ? "wellness"
      : modelType === "trainer"
        ? doc?.category || null
        : ["Fitness", "Wellness", "Sports"].includes(doc?.category)
          ? doc.category.toLowerCase()
          : GYM_PROVIDER_MAIN_CATEGORY[providerType] || null;

  return { listingType, mainCategory };
}

export function buildMarketplaceListingTypeFilter({
  listingType,
  modelType,
  ownerIdsByProviderType = {},
  recognizedOwnerIdsByModel = {},
}) {
  if (!listingType) return {};
  const config = MARKETPLACE_LISTING_TYPES[listingType];
  if (!config || config.modelType !== modelType) return null;
  if (modelType === "nutritionist") return {};
  const exactOwnerIds = config.providerTypes.flatMap(
    (providerType) => ownerIdsByProviderType[providerType] || [],
  );
  if (!config.includesLegacy) return { owner: { $in: exactOwnerIds } };
  return {
    $or: [
      { owner: { $in: exactOwnerIds } },
      { owner: null },
      { owner: { $nin: recognizedOwnerIdsByModel[modelType] || [] } },
    ],
  };
}

export function combineMarketplaceFilters(...filters) {
  const activeFilters = filters.filter(
    (filter) => filter && Object.keys(filter).length > 0,
  );
  if (activeFilters.length === 0) return {};
  if (activeFilters.length === 1) return activeFilters[0];
  return { $and: activeFilters };
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
  if (categorySlug === "unclassified") {
    if (modelType === "nutritionist") return null;
    const categoryFilter = {
      category: {
        $nin: activeMainCategories.map((item) =>
          modelType === "gym" ? item.name : item.slug,
        ),
      },
    };
    if (modelType !== "gym") return categoryFilter;
    const classifiedOwnerIds = [
      "gym_owner",
      "fitness_centre_owner",
      "wellness_centre_owner",
      "sports_academy_owner",
    ].flatMap((providerType) => ownerIdsByProviderType[providerType] || []);
    return classifiedOwnerIds.length
      ? { $and: [categoryFilter, { owner: { $nin: classifiedOwnerIds } }] }
      : categoryFilter;
  }
  if (modelType === "nutritionist") {
    if (mainCategory.slug !== "wellness") return null;
    if (selectedSubcategory && selectedSubcategory.slug !== "nutrition")
      return null;
    return {};
  }
  if (modelType === "trainer") {
    const filter = { category: mainCategory.slug };
    // Fitness -> Personal Trainers denotes the Trainer listing class, not a literal role value.
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
              { owner: { $in: trainerOwnerIds } },
              { owner: null },
              { owner: { $nin: recognizedProfessionalOwnerIds } },
            ],
          },
        ],
      };
    }
    if (selectedSubcategory) filter.role = selectedSubcategory.name;
    return filter;
  }
  const canonicalNames = activeMainCategories.map((item) => item.name);
  const fallbackProviderTypes =
    {
      fitness: ["gym_owner", "fitness_centre_owner"],
      wellness: ["wellness_centre_owner"],
      sports: ["sports_academy_owner"],
    }[mainCategory.slug] || [];
  const fallbackOwnerIds = fallbackProviderTypes.flatMap(
    (providerType) => ownerIdsByProviderType[providerType] || [],
  );
  const mainFilter = fallbackOwnerIds.length
    ? {
        $or: [
          { category: mainCategory.name },
          {
            category: { $nin: canonicalNames },
            owner: { $in: fallbackOwnerIds },
          },
        ],
      }
    : { category: mainCategory.name };

  if (!selectedSubcategory) return mainFilter;

  // The Fitness > Gyms subcategory represents gym listings,
  // not a requirement for the literal "Gyms" tag.

  if (mainCategory.slug === "fitness" && selectedSubcategory.slug === "gyms") {
    const fitnessVenueOwnerIds = [
      ...(ownerIdsByProviderType.gym_owner || []),
      ...(ownerIdsByProviderType.fitness_centre_owner || []),
    ];

    const recognizedVenueOwnerIds = [
      "gym_owner",
      "fitness_centre_owner",
      "wellness_centre_owner",
      "sports_academy_owner",
      "studio_owner",
    ].flatMap((providerType) => ownerIdsByProviderType[providerType] || []);

    return {
      $and: [
        mainFilter,
        {
          $or: [
            { owner: { $in: fitnessVenueOwnerIds } },
            { owner: null },
            { owner: { $nin: recognizedVenueOwnerIds } },
          ],
        },
      ],
    };
  }

  return {
    $and: [mainFilter, { tags: selectedSubcategory.name }],
  };
}
