import mongoose from "mongoose";

const recentlyViewedSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    gym: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Gym",
      required: true,
      index: true,
    },

    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// A user should have only one recently-viewed record per gym.
recentlyViewedSchema.index({ user: 1, gym: 1 }, { unique: true });

const RecentlyViewed = mongoose.model("RecentlyViewed", recentlyViewedSchema);

export default RecentlyViewed;
