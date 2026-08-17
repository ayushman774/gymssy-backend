import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import Trainer from "../models/trainers/Trainer.js";

const trainers = [
  {
    name: "Marcus Reid",
    slug: "marcus-reid",
    specialization: "Strength & Conditioning",
    experience: 14,
    rating: 4.9,
    reviewCount: 128,

    image: {
      url: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=500&q=80",
      alt: "Marcus Reid - Strength and Conditioning Trainer",
    },

    pricePerSession: 80,
    available: true,
    featured: true,
    isVerified: true,
    isActive: true,
  },

  {
    name: "Sophia Laurent",
    slug: "sophia-laurent",
    specialization: "Yoga & Mobility",
    experience: 11,
    rating: 4.9,
    reviewCount: 215,

    image: {
      url: "https://images.unsplash.com/photo-1548690312-e3b507d8c110?w=500&q=80",
      alt: "Sophia Laurent - Yoga and Mobility Trainer",
    },

    pricePerSession: 65,
    available: true,
    featured: true,
    isVerified: true,
    isActive: true,
  },

  {
    name: "Jordan Steele",
    slug: "jordan-steele",
    specialization: "HIIT & Metabolic",
    experience: 9,
    rating: 4.8,
    reviewCount: 189,

    image: {
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=500&q=80",
      alt: "Jordan Steele - HIIT and Metabolic Trainer",
    },

    pricePerSession: 75,
    available: false,
    featured: true,
    isVerified: true,
    isActive: true,
  },

  {
    name: "Priya Sharma",
    slug: "priya-sharma",
    specialization: "Body Recomposition",
    experience: 8,
    rating: 4.8,
    reviewCount: 156,

    image: {
      url: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=500&q=80",
      alt: "Priya Sharma - Body Recomposition Trainer",
    },

    pricePerSession: 70,
    available: true,
    featured: true,
    isVerified: true,
    isActive: true,
  },

  {
    name: "Leo Martinez",
    slug: "leo-martinez",
    specialization: "Boxing & Combat",
    experience: 10,
    rating: 4.7,
    reviewCount: 143,

    image: {
      url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=500&q=80",
      alt: "Leo Martinez - Boxing and Combat Trainer",
    },

    pricePerSession: 60,
    available: true,
    featured: true,
    isVerified: true,
    isActive: true,
  },
];

const seedTrainers = async () => {
  try {
    await connectDB();

    await Trainer.deleteMany({});

    await Trainer.insertMany(trainers);

    console.log("✅ Trainers seeded successfully");
    console.log(`📦 ${trainers.length} trainers added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Trainer seeding failed:", error);
    process.exit(1);
  }
};

seedTrainers();
