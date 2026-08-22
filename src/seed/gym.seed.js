import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Gym from "../models/gyms/Gym.js";
import City from "../models/cities/City.js";
import { gymsData } from "../data/gymsData.js";

const seedGyms = async () => {
  try {
    await connectDB();

    console.log("🌱 Starting gym seed...");

    const cities = await City.find({
      isActive: true,
    }).lean();

    if (!cities.length) {
      throw new Error(
        "No active cities found. Please create Bangalore city first.",
      );
    }

    let inserted = 0;
    let updated = 0;

    for (const gym of gymsData) {
      const citySlug = gym.location.city.toLowerCase().replace(/\s+/g, "-");

      const city = cities.find((item) => item.slug === citySlug);

      if (!city) {
        console.warn(`⚠️ City not found for gym: ${gym.name} (${citySlug})`);

        continue;
      }

      const gymData = {
        name: gym.name,
        slug: gym.slug,

        verified: gym.verified ?? false,

        category: gym.category,

        tags: gym.tags ?? [],

        location: {
          area: gym.location?.area ?? "",
          city: gym.location?.city ?? "",
          state: gym.location?.state ?? "",
          pincode: gym.location?.pincode ?? "",
          address: gym.location?.address ?? "",
          landmark: gym.location?.landmark ?? "",
          parking: gym.location?.parking ?? "",
        },

        coordinates: {
          lat: gym.coordinates?.lat ?? null,
          lng: gym.coordinates?.lng ?? null,
        },

        distance: parseDistance(gym.distance),

        phone: gym.phone ?? "",

        email: gym.email ?? "",

        website: gym.website ?? "",

        description: gym.description ?? "",

        highlights: gym.highlights ?? [],

        rating: gym.rating ?? 0,

        reviewCount: gym.reviewCount ?? 0,

        priceFrom: getPriceFrom(gym.memberships),

        openNow: gym.openNow ?? false,

        images: {
          cover: gym.images?.cover ?? "",
          gallery: gym.images?.gallery ?? [],
        },

        facilities: gym.facilities ?? [],

        memberships: gym.memberships ?? [],

        trainers: gym.trainers ?? [],

        classes: gym.classes ?? [],

        timings: gym.timings ?? [],

        reviews: gym.reviews ?? [],

        ratingBreakdown: gym.ratingBreakdown ?? [],

        isActive: true,

        featured: false,

        city: city._id,
      };

      const existingGym = await Gym.findOne({
        slug: gym.slug,
      });

      await Gym.findOneAndUpdate({ slug: gym.slug }, gymData, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      });

      if (existingGym) {
        updated++;
        console.log(`🔄 Updated: ${gym.name}`);
      } else {
        inserted++;
        console.log(`✅ Inserted: ${gym.name}`);
      }
    }

    console.log("");
    console.log("🎉 Gym seed completed");
    console.log(`✅ Inserted: ${inserted}`);
    console.log(`🔄 Updated: ${updated}`);
    console.log(`📊 Total source gyms: ${gymsData.length}`);
  } catch (error) {
    console.error("❌ Gym seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

const parseDistance = (distance) => {
  if (typeof distance === "number") {
    return distance;
  }

  if (!distance) {
    return null;
  }

  const numericDistance = parseFloat(distance);

  return Number.isNaN(numericDistance) ? null : numericDistance;
};

const getPriceFrom = (memberships = []) => {
  if (!memberships.length) {
    return 0;
  }

  const prices = memberships
    .map((membership) => membership.price)
    .filter((price) => typeof price === "number" && price > 0);

  return prices.length ? Math.min(...prices) : 0;
};

seedGyms();
