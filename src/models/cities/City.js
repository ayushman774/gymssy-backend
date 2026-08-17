import mongoose from "mongoose";

const citySchema = new mongoose.Schema(
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

    state: {
      type: String,
      required: true,
      trim: true,
    },

    country: {
      type: String,
      default: "India",
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

    isPopular: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

const City = mongoose.model("City", citySchema);

export default City;
