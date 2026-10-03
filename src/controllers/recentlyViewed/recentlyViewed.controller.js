import RecentlyViewed from "../../models/recentlyViewed/RecentlyViewed.js";
import Gym from "../../models/gyms/Gym.js";
import mongoose from "mongoose";
import { toPublicGym } from "../../utils/publicGym.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";

const HISTORY_LIMIT = 10;

/**
 * Add or update a recently viewed gym
 */
export const addRecentlyViewed = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(gymId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gym ID",
      });
    }

    const gym = await Gym.findOne(withPublicListingVisibility({
      _id: gymId,
    })).lean();

    if (!gym) {
      return res.status(404).json({
        success: false,
        message: "Gym not found",
      });
    }

    const recentlyViewed = await RecentlyViewed.findOneAndUpdate(
      {
        user: userId,
        gym: gymId,
      },
      {
        $set: {
          viewedAt: new Date(),
        },
      },
      {
        new: true,
        upsert: true,
      },
    );

    const overflow = await RecentlyViewed.find({ user: userId })
      .sort({ viewedAt: -1 })
      .skip(HISTORY_LIMIT)
      .select("_id")
      .lean();

    if (overflow.length) {
      await RecentlyViewed.deleteMany({
        user: userId,
        _id: { $in: overflow.map((item) => item._id) },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Gym added to recently viewed",
      data: recentlyViewed,
    });
  } catch (error) {
    console.error("Add recently viewed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update recently viewed",
    });
  }
};

/**
 * Get user's recently viewed gyms
 */
export const getRecentlyViewed = async (req, res) => {
  try {
    const userId = req.user.id;

    const recentlyViewed = await RecentlyViewed.find({
      user: userId,
    })
      .sort({ viewedAt: -1 })
      .limit(HISTORY_LIMIT)
      .populate({
        path: "gym",
        match: withPublicListingVisibility(),
      })
      .lean();

    // Remove records whose gym no longer exists/is inactive
    const gyms = recentlyViewed
      .filter((item) => item.gym)
      .map((item) => ({
        ...toPublicGym(item.gym),
        viewedAt: item.viewedAt,
      }));

    return res.status(200).json({
      success: true,
      count: gyms.length,
      data: gyms,
    });
  } catch (error) {
    console.error("Get recently viewed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch recently viewed gyms",
    });
  }
};

/**
 * Remove one gym from recently viewed
 */
export const removeRecentlyViewed = async (req, res) => {
  try {
    const { gymId } = req.params;
    const userId = req.user.id;

    if (!mongoose.isValidObjectId(gymId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid gym ID",
      });
    }

    await RecentlyViewed.findOneAndDelete({
      user: userId,
      gym: gymId,
    });

    return res.status(200).json({
      success: true,
      message: "Gym removed from recently viewed",
    });
  } catch (error) {
    console.error("Remove recently viewed error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove recently viewed gym",
    });
  }
};
