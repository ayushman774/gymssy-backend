import { randomUUID } from "node:crypto";
import { uploadImageBuffer } from "../../services/imageUpload.service.js";

// Authenticated provider upload. The returned secure URL is stored in
// Gym.trainers[].image when the listing form is saved.
export async function uploadVenueTrainerImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Trainer photo is required" });
    const uploaded = await uploadImageBuffer(req.file.buffer, {
      folder: `gymssy/providers/${req.user.id}/venue-trainers`,
      publicId: randomUUID(),
      transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
    });
    if (!uploaded?.url) throw new Error("Cloudinary returned no URL");
    return res.status(201).json({ success: true, data: { url: uploaded.url } });
  } catch (error) {
    console.error("Venue trainer image upload failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to upload trainer photo" });
  }
}
