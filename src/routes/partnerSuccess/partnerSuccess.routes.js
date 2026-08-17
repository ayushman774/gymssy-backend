import express from "express";
import { getPartnerSuccessStories } from "../../controllers/partnerSuccess/partnerSuccess.controller.js";

const router = express.Router();

router.get("/", getPartnerSuccessStories);

export default router;
