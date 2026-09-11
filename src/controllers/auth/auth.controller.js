import bcrypt from "bcryptjs";

import User from "../../models/users/User.js";
import generateToken from "../../utils/generateToken.js";

// ============================================================
// ALLOWED PROVIDER TYPES
// ============================================================

const ALLOWED_PROVIDER_TYPES = [
  "trainer",
  "coach",
  "nutritionist",
  "gym_owner",
  "fitness_centre_owner",
  "wellness_centre_owner",
  "sports_academy_owner",
  "studio_owner",
  "other",
];

// ============================================================
// REGISTER USER / PROVIDER
// ============================================================

export const registerUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      accountType = "user",
      providerType,
    } = req.body;

    // ----------------------------------------------------------
    // BASIC VALIDATION
    // ----------------------------------------------------------

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE ACCOUNT TYPE
    // ----------------------------------------------------------

    const normalizedAccountType = accountType.trim().toLowerCase();

    // Public registration can only create normal users
    // or business/provider accounts.
    if (!["user", "business"].includes(normalizedAccountType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account type",
      });
    }

    // ----------------------------------------------------------
    // PROVIDER VALIDATION
    // ----------------------------------------------------------

    let normalizedProviderType = null;

    if (normalizedAccountType === "business") {
      if (!providerType) {
        return res.status(400).json({
          success: false,
          message: "Provider type is required for business accounts",
        });
      }

      normalizedProviderType = providerType.trim().toLowerCase();

      if (!ALLOWED_PROVIDER_TYPES.includes(normalizedProviderType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider type",
          allowedProviderTypes: ALLOWED_PROVIDER_TYPES,
        });
      }
    }

    // ----------------------------------------------------------
    // NORMALIZE EMAIL
    // ----------------------------------------------------------

    const normalizedEmail = email.toLowerCase().trim();

    // ----------------------------------------------------------
    // CHECK EXISTING USER
    // ----------------------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // ----------------------------------------------------------
    // HASH PASSWORD
    // ----------------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 12);

    // ----------------------------------------------------------
    // CREATE USER
    // ----------------------------------------------------------

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || "",

      role: normalizedAccountType,

      providerType: normalizedProviderType,

      isActive: true,
      isEmailVerified: false,
    });

    // ----------------------------------------------------------
    // GENERATE TOKEN
    // ----------------------------------------------------------

    const token = generateToken(user._id);

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      message:
        normalizedAccountType === "business"
          ? "Provider account created successfully"
          : "Account created successfully",

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

        token,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create account",
    });
  }
};

// ============================================================
// LOGIN USER / PROVIDER / ADMIN
// ============================================================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE EMAIL
    // ----------------------------------------------------------

    const normalizedEmail = email.toLowerCase().trim();

    // ----------------------------------------------------------
    // FIND USER
    // ----------------------------------------------------------

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ----------------------------------------------------------
    // CHECK ACCOUNT STATUS
    // ----------------------------------------------------------

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    // ----------------------------------------------------------
    // CHECK PASSWORD
    // ----------------------------------------------------------

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ----------------------------------------------------------
    // GENERATE JWT
    // ----------------------------------------------------------

    const token = generateToken(user._id);

    // ----------------------------------------------------------
    // LOGIN RESPONSE
    // ----------------------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Login successful",

      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,

          // Account role
          role: user.role,

          // Provider type will be null for normal users
          providerType: user.providerType || null,

          avatar: user.avatar,

          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        },

        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    // req.user is populated by authMiddleware
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          providerType: user.providerType || null,
          avatar: user.avatar,
          isActive: user.isActive,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  } catch (error) {
    console.error("Get current user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch current user",
    });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, adminSecret } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!name || !email || !password || !adminSecret) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and admin secret are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // ----------------------------------------------------------
    // CHECK ADMIN SECRET
    // ----------------------------------------------------------

    if (
      !process.env.ADMIN_CREATION_SECRET ||
      adminSecret !== process.env.ADMIN_CREATION_SECRET
    ) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin creation secret",
      });
    }

    // ----------------------------------------------------------
    // NORMALIZE EMAIL
    // ----------------------------------------------------------

    const normalizedEmail = email.toLowerCase().trim();

    // ----------------------------------------------------------
    // CHECK EXISTING ACCOUNT
    // ----------------------------------------------------------

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    // ----------------------------------------------------------
    // HASH PASSWORD
    // ----------------------------------------------------------

    const hashedPassword = await bcrypt.hash(password, 12);

    // ----------------------------------------------------------
    // CREATE ADMIN
    // ----------------------------------------------------------

    const admin = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone?.trim() || "",

      role: "admin",

      // Admin is not a provider.
      providerType: null,

      isActive: true,
      isEmailVerified: true,
    });

    // ----------------------------------------------------------
    // GENERATE TOKEN
    // ----------------------------------------------------------

    const token = generateToken(admin._id);

    // ----------------------------------------------------------
    // RESPONSE
    // ----------------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Admin account created successfully",

      data: {
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
          providerType: null,
          avatar: admin.avatar,
          isActive: admin.isActive,
          isEmailVerified: admin.isEmailVerified,
        },

        token,
      },
    });
  } catch (error) {
    console.error("Create admin error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create admin account",
    });
  }
};
