import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Category from "../models/categories/Category.js";

const mainCategories = [
  {
    name: "Fitness",
    slug: "fitness",
    type: "main",
    parentCategory: null,
    icon: "Dumbbell",
    description: "Gyms, trainers, fitness classes & more",
    image: {
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=85&fit=crop&auto=format",
      alt: "Modern fitness center with professional equipment",
    },
    isActive: true,
    order: 1,
  },

  {
    name: "Wellness",
    slug: "wellness",
    type: "main",
    parentCategory: null,
    icon: "HeartPulse",
    description: "Yoga, meditation, spa, nutrition & more",
    image: {
      url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=1200&q=85&fit=crop&auto=format",
      alt: "Peaceful wellness and yoga environment",
    },
    isActive: true,
    order: 2,
  },

  {
    name: "Sports",
    slug: "sports",
    type: "main",
    parentCategory: null,
    icon: "Trophy",
    description: "Coaching, academies, courts & more",
    image: {
      url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1200&q=85&fit=crop&auto=format",
      alt: "Athletes training in a sports facility",
    },
    isActive: true,
    order: 3,
  },
];

const subcategories = {
  fitness: [
    {
      name: "Gyms",
      slug: "gyms",
      icon: "Dumbbell",
      description: "Premium fitness centers with world-class equipment",
      count: 2400,
      image: {
        url: "",
        alt: "Premium fitness center with world-class equipment",
      },
    },
    {
      name: "Personal Trainers",
      slug: "personal-trainers",
      icon: "UserRound",
      description: "One-on-one coaching tailored to your goals",
      count: 1200,
      image: {
        url: "",
        alt: "Personal trainer coaching a client",
      },
    },
    {
      name: "CrossFit",
      slug: "crossfit",
      icon: "Flame",
      description: "High-intensity functional fitness training",
      count: 340,
      image: {
        url: "",
        alt: "CrossFit training session",
      },
    },
    {
      name: "Pilates",
      slug: "pilates",
      icon: "PersonStanding",
      description: "Strengthen your core with expert-led sessions",
      count: 540,
      image: {
        url: "",
        alt: "Pilates training session",
      },
    },
    {
      name: "Cardio",
      slug: "cardio",
      icon: "HeartPulse",
      description: "High-energy cardio classes for every level",
      count: 780,
      image: {
        url: "",
        alt: "Cardio fitness training",
      },
    },
    {
      name: "HIIT",
      slug: "hiit",
      icon: "Zap",
      description: "High-intensity interval training",
      count: 220,
      image: {
        url: "",
        alt: "HIIT workout session",
      },
    },
    {
      name: "Fitness Classes",
      slug: "fitness-classes",
      icon: "Target",
      description: "Group fitness classes for every goal",
      count: 560,
      image: {
        url: "",
        alt: "Group fitness class",
      },
    },
  ],

  wellness: [
    {
      name: "Yoga",
      slug: "yoga",
      icon: "Flower2",
      description: "Find your flow with certified yoga instructors",
      count: 890,
      image: {
        url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80&fit=crop&auto=format",
        alt: "Yoga class with certified yoga instructors",
      },
    },

    {
      name: "Meditation",
      slug: "meditation",
      icon: "Leaf",
      description: "Mindfulness and meditation experiences",
      count: 310,
      image: {
        url: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=800&q=80&fit=crop&auto=format",
        alt: "Meditation and mindfulness session",
      },
    },

    {
      name: "Spa & Recovery",
      slug: "spa-recovery",
      icon: "Sparkles",
      description: "Relaxation, recovery and rejuvenation",
      count: 280,
      image: {
        url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80&fit=crop&auto=format",
        alt: "Spa and recovery treatment",
      },
    },

    {
      name: "Nutrition",
      slug: "nutrition",
      icon: "Salad",
      description: "Nutrition guidance and wellness programs",
      count: 190,
      image: {
        url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800&q=80&fit=crop&auto=format",
        alt: "Healthy nutrition and wellness",
      },
    },

    {
      name: "Wellness Centers",
      slug: "wellness-centers",
      icon: "House",
      description: "Holistic spaces for mind and body",
      count: 240,
      image: {
        url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80&fit=crop&auto=format",
        alt: "Modern wellness center",
      },
    },

    {
      name: "Recovery",
      slug: "recovery",
      icon: "HeartPulse",
      description: "Rest and recover the right way",
      count: 160,
      image: {
        url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800&q=80&fit=crop&auto=format",
        alt: "Recovery therapy session",
      },
    },

    {
      name: "Mobility",
      slug: "mobility",
      icon: "Move",
      description: "Improve flexibility, movement and mobility",
      count: 140,
      image: {
        url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&fit=crop&auto=format",
        alt: "Mobility training session",
      },
    },

    {
      name: "Mindfulness",
      slug: "mindfulness",
      icon: "Brain",
      description: "Be present, reduce anxiety",
      count: 120,
      image: {
        url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=800&q=80&fit=crop&auto=format",
        alt: "Mindfulness and meditation practice",
      },
    },

    {
      name: "Holistic Wellness",
      slug: "holistic-wellness",
      icon: "Sparkles",
      description: "Whole-body wellness approaches",
      count: 95,
      image: {
        url: "https://images.unsplash.com/photo-1616279967983-ec413476e824?w=800&q=80&fit=crop&auto=format",
        alt: "Holistic wellness and relaxation",
      },
    },
  ],

  sports: [
    {
      name: "Swimming",
      slug: "swimming",
      icon: "Waves",
      description: "Pools, coaching & swim clubs",
      count: 320,
      image: {
        url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80&fit=crop&auto=format",
        alt: "Swimming pools and coaching",
      },
    },

    {
      name: "Martial Arts",
      slug: "martial-arts",
      icon: "Swords",
      description: "Karate, BJJ, MMA & more",
      count: 280,
      image: {
        url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80&fit=crop&auto=format",
        alt: "Martial arts training session",
      },
    },

    {
      name: "Boxing",
      slug: "boxing",
      icon: "Dumbbell",
      description: "Train like a champion",
      count: 190,
      image: {
        url: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80&fit=crop&auto=format",
        alt: "Boxing training session",
      },
    },

    {
      name: "Sports Coaching",
      slug: "sports-coaching",
      icon: "Trophy",
      description: "Expert coaching for every sport",
      count: 440,
      image: {
        url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80&fit=crop&auto=format",
        alt: "Sports coaching session",
      },
    },

    {
      name: "Sports Academies",
      slug: "sports-academies",
      icon: "Trophy",
      description: "Elite academies for serious players",
      count: 160,
      image: {
        url: "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80&fit=crop&auto=format",
        alt: "Sports academy and training facility",
      },
    },

    {
      name: "Running Clubs",
      slug: "running-clubs",
      icon: "PersonStanding",
      description: "Run with your community",
      count: 210,
      image: {
        url: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80&fit=crop&auto=format",
        alt: "Community of runners",
      },
    },

    {
      name: "Tennis",
      slug: "tennis",
      icon: "CircleDot",
      description: "Courts, coaching & clubs",
      count: 240,
      image: {
        url: "https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800&q=80&fit=crop&auto=format",
        alt: "Tennis court and training",
      },
    },

    {
      name: "Badminton",
      slug: "badminton",
      icon: "CircleDot",
      description: "Book courts & find coaches",
      count: 380,
      image: {
        url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80&fit=crop&auto=format",
        alt: "Badminton training",
      },
    },

    {
      name: "Football",
      slug: "football",
      icon: "CircleDot",
      description: "Training, academies & leagues",
      count: 290,
      image: {
        url: "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80&fit=crop&auto=format",
        alt: "Football training",
      },
    },

    {
      name: "Basketball",
      slug: "basketball",
      icon: "CircleDot",
      description: "Courts, drills & team training",
      count: 180,
      image: {
        url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80&fit=crop&auto=format",
        alt: "Basketball court and training",
      },
    },

    {
      name: "Cricket",
      slug: "cricket",
      icon: "CircleDot",
      description: "Nets, academies & coaching",
      count: 350,
      image: {
        url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80&fit=crop&auto=format",
        alt: "Cricket training and academy",
      },
    },
  ],
};

const seedCategories = async () => {
  try {
    await connectDB();

    await Category.deleteMany({});

    // 1. Create main categories
    const createdMainCategories = await Category.insertMany(mainCategories);

    // 2. Create a map: fitness -> MongoDB ID
    const parentMap = {};

    createdMainCategories.forEach((category) => {
      parentMap[category.slug] = category._id;
    });

    // 3. Build subcategories with parent IDs
    const subcategoryDocuments = [];

    Object.entries(subcategories).forEach(([parentSlug, children]) => {
      children.forEach((child, index) => {
        subcategoryDocuments.push({
          ...child,
          type: "subcategory",
          parentCategory: parentMap[parentSlug],
          isActive: true,
          order: index + 1,
        });
      });
    });

    // 4. Insert subcategories
    await Category.insertMany(subcategoryDocuments);

    const total = createdMainCategories.length + subcategoryDocuments.length;

    console.log("✅ Categories seeded successfully");
    console.log(`📦 ${total} categories added`);
    console.log(`   Main categories: ${createdMainCategories.length}`);
    console.log(`   Subcategories: ${subcategoryDocuments.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Category seeding failed:", error);
    process.exit(1);
  }
};

seedCategories();
