import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";
import { createEnquiry, getMyEnquiries } from "../../controllers/enquiries/enquiry.controller.js";

const router = express.Router();
router.use(authMiddleware, authorizeRoles("user"));
router.get("/", getMyEnquiries);
router.post("/", createEnquiry);
export default router;
