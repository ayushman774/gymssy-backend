import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import PartnerSuccess from "../models/partnerSuccess/PartnerSuccess.js";

const successStories = [
  {
    businessName: "Iron Republic Gym",
    ownerName: "Arjun Mehta",
    businessType: "Premium Gym",
    city: "Mumbai",

    testimonial:
      "Listing on Gymssy was the single best decision I made for my gym. Within 3 months, our monthly enquiries doubled and we signed on 80 new members directly through the platform.",

    growth: "40% increase in monthly enquiries",

    image: {
      url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80",
      alt: "Iron Republic Gym",
    },

    avatar: {
      url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&q=80",
      alt: "Arjun Mehta",
    },

    rating: 5,
    isActive: true,
    order: 1,
  },

  {
    businessName: "Serenity Yoga Studio",
    ownerName: "Priya Nair",
    businessType: "Yoga Studio",
    city: "Bangalore",

    testimonial:
      "Gymssy helped us reach people who were genuinely looking for yoga classes near them. Our studio went from 30% capacity to fully booked within two months of joining.",

    growth: "65% increase in class bookings",

    image: {
      url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80",
      alt: "Serenity Yoga Studio",
    },

    avatar: {
      url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
      alt: "Priya Nair",
    },

    rating: 5,
    isActive: true,
    order: 2,
  },

  {
    businessName: "Champion Martial Arts",
    ownerName: "Ravi Shankar",
    businessType: "Martial Arts Academy",
    city: "Delhi",

    testimonial:
      "The verified profile gave our academy instant credibility. Parents trust Gymssy and that trust transfers directly to our business. Enrolments are up 50% year on year.",

    growth: "50% growth in annual enrolments",

    image: {
      url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80",
      alt: "Champion Martial Arts Academy",
    },

    avatar: {
      url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
      alt: "Ravi Shankar",
    },

    rating: 5,
    isActive: true,
    order: 3,
  },
];

const seedPartnerSuccess = async () => {
  try {
    await connectDB();

    await PartnerSuccess.deleteMany({});

    await PartnerSuccess.insertMany(successStories);

    console.log("✅ Partner success stories seeded successfully");
    console.log(`📦 ${successStories.length} stories added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Partner success seeding failed:", error);

    process.exit(1);
  }
};

seedPartnerSuccess();
