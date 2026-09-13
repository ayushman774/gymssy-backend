import ProviderProfile from "../../models/providers/ProviderProfile.js";
import User from "../../models/users/User.js";

// ============================================================
// GET MY PROVIDER PROFILE
// ============================================================

export const getMyProviderProfile = async (req, res) => {
  try {
    const providerProfile = await ProviderProfile.findOne({
      user: req.user.id,
    }).populate("user", "name email phone role providerType avatar");

    if (!providerProfile) {
      return res.status(404).json({
        success: false,
        message: "Provider profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: providerProfile,
    });
  } catch (error) {
    console.error("Get provider profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider profile",
    });
  }
};

// ============================================================
// CREATE MY PROVIDER PROFILE
// ============================================================

export const createProviderProfile = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // CHECK PROVIDER ROLE
    // ----------------------------------------------------------

    if (req.user.role !== "business") {
      return res.status(403).json({
        success: false,
        message: "Only provider accounts can create a provider profile",
      });
    }

    // ----------------------------------------------------------
    // CHECK EXISTING PROFILE
    // ----------------------------------------------------------

    const existingProfile = await ProviderProfile.findOne({
      user: req.user.id,
    });

    if (existingProfile) {
      return res.status(409).json({
        success: false,
        message: "Provider profile already exists",
      });
    }

    // ----------------------------------------------------------
    // GET CURRENT USER
    // ----------------------------------------------------------

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ----------------------------------------------------------
    // REQUEST DATA
    // ----------------------------------------------------------

    const {
      businessName,
      bio,
      phone,
      email,
      website,
      avatar,
      location,
      socialLinks,
    } = req.body;

    // ----------------------------------------------------------
    // CREATE PROFILE
    // ----------------------------------------------------------

    const providerProfile = await ProviderProfile.create({
      user: req.user.id,

      businessName: businessName?.trim() || "",

      bio: bio?.trim() || "",

      phone: phone?.trim() || user.phone || "",

      email: email?.toLowerCase().trim() || user.email,

      website: website?.trim() || "",

      avatar: {
        url: avatar?.url?.trim() || "",
        alt: avatar?.alt?.trim() || "",
      },

      location: {
        address: location?.address?.trim() || "",
        area: location?.area?.trim() || "",
        city: location?.city?.trim() || "",
        state: location?.state?.trim() || "",
        pincode: location?.pincode?.trim() || "",
      },

      socialLinks: {
        instagram: socialLinks?.instagram?.trim() || "",
        facebook: socialLinks?.facebook?.trim() || "",
        youtube: socialLinks?.youtube?.trim() || "",
        linkedin: socialLinks?.linkedin?.trim() || "",
      },
    });

    return res.status(201).json({
      success: true,
      message: "Provider profile created successfully",
      data: providerProfile,
    });
  } catch (error) {
    console.error("Create provider profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create provider profile",
    });
  }
};

// ============================================================
// UPDATE MY PROVIDER PROFILE
// ============================================================

export const updateMyProviderProfile = async (req, res) => {
  try {
    // ----------------------------------------------------------
    // CHECK PROVIDER ROLE
    // ----------------------------------------------------------

    if (req.user.role !== "business") {
      return res.status(403).json({
        success: false,
        message: "Only provider accounts can update a provider profile",
      });
    }

    // ----------------------------------------------------------
    // GET CURRENT USER
    // ----------------------------------------------------------

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // ----------------------------------------------------------
    // REQUEST DATA
    // ----------------------------------------------------------

    const {
      name,
      phone,
      businessName,
      bio,
      email,
      website,
      avatar,
      location,
      socialLinks,
    } = req.body;

    // ----------------------------------------------------------
    // UPDATE ACCOUNT-LEVEL INFORMATION
    // ----------------------------------------------------------
    // These fields belong to User, not ProviderProfile.
    //
    // IMPORTANT:
    // role, providerType, isActive, isEmailVerified,
    // password and email are not changed through this endpoint.
    // ----------------------------------------------------------

    if (name !== undefined) {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return res.status(400).json({
          success: false,
          message: "Name cannot be empty",
        });
      }

      user.name = trimmedName;
    }

    if (phone !== undefined) {
      user.phone = phone.trim();
    }

    // ----------------------------------------------------------
    // FIND OR CREATE PROVIDER PROFILE
    // ----------------------------------------------------------

    let providerProfile = await ProviderProfile.findOne({
      user: req.user.id,
    });

    if (!providerProfile) {
      providerProfile = new ProviderProfile({
        user: req.user.id,
      });
    }

    // ----------------------------------------------------------
    // UPDATE PROVIDER PROFILE INFORMATION
    // ----------------------------------------------------------

    if (businessName !== undefined) {
      providerProfile.businessName = businessName.trim();
    }

    if (bio !== undefined) {
      providerProfile.bio = bio.trim();
    }

    if (email !== undefined) {
      providerProfile.email = email.toLowerCase().trim();
    }

    if (website !== undefined) {
      providerProfile.website = website.trim();
    }

    // ----------------------------------------------------------
    // UPDATE PROVIDER AVATAR
    // ----------------------------------------------------------

    if (avatar !== undefined) {
      providerProfile.avatar = {
        url: avatar?.url?.trim() || "",
        alt: avatar?.alt?.trim() || "",
      };
    }

    // ----------------------------------------------------------
    // UPDATE PROVIDER LOCATION
    // ----------------------------------------------------------

    if (location !== undefined) {
      providerProfile.location = {
        address: location?.address?.trim() || "",
        area: location?.area?.trim() || "",
        city: location?.city?.trim() || "",
        state: location?.state?.trim() || "",
        pincode: location?.pincode?.trim() || "",
      };
    }

    // ----------------------------------------------------------
    // UPDATE SOCIAL LINKS
    // ----------------------------------------------------------

    if (socialLinks !== undefined) {
      providerProfile.socialLinks = {
        instagram: socialLinks?.instagram?.trim() || "",
        facebook: socialLinks?.facebook?.trim() || "",
        youtube: socialLinks?.youtube?.trim() || "",
        linkedin: socialLinks?.linkedin?.trim() || "",
      };
    }

    // ----------------------------------------------------------
    // SAVE
    // ----------------------------------------------------------

    await user.save();
    await providerProfile.save();

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Provider profile updated successfully",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          providerType: user.providerType,
          avatar: user.avatar,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        },
        providerProfile,
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
