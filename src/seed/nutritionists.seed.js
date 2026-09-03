import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import Nutritionist from "../models/nutritionists/Nutritionist.js";

export const NUTRITIONISTS = [
  {
    id: "nutritionist-001",
    name: "Dr. Ananya Mehta",
    slug: "dr-ananya-mehta",
    role: "Clinical Nutritionist",
    specialty: "Weight Management & Metabolic Health",
    experience: "11 Years",
    sessions: "2,100+",
    rating: 4.9,
    reviews: 178,
    clients: "420+",
    certifications: [
      "M.Sc. Clinical Nutrition",
      "Certified Sports Nutritionist",
      "Lifestyle Medicine",
    ],
    specializations: [
      "Weight Management",
      "Metabolic Health",
      "Personalized Meal Planning",
    ],
    bio: "Evidence-based clinical nutritionist focused on sustainable lifestyle changes rather than restrictive diets. Ananya creates personalized nutrition strategies that help clients improve body composition, energy levels and long-term health.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Dr. Ananya Mehta — Clinical Nutritionist at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/nutritionists/dr-ananya-mehta",
  },

  {
    id: "nutritionist-002",
    name: "Rhea Kapoor",
    slug: "rhea-kapoor",
    role: "Sports Nutritionist",
    specialty: "Sports Performance & Athletic Nutrition",
    experience: "8 Years",
    sessions: "1,750+",
    rating: 4.8,
    reviews: 146,
    clients: "310+",
    certifications: [
      "M.Sc. Sports Nutrition",
      "ISSA Sports Nutrition",
      "Certified Performance Nutrition Coach",
    ],
    specializations: [
      "Sports Nutrition",
      "Performance Nutrition",
      "Pre & Post Workout Nutrition",
    ],
    bio: "Sports nutrition specialist helping athletes and active individuals fuel training, improve recovery and perform at their best. Rhea combines practical meal strategies with evidence-based performance nutrition.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Rhea Kapoor — Sports Nutritionist at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/nutritionists/rhea-kapoor",
  },

  {
    id: "nutritionist-003",
    name: "Dr. Arjun Malhotra",
    slug: "dr-arjun-malhotra",
    role: "Nutrition & Lifestyle Specialist",
    specialty: "Healthy Lifestyle & Body Recomposition",
    experience: "10 Years",
    sessions: "1,900+",
    rating: 4.9,
    reviews: 159,
    clients: "350+",
    certifications: [
      "M.Sc. Nutrition & Dietetics",
      "Certified Lifestyle Coach",
      "Precision Nutrition Level 2",
    ],
    specializations: [
      "Body Recomposition",
      "Healthy Eating",
      "Lifestyle Nutrition",
    ],
    bio: "Nutrition and lifestyle specialist helping busy professionals build sustainable eating habits. Arjun focuses on realistic nutrition systems that fit work schedules, travel and everyday life.",
    available: true,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Dr. Arjun Malhotra — Nutrition and Lifestyle Specialist at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/nutritionists/dr-arjun-malhotra",
  },

  {
    id: "nutritionist-004",
    name: "Meera Nair",
    slug: "meera-nair",
    role: "Holistic Nutrition Coach",
    specialty: "Women's Nutrition & Wellness",
    experience: "9 Years",
    sessions: "1,600+",
    rating: 5.0,
    reviews: 132,
    clients: "270+",
    certifications: [
      "M.Sc. Food & Nutrition",
      "Certified Holistic Nutrition Coach",
      "Women's Wellness Specialist",
    ],
    specializations: [
      "Women's Nutrition",
      "Hormonal Wellness",
      "Healthy Meal Planning",
    ],
    bio: "Holistic nutrition coach focused on helping women develop healthier relationships with food and build sustainable wellness routines. Meera combines personalized nutrition planning with practical lifestyle guidance.",
    available: true,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1580489944761-15a19d654956?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Meera Nair — Holistic Nutrition Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/nutritionists/meera-nair",
  },

  {
    id: "nutritionist-005",
    name: "Kabir Singh",
    slug: "kabir-singh",
    role: "Fitness Nutritionist",
    specialty: "Muscle Gain & Body Transformation",
    experience: "7 Years",
    sessions: "1,450+",
    rating: 4.8,
    reviews: 104,
    clients: "240+",
    certifications: [
      "M.Sc. Sports & Exercise Nutrition",
      "Precision Nutrition Level 1",
      "Certified Fitness Nutrition Coach",
    ],
    specializations: ["Muscle Gain", "Fat Loss", "Body Transformation"],
    bio: "Fitness nutrition specialist helping gym members achieve measurable body composition goals through practical, flexible nutrition plans. Kabir focuses on sustainable habits instead of extreme diets.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1560250097-0b93528c311a?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Kabir Singh — Fitness Nutritionist at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/nutritionists/kabir-singh",
  },

  {
    id: "nutritionist-006",
    name: "Ishita Rao",
    slug: "ishita-rao",
    role: "Diet & Nutrition Specialist",
    specialty: "Personalized Diet Planning",
    experience: "6 Years",
    sessions: "1,200+",
    rating: 4.7,
    reviews: 89,
    clients: "180+",
    certifications: [
      "M.Sc. Dietetics",
      "Certified Nutrition Coach",
      "Advanced Meal Planning Specialist",
    ],
    specializations: [
      "Personalized Diet Plans",
      "Weight Management",
      "Healthy Eating",
    ],
    bio: "Personalized nutrition specialist who creates simple and practical meal plans tailored to individual goals, preferences and routines. Ishita helps clients make healthier choices without giving up the foods they enjoy.",
    available: false,
    featured: false,
    image: {
      src: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Ishita Rao — Diet and Nutrition Specialist at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/nutritionists/ishita-rao",
  },
];

const seedNutritionists = async () => {
  try {
    await connectDB();

    await Nutritionist.deleteMany({});

    await Nutritionist.insertMany(NUTRITIONISTS);

    console.log("✅ NUTRITIONISTS seeded successfully");
    console.log(`📦 ${NUTRITIONISTS.length} nutritionists added`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Nutritionist seeding failed:", error);
    process.exit(1);
  }
};

seedNutritionists();
