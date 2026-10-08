import express from "express";

import {
  getTrendingExperiences,
  getExperienceBySlug,
} from "../../controllers/experiences/experience.controller.js";

const router = express.Router();

router.get("/trending", getTrendingExperiences);

// Keep this dynamic route after /trending
router.get("/:slug", getExperienceBySlug);

export default router;
