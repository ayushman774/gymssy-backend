import Trainer from "../../models/trainers/Trainer.js";

export const getFeaturedTrainers = async (req, res) => {
  try {
    const trainers = await Trainer.find({
      isActive: true,
      featured: true,
    })
      .sort({
        rating: -1,
        reviewCount: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: trainers.length,
      data: trainers,
    });
  } catch (error) {
    console.error("Get featured trainers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured trainers",
    });
  }
};
