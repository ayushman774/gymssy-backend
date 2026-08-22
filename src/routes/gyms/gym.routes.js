import express from "express";
import {
  getFeaturedGyms,
  getGymBySlug,
  getGymsByCategory,
} from "../../controllers/gyms/gym.controller.js";

const router = express.Router();

router.get("/featured", getFeaturedGyms);

router.get("/category/:category", getGymsByCategory);

router.get("/:slug", getGymBySlug);

export default router;
