import mongoose from "mongoose";

const experienceSchema = new mongoose.Schema(
  {
    title: {
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
      required: true,
      trim: true,
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

    duration: {
      type: Number,
      required: true,
      min: 1,
    },

    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      default: "All Levels",
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    priceFrom: {
      type: Number,
      required: true,
      min: 0,
    },

    spots: {
      type: Number,
      required: true,
      min: 0,
    },

    trending: {
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

const Experience = mongoose.model("Experience", experienceSchema);

export default Experience;
