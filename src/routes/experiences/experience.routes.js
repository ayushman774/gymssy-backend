import express from "express";
import { getTrendingExperiences } from "../../controllers/experiences/experience.controller.js";

const router = express.Router();

router.get("/trending", getTrendingExperiences);

export default router;
