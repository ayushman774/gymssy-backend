import Category from "../../models/categories/Category.js";

// GET /api/categories
export const getCategories = async (req, res) => {
  try {
    const mainCategories = await Category.find({
      type: "main",
      parentCategory: null,
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    const mainCategoryIds = mainCategories.map((category) => category._id);

    const subcategories = await Category.find({
      type: "subcategory",
      parentCategory: { $in: mainCategoryIds },
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    const data = mainCategories.map((category) => ({
      ...category,
      subcategories: subcategories.filter(
        (subcategory) =>
          subcategory.parentCategory.toString() === category._id.toString(),
      ),
    }));

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("Get categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
};

// GET /api/categories/:slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await Category.findOne({
      slug,
      isActive: true,
    }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const subcategories = await Category.find({
      parentCategory: category._id,
      type: "subcategory",
      isActive: true,
    })
      .sort({ order: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        ...category,
        subcategories,
      },
    });
  } catch (error) {
    console.error("Get category by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch category",
    });
  }
};
