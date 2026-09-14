import express from "express";
import authMiddleware from "../../middleware/auth.middleware.js";
import authorizeRoles from "../../middleware/auth/roleMiddleware.js";

import {
  getMyProviderProfile,
  createProviderProfile,
  updateMyProviderProfile,
} from "../../controllers/providers/provider.controller.js";

import {
  getMyProviderListings,
  getMyProviderListingById,
  createProviderListing,
  updateMyProviderListing,
} from "../../controllers/providers/providerListing.controller.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Provider Profile
|--------------------------------------------------------------------------
*/

router.get(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  getMyProviderProfile,
);

router.post(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  createProviderProfile,
);

router.put(
  "/profile",
  authMiddleware,
  authorizeRoles("business"),
  updateMyProviderProfile,
);

/*
|--------------------------------------------------------------------------
| Provider Listings
|--------------------------------------------------------------------------
*/

/*
 * Get all listings owned by logged-in provider
 */

router.post(
  "/listings",
  authMiddleware,
  authorizeRoles("business"),
  createProviderListing,
);

router.get(
  "/listings",
  authMiddleware,
  authorizeRoles("business"),
  getMyProviderListings,
);

/*
 * Get one listing owned by logged-in provider
 */
router.get(
  "/listings/:id",
  authMiddleware,
  authorizeRoles("business"),
  getMyProviderListingById,
);

/*
 * Update one listing owned by logged-in provider
 */
router.put(
  "/listings/:id",
  authMiddleware,
  authorizeRoles("business"),
  updateMyProviderListing,
);

export default router;
