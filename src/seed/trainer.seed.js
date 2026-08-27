import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import Trainer from "../models/trainers/Trainer.js";

export const TRAINERS = [
  {
    id: "trainer-001",
    name: "Marcus Reid",
    slug: "marcus-reid",
    role: "Head Strength Coach",
    specialty: "Strength & Powerlifting",
    experience: "12 Years",
    sessions: "2,400+",
    rating: 4.9,
    reviews: 186,
    clients: "340+",
    certifications: ["NSCA-CSCS", "USAW Level 2", "Precision Nutrition"],
    specializations: ["Powerlifting", "Olympic Lifting", "Body Recomposition"],
    bio: "Former national powerlifting champion turned elite coach. Marcus has guided over 340 clients through life-changing transformations using evidence-based programming and relentless attention to technique.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Marcus Reid — Head Strength Coach at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/trainers/marcus-reid",
  },
  {
    id: "trainer-002",
    name: "Sofia Vega",
    slug: "sofia-vega",
    role: "Performance Coach",
    specialty: "HIIT & Functional Training",
    experience: "8 Years",
    sessions: "1,800+",
    rating: 4.8,
    reviews: 142,
    clients: "280+",
    certifications: ["NASM-CPT", "CrossFit Level 3", "TRX Certified"],
    specializations: ["HIIT", "Functional Movement", "Athletic Conditioning"],
    bio: "Elite performance coach who transforms athletes and everyday members alike. Sofia's high-energy sessions are precision-engineered to maximise output and minimise injury.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1609899537878-48f7c9146cbd?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1609899537878-48f7c9146cbd?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1609899537878-48f7c9146cbd?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1609899537878-48f7c9146cbd?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Sofia Vega — Performance Coach at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/sofia-vega",
  },
  {
    id: "trainer-003",
    name: "James Okafor",
    slug: "james-okafor",
    role: "Transformation Specialist",
    specialty: "Body Transformation",
    experience: "10 Years",
    sessions: "2,100+",
    rating: 4.9,
    reviews: 164,
    clients: "310+",
    certifications: ["ACE-CPT", "Precision Nutrition L2", "NASM-CES"],
    specializations: ["Body Recomposition", "Fat Loss", "Muscle Building"],
    bio: "Holistic transformation specialist who combines expert programming with deep nutritional knowledge. James has helped over 300 clients achieve results they once thought impossible.",
    available: false,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1611672585731-fa10603fb9e0?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "James Okafor — Transformation Specialist at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/james-okafor",
  },
  {
    id: "trainer-004",
    name: "Priya Sharma",
    slug: "priya-sharma",
    role: "Mobility & Recovery Coach",
    specialty: "Yoga & Mobility",
    experience: "9 Years",
    sessions: "1,600+",
    rating: 5.0,
    reviews: 118,
    clients: "220+",
    certifications: ["RYT-500", "FMS Certified", "NASM-CPT"],
    specializations: ["Yoga", "Mobility", "Injury Prevention"],
    bio: "Certified mobility specialist who bridges the gap between athletic performance and mindful movement. Priya's clients consistently report reduced injury rates and significant performance improvements.",
    available: true,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1518611012118-696072aa579a?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Priya Sharma — Mobility and Recovery Coach at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/trainers/priya-sharma",
  },
  {
    id: "trainer-005",
    name: "Dex Williams",
    slug: "dex-williams",
    role: "Athletic Performance Director",
    specialty: "Athletic Performance",
    experience: "14 Years",
    sessions: "2,800+",
    rating: 4.9,
    reviews: 201,
    clients: "400+",
    certifications: ["NSCA-CSCS", "EXOS Specialist", "USA Track & Field"],
    specializations: [
      "Speed & Agility",
      "Sports Conditioning",
      "Power Development",
    ],
    bio: "Former professional athlete and performance director with experience training elite competitors across multiple sports. Dex brings a championship mindset to every session.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1546961342-ea5f62d5a27b?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Dex Williams — Athletic Performance Director at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/trainers/dex-williams",
  },
  {
    id: "trainer-006",
    name: "Layla Hassan",
    slug: "layla-hassan",
    role: "Nutrition & Lifestyle Coach",
    specialty: "Nutrition & Weight Loss",
    experience: "7 Years",
    sessions: "1,400+",
    rating: 4.8,
    reviews: 97,
    clients: "190+",
    certifications: ["Precision Nutrition L2", "NASM-CPT", "ACE Health Coach"],
    specializations: [
      "Nutrition Planning",
      "Weight Management",
      "Lifestyle Coaching",
    ],
    bio: "Science-backed nutrition coach who specialises in sustainable body composition changes. Layla's integrated approach combines training and nutrition for results that stick.",
    available: true,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1559628129-67cf63b72248?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1559628129-67cf63b72248?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1559628129-67cf63b72248?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1559628129-67cf63b72248?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Layla Hassan — Nutrition and Lifestyle Coach at Gymssy Fitness",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/layla-hassan",
  },
];

const seedTrainers = async () => {
  try {
    await connectDB();

    await Trainer.deleteMany({});

    await Trainer.insertMany(TRAINERS);

    console.log("✅ TRAINERS seeded successfully");
    console.log(`📦 ${TRAINERS.length} trainers added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Trainer seeding failed:", error);
    process.exit(1);
  }
};

seedTrainers();
