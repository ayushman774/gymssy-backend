import { randomUUID } from "node:crypto";
import { uploadImageBuffer } from "../../services/imageUpload.service.js";

// Authenticated provider profile image for trainer and nutritionist listings.
export async function uploadProviderProfessionalImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Profile image is required" });
    const uploaded = await uploadImageBuffer(req.file.buffer, {
      folder: `gymssy/providers/${req.user.id}/professional-listings`,
      publicId: randomUUID(),
      transformation: [{ width: 1200, height: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
    });
    if (!uploaded?.url) throw new Error("Cloudinary returned no URL");
    return res.status(201).json({ success: true, data: { url: uploaded.url } });
  } catch (error) {
    console.error("Professional listing image upload failed:", error);
    return res.status(500).json({ success: false, message: "Unable to upload profile image" });
  }
}
