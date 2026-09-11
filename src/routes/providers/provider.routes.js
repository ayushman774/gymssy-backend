import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";

import {
  getMyProviderProfile,
  createProviderProfile,
  updateMyProviderProfile,
} from "../../controllers/providers/provider.controller.js";

const router = express.Router();

// ============================================================
// PROVIDER PROFILE
// ============================================================

// Get logged-in provider profile
router.get(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  getMyProviderProfile,
);

// Create logged-in provider profile
router.post(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  createProviderProfile,
);

// Update logged-in provider profile
router.put(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  updateMyProviderProfile,
);

export default router;
