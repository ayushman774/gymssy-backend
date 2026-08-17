import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import City from "../models/cities/City.js";

const cities = [
  {
    name: "Bangalore",
    slug: "bangalore",
    state: "Karnataka",

    image: {
      url: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=700&q=80",
      alt: "Bangalore city",
    },

    isPopular: true,
    isActive: true,
    order: 1,
  },

  {
    name: "Mumbai",
    slug: "mumbai",
    state: "Maharashtra",

    image: {
      url: "https://images.unsplash.com/photo-1562979314-bee7453e911c?w=700&q=80",
      alt: "Mumbai city",
    },

    isPopular: true,
    isActive: true,
    order: 2,
  },

  {
    name: "Delhi",
    slug: "delhi",
    state: "Delhi",

    image: {
      url: "https://images.unsplash.com/photo-1558431382-27e303142255?w=700&q=80",
      alt: "Delhi city",
    },

    isPopular: true,
    isActive: true,
    order: 3,
  },

  {
    name: "Hyderabad",
    slug: "hyderabad",
    state: "Telangana",

    image: {
      url: "https://images.unsplash.com/photo-1573153237029-5a3a8d41f3c6?w=700&q=80",
      alt: "Hyderabad city",
    },

    isPopular: true,
    isActive: true,
    order: 4,
  },

  {
    name: "Pune",
    slug: "pune",
    state: "Maharashtra",

    image: {
      url: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=700&q=80",
      alt: "Pune city",
    },

    isPopular: true,
    isActive: true,
    order: 5,
  },

  {
    name: "Chennai",
    slug: "chennai",
    state: "Tamil Nadu",

    image: {
      url: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=700&q=80",
      alt: "Chennai city",
    },

    isPopular: true,
    isActive: true,
    order: 6,
  },
];



const seedCities = async () => {
  try {
    await connectDB();

    await City.deleteMany({});

    await City.insertMany(cities);

    console.log("✅ Cities seeded successfully");
    console.log(`📦 ${cities.length} cities added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ City seeding failed:", error);

    process.exit(1);
  }
};

seedCities();
