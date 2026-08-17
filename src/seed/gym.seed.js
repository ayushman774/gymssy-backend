import dotenv from "dotenv";
dotenv.config();

import connectDB from "../config/db.js";
import Gym from "../models/gyms/Gym.js";
import City from "../models/cities/City.js";

const seedGyms = async () => {
  try {
    await connectDB();

    // Get city references
    const bangalore = await City.findOne({ slug: "bangalore" });
    const mumbai = await City.findOne({ slug: "mumbai" });
    const delhi = await City.findOne({ slug: "delhi" });
    const chennai = await City.findOne({ slug: "chennai" });

    if (!bangalore || !mumbai || !delhi || !chennai) {
      throw new Error("Required cities not found. Run city.seed.js first.");
    }

    const gyms = [
      {
        name: "Cult.fit Indiranagar",
        slug: "cult-fit-indiranagar",
        category: "Premium Gym",
        city: bangalore._id,
        location: "Indiranagar",
        distance: 1.2,
        rating: 4.9,
        reviews: 1842,
        priceFrom: 999,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&fit=crop&auto=format",
          alt: "Cult.fit Indiranagar gym",
        },
        isActive: true,
      },

      {
        name: "Anytime Fitness",
        slug: "anytime-fitness-koramangala",
        category: "24/7 Gym",
        city: bangalore._id,
        location: "Koramangala",
        distance: 2.4,
        rating: 4.7,
        reviews: 963,
        priceFrom: 1499,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80&fit=crop&auto=format",
          alt: "Anytime Fitness gym",
        },
        isActive: true,
      },

      {
        name: "SARVA Yoga Studio",
        slug: "sarva-yoga-hsr",
        category: "Yoga",
        city: bangalore._id,
        location: "HSR Layout",
        distance: 3.1,
        rating: 4.8,
        reviews: 724,
        priceFrom: 799,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&q=80&fit=crop&auto=format",
          alt: "SARVA Yoga Studio",
        },
        isActive: true,
      },

      {
        name: "CrossFit Chennai",
        slug: "crossfit-chennai-nungambakkam",
        category: "CrossFit",
        city: chennai._id,
        location: "Nungambakkam",
        distance: 0.9,
        rating: 4.6,
        reviews: 412,
        priceFrom: 1299,
        isOpen: false,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=800&q=80&fit=crop&auto=format",
          alt: "CrossFit Chennai training facility",
        },
        isActive: true,
      },

      {
        name: "The Pilates Studio",
        slug: "the-pilates-studio-bandra",
        category: "Pilates",
        city: mumbai._id,
        location: "Bandra West",
        distance: 1.7,
        rating: 5.0,
        reviews: 338,
        priceFrom: 1899,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80&fit=crop&auto=format",
          alt: "The Pilates Studio",
        },
        isActive: true,
      },

      {
        name: "DLF Aquatics Club",
        slug: "dlf-aquatics-gurgaon",
        category: "Swimming",
        city: delhi._id,
        location: "DLF Phase 2",
        distance: 4.3,
        rating: 4.5,
        reviews: 591,
        priceFrom: 2199,
        isOpen: true,
        isVerified: false,
        image: {
          url: "https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?w=800&q=80&fit=crop&auto=format",
          alt: "DLF Aquatics Club swimming pool",
        },
        isActive: true,
      },

      {
        name: "Gold's Gym CP",
        slug: "gold-gym-connaught-place",
        category: "Premium Gym",
        city: delhi._id,
        location: "Connaught Place",
        distance: 2.8,
        rating: 4.7,
        reviews: 2103,
        priceFrom: 1599,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80&fit=crop&auto=format",
          alt: "Gold's Gym Connaught Place",
        },
        isActive: true,
      },

      {
        name: "Zen Fit Studio",
        slug: "zen-fit-powai",
        category: "Yoga & Wellness",
        city: mumbai._id,
        location: "Powai",
        distance: 3.6,
        rating: 4.8,
        reviews: 476,
        priceFrom: 1199,
        isOpen: false,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80&fit=crop&auto=format",
          alt: "Zen Fit Studio yoga and wellness",
        },
        isActive: true,
      },

      {
        name: "Gymssy Performance Center",
        slug: "gymssy-performance-center",
        category: "Premium Gym",
        city: bangalore._id,
        location: "Downtown District",
        distance: 0.8,
        rating: 4.9,
        reviews: 312,
        priceFrom: 49,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80",
          alt: "Gymssy Performance Center",
        },
        facilities: ["Olympic Lifting", "Cardio Zone", "Sauna", "Juice Bar"],
        tags: ["24/7", "Personal Training"],
        featured: true,
        isActive: true,
      },

      {
        name: "Elite Fitness Studio",
        slug: "elite-fitness-studio",
        category: "Fitness Studio",
        city: mumbai._id,
        location: "Midtown Central",
        distance: 1.5,
        rating: 4.8,
        reviews: 204,
        priceFrom: 39,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80",
          alt: "Elite Fitness Studio",
        },
        facilities: ["Spin Studio", "Yoga Room", "Boxing", "Nutrition Bar"],
        tags: ["Group Classes", "Female Trainers"],
        featured: false,
        isActive: true,
      },

      {
        name: "FunctionalFit Hub",
        slug: "functionalfit-hub",
        category: "Functional Training",
        city: bangalore._id,
        location: "West End",
        distance: 2.2,
        rating: 4.7,
        reviews: 178,
        priceFrom: 45,
        isOpen: false,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1534367507873-d2d7e24c797f?w=800&q=80",
          alt: "FunctionalFit Hub",
        },
        facilities: [
          "CrossFit Zone",
          "Heavy Bags",
          "Recovery Suite",
          "Protein Bar",
        ],
        tags: ["24/7", "Functional Training"],
        featured: false,
        isActive: true,
      },

      {
        name: "Prestige Athletic Club",
        slug: "prestige-athletic-club",
        category: "Athletic Club",
        city: bangalore._id,
        location: "Uptown Heights",
        distance: 3.1,
        rating: 4.9,
        reviews: 267,
        priceFrom: 89,
        isOpen: true,
        isVerified: true,
        image: {
          url: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=800&q=80",
          alt: "Prestige Athletic Club",
        },
        facilities: [
          "Pilates Studio",
          "Aqua Training",
          "Cryotherapy",
          "VIP Lounge",
        ],
        tags: ["VIP", "Personal Training"],
        featured: true,
        isActive: true,
      },
    ];

    await Gym.deleteMany({});

    await Gym.insertMany(gyms);

    console.log("✅ Gyms seeded successfully");
    console.log(`📦 ${gyms.length} gyms added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Gym seeding failed:", error);
    process.exit(1);
  }
};

seedGyms();
