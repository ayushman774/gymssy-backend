import dotenv from "dotenv";

dotenv.config();

import connectDB from "../config/db.js";
import Experience from "../models/experiences/Experience.js";

const experiences = [
  // ============================================================
  // WELLNESS EXPERIENCES
  // ============================================================

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
    title: "Guided Meditation Session",
    slug: "guided-meditation-session",
    category: "Meditation",

    image: {
      url: "https://images.unsplash.com/photo-1545389336-cf090694435e?w=700&q=80",
      alt: "Guided Meditation Session",
    },

    duration: 45,
    level: "Beginner",
    rating: 4.8,
    priceFrom: 10,
    spots: 12,
    trending: true,
    isActive: true,
  },

  {
    title: "Deep Tissue Spa Therapy",
    slug: "deep-tissue-spa-therapy",
    category: "Spa & Recovery",

    image: {
      url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=700&q=80",
      alt: "Deep Tissue Spa Therapy",
    },

    duration: 90,
    level: "All Levels",
    rating: 5.0,
    priceFrom: 30,
    spots: 3,
    trending: true,
    isActive: true,
  },

  {
    title: "Nutrition Consultation",
    slug: "nutrition-consultation",
    category: "Nutrition",

    image: {
      url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=700&q=80",
      alt: "Nutrition Consultation",
    },

    duration: 60,
    level: "All Levels",
    rating: 4.7,
    priceFrom: 20,
    spots: 5,
    trending: true,
    isActive: true,
  },

  {
    title: "Restorative Yoga",
    slug: "restorative-yoga",
    category: "Yoga",

    image: {
      url: "https://images.unsplash.com/photo-1616279967983-ec413476e824?w=700&q=80",
      alt: "Restorative Yoga",
    },

    duration: 75,
    level: "Beginner",
    rating: 4.9,
    priceFrom: 18,
    spots: 10,
    trending: true,
    isActive: true,
  },

  {
    title: "Breathwork & Mindfulness",
    slug: "breathwork-mindfulness",
    category: "Mindfulness",

    image: {
      url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=700&q=80",
      alt: "Breathwork and Mindfulness",
    },

    duration: 50,
    level: "All Levels",
    rating: 4.8,
    priceFrom: 14,
    spots: 15,
    trending: true,
    isActive: true,
  },

  // ============================================================
  // FITNESS EXPERIENCES
  // ============================================================

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

  // ============================================================
  // SPORTS EXPERIENCES
  // ============================================================

  {
    title: "Boxing Fundamentals",
    slug: "boxing-fundamentals",
    category: "Boxing",

    image: {
      url: "https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=700&q=80",
      alt: "Boxing Fundamentals training session",
    },

    duration: 60,
    level: "Beginner",
    rating: 4.8,
    priceFrom: 25,
    spots: 10,
    trending: true,
    isActive: true,
  },

  {
    title: "Elite Football Training",
    slug: "elite-football-training",
    category: "Football",

    image: {
      url: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=700&q=80",
      alt: "Elite Football Training",
    },

    duration: 90,
    level: "All Levels",
    rating: 4.9,
    priceFrom: 30,
    spots: 16,
    trending: true,
    isActive: true,
  },

  {
    title: "Professional Cricket Nets",
    slug: "professional-cricket-nets",
    category: "Cricket",

    image: {
      url: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=700&q=80",
      alt: "Professional Cricket Nets",
    },

    duration: 90,
    level: "Intermediate",
    rating: 4.9,
    priceFrom: 28,
    spots: 12,
    trending: true,
    isActive: true,
  },

  {
    title: "Badminton Power Session",
    slug: "badminton-power-session",
    category: "Badminton",

    image: {
      url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=700&q=80",
      alt: "Badminton training session",
    },

    duration: 60,
    level: "All Levels",
    rating: 4.8,
    priceFrom: 20,
    spots: 8,
    trending: true,
    isActive: true,
  },

  {
    title: "Tennis Performance Clinic",
    slug: "tennis-performance-clinic",
    category: "Tennis",

    image: {
      url: "https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=700&q=80",
      alt: "Tennis Performance Clinic",
    },

    duration: 75,
    level: "Intermediate",
    rating: 4.9,
    priceFrom: 35,
    spots: 6,
    trending: true,
    isActive: true,
  },

  {
    title: "Swimming Technique Masterclass",
    slug: "swimming-technique-masterclass",
    category: "Swimming",

    image: {
      url: "https://images.unsplash.com/photo-1530549387789-4c1017266635?w=700&q=80",
      alt: "Swimming Technique Masterclass",
    },

    duration: 60,
    level: "Intermediate",
    rating: 4.8,
    priceFrom: 22,
    spots: 10,
    trending: true,
    isActive: true,
  },

  {
    title: "Martial Arts Fundamentals",
    slug: "martial-arts-fundamentals",
    category: "Martial Arts",

    image: {
      url: "https://images.unsplash.com/photo-1555597673-b21d5c935865?w=700&q=80",
      alt: "Martial Arts Fundamentals",
    },

    duration: 60,
    level: "Beginner",
    rating: 4.9,
    priceFrom: 24,
    spots: 14,
    trending: true,
    isActive: true,
  },

  {
    title: "Basketball Skills Academy",
    slug: "basketball-skills-academy",
    category: "Basketball",

    image: {
      url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=700&q=80",
      alt: "Basketball Skills Academy",
    },

    duration: 90,
    level: "All Levels",
    rating: 4.8,
    priceFrom: 26,
    spots: 15,
    trending: true,
    isActive: true,
  },

  {
    title: "5K Running Club Experience",
    slug: "5k-running-club-experience",
    category: "Running Clubs",

    image: {
      url: "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=700&q=80",
      alt: "5K Running Club Experience",
    },

    duration: 60,
    level: "All Levels",
    rating: 4.7,
    priceFrom: 15,
    spots: 25,
    trending: true,
    isActive: true,
  },

  {
    title: "Sports Performance Coaching",
    slug: "sports-performance-coaching",
    category: "Sports Coaching",

    image: {
      url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=80",
      alt: "Sports Performance Coaching",
    },

    duration: 75,
    level: "Advanced",
    rating: 5.0,
    priceFrom: 40,
    spots: 8,
    trending: true,
    isActive: true,
  },

  {
    title: "Multi-Sport Academy Trial",
    slug: "multi-sport-academy-trial",
    category: "Sports Academies",

    image: {
      url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=700&q=80",
      alt: "Multi-Sport Academy Trial",
    },

    duration: 90,
    level: "All Levels",
    rating: 4.8,
    priceFrom: 30,
    spots: 20,
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
