import express from "express";
import { getActiveCities, getPopularCities } from "../../controllers/cities/city.controller.js";

const router = express.Router();

router.get("/popular", getPopularCities);
router.get("/", getActiveCities);

export default router;
