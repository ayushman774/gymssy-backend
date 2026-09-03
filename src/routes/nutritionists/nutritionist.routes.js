import express from "express";

import {
  getNutritionists,
  getFeaturedNutritionists,
  getNutritionistBySlug,
} from "../../controllers/nutritionists/nutritionist.controller.js";

const router = express.Router();

/* =================================
   ALL NUTRITIONISTS
================================= */

router.get("/", getNutritionists);

/* =================================
   FEATURED NUTRITIONISTS
================================= */

router.get("/featured", getFeaturedNutritionists);

/* =================================
   SINGLE NUTRITIONIST
================================= */

router.get("/:slug", getNutritionistBySlug);

export default router;
