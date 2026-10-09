import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import {
  buildMarketplaceTaxonomyFilter,
  getMarketplaceClassification,
} from "../src/utils/marketplaceClassification.js";

const fitness = {
  name: "Fitness",
  slug: "fitness",
};

const wellness = {
  name: "Wellness",
  slug: "wellness",
};

const sports = {
  name: "Sports",
  slug: "sports",
};

const mainCategories = [fitness, wellness, sports];

const gyms = {
  name: "Gyms",
  slug: "gyms",
};

const yoga = {
  name: "Yoga",
  slug: "yoga",
};

const boxing = {
  name: "Boxing",
  slug: "boxing",
};

const legacyGym = {
  _id: new mongoose.Types.ObjectId(),
  name: "Legacy 24/7 Fitness Gym",
  slug: "legacy-24-7-fitness-gym",
  category: "24/7 Gym",
  tags: [],
  owner: null,
  marketplaceCategory: undefined,
  isActive: true,
  moderationStatus: "approved",
  rating: 4.5,
  reviewCount: 25,
  featured: false,
  priceFrom: 1000,
  createdAt: new Date("2026-01-01"),
};

function getValue(document, path) {
  return path.split(".").reduce((value, key) => value?.[key], document);
}

function equals(left, right) {
  if (left == null || right == null) {
    return left == null && right == null;
  }

  return String(left) === String(right);
}

function matchesValue(actual, expected) {
  const values = Array.isArray(actual) ? actual : [actual];

  if (expected instanceof RegExp) {
    return values.some((value) => expected.test(String(value ?? "")));
  }

  if (expected && typeof expected === "object" && !Array.isArray(expected)) {
    if (Object.hasOwn(expected, "$exists")) {
      if ((actual !== undefined) !== expected.$exists) {
        return false;
      }
    }

    if (Object.hasOwn(expected, "$in")) {
      if (
        !values.some((value) =>
          expected.$in.some((item) => equals(value, item)),
        )
      ) {
        return false;
      }
    }

    if (Object.hasOwn(expected, "$nin")) {
      if (
        !values.every((value) =>
          expected.$nin.every((item) => !equals(value, item)),
        )
      ) {
        return false;
      }
    }

    if (Object.hasOwn(expected, "$regex")) {
      const expression =
        expected.$regex instanceof RegExp
          ? expected.$regex
          : new RegExp(expected.$regex, expected.$options || "");

      if (!values.some((value) => expression.test(String(value ?? "")))) {
        return false;
      }
    }

    return true;
  }

  return values.some((value) => equals(value, expected));
}

function matches(document, filter = {}) {
  return Object.entries(filter).every(([field, expected]) => {
    if (field === "$and") {
      return expected.every((item) => matches(document, item));
    }

    if (field === "$or") {
      return expected.some((item) => matches(document, item));
    }

    return matchesValue(getValue(document, field), expected);
  });
}

function taxonomy(category, subcategory) {
  return buildMarketplaceTaxonomyFilter({
    modelType: "gym",
    categorySlug: category.slug,
    mainCategory: category,
    selectedSubcategory: subcategory,
    activeMainCategories: mainCategories,
    ownerIdsByProviderType: {},
  });
}

test("legacy 24/7 Gym appears in Fitness > Gyms", () => {
  const filter = taxonomy(fitness, gyms);

  assert.equal(
    matches(legacyGym, filter),
    true,
    "Ownerless 24/7 Gym must match Fitness > Gyms",
  );
});

test("legacy 24/7 Gym does not appear in Wellness > Yoga", () => {
  const filter = taxonomy(wellness, yoga);

  assert.equal(matches(legacyGym, filter), false);
});

test("legacy 24/7 Gym does not appear in Sports > Boxing", () => {
  const filter = taxonomy(sports, boxing);

  assert.equal(matches(legacyGym, filter), false);
});

test("explicit Wellness classification overrides legacy Gym category", () => {
  const document = {
    ...legacyGym,
    marketplaceCategory: "wellness",
    marketplaceSubcategories: ["yoga"],
  };

  assert.equal(matches(document, taxonomy(fitness, gyms)), false);

  assert.equal(matches(document, taxonomy(wellness, yoga)), true);

  assert.equal(
    getMarketplaceClassification(document, "gym").mainCategory,
    "wellness",
  );
});

test("explicit Fitness Gyms classification works without legacy tags", () => {
  const document = {
    ...legacyGym,
    category: "Independent Fitness Business",
    marketplaceCategory: "fitness",
    marketplaceSubcategories: ["gyms"],
  };

  assert.equal(matches(document, taxonomy(fitness, gyms)), true);

  assert.equal(
    getMarketplaceClassification(document, "gym").mainCategory,
    "fitness",
  );
});

test("unrelated ownerless businesses are not automatically Fitness Gyms", () => {
  const document = {
    ...legacyGym,
    category: "Meditation Centre",
    tags: ["Meditation"],
  };

  assert.equal(matches(document, taxonomy(fitness, gyms)), false);
});
