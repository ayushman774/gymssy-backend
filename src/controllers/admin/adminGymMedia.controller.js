import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Gym from "../../models/gyms/Gym.js";
import { deleteImageByPublicId, uploadImageBuffer } from "../../services/imageUpload.service.js";
import { createManagedGalleryItem, ensureGymGalleryIds, GYM_GALLERY_MAX_ITEMS, toAdminGymImages } from "../../utils/gymMedia.js";
import { normalizeAdminListingDetail } from "./admin.controller.js";

const COVER_TRANSFORMATION = [{ width: 1600, height: 900, crop: "limit", quality: "auto:good", fetch_format: "auto" }];
const GALLERY_TRANSFORMATION = [{ width: 1600, height: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" }];

const defaultDetail = async (id) => {
  const doc = await Gym.findById(id).populate("owner", "name email providerType isActive").populate("city").lean();
  return normalizeAdminListingDetail(doc, "gym");
};
const validId = (id) => mongoose.Types.ObjectId.isValid(id);
const send = async (res, id, message, getDetail) => res.status(200).json({ success: true, message, data: await getDetail(id) });
const cleanup = async (deleteImage, publicId, warning) => { if (!publicId) return; try { await deleteImage(publicId); } catch { console.warn(warning); } };

export function createAdminGymMediaHandlers({ uploadImage = uploadImageBuffer, deleteImage = deleteImageByPublicId, getDetail = defaultDetail } = {}) {
  const uploadCover = async (req, res) => {
    let uploaded;
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      if (!req.file) return res.status(400).json({ success: false, message: "Cover image is required" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" });
      const previous = gym.images?.coverMeta?.publicId || "";
      uploaded = await uploadImage(req.file.buffer, { folder: `gymssy/gyms/${gym._id}/cover`, publicId: randomUUID(), transformation: COVER_TRANSFORMATION });
      if (!uploaded?.url || !uploaded?.publicId) throw new Error("Image service returned an incomplete upload result");
      gym.images.cover = uploaded.url; gym.images.coverMeta = { publicId: uploaded.publicId, width: uploaded.width ?? null, height: uploaded.height ?? null, format: uploaded.format || "" };
      try { await gym.save(); } catch (error) { await cleanup(deleteImage, uploaded.publicId, "Failed to clean up a newly uploaded Gym cover"); throw error; }
      if (previous !== uploaded.publicId) await cleanup(deleteImage, previous, "Failed to clean up the previous Gym cover");
      return send(res, gym._id, "Gym cover uploaded successfully", getDetail);
    } catch (error) { console.error("Gym cover upload failed:", error.message); return res.status(500).json({ success: false, message: "Failed to upload Gym cover" }); }
  };

  const removeCover = async (req, res) => {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" });
      const previous = gym.images?.coverMeta?.publicId || ""; gym.images.cover = ""; gym.images.coverMeta = { publicId: "", width: null, height: null, format: "" }; await gym.save();
      await cleanup(deleteImage, previous, "Failed to delete a removed Gym cover");
      return send(res, gym._id, "Gym cover removed successfully", getDetail);
    } catch (error) { console.error("Gym cover removal failed:", error.message); return res.status(500).json({ success: false, message: "Failed to remove Gym cover" }); }
  };

  const uploadGallery = async (req, res) => {
    let uploaded;
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      if (!req.file) return res.status(400).json({ success: false, message: "Gallery image is required" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" });
      if ((gym.images?.gallery?.length || 0) >= GYM_GALLERY_MAX_ITEMS) return res.status(400).json({ success: false, message: `Gallery cannot contain more than ${GYM_GALLERY_MAX_ITEMS} images` });
      ensureGymGalleryIds(gym);
      uploaded = await uploadImage(req.file.buffer, { folder: `gymssy/gyms/${gym._id}/gallery`, publicId: randomUUID(), transformation: GALLERY_TRANSFORMATION });
      if (!uploaded?.url || !uploaded?.publicId) throw new Error("Image service returned an incomplete upload result");
      gym.images.gallery.push(createManagedGalleryItem(uploaded, req.body));
      try { await gym.save(); } catch (error) { await cleanup(deleteImage, uploaded.publicId, "Failed to clean up a newly uploaded Gym gallery image"); throw error; }
      return send(res, gym._id, "Gallery image uploaded successfully", getDetail);
    } catch (error) { console.error("Gym gallery upload failed:", error.message); return res.status(500).json({ success: false, message: "Failed to upload gallery image" }); }
  };

  const updateGalleryMetadata = async (req, res) => {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      const unsupportedFields = Object.keys(req.body || {}).filter((field) => !["alt", "category"].includes(field));
      if (unsupportedFields.length) return res.status(400).json({ success: false, message: "Unsupported gallery metadata fields", unsupportedFields });
      if (!Object.keys(req.body || {}).length) return res.status(400).json({ success: false, message: "No gallery metadata supplied" });
      if (Object.values(req.body).some((value) => typeof value !== "string")) return res.status(400).json({ success: false, message: "Gallery metadata must be strings" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" }); ensureGymGalleryIds(gym);
      const item = gym.images.gallery.find((entry) => entry.id === req.params.galleryId); if (!item) return res.status(404).json({ success: false, message: "Gallery image not found" });
      if (req.body.alt !== undefined) item.alt = req.body.alt.trim(); if (req.body.category !== undefined) item.category = req.body.category.trim(); await gym.save();
      return send(res, gym._id, "Gallery metadata updated successfully", getDetail);
    } catch (error) { console.error("Gym gallery metadata update failed:", error.message); return res.status(500).json({ success: false, message: "Failed to update gallery metadata" }); }
  };

  const removeGallery = async (req, res) => {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" }); ensureGymGalleryIds(gym);
      const index = gym.images.gallery.findIndex((entry) => entry.id === req.params.galleryId); if (index < 0) return res.status(404).json({ success: false, message: "Gallery image not found" });
      const [removed] = gym.images.gallery.splice(index, 1); await gym.save(); await cleanup(deleteImage, removed.publicId, "Failed to delete a removed Gym gallery image");
      return send(res, gym._id, "Gallery image removed successfully", getDetail);
    } catch (error) { console.error("Gym gallery removal failed:", error.message); return res.status(500).json({ success: false, message: "Failed to remove gallery image" }); }
  };

  const reorderGallery = async (req, res) => {
    try {
      if (!validId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid Gym ID" });
      const gym = await Gym.findById(req.params.id); if (!gym) return res.status(404).json({ success: false, message: "Gym listing not found" }); ensureGymGalleryIds(gym);
      const ids = req.body?.galleryIds; const current = gym.images.gallery.map((item) => item.id);
      if (!Array.isArray(ids) || ids.length !== current.length || new Set(ids).size !== ids.length || ids.some((id) => !current.includes(id))) return res.status(400).json({ success: false, message: "galleryIds must contain every current gallery ID exactly once" });
      const byId = new Map(gym.images.gallery.map((item) => [item.id, item])); gym.images.gallery = ids.map((id) => byId.get(id)); await gym.save();
      return send(res, gym._id, "Gallery order updated successfully", getDetail);
    } catch (error) { console.error("Gym gallery reorder failed:", error.message); return res.status(500).json({ success: false, message: "Failed to reorder gallery" }); }
  };
  return { uploadCover, removeCover, uploadGallery, updateGalleryMetadata, removeGallery, reorderGallery };
}

export const { uploadCover, removeCover, uploadGallery, updateGalleryMetadata, removeGallery, reorderGallery } = createAdminGymMediaHandlers();
