import express from "express";

import {
  addRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
} from "../../controllers/recentlyViewed/recentlyViewed.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/:gymId", addRecentlyViewed);

router.get("/", getRecentlyViewed);

router.delete("/:gymId", removeRecentlyViewed);

export default router;
