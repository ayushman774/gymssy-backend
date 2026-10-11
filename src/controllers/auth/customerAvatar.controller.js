import multer from "multer";
import { getCloudinaryClient } from "../../config/cloudinary.js";
import User from "../../models/users/User.js";

const MAX_SIZE = 5 * 1024 * 1024;
const accepted = new Set(["image/jpeg", "image/png", "image/webp"]);

export const customerAvatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE, files: 1, fields: 1 },
  fileFilter: (_req, file, callback) => {
    if (!accepted.has(file.mimetype)) {
      const error = new Error("Only JPEG, PNG, and WebP images are supported.");
      error.status = 400;
      return callback(error);
    }
    callback(null, true);
  },
}).single("photo");

export const handleCustomerAvatarUpload = (req, res, next) => {
  if (!req.is("multipart/form-data")) return res.status(415).json({ success: false, message: "Upload must use multipart/form-data." });
  customerAvatarUpload(req, res, (error) => {
    if (!error) return next();
    return res.status(error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE" ? 413 : error.status || 400)
      .json({ success: false, message: error.code === "LIMIT_FILE_SIZE" ? "Image must be 5 MB or smaller." : error.message });
  });
};

const imageMatchesType = (buffer, mime) => {
  if (mime === "image/jpeg") return buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (mime === "image/png") return buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return buffer.length > 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
};

export const uploadCustomerAvatar = async (req, res) => {
  try {
    if (req.user.role !== "user") return res.status(403).json({ success: false, message: "Customer account required" });
    if (!req.file) return res.status(400).json({ success: false, message: "Choose an image to upload." });
    if (!imageMatchesType(req.file.buffer, req.file.mimetype)) return res.status(400).json({ success: false, message: "Invalid image file." });

    const cloudinary = getCloudinaryClient();
    const uploaded = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: "gymssy/customer-avatars",
        public_id: `${req.user.id}-${Date.now()}`,
        overwrite: false,
        resource_type: "image",
        transformation: [{ width: 600, height: 600, crop: "fill", gravity: "face" }],
      }, (error, result) => error ? reject(error) : resolve(result));
      stream.end(req.file.buffer);
    });
    if (!uploaded?.secure_url) throw new Error("Image storage returned no URL.");
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive || user.role !== "user") return res.status(403).json({ success: false, message: "Customer account unavailable" });
    user.avatar = { url: uploaded.secure_url, alt: "Customer profile picture" };
    user.avatarPreset = "";
    await user.save();
    return res.json({ success: true, message: "Profile picture uploaded.", data: { user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
      avatar: user.avatar, avatarPreset: user.avatarPreset, gender: user.gender, address: user.address,
      isActive: user.isActive, isEmailVerified: user.isEmailVerified,
    } } });
  } catch (error) {
    console.error("Customer avatar upload failed:", { message: error.message, code: error.code, http_code: error.http_code });
    const configError = error.code === "CLOUDINARY_CONFIGURATION_ERROR";
    const cloudinaryError = Number(error.http_code) >= 400;
    return res.status(configError ? 503 : cloudinaryError ? 502 : 500).json({ success: false, message: configError ? "Cloudinary is not configured on the API server. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the backend environment." : cloudinaryError ? "Cloudinary rejected the image upload. Check backend Cloudinary credentials and upload permissions." : "Unable to upload image. Please try again." });
  }
};
