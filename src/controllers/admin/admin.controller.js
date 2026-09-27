import mongoose from "mongoose";
import User from "../../models/users/User.js";
import ProviderProfile from "../../models/providers/ProviderProfile.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";

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
const normalizeAdminListing = (doc, type) => {
  return {
    id: doc._id,
    type,
    name: doc.name,
    slug: doc.slug,
    owner: doc.owner,
    category: doc.category,
    city: doc.city ? (typeof doc.city === "object" ? doc.city.name : doc.city) : null,
    isActive: doc.isActive,
    isVerified: doc.verified !== undefined ? doc.verified : doc.isVerified,
    featured: doc.featured,
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
      page = 1,
      limit = 10,
    } = req.query;

    const currentPage = Math.max(Number.parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(Number.parseInt(limit, 10) || 10, 1), 100);
    const skip = (currentPage - 1) * perPage;

    // Filters for different models
    const commonFilter = {};
    if (status === "active") commonFilter.isActive = true;
    if (status === "inactive") commonFilter.isActive = false;

    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      const escapedSearch = trimmedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const searchRegex = new RegExp(escapedSearch, "i");
      commonFilter.name = searchRegex;
    }

    // Determine which models to query
    const modelsToQuery = [];
    if (!type || type === "gym") modelsToQuery.push({ model: Gym, type: "gym" });
    if (!type || type === "trainer")
      modelsToQuery.push({ model: Trainer, type: "trainer" });
    if (!type || type === "nutritionist")
      modelsToQuery.push({ model: Nutritionist, type: "nutritionist" });

    // Since we need to merge results from different collections and paginate,
    // and they have different fields, we'll fetch them all (within reason)
    // or if a specific type is requested, it's easier.

    if (type) {
      // Single model query - efficient pagination
      const target = modelsToQuery[0];
      const filter = { ...commonFilter };

      // City filter only for gyms
      if (target.type === "gym" && city) {
        filter.city = city;
      }

      const [docs, total] = await Promise.all([
        target.model
          .find(filter)
          .populate("owner", "name email")
          .populate(target.type === "gym" ? "city" : "") // populate city for gyms
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(perPage)
          .lean(),
        target.model.countDocuments(filter),
      ]);

      const listings = docs.map((doc) => normalizeAdminListing(doc, target.type));

      return res.status(200).json({
        success: true,
        data: {
          listings,
          pagination: {
            totalListings: total,
            totalPages: Math.ceil(total / perPage),
            currentPage,
            perPage,
            hasNextPage: currentPage * perPage < total,
            hasPreviousPage: currentPage > 1,
          },
        },
      });
    } else {
      // Multi-model query - harder to paginate perfectly in-memory
      // For now, we'll fetch from all and merge (simplified approach for MVP)
      const results = await Promise.all(
        modelsToQuery.map(async (t) => {
          const filter = { ...commonFilter };
          // For gyms, apply city filter if exists
          if (t.type === "gym" && city) {
            filter.city = city;
          }
          const docs = await t.model
            .find(filter)
            .populate("owner", "name email")
            .populate(t.type === "gym" ? "city" : "")
            .sort({ createdAt: -1 })
            .limit(skip + perPage) // Fetch enough to cover the current page
            .lean();
          return docs.map((doc) => normalizeAdminListing(doc, t.type));
        }),
      );

      const allListings = results
        .flat()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const totalListings = allListings.length; // This is a limitation of this approach
      const paginatedListings = allListings.slice(skip, skip + perPage);

      return res.status(200).json({
        success: true,
        data: {
          listings: paginatedListings,
          pagination: {
            totalListings,
            totalPages: Math.ceil(totalListings / perPage),
            currentPage,
            perPage,
            hasNextPage: skip + perPage < totalListings,
            hasPreviousPage: currentPage > 1,
          },
        },
      });
    }
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

export const updateProviderProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, providerType, isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    // Explicit allowlist of editable fields
    // Email and Phone/Mobile are intentionally excluded per requirements
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (providerType !== undefined) updates.providerType = providerType;

    // If isActive is being updated, we use the dedicated status logic
    // to handle cascading if deactivating.
    // However, if it's passed here, we can handle it or ignore it.
    // Let's focus on profile fields here.

    const provider = await User.findOneAndUpdate(
      { _id: id, role: "business" },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!provider) {
      return res.status(404).json({
        success: false,
        message: "Provider not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Provider profile updated successfully",
      data: provider,
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

    const [gyms, trainers, nutritionists] = await Promise.all([
      Gym.find({ owner: id }).lean(),
      Trainer.find({ owner: id }).lean(),
      Nutritionist.find({ owner: id }).lean(),
    ]);

    const normalizedListings = [
      ...gyms.map(l => normalizeAdminListing(l, "gym")),
      ...trainers.map(l => normalizeAdminListing(l, "trainer")),
      ...nutritionists.map(l => normalizeAdminListing(l, "nutritionist")),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
      total: normalizedListings.length,
      active: normalizedListings.filter(l => l.isActive).length,
      inactive: normalizedListings.filter(l => !l.isActive).length,
    };

    return res.status(200).json({
      success: true,
      data: {
        listings: normalizedListings,
        counts,
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
      .populate("owner", "name email providerType")
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
      data: normalizeAdminListing(listing, type),
    });
  } catch (error) {
    console.error("Get admin listing detail error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listing details",
    });
  }
};
