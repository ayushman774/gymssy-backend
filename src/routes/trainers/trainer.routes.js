import express from "express";
import {
  getFeaturedTrainers,
  getTrainerBySlug,
} from "../../controllers/trainers/trainer.controller.js";

const router = express.Router();

router.get("/featured", getFeaturedTrainers);
router.get("/:slug", getTrainerBySlug);

export default router;
