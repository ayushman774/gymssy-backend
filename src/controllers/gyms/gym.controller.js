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

export const getGymBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const gym = await Gym.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    }).lean();

    if (!gym) {
      return res.status(404).json({
        success: false,
        message: "Gym not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: gym,
    });
  } catch (error) {
    console.error("Get gym by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch gym",
    });
  }
};

export const getGymsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const normalizedCategory = category.trim().replace(/-/g, " ");

    const gyms = await Gym.find({
      isActive: true,
      $or: [
        {
          category: {
            $regex: `^${normalizedCategory}$`,
            $options: "i",
          },
        },
        {
          tags: {
            $regex: normalizedCategory,
            $options: "i",
          },
        },
      ],
    })
      .sort({
        featured: -1,
        rating: -1,
        reviewCount: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: gyms.length,
      category: normalizedCategory,
      data: gyms,
    });
  } catch (error) {
    console.error("Get gyms by category error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch gyms by category",
    });
  }
};
