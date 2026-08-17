import express from "express";
import { getFeaturedGyms } from "../../controllers/gyms/gym.controller.js";

const router = express.Router();

router.get("/featured", getFeaturedGyms);

export default router;
