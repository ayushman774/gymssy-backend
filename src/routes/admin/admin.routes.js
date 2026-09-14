import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/auth/adminMiddleware.js";

import { getAdminDashboard } from "../../controllers/admin/admin.controller.js";

const router = express.Router();

/* ================================
   ADMIN AUTH TEST
================================ */

router.get("/test", authMiddleware, adminMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin authorization successful",
    data: {
      user: req.user,
    },
  });
});

/* ================================
   ADMIN DASHBOARD
================================ */

router.get("/dashboard", authMiddleware, adminMiddleware, getAdminDashboard);

export default router;
