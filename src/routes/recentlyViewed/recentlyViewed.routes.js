import express from "express";

import {
  addRecentlyViewed,
  getRecentlyViewed,
  removeRecentlyViewed,
} from "../../controllers/recentlyViewed/recentlyViewed.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRoles("user"));

router.post("/:gymId", addRecentlyViewed);

router.get("/", getRecentlyViewed);

router.delete("/:gymId", removeRecentlyViewed);

export default router;
