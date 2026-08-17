import Experience from "../../models/experiences/Experience.js";

export const getTrendingExperiences = async (req, res) => {
  try {
    const experiences = await Experience.find({
      isActive: true,
      trending: true,
    })
      .sort({
        rating: -1,
        createdAt: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: experiences.length,
      data: experiences,
    });
  } catch (error) {
    console.error("Get trending experiences error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trending experiences",
    });
  }
};
