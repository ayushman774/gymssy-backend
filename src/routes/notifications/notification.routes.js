import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import { listNotifications, markNotificationRead, markAllNotificationsRead } from "../../controllers/notifications/notification.controller.js";

const router = express.Router();
router.use(authMiddleware);
router.get("/", listNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);
export default router;
