import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import Experience from "../models/experiences/Experience.js";

const experiences = [
  {
    title: "Morning Yoga Flow",
    slug: "morning-yoga-flow",
    category: "Yoga",

    image: {
      url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80",
      alt: "Morning Yoga Flow",
    },

    duration: 60,
    level: "All Levels",
    rating: 4.9,
    priceFrom: 15,
    spots: 8,
    trending: true,
    isActive: true,
  },

  {
    title: "CrossFit Open WOD",
    slug: "crossfit-open-wod",
    category: "CrossFit",

    image: {
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=700&q=80",
      alt: "CrossFit Open WOD",
    },

    duration: 45,
    level: "Intermediate",
    rating: 4.8,
    priceFrom: 20,
    spots: 12,
    trending: true,
    isActive: true,
  },

  {
    title: "Functional Fitness",
    slug: "functional-fitness",
    category: "Functional",

    image: {
      url: "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?w=700&q=80",
      alt: "Functional Fitness",
    },

    duration: 50,
    level: "Beginner",
    rating: 4.7,
    priceFrom: 18,
    spots: 15,
    trending: false,
    isActive: true,
  },

  {
    title: "Salsa Dance Class",
    slug: "salsa-dance-class",
    category: "Dance",

    image: {
      url: "https://images.unsplash.com/photo-1547153760-18fc86324498?w=700&q=80",
      alt: "Salsa Dance Class",
    },

    duration: 75,
    level: "All Levels",
    rating: 4.9,
    priceFrom: 22,
    spots: 5,
    trending: true,
    isActive: true,
  },

  {
    title: "Boxing Fundamentals",
    slug: "boxing-fundamentals",
    category: "Boxing",

    image: {
      url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=700&q=80",
      alt: "Boxing Fundamentals",
    },

    duration: 60,
    level: "Beginner",
    rating: 4.8,
    priceFrom: 25,
    spots: 10,
    trending: false,
    isActive: true,
  },

  {
    title: "Elite Strength Program",
    slug: "elite-strength-program",
    category: "Strength",

    image: {
      url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=700&q=80",
      alt: "Elite Strength Program",
    },

    duration: 90,
    level: "Advanced",
    rating: 5.0,
    priceFrom: 35,
    spots: 6,
    trending: true,
    isActive: true,
  },
];

const seedExperiences = async () => {
  try {
    await connectDB();

    await Experience.deleteMany({});

    await Experience.insertMany(experiences);

    console.log("✅ Experiences seeded successfully");
    console.log(`📦 ${experiences.length} experiences added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Experience seeding failed:", error);

    process.exit(1);
  }
};

seedExperiences();
