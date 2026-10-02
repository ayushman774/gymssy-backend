import express from "express";
import { getDiscoveryListings } from "../../controllers/discovery/discovery.controller.js";

const router = express.Router();

router.get("/", getDiscoveryListings);

export default router;
