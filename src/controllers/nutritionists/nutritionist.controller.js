import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";
import {
  toPublicNutritionist,
  toPublicNutritionists,
} from "../../utils/publicProfessional.js";

/* =========================================
   GET FEATURED NUTRITIONISTS
========================================= */

export const getFeaturedNutritionists = async (req, res) => {
  try {
    const nutritionists = await Nutritionist.find(withPublicListingVisibility({
      featured: true,
    }))
      .sort({
        rating: -1,
        reviews: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: nutritionists.length,
      data: toPublicNutritionists(nutritionists),
    });
  } catch (error) {
    console.error("Get featured nutritionists error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch featured nutritionists",
    });
  }
};

/* =========================================
   GET NUTRITIONIST BY SLUG
========================================= */

export const getNutritionistBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const nutritionist = await Nutritionist.findOne(withPublicListingVisibility({
      slug,
    })).lean();

    if (!nutritionist) {
      return res.status(404).json({
        success: false,
        message: "Nutritionist not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: toPublicNutritionist(nutritionist),
    });
  } catch (error) {
    console.error("Get nutritionist by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nutritionist",
    });
  }
};

/* =========================================
   GET ALL NUTRITIONISTS
========================================= */

export const getNutritionists = async (req, res) => {
  try {
    const nutritionists = await Nutritionist.find(withPublicListingVisibility())
      .sort({
        featured: -1,
        rating: -1,
        reviews: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: nutritionists.length,
      data: toPublicNutritionists(nutritionists),
    });
  } catch (error) {
    console.error("Get nutritionists error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch nutritionists",
    });
  }
};
