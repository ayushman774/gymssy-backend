import express from "express";

import {
  registerUser,
  loginUser,
  getCurrentUser,
  createAdmin,
} from "../../controllers/auth/auth.controller.js";

import authMiddleware from "../../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected route
router.get("/me", authMiddleware, getCurrentUser);
router.post("/create-admin", createAdmin);
export default router;
