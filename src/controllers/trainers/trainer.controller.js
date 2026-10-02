import Trainer from "../../models/trainers/Trainer.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";
import { toPublicTrainer, toPublicTrainers } from "../../utils/publicProfessional.js";

export const getFeaturedTrainers = async (req, res) => {
  try {
    const { category } = req.query;

    const filter = withPublicListingVisibility({
      featured: true,
    });

    // Optional category filter
    // Example:
    // /api/trainers/featured?category=sports
    if (category) {
      const normalizedCategory = category.toLowerCase().trim();

      if (!["fitness", "wellness", "sports"].includes(normalizedCategory)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid category. Allowed categories: fitness, wellness, sports",
        });
      }

      filter.category = normalizedCategory;
    }

    const trainers = await Trainer.find(filter)
      .sort({
        rating: -1,
        reviews: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: trainers.length,
      data: toPublicTrainers(trainers),
    });
  } catch (error) {
    console.error("Get featured trainers error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured trainers",
    });
  }
};

export const getTrainerBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const trainer = await Trainer.findOne(withPublicListingVisibility({
      slug,
    })).lean();

    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: "Trainer not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: toPublicTrainer(trainer),
    });
  } catch (error) {
    console.error("Get trainer by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch trainer",
    });
  }
};
