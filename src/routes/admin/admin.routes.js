import express from "express";

import authMiddleware from "../../middleware/auth.middleware.js";
import adminMiddleware from "../../middleware/auth/adminMiddleware.js";
import { uploadProviderAvatarFile } from "../../middleware/uploads/providerAvatarUpload.js";
import { uploadGymCoverFile, uploadGymGalleryFile } from "../../middleware/uploads/gymMediaUpload.js";
import { uploadCover, removeCover, uploadGallery, updateGalleryMetadata, removeGallery, reorderGallery } from "../../controllers/admin/adminGymMedia.controller.js";
import {
  uploadProviderAvatar,
  removeProviderAvatar,
} from "../../controllers/admin/adminProviderAvatar.controller.js";
import { createAdminProviderListing } from "../../controllers/admin/adminProviderListing.controller.js";

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
  updateAdminListingContent,
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

router.post("/listings/gym/:id/media/cover", authMiddleware, adminMiddleware, uploadGymCoverFile, uploadCover);
router.delete("/listings/gym/:id/media/cover", authMiddleware, adminMiddleware, removeCover);
router.post("/listings/gym/:id/media/gallery", authMiddleware, adminMiddleware, uploadGymGalleryFile, uploadGallery);
router.patch("/listings/gym/:id/media/gallery/order", authMiddleware, adminMiddleware, reorderGallery);
router.patch("/listings/gym/:id/media/gallery/:galleryId", authMiddleware, adminMiddleware, updateGalleryMetadata);
router.delete("/listings/gym/:id/media/gallery/:galleryId", authMiddleware, adminMiddleware, removeGallery);

router.patch(
  "/providers/:id/verification",
  authMiddleware,
  adminMiddleware,
  updateProviderVerification,
);

router.post(
  "/providers/:id/avatar",
  authMiddleware,
  adminMiddleware,
  uploadProviderAvatarFile,
  uploadProviderAvatar,
);

router.delete(
  "/providers/:id/avatar",
  authMiddleware,
  adminMiddleware,
  removeProviderAvatar,
);

router.get(
  "/providers/:id/listings",
  authMiddleware,
  adminMiddleware,
  getAdminProviderListings,
);

router.put(
  "/listings/:type/:id",
  authMiddleware,
  adminMiddleware,
  updateAdminListingContent,
);

router.post(
  "/providers/:providerId/listings",
  authMiddleware,
  adminMiddleware,
  createAdminProviderListing,
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
