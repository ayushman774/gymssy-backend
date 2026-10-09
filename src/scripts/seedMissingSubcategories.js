import "dotenv/config";
import mongoose from "mongoose";

import connectDB from "../config/db.js";
import Category from "../models/categories/Category.js";
import City from "../models/cities/City.js";
import Gym from "../models/gyms/Gym.js";
import Trainer from "../models/trainers/Trainer.js";
import Nutritionist from "../models/nutritionists/Nutritionist.js";
import User from "../models/users/User.js";

import {
  buildMarketplaceTaxonomyFilter,
  combineMarketplaceFilters,
} from "../utils/marketplaceClassification.js";

const APPLY = process.argv.includes("--apply");
const VERIFY = process.argv.includes("--verify");

const MAIN_SLUGS = ["fitness", "wellness", "sports"];

const PUBLIC_FILTER = {
  isActive: true,
  moderationStatus: {
    $nin: ["pending", "rejected"],
  },
};

const SEED_PREFIX = "gymssy-demo-v1";

const normalizedSlug = (value) =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function modelFor(main, subcategory) {
  if (main.slug === "fitness" && subcategory.slug === "personal-trainers") {
    return Trainer;
  }

  if (main.slug === "wellness" && subcategory.slug === "nutrition") {
    return Nutritionist;
  }

  return Gym;
}

function seedSlug(main, subcategory) {
  return [
    SEED_PREFIX,
    normalizedSlug(main.slug),
    normalizedSlug(subcategory.slug),
  ].join("-");
}

function seedName(subcategory) {
  return `Gymssy Demo - ${subcategory.name}`;
}

function gymDocument(main, subcategory, city) {
  const name = seedName(subcategory);

  return {
    name,
    slug: seedSlug(main, subcategory),

    category: main.name,
    tags: [subcategory.name],

    marketplaceCategory: main.slug,
    marketplaceSubcategories: [subcategory.slug],

    description:
      `DEMO LISTING - ${subcategory.name} in the ` +
      `${main.name} category. This is sample ` +
      `content for testing Gymssy. It is not a ` +
      `verified or bookable business.`,

    city: city._id,

    location: {
      city: city.name,
      state: city.state,
      area: "",
      address: "",
    },

    rating: 0,
    reviewCount: 0,
    priceFrom: 0,

    verified: false,
    featured: false,
    isActive: true,
    moderationStatus: "approved",

    owner: null,

    images: {
      cover: "",
      gallery: [],
    },

    facilities: [],
    memberships: [],
    classes: [],
    trainers: [],
    timings: [],
  };
}

function trainerDocument(main, subcategory) {
  const slug = seedSlug(main, subcategory);

  return {
    id: slug,
    name: seedName(subcategory),
    slug,

    category: main.slug,
    role: subcategory.name,
    specialty: subcategory.name,

    experience: "Demo profile",
    sessions: "Not available",
    clients: "0",

    bio:
      "DEMO LISTING - Sample professional profile " +
      "for Gymssy testing. Not a real or " +
      "bookable trainer.",

    rating: 0,
    reviews: 0,
    available: false,
    isVerified: false,
    featured: false,

    isActive: true,
    moderationStatus: "approved",
    owner: null,

    image: {
      src: "",
      alt: nameForImage(subcategory),
    },
  };
}

function nutritionistDocument(main, subcategory) {
  const slug = seedSlug(main, subcategory);

  return {
    id: slug,
    name: seedName(subcategory),
    slug,

    role: "Nutritionist",
    specialty: subcategory.name,

    experience: "Demo profile",
    sessions: "Not available",
    clients: "0",

    bio:
      "DEMO LISTING - Sample nutritionist profile " +
      "for Gymssy testing. Not a real or " +
      "bookable professional.",

    rating: 0,
    reviews: 0,
    available: false,
    isVerified: false,
    featured: false,

    isActive: true,
    moderationStatus: "approved",
    owner: null,

    image: {
      src: "",
      alt: nameForImage(subcategory),
    },
  };
}

function nameForImage(subcategory) {
  return `Demo ${subcategory.name}`;
}

async function ownerMap() {
  const users = await User.find({
    role: "business",
    providerType: { $ne: null },
  })
    .select("_id providerType")
    .lean();

  const result = {};

  for (const user of users) {
    if (!result[user.providerType]) {
      result[user.providerType] = [];
    }

    result[user.providerType].push(user._id);
  }

  return result;
}

function taxonomyFilter({ main, subcategory, modelType, mains, owners }) {
  return buildMarketplaceTaxonomyFilter({
    modelType,
    categorySlug: main.slug,
    mainCategory: main,
    selectedSubcategory: subcategory,
    activeMainCategories: mains,
    ownerIdsByProviderType: owners,
  });
}

async function coverage({ main, subcategory, mains, owners }) {
  const models = [
    [Gym, "gym"],
    [Trainer, "trainer"],
    [Nutritionist, "nutritionist"],
  ];

  let total = 0;

  for (const [Model, modelType] of models) {
    const taxonomy = taxonomyFilter({
      main,
      subcategory,
      modelType,
      mains,
      owners,
    });

    if (taxonomy === null) continue;

    const filter = combineMarketplaceFilters(PUBLIC_FILTER, taxonomy);

    total += await Model.countDocuments(filter);
  }

  return total;
}

async function ensureSeed({ main, subcategory, city }) {
  const Model = modelFor(main, subcategory);
  const slug = seedSlug(main, subcategory);

  const existing = await Model.findOne({ slug })
    .select("_id slug isActive moderationStatus")
    .lean();

  if (existing) {
    throw new Error(
      `Seed slug already exists but category has no ` +
        `visible listings: ${slug}. ` +
        `Inspect this record before proceeding.`,
    );
  }

  const document =
    Model === Trainer
      ? trainerDocument(main, subcategory)
      : Model === Nutritionist
        ? nutritionistDocument(main, subcategory)
        : gymDocument(main, subcategory, city);

  if (!APPLY) {
    return { action: "WOULD_CREATE", slug };
  }

  const created = await Model.create(document);

  return {
    action: "CREATED",
    slug,
    id: String(created._id),
  };
}

async function main() {
  await connectDB();

  const mains = await Category.find({
    type: "main",
    slug: { $in: MAIN_SLUGS },
    isActive: true,
  })
    .sort({ order: 1, name: 1 })
    .lean();

  if (mains.length !== MAIN_SLUGS.length) {
    throw new Error(
      "Expected all three active main categories: " + MAIN_SLUGS.join(", "),
    );
  }

  const subcategories = await Category.find({
    type: "subcategory",
    parentCategory: {
      $in: mains.map((main) => main._id),
    },
    isActive: true,
  })
    .sort({ order: 1, name: 1 })
    .lean();

  if (!subcategories.length) {
    throw new Error("No active subcategories found.");
  }

  const city =
    (await City.findOne({
      slug: "bangalore",
      isActive: true,
    }).lean()) ||
    (await City.findOne({
      isActive: true,
    })
      .sort({ order: 1, name: 1 })
      .lean());

  if (!city) {
    throw new Error("No active City exists. Gym listings require a City.");
  }

  const owners = await ownerMap();

  console.log("\nGYMSSY SUBCATEGORY COVERAGE");
  console.log(`Mode: ${VERIFY ? "VERIFY" : APPLY ? "APPLY" : "DRY RUN"}`);
  console.log(`Demo city: ${city.name}\n`);

  const results = [];

  for (const main of mains) {
    const children = subcategories.filter(
      (subcategory) => String(subcategory.parentCategory) === String(main._id),
    );

    for (const subcategory of children) {
      const existingCount = await coverage({
        main,
        subcategory,
        mains,
        owners,
      });

      const row = {
        category: main.name,
        subcategory: subcategory.name,
        slug: subcategory.slug,
        existing: existingCount,
        action: "SKIP",
      };

      if (existingCount === 0) {
        if (VERIFY) {
          row.action = "MISSING";
        } else {
          const outcome = await ensureSeed({
            main,
            subcategory,
            city,
          });

          row.action = outcome.action;
        }
      }

      results.push(row);
    }
  }

  console.table(results);

  const missing = results.filter(
    (row) => row.action === "MISSING" || row.action === "WOULD_CREATE",
  );

  const created = results.filter((row) => row.action === "CREATED");

  console.log(`\nSubcategories checked: ${results.length}`);
  console.log(`Missing or planned: ${missing.length}`);
  console.log(`Created: ${created.length}`);

  if (VERIFY && missing.length) {
    process.exitCode = 1;
  }

  if (!APPLY && !VERIFY) {
    console.log("\nDry run only. No records were inserted.");
    console.log("Run with --apply to insert missing demo listings.");
  }
}

try {
  await main();
} catch (error) {
  console.error("\nSeed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
