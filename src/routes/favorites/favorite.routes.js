import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";
import { createFavorite, deleteFavorite, getFavoriteIds, getFavorites } from "../../controllers/favorites/favorite.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles("user"));
router.get("/ids", getFavoriteIds);
router.get("/", getFavorites);
router.post("/", createFavorite);
router.delete("/:targetType/:targetId", deleteFavorite);
export default router;
