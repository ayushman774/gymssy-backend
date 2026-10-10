import mongoose from "mongoose";
import Gym from "../../models/gyms/Gym.js";

const ALLOWED_COLLECTIONS = ["luxury-wellness"];

export const updateAdminFeaturedCollections = async (req, res) => {
  try {
    const { id } = req.params;
    const { featuredCollections } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing ID" });
    }
    if (
      !Array.isArray(featuredCollections) ||
      featuredCollections.some((slug) => typeof slug !== "string" || !ALLOWED_COLLECTIONS.includes(slug))
    ) {
      return res.status(400).json({
        success: false,
        message: "featuredCollections must be an array containing only supported collection slugs",
        allowedCollections: ALLOWED_COLLECTIONS,
      });
    }

    const gym = await Gym.findById(id);
    if (!gym) {
      return res.status(404).json({ success: false, message: "Gym listing not found" });
    }

    const unique = [...new Set(featuredCollections)];

    gym.featuredCollections = unique;
    await gym.save();

    return res.status(200).json({
      success: true,
      message: "Featured collections updated",
      data: { id: String(gym._id), featuredCollections: gym.featuredCollections },
    });
  } catch (error) {
    console.error("Admin featured collection update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update featured collections" });
  }
};
