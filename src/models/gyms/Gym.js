import mongoose from "mongoose";

const gymSchema = new mongoose.Schema(
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

    category: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    distance: {
      type: Number,
      default: null,
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

    priceFrom: {
      type: Number,
      default: 0,
    },

    isOpen: {
      type: Boolean,
      default: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
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

    isActive: {
      type: Boolean,
      default: true,
    },
    facilities: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    featured: {
      type: Boolean,
      default: false,
    },
    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Gym = mongoose.model("Gym", gymSchema);

export default Gym;
