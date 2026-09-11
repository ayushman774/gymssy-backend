import mongoose from "mongoose";

const providerProfileSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------------
    // OWNER
    // ----------------------------------------------------------
    // Links this provider profile to the authenticated User.
    // One user can have only one provider profile.

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // ----------------------------------------------------------
    // BASIC PROFILE
    // ----------------------------------------------------------

    businessName: {
      type: String,
      trim: true,
      default: "",
    },

    bio: {
      type: String,
      trim: true,
      default: "",
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    // ----------------------------------------------------------
    // PROFILE IMAGE
    // ----------------------------------------------------------

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

    // ----------------------------------------------------------
    // LOCATION
    // ----------------------------------------------------------

    location: {
      address: {
        type: String,
        trim: true,
        default: "",
      },

      area: {
        type: String,
        trim: true,
        default: "",
      },

      city: {
        type: String,
        trim: true,
        default: "",
      },

      state: {
        type: String,
        trim: true,
        default: "",
      },

      pincode: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ----------------------------------------------------------
    // SOCIAL LINKS
    // ----------------------------------------------------------

    socialLinks: {
      instagram: {
        type: String,
        trim: true,
        default: "",
      },

      facebook: {
        type: String,
        trim: true,
        default: "",
      },

      youtube: {
        type: String,
        trim: true,
        default: "",
      },

      linkedin: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ----------------------------------------------------------
    // PROVIDER STATUS
    // ----------------------------------------------------------

    isVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const ProviderProfile = mongoose.model(
  "ProviderProfile",
  providerProfileSchema,
);

export default ProviderProfile;
