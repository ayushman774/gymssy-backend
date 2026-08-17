import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
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

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    experience: {
      type: Number,
      required: true,
      min: 0,
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    image: {
      url: {
        type: String,
        default: "",
      },
      alt: {
        type: String,
        default: "",
      },
    },

    pricePerSession: {
      type: Number,
      required: true,
      min: 0,
    },

    available: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
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
