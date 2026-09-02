import Gym from "../../models/gyms/Gym.js";
import City from "../../models/cities/City.js";
import Category from "../../models/categories/Category.js";

export const getFeaturedGyms = async (req, res) => {
  try {
    const { type } = req.query;

    const filter = {
      isActive: true,
    };

    /*
    =================================
    TYPE FILTER
    =================================
    */

    if (type) {
      const normalizedType = type.trim().toLowerCase();

      const allowedTypes = ["fitness", "wellness", "sports"];

      if (!allowedTypes.includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: `Invalid type. Allowed values: ${allowedTypes.join(", ")}`,
        });
      }

      /*
      =================================
      FIND SUBCATEGORIES FOR TYPE
      =================================
      */

      const parentCategory = await Category.findOne({
        slug: normalizedType,
        type: "main",
        isActive: true,
      }).lean();

      if (!parentCategory) {
        return res.status(404).json({
          success: false,
          message: `${normalizedType} category not found`,
        });
      }

      const subcategories = await Category.find({
        parentCategory: parentCategory._id,
        type: "subcategory",
        isActive: true,
      })
        .select("name slug")
        .lean();

      const categoryNames = subcategories.map((item) => item.name);

      const categorySlugs = subcategories.map((item) =>
        item.slug.replace(/-/g, " "),
      );

      /*
      =================================
      MATCH CATEGORY OR TAGS
      =================================
      */

      filter.$or = [
        {
          category: {
            $in: categoryNames,
          },
        },
        {
          tags: {
            $in: categoryNames,
          },
        },
        {
          category: {
            $in: categorySlugs,
          },
        },
        {
          tags: {
            $in: categorySlugs,
          },
        },
      ];
    }

    /*
    =================================
    FETCH FEATURED GYMS
    =================================
    */

    const gyms = await Gym.find(filter)
      .sort({
        featured: -1,
        rating: -1,
        reviewCount: -1,
      })
      .limit(10)
      .lean();

    return res.status(200).json({
      success: true,
      count: gyms.length,
      type: type ? type.trim().toLowerCase() : null,
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

export const getGyms = async (req, res) => {
  try {
    const { city, category } = req.query;

    const filter = {
      isActive: true,
    };

    /* ================================
       CITY FILTER
    ================================= */

    if (city) {
      const normalizedCity = city.trim().toLowerCase();

      const cityDoc = await City.findOne({
        slug: normalizedCity,
        isActive: true,
      }).lean();

      if (!cityDoc) {
        return res.status(200).json({
          success: true,
          count: 0,
          city: normalizedCity,
          category: category || null,
          data: [],
        });
      }

      filter.city = cityDoc._id;
    }

    /* ================================
       CATEGORY FILTER
    ================================= */

    if (category) {
      const normalizedCategory = category.trim().replace(/-/g, " ");

      filter.$or = [
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
      ];
    }

    /* ================================
       FETCH GYMS
    ================================= */

    const gyms = await Gym.find(filter)
      .sort({
        featured: -1,
        rating: -1,
        reviewCount: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: gyms.length,
      city: city || null,
      category: category || null,
      data: gyms,
    });
  } catch (error) {
    console.error("Get gyms error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch gyms",
    });
  }
};
