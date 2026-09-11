import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/auth/adminMiddleware.js";

const router = express.Router();

router.get("/test", authMiddleware, adminMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin authorization successful",
    data: {
      user: req.user,
    },
  });
});

export default router;
