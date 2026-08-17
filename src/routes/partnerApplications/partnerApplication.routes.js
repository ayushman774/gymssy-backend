import express from "express";
import { createPartnerApplication } from "../../controllers/partnerApplications/partnerApplication.controller.js";

const router = express.Router();

router.post("/", createPartnerApplication);

export default router;
