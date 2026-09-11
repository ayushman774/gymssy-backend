import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    // ============================================================
    // BASIC INFORMATION
    // ============================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    // ============================================================
    // AUTHENTICATION
    // ============================================================

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    // ============================================================
    // PROFILE
    // ============================================================

    avatar: {
      url: {
        type: String,
        default: "",
      },
      alt: {
        type: String,
        default: "",
      },
    },

    // ============================================================
    // ACCOUNT ROLE
    // ============================================================

    // "user"     = normal Gymssy customer
    // "business" = provider/business account
    // "admin"    = Gymssy administrator
    role: {
      type: String,
      enum: ["user", "business", "admin"],
      default: "user",
      index: true,
    },

    // ============================================================
    // PROVIDER TYPE
    // ============================================================

    // Used only when role === "business".
    //
    // Keeping providerType separate from role allows us to have
    // one authentication system for all provider types.
    providerType: {
      type: String,
      enum: [
        "trainer",
        "coach",
        "nutritionist",
        "gym_owner",
        "fitness_centre_owner",
        "wellness_centre_owner",
        "sports_academy_owner",
        "studio_owner",
        "other",
      ],
      default: null,
      index: true,
    },

    // ============================================================
    // ACCOUNT STATUS
    // ============================================================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// ============================================================
// VALIDATION
// ============================================================
//
// providerType should exist for business accounts and should not
// be required for normal users or admins.
//
// This is handled at application level so that existing users
// already stored in MongoDB continue to work safely.

userSchema.index({
  role: 1,
  providerType: 1,
});

const User = mongoose.model("User", userSchema);

export default User;
