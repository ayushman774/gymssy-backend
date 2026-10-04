import mongoose from "mongoose";
import User from "../../models/users/User.js";
import ProviderProfile from "../../models/providers/ProviderProfile.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import Category from "../../models/categories/Category.js";
import { getListingUpdateUnsupportedFields, ListingContractError, prepareListingContentUpdate } from "../providers/providerListing.controller.js";
import { toAdminGymImages } from "../../utils/gymMedia.js";
import {
  MARKETPLACE_LISTING_TYPES,
  buildMarketplaceListingTypeFilter,
  buildMarketplaceTaxonomyFilter,
  combineMarketplaceFilters,
  getMarketplaceClassification,
} from "../../utils/marketplaceClassification.js";

// ============================================================
// ADMIN DASHBOARD
// ============================================================

export const getAdminDashboard = async (req, res) => {
  try {
    // ==========================================================
    // 1. USER COUNTS
    // ==========================================================

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      verifiedUsers,
      unverifiedUsers,
      totalAdmins,
      totalProviders,
      activeProviders,
      inactiveProviders,
    ] = await Promise.all([
      User.countDocuments({ role: "user" }),

      User.countDocuments({
        role: "user",
        isActive: true,
      }),

      User.countDocuments({
        role: "user",
        isActive: false,
      }),

      User.countDocuments({
        role: "user",
        isEmailVerified: true,
      }),

      User.countDocuments({
        role: "user",
        isEmailVerified: false,
      }),

      User.countDocuments({ role: "admin" }),

      User.countDocuments({ role: "business" }),

      User.countDocuments({
        role: "business",
        isActive: true,
      }),

      User.countDocuments({
        role: "business",
        isActive: false,
      }),
    ]);

    // ==========================================================
    // 2. PROVIDER TYPE BREAKDOWN
    // ==========================================================

    const providerTypeBreakdown = await User.aggregate([
      {
        $match: {
          role: "business",
          providerType: {
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$providerType",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    // ==========================================================
    // 3. PROVIDER PROFILE COUNTS
    // ==========================================================

    const [
      totalProviderProfiles,
      activeProviderProfiles,
      verifiedProviderProfiles,
      unverifiedProviderProfiles,
    ] = await Promise.all([
      ProviderProfile.countDocuments(),

      ProviderProfile.countDocuments({
        isActive: true,
      }),

      ProviderProfile.countDocuments({
        isVerified: true,
      }),

      ProviderProfile.countDocuments({
        isVerified: false,
      }),
    ]);

    // ==========================================================
    // 4. LISTING COUNTS
    //
    // Total listings = Gym + Trainer + Nutritionist
    //
    // Embedded trainers inside Gym documents are NOT counted
    // separately.
    // ==========================================================

    const [
      totalGyms,
      activeGyms,
      inactiveGyms,
      verifiedGyms,
      unverifiedGyms,
      featuredGyms,

      totalTrainers,
      activeTrainers,
      inactiveTrainers,
      verifiedTrainers,
      unverifiedTrainers,
      featuredTrainers,

      totalNutritionists,
      activeNutritionists,
      inactiveNutritionists,
      verifiedNutritionists,
      unverifiedNutritionists,
      featuredNutritionists,
    ] = await Promise.all([
      // --------------------------------------------------------
      // GYMS
      // --------------------------------------------------------

      Gym.countDocuments(),

      Gym.countDocuments({
        isActive: true,
      }),

      Gym.countDocuments({
        isActive: false,
      }),

      Gym.countDocuments({
        verified: true,
      }),

      Gym.countDocuments({
        verified: false,
      }),

      Gym.countDocuments({
        featured: true,
      }),

      // --------------------------------------------------------
      // TRAINERS
      // --------------------------------------------------------

      Trainer.countDocuments(),

      Trainer.countDocuments({
        isActive: true,
      }),

      Trainer.countDocuments({
        isActive: false,
      }),

      Trainer.countDocuments({
        isVerified: true,
      }),

      Trainer.countDocuments({
        isVerified: false,
      }),

      Trainer.countDocuments({
        featured: true,
      }),

      // --------------------------------------------------------
      // NUTRITIONISTS
      // --------------------------------------------------------

      Nutritionist.countDocuments(),

      Nutritionist.countDocuments({
        isActive: true,
      }),

      Nutritionist.countDocuments({
        isActive: false,
      }),

      Nutritionist.countDocuments({
        isVerified: true,
      }),

      Nutritionist.countDocuments({
        isVerified: false,
      }),

      Nutritionist.countDocuments({
        featured: true,
      }),
    ]);

    const totalListings = totalGyms + totalTrainers + totalNutritionists;

    const activeListings = activeGyms + activeTrainers + activeNutritionists;

    const inactiveListings =
      inactiveGyms + inactiveTrainers + inactiveNutritionists;

    // ==========================================================
    // 5. RECENT ACTIVITY
    //
    // Real records only.
    // No fake activity and no approval assumptions.
    // ==========================================================

    const [
      recentUsers,
      recentProviders,
      recentGyms,
      recentTrainers,
      recentNutritionists,
    ] = await Promise.all([
      User.find({
        role: "user",
      })
        .select("name email createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      User.find({
        role: "business",
      })
        .select("name email providerType createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Gym.find({})
        .select("name slug createdAt isActive verified")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Trainer.find({})
        .select("name slug createdAt isActive isVerified")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),

      Nutritionist.find({})
        .select("name slug createdAt isActive isVerified")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    // ==========================================================
    // NORMALIZE RECENT ACTIVITY
    // ==========================================================

    const recentActivity = [
      ...recentUsers.map((user) => ({
        type: "user",
        action: "registered",
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      })),

      ...recentProviders.map((provider) => ({
        type: "provider",
        action: "registered",
        name: provider.name,
        email: provider.email,
        providerType: provider.providerType,
        createdAt: provider.createdAt,
      })),

      ...recentGyms.map((gym) => ({
        type: "gym",
        action: "created",
        name: gym.name,
        slug: gym.slug,
        isActive: gym.isActive,
        verified: gym.verified,
        createdAt: gym.createdAt,
      })),

      ...recentTrainers.map((trainer) => ({
        type: "trainer",
        action: "created",
        name: trainer.name,
        slug: trainer.slug,
        isActive: trainer.isActive,
        isVerified: trainer.isVerified,
        createdAt: trainer.createdAt,
      })),

      ...recentNutritionists.map((nutritionist) => ({
        type: "nutritionist",
        action: "created",
        name: nutritionist.name,
        slug: nutritionist.slug,
        isActive: nutritionist.isActive,
        isVerified: nutritionist.isVerified,
        createdAt: nutritionist.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // ==========================================================
    // 6. RESPONSE
    // ==========================================================

    return res.status(200).json({
      success: true,
      message: "Admin dashboard data fetched successfully",

      data: {
        // ------------------------------------------------------
        // OVERVIEW
        // ------------------------------------------------------

        overview: {
          totalUsers,
          totalProviders,
          totalListings,
          activeListings,
          inactiveListings,
          totalAdmins,
        },

        // ------------------------------------------------------
        // USERS
        // ------------------------------------------------------

        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          verified: verifiedUsers,
          unverified: unverifiedUsers,
        },

        // ------------------------------------------------------
        // PROVIDERS
        // ------------------------------------------------------

        providers: {
          total: totalProviders,
          active: activeProviders,
          inactive: inactiveProviders,

          profiles: {
            total: totalProviderProfiles,
            active: activeProviderProfiles,
            verified: verifiedProviderProfiles,
            unverified: unverifiedProviderProfiles,
          },

          byType: providerTypeBreakdown.map((item) => ({
            type: item._id,
            count: item.count,
          })),
        },

        // ------------------------------------------------------
        // LISTINGS
        // ------------------------------------------------------

        listings: {
          total: totalListings,
          active: activeListings,
          inactive: inactiveListings,

          gyms: {
            total: totalGyms,
            active: activeGyms,
            inactive: inactiveGyms,
            verified: verifiedGyms,
            unverified: unverifiedGyms,
            featured: featuredGyms,
          },

          trainers: {
            total: totalTrainers,
            active: activeTrainers,
            inactive: inactiveTrainers,
            verified: verifiedTrainers,
            unverified: unverifiedTrainers,
            featured: featuredTrainers,
          },

          nutritionists: {
            total: totalNutritionists,
            active: activeNutritionists,
            inactive: inactiveNutritionists,
            verified: verifiedNutritionists,
            unverified: unverifiedNutritionists,
            featured: featuredNutritionists,
          },
        },

        // ------------------------------------------------------
        // VERIFICATION
        // ------------------------------------------------------

        verification: {
          users: {
            verified: verifiedUsers,
            unverified: unverifiedUsers,
          },

          providers: {
            verified: verifiedProviderProfiles,
            unverified: unverifiedProviderProfiles,
          },

          gyms: {
            verified: verifiedGyms,
            unverified: unverifiedGyms,
          },

          trainers: {
            verified: verifiedTrainers,
            unverified: unverifiedTrainers,
          },

          nutritionists: {
            verified: verifiedNutritionists,
            unverified: unverifiedNutritionists,
          },
        },

        // ------------------------------------------------------
        // RECENT ACTIVITY
        // ------------------------------------------------------

        recentActivity,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin dashboard data",
    });
  }
};

// ============================================================
// GET ALL PROVIDERS - ADMIN
// ============================================================
//
// Read-only provider management endpoint.
//
// Provider accounts are User documents where:
// role === "business"
//
// ProviderProfile is optional, so the response also includes:
// profileExists
//
// This endpoint does not modify provider data.
// ============================================================

export const getAdminProviders = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // QUERY PARAMETERS
    // ----------------------------------------------------------

    const {
      search = "",
      providerType = "",
      status = "",
      page = 1,
      limit = 10,
    } = req.query;

    // ----------------------------------------------------------
    // PAGINATION
    // ----------------------------------------------------------

    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);

    const perPage = Math.min(
      Math.max(Number.parseInt(limit, 10) || 10, 1),
      100,
    );

    const skip = (currentPage - 1) * perPage;

    // ----------------------------------------------------------
    // BASE FILTER
    // ----------------------------------------------------------

    const filter = {
      role: "business",
    };

    // ----------------------------------------------------------
    // SEARCH
    // ----------------------------------------------------------

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // ----------------------------------------------------------
    // PROVIDER TYPE FILTER
    // ----------------------------------------------------------

    if (providerType.trim()) {
      filter.providerType = providerType.trim();
    }

    // ----------------------------------------------------------
    // ACTIVE / INACTIVE FILTER
    // ----------------------------------------------------------

    if (status === "active") {
      filter.isActive = true;
    }

    if (status === "inactive") {
      filter.isActive = false;
    }

    // ----------------------------------------------------------
    // FETCH PROVIDERS AND COUNT
    // ----------------------------------------------------------

    const [providers, totalProviders] = await Promise.all([
      User.find(filter)
        .select(
          "name email phone role providerType isActive isEmailVerified avatar createdAt updatedAt",
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(perPage)
        .lean(),

      User.countDocuments(filter),
    ]);

    // ----------------------------------------------------------
    // FETCH RELATED PROVIDER PROFILES
    // ----------------------------------------------------------

    const providerUserIds = providers.map((provider) => provider._id);

    const providerProfiles = await ProviderProfile.find({
      user: { $in: providerUserIds },
    })
      .select(
        "user businessName phone email website location isVerified isActive createdAt updatedAt avatar",
      )
      .lean();

    // ----------------------------------------------------------
    // CREATE PROFILE LOOKUP
    // ----------------------------------------------------------

    const profileMap = new Map(
      providerProfiles.map((profile) => [profile.user.toString(), profile]),
    );

    // ----------------------------------------------------------
    // FORMAT RESPONSE
    // ----------------------------------------------------------

    const formattedProviders = providers.map((provider) => {
      const profile = profileMap.get(provider._id.toString()) || null;

      return {
        id: provider._id,

        name: provider.name,
        email: provider.email,
        phone: provider.phone || "",

        role: provider.role,
        providerType: provider.providerType || "other",

        isActive: provider.isActive,
        isEmailVerified: provider.isEmailVerified,

        avatar: provider.avatar || {
          url: "",
          alt: "",
        },

        profileExists: Boolean(profile),

        profile: profile
          ? {
              id: profile._id,
              businessName: profile.businessName || "",
              phone: profile.phone || "",
              email: profile.email || "",
              website: profile.website || "",

              location: profile.location || {
                address: "",
                area: "",
                city: "",
                state: "",
                pincode: "",
              },

              isVerified: profile.isVerified,
              isActive: profile.isActive,

              avatar: profile.avatar || {
                url: "",
                alt: "",
              },

              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
            }
          : null,

        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      };
    });

    // ----------------------------------------------------------
    // PAGINATION METADATA
    // ----------------------------------------------------------

    const totalPages = Math.ceil(totalProviders / perPage);

    return res.status(200).json({
      success: true,
      message: "Admin providers fetched successfully",

      data: {
        providers: formattedProviders,

        pagination: {
          totalProviders,
          totalPages,
          currentPage,
          perPage,
          hasNextPage: currentPage < totalPages,
          hasPreviousPage: currentPage > 1,
        },

        filters: {
          search: trimmedSearch,
          providerType: providerType.trim(),
          status,
        },
      },
    });
  } catch (error) {
    console.error("Get admin providers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin providers",
    });
  }
};

// ============================================================
// GET SINGLE PROVIDER DETAILS - ADMIN
// ============================================================
//
// Read-only provider details endpoint.
//
// Provider account comes from User where role === "business".
// ProviderProfile is optional.
//
// No edit, delete, approval, or ownership logic is included.
// ============================================================

export const getAdminProviderById = async (req, res) => {
  try {
    const { id } = req.params;

    // ----------------------------------------------------------
    // VALIDATE MONGODB ID
    // ----------------------------------------------------------

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    // ----------------------------------------------------------
    // FETCH PROVIDER ACCOUNT
    // ----------------------------------------------------------

    const provider = await User.findOne({
      _id: id,
      role: "business",
    })
      .select(
        "name email phone role providerType isActive isEmailVerified avatar createdAt updatedAt",
      )
      .lean();

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    // ----------------------------------------------------------
    // FETCH PROVIDER PROFILE
    // ----------------------------------------------------------

    const providerProfile = await ProviderProfile.findOne({
      user: provider._id,
    })
      .select(
        "businessName bio phone email website avatar location socialLinks isVerified isActive createdAt updatedAt",
      )
      .lean();

    const { listings, listingSummary } =
      await findNormalizedProviderListings(provider._id);

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Admin provider details fetched successfully",

      data: {
        provider: {
          id: provider._id,

          name: provider.name,
          email: provider.email,
          phone: provider.phone || "",

          role: provider.role,
          providerType: provider.providerType || "other",

          isActive: provider.isActive,
          isEmailVerified: provider.isEmailVerified,

          avatar: provider.avatar || {
            url: "",
            alt: "",
          },

          createdAt: provider.createdAt,
          updatedAt: provider.updatedAt,
        },

        profileExists: Boolean(providerProfile),

        profile: providerProfile
          ? {
              id: providerProfile._id,

              businessName: providerProfile.businessName || "",
              bio: providerProfile.bio || "",

              phone: providerProfile.phone || "",
              email: providerProfile.email || "",
              website: providerProfile.website || "",

              avatar: providerProfile.avatar || {
                url: "",
                alt: "",
              },

              location: providerProfile.location || {
                address: "",
                area: "",
                city: "",
                state: "",
                pincode: "",
              },

              socialLinks: providerProfile.socialLinks || {
                instagram: "",
                facebook: "",
                youtube: "",
                linkedin: "",
              },

              isVerified: providerProfile.isVerified,
              isActive: providerProfile.isActive,

              createdAt: providerProfile.createdAt,
              updatedAt: providerProfile.updatedAt,
            }
          : null,
        listings,
        listingSummary,
      },
    });
  } catch (error) {
    console.error("Get admin provider details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin provider details",
    });
  }
};

// ============================================================
// ADMIN LISTING HELPERS
// ============================================================

/**
 * Normalizes a listing document from any of the three models
 * into a consistent admin-facing structure.
 */
export const normalizeAdminListing = (doc, type) => {
  const { listingType, mainCategory: normalizedMainCategory } = getMarketplaceClassification(doc, type);
  return {
    id: doc._id,
    type,
    modelType: type,
    listingType,
    mainCategory: normalizedMainCategory,
    marketplaceSubcategorySlugs: type === "nutritionist" ? ["nutrition"] : type === "trainer" && doc.category === "fitness" ? ["personal-trainers"] : [],
    name: doc.name,
    slug: doc.slug,
    owner: doc.owner,
    category: doc.category,
    subcategoryValues:
      type === "gym"
        ? Array.isArray(doc.tags)
          ? doc.tags
          : []
        : doc.role
          ? [doc.role]
          : [],
    city: doc.city ? (typeof doc.city === "object" ? doc.city.name : doc.city) : null,
    isActive: doc.isActive,
    isVerified: doc.verified !== undefined ? doc.verified : doc.isVerified,
    featured: doc.featured,
    moderationStatus: doc.moderationStatus,
    rating: doc.rating ?? 0,
    reviewCount: doc.reviews ?? 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
};

/**
 * Resolves the appropriate model based on listing type string.
 */
const getModelByType = (type) => {
  switch (type) {
    case "gym":
      return Gym;
    case "trainer":
    case "coach":
      return Trainer;
    case "nutritionist":
      return Nutritionist;
    default:
      return null;
  }
};

// ============================================================
// GET ALL LISTINGS - ADMIN
// ============================================================
//
// Fetches marketplace listings across Gyms, Trainers, and Nutritionists.
// Supports filtering by type, status, search, and city.
// ============================================================

export const getAdminListings = async (req, res) => {
  try {
    const {
      search = "",
      type = "", // gym, trainer, nutritionist
      status = "", // active, inactive
      city = "", // cityId
      category = "", // active main-category slug, or "unclassified"
      subcategory = "", // active subcategory slug
      moderationStatus = "",
      verification = "",
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * perPage;

    if (type && !ADMIN_LISTING_TYPES[type]) {
      return res.status(400).json({ success: false, message: "Invalid listing type" });
    }

    const providerTypes = [...new Set(Object.values(ADMIN_LISTING_TYPES).flatMap((config) => config.providerTypes))];
    const listingOwners = await User.find({ role: "business", providerType: { $in: providerTypes } }).select("_id providerType").lean();
    const ownerIdsByProviderType = Object.fromEntries(providerTypes.map((providerType) => [providerType, []]));
    for (const owner of listingOwners) ownerIdsByProviderType[owner.providerType].push(owner._id);
    const recognizedOwnerIdsByModel = {
      gym: Object.values(ADMIN_LISTING_TYPES).filter((config) => config.modelType === "gym").flatMap((config) => config.providerTypes.flatMap((providerType) => ownerIdsByProviderType[providerType])),
      trainer: Object.values(ADMIN_LISTING_TYPES).filter((config) => config.modelType === "trainer").flatMap((config) => config.providerTypes.flatMap((providerType) => ownerIdsByProviderType[providerType])),
    };

    const normalizedCategory = String(category).trim().toLowerCase();
    const normalizedSubcategory = String(subcategory).trim().toLowerCase();
    let mainCategory = null;
    let selectedSubcategory = null;
    let activeMainCategories = [];

    if (normalizedCategory === "unclassified") {
      activeMainCategories = await Category.find({
        type: "main",
        parentCategory: null,
        isActive: true,
      }).lean();
      if (normalizedSubcategory) {
        return res.status(400).json({
          success: false,
          message: "Subcategory is not available for unclassified listings",
        });
      }
    } else if (normalizedCategory) {
      mainCategory = await Category.findOne({
        slug: normalizedCategory,
        type: "main",
        parentCategory: null,
        isActive: true,
      }).lean();
      if (!mainCategory) {
        return res.status(404).json({ success: false, message: "Listing category not found" });
      }
      activeMainCategories = await Category.find({ type: "main", parentCategory: null, isActive: true }).lean();
      if (normalizedSubcategory) {
        selectedSubcategory = await Category.findOne({
          slug: normalizedSubcategory,
          type: "subcategory",
          parentCategory: mainCategory._id,
          isActive: true,
        }).lean();
        if (!selectedSubcategory) {
          return res.status(400).json({
            success: false,
            message: `Subcategory does not belong to ${mainCategory.name}`,
          });
        }
      }
    } else if (normalizedSubcategory) {
      return res.status(400).json({
        success: false,
        message: "A main category is required when filtering by subcategory",
      });
    }
    if (normalizedCategory && !["unclassified", "wellness"].includes(normalizedCategory) && type === "nutritionist") {
      return res.status(400).json({ success: false, message: "Nutritionist listings are not classified under marketplace categories" });
    }

    // Filters shared by all listing models.
    const commonFilter = {};
    if (status === "active") commonFilter.isActive = true;
    if (status === "inactive") commonFilter.isActive = false;
    if (moderationStatus) commonFilter.moderationStatus = moderationStatus;

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      commonFilter.name = searchRegex;
    }

    const taxonomyFilterFor = (listingType) => buildAdminListingTaxonomyFilter({
      listingType,
      categorySlug: normalizedCategory,
      mainCategory,
      selectedSubcategory,
      activeMainCategories,
      ownerIdsByProviderType,
    });
    const filterFor = (listingType, options = {}) => {
      const taxonomyFilter = taxonomyFilterFor(listingType);
      if (taxonomyFilter === null) return null;
      const listingTypeFilter = buildAdminListingTypeFilter({ listingType: type, modelType: listingType, ownerIdsByProviderType, recognizedOwnerIdsByModel });
      if (listingTypeFilter === null) return null;
      const operationalFilter = { ...commonFilter };
      if (listingType === "gym" && city) operationalFilter.city = city;
      if (verification === "verified") {
        operationalFilter[listingType === "gym" ? "verified" : "isVerified"] = true;
      }
      if (verification === "unverified") {
        operationalFilter[listingType === "gym" ? "verified" : "isVerified"] = false;
      }
      if (options.summary) {
        delete operationalFilter.isActive;
        delete operationalFilter.moderationStatus;
        delete operationalFilter.verified;
        delete operationalFilter.isVerified;
      }
      return combineAdminListingFilters(operationalFilter, taxonomyFilter, listingTypeFilter);
    };

    // Determine which models to query.
    const modelsToQuery = [];
    const selectedModelType = type ? ADMIN_LISTING_TYPES[type].modelType : "";
    if (!selectedModelType || selectedModelType === "gym") modelsToQuery.push({ model: Gym, type: "gym" });
    if (!selectedModelType || selectedModelType === "trainer")
      modelsToQuery.push({ model: Trainer, type: "trainer" });
    if (!selectedModelType || selectedModelType === "nutritionist")
      modelsToQuery.push({ model: Nutritionist, type: "nutritionist" });

    const targets = modelsToQuery.filter((target) => filterFor(target.type) !== null);
    const results = await Promise.all(
      targets.map(async (target) => {
        const filter = filterFor(target.type);
        const [docs, total] = await Promise.all([
          target.model
            .find(filter)
            .populate("owner", "name email providerType")
            .populate(target.type === "gym" ? "city" : "")
            .sort({ createdAt: -1 })
            .limit(skip + perPage)
            .lean(),
          target.model.countDocuments(filter),
        ]);
        return {
          total,
          listings: docs.map((doc) => normalizeAdminListing(doc, target.type)),
        };
      }),
    );

    const allListings = results
      .flatMap((result) => result.listings)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const totalListings = results.reduce((sum, result) => sum + result.total, 0);
    const paginatedListings = allListings.slice(skip, skip + perPage);

    const summaryParts = await Promise.all(
      targets.map(async (target) => {
        const base = filterFor(target.type, { summary: true });
        const verifiedField = target.type === "gym" ? "verified" : "isVerified";
        const [total, active, pending, verified] = await Promise.all([
          target.model.countDocuments(base),
          target.model.countDocuments({ ...base, isActive: true }),
          target.model.countDocuments({ ...base, moderationStatus: "pending" }),
          target.model.countDocuments({ ...base, [verifiedField]: true }),
        ]);
        return { total, active, pending, verified };
      }),
    );
    const summary = summaryParts.reduce(
      (totals, part) => ({
        total: totals.total + part.total,
        active: totals.active + part.active,
        pending: totals.pending + part.pending,
        verified: totals.verified + part.verified,
      }),
      { total: 0, active: 0, pending: 0, verified: 0 },
    );

    return res.status(200).json({
      success: true,
      data: {
        listings: paginatedListings,
        summary,
        listingTypeOptions: Object.entries(ADMIN_LISTING_TYPES)
          .filter(([, config]) => config.modelType !== "nutritionist" || normalizedCategory === "wellness")
          .map(([value, config]) => ({ value, label: config.label })),
        classification:
          normalizedCategory === "unclassified"
            ? { slug: "unclassified", name: "Unclassified", subcategories: [] }
            : mainCategory
              ? {
                  slug: mainCategory.slug,
                  name: mainCategory.name,
                  subcategory: selectedSubcategory
                    ? { slug: selectedSubcategory.slug, name: selectedSubcategory.name }
                    : null,
                }
              : null,
        pagination: {
          totalListings,
          totalPages: Math.max(Math.ceil(totalListings / perPage), 1),
          currentPage,
          perPage,
          hasNextPage: skip + perPage < totalListings,
          hasPreviousPage: currentPage > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get admin listings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch marketplace listings",
    });
  }
};

// ============================================================
// UPDATE LISTING STATUS - ADMIN
// ============================================================

export const updateListingStatus = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive (boolean) is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const Model = getModelByType(type);
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing type",
      });
    }

    const listing = await Model.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.isActive = isActive;
    await listing.save();

    return res.status(200).json({
      success: true,
      message: `Listing status updated to ${isActive ? "active" : "inactive"}`,
      data: normalizeAdminListing(listing, type),
    });
  } catch (error) {
    console.error("Update listing status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update listing status",
    });
  }
};

// ============================================================
// UPDATE LISTING VERIFICATION - ADMIN
// ============================================================

export const updateListingVerification = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isVerified } = req.body;

    if (isVerified === undefined || typeof isVerified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVerified (boolean) is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const Model = getModelByType(type);
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing type",
      });
    }

    const listing = await Model.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Handle inconsistent field naming across models
    if (type === "gym") {
      listing.verified = isVerified;
    } else {
      listing.isVerified = isVerified;
    }

    await listing.save();

    return res.status(200).json({
      success: true,
      message: `Listing verification updated to ${isVerified ? "verified" : "unverified"}`,
      data: normalizeAdminListing(listing, type),
    });
  } catch (error) {
    console.error("Update listing verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update listing verification",
    });
  }
};

// ============================================================
// UPDATE LISTING FEATURED STATE - ADMIN
// ============================================================

export const updateListingFeatured = async (req, res) => {
  try {
    const { type, id } = req.params;
    const { featured } = req.body;

    if (featured === undefined || typeof featured !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "featured (boolean) is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const Model = getModelByType(type);
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing type",
      });
    }

    const listing = await Model.findById(id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.featured = featured;
    await listing.save();

    return res.status(200).json({
      success: true,
      message: `Listing featured state updated to ${featured ? "featured" : "standard"}`,
      data: normalizeAdminListing(listing, type),
    });
  } catch (error) {
    console.error("Update listing featured error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update listing featured state",
    });
  }
};

// ============================================================
// UPDATE PROVIDER PROFILE - ADMIN
// ============================================================

const ADMIN_PROVIDER_PROFILE_FIELDS = new Set([
  "businessName",
  "bio",
  "phone",
  "email",
  "website",
  "location",
  "socialLinks",
]);

const ADMIN_PROVIDER_LOCATION_FIELDS = new Set([
  "address",
  "area",
  "city",
  "state",
  "pincode",
]);

const ADMIN_PROVIDER_SOCIAL_FIELDS = new Set([
  "instagram",
  "facebook",
  "youtube",
  "linkedin",
]);

const getUnsupportedAdminProviderFields = (body = {}) => {
  const unsupportedFields = Object.keys(body).filter(
    (field) => !ADMIN_PROVIDER_PROFILE_FIELDS.has(field),
  );

  if (
    body.location !== undefined &&
    (body.location === null ||
      typeof body.location !== "object" ||
      Array.isArray(body.location))
  ) {
    unsupportedFields.push("location");
  } else if (body.location) {
    unsupportedFields.push(
      ...Object.keys(body.location)
        .filter((field) => !ADMIN_PROVIDER_LOCATION_FIELDS.has(field))
        .map((field) => `location.${field}`),
    );
  }

  if (
    body.socialLinks !== undefined &&
    (body.socialLinks === null ||
      typeof body.socialLinks !== "object" ||
      Array.isArray(body.socialLinks))
  ) {
    unsupportedFields.push("socialLinks");
  } else if (body.socialLinks) {
    unsupportedFields.push(
      ...Object.keys(body.socialLinks)
        .filter((field) => !ADMIN_PROVIDER_SOCIAL_FIELDS.has(field))
        .map((field) => `socialLinks.${field}`),
    );
  }

  return [...new Set(unsupportedFields)];
};

export const ADMIN_LISTING_TYPES = MARKETPLACE_LISTING_TYPES;

export const buildAdminListingTypeFilter = ({ listingType, modelType, ownerIdsByProviderType = {}, recognizedOwnerIdsByModel = {} }) => {
  return buildMarketplaceListingTypeFilter({ listingType, modelType, ownerIdsByProviderType, recognizedOwnerIdsByModel });
};

export const combineAdminListingFilters = (...filters) => {
  return combineMarketplaceFilters(...filters);
};

export const buildAdminListingTaxonomyFilter = ({ listingType, categorySlug, mainCategory, selectedSubcategory, activeMainCategories = [], ownerIdsByProviderType = {} }) => {
  return buildMarketplaceTaxonomyFilter({ modelType: listingType, categorySlug, mainCategory, selectedSubcategory, activeMainCategories, ownerIdsByProviderType });
};

const ADMIN_GYM_PHASE_A_FIELDS = new Set([
  "name", "slug", "category", "tags", "phone", "email", "website",
  "description", "highlights", "location", "coordinates", "priceFrom",
  "timings", "city",
]);
const ADMIN_GYM_LOCATION_FIELDS = new Set([
  "address", "area", "city", "state", "pincode", "landmark", "parking",
]);
const ADMIN_GYM_COORDINATE_FIELDS = new Set(["lat", "lng", "latitude", "longitude"]);
const ADMIN_GYM_TIMING_FIELDS = new Set(["day", "open", "close", "isOpen"]);
const TIME_24_HOUR_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const getAdminGymPhaseAUnsupportedFields = (body = {}) => {
  const unsupported = Object.keys(body).filter((field) => !ADMIN_GYM_PHASE_A_FIELDS.has(field));
  for (const [group, allowed] of [["location", ADMIN_GYM_LOCATION_FIELDS], ["coordinates", ADMIN_GYM_COORDINATE_FIELDS]]) {
    const value = body[group];
    if (value !== undefined && (value === null || typeof value !== "object" || Array.isArray(value))) unsupported.push(group);
    else if (value) unsupported.push(...Object.keys(value).filter((field) => !allowed.has(field)).map((field) => `${group}.${field}`));
  }
  if (Array.isArray(body.timings)) body.timings.forEach((row, index) => {
    if (row && typeof row === "object" && !Array.isArray(row)) unsupported.push(...Object.keys(row).filter((field) => !ADMIN_GYM_TIMING_FIELDS.has(field)).map((field) => `timings.${index}.${field}`));
  });
  return [...new Set(unsupported)];
};

const validateAdminGymPhaseA = (body) => {
  const errors = [];
  for (const field of ["tags", "highlights"]) if (body[field] !== undefined && (!Array.isArray(body[field]) || body[field].some((item) => typeof item !== "string"))) errors.push({ field, message: `${field} must be an array of strings` });
  if (body.priceFrom !== undefined && body.priceFrom !== null && (typeof body.priceFrom !== "number" || !Number.isFinite(body.priceFrom))) errors.push({ field: "priceFrom", message: "priceFrom must be null or a finite number" });
  if (body.timings !== undefined) {
    if (!Array.isArray(body.timings)) errors.push({ field: "timings", message: "timings must be an array" });
    else {
      const days = new Set();
      body.timings.forEach((row, index) => {
        const prefix = `timings.${index}`;
        if (!row || typeof row !== "object" || Array.isArray(row)) { errors.push({ field: prefix, message: "each timing must be an object" }); return; }
        const day = typeof row.day === "string" ? row.day.trim() : "";
        if (!day) errors.push({ field: `${prefix}.day`, message: "day is required" });
        else if (days.has(day.toLowerCase())) errors.push({ field: `${prefix}.day`, message: "duplicate timing days are not allowed" });
        else days.add(day.toLowerCase());
        if (typeof row.isOpen !== "boolean") errors.push({ field: `${prefix}.isOpen`, message: "isOpen must be a boolean" });
        for (const field of ["open", "close"]) {
          const value = row[field];
          if (value !== undefined && typeof value !== "string") errors.push({ field: `${prefix}.${field}`, message: `${field} must be a string` });
          if (row.isOpen === true && (typeof value !== "string" || !TIME_24_HOUR_PATTERN.test(value.trim()))) errors.push({ field: `${prefix}.${field}`, message: `${field} must use HH:mm 24-hour format when the gym is open` });
          else if (row.isOpen === false && typeof value === "string" && value.trim() && !TIME_24_HOUR_PATTERN.test(value.trim())) errors.push({ field: `${prefix}.${field}`, message: `${field} must be blank or use HH:mm 24-hour format` });
        }
      });
    }
  }
  return errors;
};

const normalizeAdminGymPhaseABody = (body) => {
  const normalized = { ...body };
  for (const field of ["tags", "highlights"]) if (Array.isArray(body[field])) normalized[field] = body[field].map((item) => item.trim()).filter(Boolean);
  if (Array.isArray(body.timings)) normalized.timings = body.timings.map((row) => ({
    ...row,
    day: typeof row?.day === "string" ? row.day.trim() : row?.day,
    open: typeof row?.open === "string" ? row.open.trim() : row?.open,
    close: typeof row?.close === "string" ? row.close.trim() : row?.close,
  }));
  return normalized;
};

export const normalizeAdminListingDetail = (doc, requestedType) => {
  const type = requestedType === "coach" ? "trainer" : requestedType;
  const owner = doc.owner && typeof doc.owner === "object" ? {
    id: doc.owner._id,
    name: doc.owner.name,
    email: doc.owner.email,
    providerType: doc.owner.providerType,
    isActive: doc.owner.isActive,
  } : null;
  const city = type === "gym" && doc.city && typeof doc.city === "object"
    ? {
        id: doc.city._id,
        name: doc.city.name,
        slug: doc.city.slug,
        state: doc.city.state,
        country: doc.city.country,
      }
    : doc.city ?? null;
  const normalized = {
    ...doc,
    _id: doc._id,
    type,
    owner,
    city,
    isVerified: doc.verified !== undefined ? doc.verified : doc.isVerified,
  };
  if (type === "gym") {
    normalized.images = toAdminGymImages(doc);
    for (const field of ["tags", "highlights", "facilities", "memberships", "trainers", "classes", "timings", "reviews", "ratingBreakdown"]) {
      normalized[field] = Array.isArray(doc[field]) ? doc[field] : [];
    }
  }
  return normalized;
};

const findNormalizedProviderListings = async (ownerId) => {
  const [gyms, trainers, nutritionists] = await Promise.all([
    Gym.find({ owner: ownerId }).lean(),
    Trainer.find({ owner: ownerId }).lean(),
    Nutritionist.find({ owner: ownerId }).lean(),
  ]);

  const listings = [
    ...gyms.map((listing) => normalizeAdminListing(listing, "gym")),
    ...trainers.map((listing) => normalizeAdminListing(listing, "trainer")),
    ...nutritionists.map((listing) =>
      normalizeAdminListing(listing, "nutritionist"),
    ),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return {
    listings,
    listingSummary: {
      total: listings.length,
      active: listings.filter((listing) => listing.isActive).length,
      inactive: listings.filter((listing) => !listing.isActive).length,
    },
  };
};

const buildAdminProviderProfileUpdates = (body) => {
  const updates = {};

  for (const field of ["businessName", "bio", "phone", "email", "website"]) {
    if (body[field] !== undefined) updates[field] = body[field].trim();
  }

  for (const field of ADMIN_PROVIDER_LOCATION_FIELDS) {
    if (body.location?.[field] !== undefined) {
      updates[`location.${field}`] = body.location[field].trim();
    }
  }

  for (const field of ADMIN_PROVIDER_SOCIAL_FIELDS) {
    if (body.socialLinks?.[field] !== undefined) {
      updates[`socialLinks.${field}`] = body.socialLinks[field].trim();
    }
  }

  return updates;
};

const getAdminProviderProfileTypeErrors = (body) => {
  const errors = [];

  for (const field of ["businessName", "bio", "phone", "email", "website"]) {
    if (body[field] !== undefined && typeof body[field] !== "string") {
      errors.push({ field, message: `${field} must be a string` });
    }
  }

  if (
    typeof body.email === "string" &&
    body.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    errors.push({ field: "email", message: "email must be a valid email address" });
  }

  for (const field of ADMIN_PROVIDER_LOCATION_FIELDS) {
    if (
      body.location?.[field] !== undefined &&
      typeof body.location[field] !== "string"
    ) {
      errors.push({
        field: `location.${field}`,
        message: `location.${field} must be a string`,
      });
    }
  }

  for (const field of ADMIN_PROVIDER_SOCIAL_FIELDS) {
    if (
      body.socialLinks?.[field] !== undefined &&
      typeof body.socialLinks[field] !== "string"
    ) {
      errors.push({
        field: `socialLinks.${field}`,
        message: `socialLinks.${field} must be a string`,
      });
    }
  }

  return errors;
};

export const updateProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const unsupportedFields = getUnsupportedAdminProviderFields(req.body);
    if (unsupportedFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Unsupported provider profile fields were submitted",
        unsupportedFields,
      });
    }

    const typeErrors = getAdminProviderProfileTypeErrors(req.body);
    if (typeErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Provider profile validation failed",
        errors: typeErrors,
      });
    }

    const updates = buildAdminProviderProfileUpdates(req.body);
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No editable provider profile fields were submitted",
      });
    }

    const provider = await User.findOne({ _id: id, role: "business" });

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const profile = await ProviderProfile.findOneAndUpdate(
      { user: provider._id },
      {
        $set: updates,
        $setOnInsert: { user: provider._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: "Provider profile updated successfully",
      data: {
        profileExists: true,
        profile,
      },
    });
  } catch (error) {
    console.error("Update provider profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update provider profile",
    });
  }
};

// ============================================================
// UPDATE PROVIDER VERIFICATION - ADMIN
// ============================================================

export const updateProviderVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    if (typeof isVerified !== "boolean" || Object.keys(req.body).length !== 1) {
      return res.status(400).json({
        success: false,
        message: "isVerified (boolean) is required",
      });
    }

    const provider = await User.findOne({ _id: id, role: "business" });
    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    const profile = await ProviderProfile.findOneAndUpdate(
      { user: provider._id },
      {
        $set: { isVerified },
        $setOnInsert: { user: provider._id },
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      },
    );

    return res.status(200).json({
      success: true,
      message: `Provider is now ${isVerified ? "verified" : "unverified"}`,
      data: {
        profileExists: true,
        profile,
      },
    });
  } catch (error) {
    console.error("Update provider verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update provider verification",
    });
  }
};

// ============================================================
// UPDATE PROVIDER STATUS - ADMIN
// ============================================================

export const updateProviderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined || typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive (boolean) is required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await User.findOneAndUpdate(
      { _id: id, role: "business" },
      { isActive },
      { new: true }
    ).select("-password");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    let affectedListings = 0;

    // CASCADE DEACTIVATION: If provider is deactivated, deactivate all owned listings
    if (isActive === false) {
      const [gyms, trainers, nutritionists] = await Promise.all([
        Gym.updateMany({ owner: id }, { isActive: false }),
        Trainer.updateMany({ owner: id }, { isActive: false }),
        Nutritionist.updateMany({ owner: id }, { isActive: false }),
      ]);
      affectedListings = gyms.modifiedCount + trainers.modifiedCount + nutritionists.modifiedCount;
    }
    // REACTIVATION: Provider becomes active, listings remain unchanged (Rule in Phase 9)

    return res.status(200).json({
      success: true,
      message: `Provider status updated to ${isActive ? "active" : "inactive"}.${
        isActive === false ? ` ${affectedListings} listings deactivated.` : ""
      }`,
      data: {
        provider,
        affectedListings
      },
    });
  } catch (error) {
    console.error("Update provider status error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update provider status",
    });
  }
};

// ============================================================
// GET PROVIDER LISTINGS - ADMIN
// ============================================================

export const getAdminProviderListings = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const { listings, listingSummary } =
      await findNormalizedProviderListings(id);

    return res.status(200).json({
      success: true,
      data: {
        listings,
        counts: listingSummary,
      },
    });
  } catch (error) {
    console.error("Get admin provider listings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider listings",
    });
  }
};

// ============================================================
// GET LISTING DETAIL - ADMIN
// ============================================================

export const getAdminListingById = async (req, res) => {
  try {
    const { type, id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const Model = getModelByType(type);
    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing type",
      });
    }

    const listing = await Model.findById(id)
      .populate("owner", "name email providerType isActive")
      .populate(type === "gym" ? "city" : "")
      .lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: normalizeAdminListingDetail(listing, type),
    });
  } catch (error) {
    console.error("Get admin listing detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listing details",
    });
  }
};

export const updateAdminListingContent = async (req, res) => {
  try {
    const requestedType = req.params.type;
    const type = requestedType === "coach" ? "trainer" : requestedType;
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID format" });
    }
    if (!["gym", "trainer", "nutritionist"].includes(type)) {
      return res.status(400).json({ success: false, message: "Listing content editing is not supported for this listing type" });
    }
    const unsupportedFields = type === "gym" ? getAdminGymPhaseAUnsupportedFields(req.body) : getListingUpdateUnsupportedFields(type, req.body);
    if (unsupportedFields.length) {
      return res.status(400).json({ success: false, message: "Unsupported listing fields were submitted", unsupportedFields });
    }
    let body = req.body;
    if (type === "gym") {
      const errors = validateAdminGymPhaseA(body);
      if (errors.length) return res.status(400).json({ success: false, message: "Listing validation failed", errors });
      body = normalizeAdminGymPhaseABody(body);
    }
    const Model = getModelByType(type);
    const listing = await Model.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });
    const updates = await prepareListingContentUpdate({ model: Model, type, listing, body });
    Object.assign(listing, updates);
    await listing.save();
    const populated = await Model.findById(listing._id)
      .populate("owner", "name email providerType isActive")
      .populate(type === "gym" ? "city" : "")
      .lean();
    return res.status(200).json({
      success: true,
      message: "Listing content updated successfully",
      data: normalizeAdminListingDetail(populated, type),
    });
  } catch (error) {
    if (error instanceof ListingContractError) return res.status(error.statusCode).json(error.payload);
    if (error.code === 11000) return res.status(409).json({ success: false, message: "A listing with the same unique identifier already exists", error: error.keyValue || null });
    if (error.name === "ValidationError") return res.status(400).json({ success: false, message: "Listing validation failed", errors: Object.values(error.errors).map((item) => ({ field: item.path, message: item.message })) });
    console.error("Update admin listing content error:", error);
    return res.status(500).json({ success: false, message: "Failed to update listing content" });
  }
};
