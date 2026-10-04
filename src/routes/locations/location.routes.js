import express from "express";

import {
  autocompleteLocation,
  geocodeLocationQuery,
} from "../../controllers/locations/location.controller.js";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";
import { locationRateLimiter } from "../../middleware/locationRateLimit.middleware.js";

const router = express.Router();

router.get("/autocomplete", locationRateLimiter, autocompleteLocation);
router.get(
  "/geocode",
  locationRateLimiter,
  authMiddleware,
  authorizeRoles("admin", "business"),
  geocodeLocationQuery,
);

export default router;
