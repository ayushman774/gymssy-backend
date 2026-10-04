import express from "express";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  createAdmin,
} from "../../controllers/auth/auth.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/auth/adminMiddleware.js";
import {
  adminCreationRateLimiter,
  loginRateLimiter,
  registrationRateLimiter,
} from "../../middleware/authRateLimit.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registrationRateLimiter, registerUser);
router.post("/login", loginRateLimiter, loginUser);

// Protected route
router.get("/me", authMiddleware, getCurrentUser);
router.post(
  "/create-admin",
  authMiddleware,
  adminMiddleware,
  adminCreationRateLimiter,
  createAdmin,
);
export default router;
