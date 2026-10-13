import { randomUUID } from "node:crypto";
import { uploadImageBuffer } from "../../services/imageUpload.service.js";

// Uploads are scoped to the authenticated business. Listing ownership is
// enforced by the existing create/update listing endpoints when URLs are saved.
export async function uploadProviderGymImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Image file is required" });
    const kind = req.params.kind;
    if (!["cover", "gallery"].includes(kind)) return res.status(400).json({ success: false, message: "Invalid image type" });
    const uploaded = await uploadImageBuffer(req.file.buffer, {
      folder: `gymssy/providers/${req.user.id}/gyms/${kind}`,
      publicId: randomUUID(),
      transformation: [{ width: kind === "cover" ? 1800 : 1600, height: 1400, crop: "limit", quality: "auto:good", fetch_format: "auto" }],
    });
    if (!uploaded?.url) throw new Error("Cloudinary returned no URL");
    return res.status(201).json({ success: true, data: uploaded });
  } catch (error) {
    console.error("Provider gym image upload failed:", error.message);
    return res.status(500).json({ success: false, message: "Unable to upload gym image" });
  }
}
