import City from "../../models/cities/City.js";

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
