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
