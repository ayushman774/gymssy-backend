import express from "express";

import {
  getCategories,
  getCategoryBySlug,
} from "../../controllers/categories/category.controller.js";

const router = express.Router();

router.get("/", getCategories);

router.get("/:slug", getCategoryBySlug);

export default router;
