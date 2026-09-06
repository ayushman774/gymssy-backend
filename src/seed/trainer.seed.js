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

export const SPORTS_TRAINERS = [
  {
    id: "sports-trainer-001",
    name: "Arjun Mehta",
    slug: "arjun-mehta",
    category: "sports",
    role: "Football Performance Coach",
    specialty: "Football & Athletic Performance",
    experience: "11 Years",
    sessions: "2,300+",
    rating: 4.9,
    reviews: 174,
    clients: "320+",
    certifications: [
      "UEFA B License",
      "NSCA-CSCS",
      "FIFA Training Certificate",
    ],
    specializations: [
      "Football Conditioning",
      "Speed & Agility",
      "Match Fitness",
      "Injury Prevention",
    ],
    bio: "Specialist football performance coach focused on developing speed, endurance, strength and match-ready conditioning. Arjun has worked with competitive players from academy level through professional environments.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Arjun Mehta — Football Performance Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/arjun-mehta",
    isVerified: true,
    isActive: true,
  },

  {
    id: "sports-trainer-002",
    name: "Rohan Kapoor",
    slug: "rohan-kapoor",
    category: "sports",
    role: "Cricket Performance Coach",
    specialty: "Cricket Training & Conditioning",
    experience: "13 Years",
    sessions: "2,700+",
    rating: 4.9,
    reviews: 198,
    clients: "360+",
    certifications: [
      "BCCI Level 2",
      "NSCA-CPT",
      "Sports Performance Specialist",
    ],
    specializations: [
      "Batting Technique",
      "Bowling Conditioning",
      "Cricket Fitness",
      "Speed & Agility",
    ],
    bio: "Experienced cricket coach combining technical skill development with modern sports science. Rohan works with players on performance, conditioning and match preparation across all competitive levels.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Rohan Kapoor — Cricket Performance Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/rohan-kapoor",
    isVerified: true,
    isActive: true,
  },

  {
    id: "sports-trainer-003",
    name: "Maya Fernandez",
    slug: "maya-fernandez",
    category: "sports",
    role: "Tennis Performance Coach",
    specialty: "Tennis & Court Performance",
    experience: "10 Years",
    sessions: "2,100+",
    rating: 4.8,
    reviews: 156,
    clients: "270+",
    certifications: ["PTR Certified", "USTA Coach", "NSCA Sports Performance"],
    specializations: [
      "Tennis Technique",
      "Footwork",
      "Match Strategy",
      "Athletic Conditioning",
    ],
    bio: "High-performance tennis coach specialising in technical development, movement efficiency and competitive preparation. Maya helps players build confidence and consistency on the court.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Maya Fernandez — Tennis Performance Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: null,
      youtube: null,
    },
    href: "/trainers/maya-fernandez",
    isVerified: true,
    isActive: true,
  },

  {
    id: "sports-trainer-004",
    name: "Kabir Singh",
    slug: "kabir-singh",
    category: "sports",
    role: "Combat Sports Coach",
    specialty: "Boxing & MMA",
    experience: "15 Years",
    sessions: "3,100+",
    rating: 5.0,
    reviews: 221,
    clients: "410+",
    certifications: [
      "USA Boxing Certified",
      "MMA Conditioning Specialist",
      "NSCA-CPT",
    ],
    specializations: [
      "Boxing",
      "MMA",
      "Combat Conditioning",
      "Fight Preparation",
    ],
    bio: "Elite combat sports coach with extensive experience preparing athletes for competition. Kabir combines technical striking, conditioning and disciplined fight preparation into structured training programs.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Kabir Singh — Boxing and MMA Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    href: "/trainers/kabir-singh",
    isVerified: true,
    isActive: true,
  },

  {
    id: "sports-trainer-005",
    name: "Ananya Rao",
    slug: "ananya-rao",
    category: "sports",
    role: "Swimming Performance Coach",
    specialty: "Swimming & Aquatic Performance",
    experience: "9 Years",
    sessions: "1,900+",
    rating: 4.9,
    reviews: 143,
    clients: "250+",
    certifications: [
      "ASCA Certified",
      "Swim England Coach",
      "Sports Performance Specialist",
    ],
    specializations: [
      "Swimming Technique",
      "Endurance",
      "Stroke Development",
      "Race Preparation",
    ],
    bio: "Dedicated swimming coach helping athletes improve technique, endurance and race performance. Ananya works with beginners, competitive swimmers and athletes preparing for aquatic events.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1530549387789-4c1017266635?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1530549387789-4c1017266635?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Ananya Rao — Swimming Performance Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: null,
      linkedin: "https://linkedin.com",
      youtube: null,
    },
    href: "/trainers/ananya-rao",
    isVerified: true,
    isActive: true,
  },

  {
    id: "sports-trainer-006",
    name: "Vikram Desai",
    slug: "vikram-desai",
    category: "sports",
    role: "Badminton Performance Coach",
    specialty: "Badminton & Athletic Conditioning",
    experience: "12 Years",
    sessions: "2,500+",
    rating: 4.8,
    reviews: 167,
    clients: "300+",
    certifications: [
      "BWF Level 2",
      "NSCA-CPT",
      "Sports Conditioning Specialist",
    ],
    specializations: [
      "Badminton Technique",
      "Footwork",
      "Reaction Training",
      "Match Conditioning",
    ],
    bio: "Performance-focused badminton coach specialising in footwork, reaction speed and match conditioning. Vikram helps recreational and competitive players build efficient movement and stronger game performance.",
    available: true,
    featured: true,
    image: {
      src: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=85&fit=crop&auto=format",
      srcSet:
        "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&q=80&fit=crop&auto=format 300w, https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=500&q=85&fit=crop&auto=format 500w, https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=600&q=85&fit=crop&auto=format 600w",
      sizes: "(max-width: 300px) 300px, (max-width: 500px) 500px, 600px",
      alt: "Vikram Desai — Badminton Performance Coach at Gymssy",
    },
    social: {
      instagram: "https://instagram.com",
      twitter: "https://twitter.com",
      linkedin: null,
      youtube: null,
    },
    href: "/trainers/vikram-desai",
    isVerified: true,
    isActive: true,
  },
];

const seedTrainers = async () => {
  try {
    await connectDB();

    await Trainer.deleteMany({});

    const fitnessTrainers = TRAINERS.map((trainer) => ({
      ...trainer,
      category: trainer.category || "fitness",
    }));

    const allTrainers = [...fitnessTrainers, ...SPORTS_TRAINERS];

    await Trainer.insertMany(allTrainers);

    console.log("✅ TRAINERS seeded successfully");
    console.log(`📦 ${allTrainers.length} trainers added`);
    console.log(`💪 Fitness trainers: ${fitnessTrainers.length}`);
    console.log(`🏅 Sports coaches: ${SPORTS_TRAINERS.length}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Trainer seeding failed:", error);
    process.exit(1);
  }
};

seedTrainers();
