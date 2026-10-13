import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";
import { listReviews, upsertReview, updateReview, deleteReview } from "../../controllers/reviews/review.controller.js";

const router = express.Router();
router.get("/:type/:id", listReviews);
router.post("/:type/:id", authMiddleware, authorizeRoles("user"), upsertReview);
router.patch("/:type/:id", authMiddleware, authorizeRoles("user"), updateReview);
router.delete("/:type/:id", authMiddleware, authorizeRoles("user"), deleteReview);
export default router;
