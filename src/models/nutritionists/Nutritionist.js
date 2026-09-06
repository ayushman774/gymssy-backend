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
  },
  {
    timestamps: true,
  },
);

const Trainer = mongoose.model("Trainer", trainerSchema);

export default Trainer;
