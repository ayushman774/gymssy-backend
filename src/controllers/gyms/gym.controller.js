import Gym from "../../models/gyms/Gym.js";

export const getFeaturedGyms = async (req, res) => {
  try {
    const gyms = await Gym.find({
      isActive: true,
    })
      .sort({
        featured: -1,
        rating: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: gyms.length,
      data: gyms,
    });
  } catch (error) {
    console.error("Get featured gyms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch gyms",
    });
  }
};
