import express from "express";

import {
  getGyms,
  getFeaturedGyms,
  getGymBySlug,
  getGymsByCategory,
} from "../../controllers/gyms/gym.controller.js";

const router = express.Router();

/* ================================
   ALL GYMS / FILTERED GYMS
================================ */

router.get("/", getGyms);

/* ================================
   FEATURED
================================ */

router.get("/featured", getFeaturedGyms);

/* ================================
   CATEGORY
================================ */

router.get("/category/:category", getGymsByCategory);

/* ================================
   SINGLE GYM
================================ */

router.get("/:slug", getGymBySlug);

export default router;
