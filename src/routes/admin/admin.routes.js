import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/auth/adminMiddleware.js";

import {
  getAdminDashboard,
  getAdminProviders,
  getAdminProviderById,
  getAdminListings,
  updateListingStatus,
  updateListingVerification,
  updateListingFeatured,
  updateProviderStatus,
  updateProviderProfile,
  updateProviderVerification,
  getAdminProviderListings,
  getAdminListingById,
} from "../../controllers/admin/admin.controller.js";

const router = express.Router();

// ============================================================
// ADMIN TEST
// ============================================================

router.get("/test", authMiddleware, adminMiddleware, (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Admin authorization successful",
    data: {
      user: req.user,
    },
  });
});

// ============================================================
// ADMIN DASHBOARD
// ============================================================

router.get("/dashboard", authMiddleware, adminMiddleware, getAdminDashboard);

// ============================================================
// ADMIN PROVIDERS
// ============================================================

router.get("/providers", authMiddleware, adminMiddleware, getAdminProviders);

router.patch(
  "/providers/:id/status",
  authMiddleware,
  adminMiddleware,
  updateProviderStatus,
);

router.put(
  "/providers/:id",
  authMiddleware,
  adminMiddleware,
  updateProviderProfile,
);

router.patch(
  "/providers/:id/verification",
  authMiddleware,
  adminMiddleware,
  updateProviderVerification,
);

router.get(
  "/providers/:id/listings",
  authMiddleware,
  adminMiddleware,
  getAdminProviderListings,
);

// ============================================================
// ADMIN LISTINGS
// ============================================================

router.get("/listings", authMiddleware, adminMiddleware, getAdminListings);

router.get(
  "/listings/:type/:id",
  authMiddleware,
  adminMiddleware,
  getAdminListingById,
);

router.patch(
  "/listings/:type/:id/status",
  authMiddleware,
  adminMiddleware,
  updateListingStatus,
);

router.patch(
  "/listings/:type/:id/verification",
  authMiddleware,
  adminMiddleware,
  updateListingVerification,
);

router.patch(
  "/listings/:type/:id/featured",
  authMiddleware,
  adminMiddleware,
  updateListingFeatured,
);

// ============================================================
// SINGLE PROVIDER DETAILS
// ============================================================

router.get(
  "/providers/:id",
  authMiddleware,
  adminMiddleware,
  getAdminProviderById,
);

export default router;
