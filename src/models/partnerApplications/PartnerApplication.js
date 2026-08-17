import mongoose from "mongoose";

const partnerApplicationSchema = new mongoose.Schema(
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

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
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

    address: {
      type: String,
      required: true,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    message: {
      type: String,
      trim: true,
      default: "",
    },

    agreed: {
      type: Boolean,
      required: true,
      default: false,
    },

    status: {
      type: String,
      enum: ["pending", "contacted", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

const PartnerApplication = mongoose.model(
  "PartnerApplication",
  partnerApplicationSchema,
);

export default PartnerApplication;
