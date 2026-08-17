import express from "express";
import { getFeaturedTrainers } from "../../controllers/trainers/trainer.controller.js";

const router = express.Router();

router.get("/featured", getFeaturedTrainers);

export default router;
