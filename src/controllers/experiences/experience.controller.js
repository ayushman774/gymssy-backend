import Experience from "../../models/experiences/Experience.js";
import Category from "../../models/categories/Category.js";

export const getTrendingExperiences = async (req, res) => {
  try {
    const { type } = req.query;

    const experienceQuery = {
      isActive: true,
      trending: true,
    };

    // Only apply category filtering when ?type=... is provided.
    // This keeps the existing /trending endpoint unchanged.
    if (type) {
      const normalizedType = type.trim().toLowerCase();

      // Find the requested main category.
      const mainCategory = await Category.findOne({
        slug: normalizedType,
        type: "main",
        isActive: true,
      }).select("_id");

      if (!mainCategory) {
        return res.status(404).json({
          success: false,
          message: `Category '${type}' not found`,
        });
      }

      // Find all active subcategories belonging to the main category.
      const subcategories = await Category.find({
        parentCategory: mainCategory._id,
        type: "subcategory",
        isActive: true,
      }).select("name");

      const categoryNames = subcategories.map(
        (subcategory) => subcategory.name,
      );

      // If the main category has no subcategories,
      // return an empty result rather than returning unrelated experiences.
      if (categoryNames.length === 0) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      experienceQuery.category = {
        $in: categoryNames,
      };
    }

    const experiences = await Experience.find(experienceQuery)
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
