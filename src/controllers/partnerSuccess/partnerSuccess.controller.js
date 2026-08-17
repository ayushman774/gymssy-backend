import PartnerSuccess from "../../models/partnerSuccess/PartnerSuccess.js";

export const getPartnerSuccessStories = async (req, res) => {
  try {
    const stories = await PartnerSuccess.find({
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: stories.length,
      data: stories,
    });
  } catch (error) {
    console.error("Get partner success stories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch partner success stories",
    });
  }
};
