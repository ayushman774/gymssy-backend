import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Category from "../models/categories/Category.js";

const categories = [
  {
    name: "Gyms",
    slug: "gyms",
    icon: "🏋",
    description: "Premium fitness centers with world-class equipment",
    image: {
      url: "",
      alt: "Premium fitness center with world-class equipment",
    },
    count: 2400,
    isActive: true,
    order: 1,
  },

  {
    name: "Yoga",
    slug: "yoga",
    icon: "🧘",
    description: "Find your flow with certified yoga instructors",
    image: {
      url: "",
      alt: "Yoga class with certified yoga instructors",
    },
    count: 890,
    isActive: true,
    order: 2,
  },

  {
    name: "Personal Trainers",
    slug: "trainers",
    icon: "💪",
    description: "One-on-one coaching tailored to your goals",
    image: {
      url: "",
      alt: "Personal trainer coaching a client",
    },
    count: 1200,
    isActive: true,
    order: 3,
  },

  {
    name: "Pilates",
    slug: "pilates",
    icon: "🤸",
    description: "Strengthen your core with expert-led sessions",
    image: {
      url: "",
      alt: "Pilates training session",
    },
    count: 540,
    isActive: true,
    order: 4,
  },

  {
    name: "Cardio",
    slug: "cardio",
    icon: "🏃",
    description: "High-energy cardio classes for every level",
    image: {
      url: "",
      alt: "People doing cardio exercises",
    },
    count: 780,
    isActive: true,
    order: 5,
  },

  {
    name: "Martial Arts",
    slug: "martial-arts",
    icon: "🥊",
    description: "MMA, boxing, BJJ and more from elite coaches",
    image: {
      url: "",
      alt: "Martial arts training session",
    },
    count: 420,
    isActive: true,
    order: 6,
  },

  {
    name: "Dance",
    slug: "dance",
    icon: "💃",
    description: "Zumba, contemporary, hip-hop and more",
    image: {
      url: "",
      alt: "People participating in a dance fitness class",
    },
    count: 360,
    isActive: true,
    order: 7,
  },

  {
    name: "Swimming",
    slug: "swimming",
    icon: "🏊",
    description: "Pools, academies, and aqua fitness classes",
    image: {
      url: "",
      alt: "Swimming pool and swimming training",
    },
    count: 290,
    isActive: true,
    order: 8,
  },

  {
    name: "Running Clubs",
    slug: "running",
    icon: "🏃",
    description: "Join a community of passionate runners",
    image: {
      url: "",
      alt: "Community of runners exercising together",
    },
    count: 180,
    isActive: true,
    order: 9,
  },

  {
    name: "Sports Academies",
    slug: "sports",
    icon: "🏸",
    description: "Multi-sport academies for all skill levels",
    image: {
      url: "",
      alt: "Athletes training at a sports academy",
    },
    count: 310,
    isActive: true,
    order: 10,
  },
];

const seedCategories = async () => {
  try {
    await connectDB();

    await Category.deleteMany({});

    await Category.insertMany(categories);

    console.log("✅ Categories seeded successfully");
    console.log(`📦 ${categories.length} categories added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Category seeding failed:", error);
    process.exit(1);
  }
};

seedCategories();
