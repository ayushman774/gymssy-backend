import mongoose from "mongoose";

const partnerSuccessSchema = new mongoose.Schema(
  {
    businessName: {
      type: String,
      required: true,
      trim: true,
    },

    ownerName: {
      type: String,
      required: true,
      trim: true,
    },

    businessType: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    testimonial: {
      type: String,
      required: true,
      trim: true,
    },

    growth: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      url: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: "",
      },
    },

    avatar: {
      url: {
        type: String,
        required: true,
      },
      alt: {
        type: String,
        default: "",
      },
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
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

const PartnerSuccess = mongoose.model("PartnerSuccess", partnerSuccessSchema);

export default PartnerSuccess;
