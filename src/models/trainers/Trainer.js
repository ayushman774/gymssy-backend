import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: String,
      enum: ["fitness", "wellness", "sports"],
      default: "fitness",
      required: true,
      index: true,
    },

    city: { type: mongoose.Schema.Types.ObjectId, ref: "City", default: null, index: true },
    location: { address: { type: String, default: "" }, area: { type: String, default: "" }, state: { type: String, default: "" }, pincode: { type: String, default: "" } },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    website: { type: String, default: "" },
    priceFrom: { type: Number, min: 0, default: null },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    specialty: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: String,
      required: true,
      trim: true,
    },

    trainingOptions: [{
      id: { type: String, required: true, trim: true },
      name: { type: String, required: true, trim: true },
      description: { type: String, default: "" },
      duration: { type: String, default: "" },
      price: { type: Number, min: 0, default: null },
      currency: { type: String, default: "₹" },
    }],

    sessions: {
      type: String,
      required: true,
      trim: true,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviews: {
      type: Number,
      default: 0,
    },

    clients: {
      type: String,
      required: true,
      trim: true,
    },

    certifications: {
      type: [String],
      default: [],
    },

    specializations: {
      type: [String],
      default: [],
    },

    bio: {
      type: String,
      default: "",
      trim: true,
    },

    available: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    image: {
      src: {
        type: String,
        default: "",
      },

      srcSet: {
        type: String,
        default: "",
      },

      sizes: {
        type: String,
        default: "",
      },

      alt: {
        type: String,
        default: "",
      },
    },

    social: {
      instagram: {
        type: String,
        default: null,
      },

      twitter: {
        type: String,
        default: null,
      },

      linkedin: {
        type: String,
        default: null,
      },

      youtube: {
        type: String,
        default: null,
      },
    },

    href: {
      type: String,
      default: "",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
      index: true,
    },

    rejectionReason: {
      type: String,
      default: "",
      trim: true,
    },

    moderationNote: {
      type: String,
      default: "",
      trim: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Trainer =
  mongoose.models.Trainer || mongoose.model("Trainer", trainerSchema);

export default Trainer;
