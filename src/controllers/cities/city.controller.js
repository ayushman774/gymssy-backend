import City from "../../models/cities/City.js";
import mongoose from "mongoose";

export const getActiveCities = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.stateId) {
      if (!mongoose.isValidObjectId(req.query.stateId)) return res.status(400).json({ success: false, message: "Invalid stateId" });
      filter.stateId = req.query.stateId;
    }
    if (req.query.search) {
      const search = String(req.query.search).trim().slice(0, 80);
      if (search) filter.name = { $regex: search.replace(/[^a-zA-Z0-9\s-]/g, ""), $options: "i" };
    }
    const cities = await City.find(filter)
      .sort({ order: 1, name: 1 })
      .select("name slug state stateId aliases country image isPopular order")
      .lean();
    return res.status(200).json({ success: true, count: cities.length, data: cities });
  } catch (error) {
    console.error("Get active cities error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch cities" });
  }
};

export const getPopularCities = async (req, res) => {
  try {
    const cities = await City.aggregate([
      {
        $match: {
          isActive: true,
          isPopular: true,
        },
      },

      {
        $lookup: {
          from: "gyms",
          let: {
            cityId: "$_id",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$city", "$$cityId"],
                },
                isActive: true,
                moderationStatus: { $nin: ["pending", "rejected"] },
              },
            },
          ],
          as: "gyms",
        },
      },

      {
        $addFields: {
          gymCount: {
            $size: "$gyms",
          },
        },
      },

      {
        $sort: {
          order: 1,
        },
      },

      {
        $project: {
          name: 1,
          slug: 1,
          state: 1,
          country: 1,
          image: 1,
          gymCount: 1,
        },
      },
    ]);

    const formattedCities = cities.map((city) => ({
      ...city,
      gymCount: `${city.gymCount}+`,
    }));

    return res.status(200).json({
      success: true,
      count: formattedCities.length,
      data: formattedCities,
    });
  } catch (error) {
    console.error("Get popular cities error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch popular cities",
    });
  }
};
