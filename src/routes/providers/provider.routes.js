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
  deleteMyProviderListing,
} from "../../controllers/providers/providerListing.controller.js";
import {
  getProviderEnquiries,
  getProviderEnquirySummary,
  getProviderEnquiryById,
  updateProviderEnquiryStatus,
} from "../../controllers/providers/providerEnquiry.controller.js";
import { getProviderBookings, getProviderBookingSummary, getProviderBookingById, updateProviderBookingStatus } from "../../controllers/providers/providerBooking.controller.js";

const router = express.Router();

router.get("/enquiries", authMiddleware, authorizeRoles("business"), getProviderEnquiries);
router.get("/enquiries/summary", authMiddleware, authorizeRoles("business"), getProviderEnquirySummary);
router.get("/enquiries/:id", authMiddleware, authorizeRoles("business"), getProviderEnquiryById);
router.patch("/enquiries/:id/status", authMiddleware, authorizeRoles("business"), updateProviderEnquiryStatus);

router.get("/bookings", authMiddleware, authorizeRoles("business"), getProviderBookings);
router.get("/bookings/summary", authMiddleware, authorizeRoles("business"), getProviderBookingSummary);
router.get("/bookings/:id", authMiddleware, authorizeRoles("business"), getProviderBookingById);
router.patch("/bookings/:id/status", authMiddleware, authorizeRoles("business"), updateProviderBookingStatus);

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

/*
 * Delete one listing owned by logged-in provider
 */
router.delete(
  "/listings/:id",
  authMiddleware,
  authorizeRoles("business"),
  deleteMyProviderListing,
);

export default router;
