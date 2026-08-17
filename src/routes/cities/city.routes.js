import express from "express";
import { getPopularCities } from "../../controllers/cities/city.controller.js";

const router = express.Router();

router.get("/popular", getPopularCities);

export default router;
