import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";
import { cancelMyBooking, createBooking, getMyBookingById, getMyBookings } from "../../controllers/bookings/booking.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles("user"));
router.get("/", getMyBookings);
router.post("/", createBooking);
router.get("/:id", getMyBookingById);
router.patch("/:id/cancel", cancelMyBooking);
export default router;
