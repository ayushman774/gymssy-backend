import { Router } from "express";
import rateLimit from "express-rate-limit";
import { submitContactMessage } from "../../controllers/contact/contactMessage.controller.js";

const router = Router();
router.post("/", rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false }), submitContactMessage);
export default router;
