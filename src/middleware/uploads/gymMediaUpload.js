import multer from "multer";

export const GYM_MEDIA_MAX_BYTES = 4 * 1024 * 1024;
export const GYM_MEDIA_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function gymMediaFileFilter(_req, file, callback) {
  if (!GYM_MEDIA_MIME_TYPES.has(file.mimetype)) { const error = new Error("Gym media must be a JPEG, PNG, or WebP image"); error.statusCode = 400; return callback(error); }
  return callback(null, true);
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: GYM_MEDIA_MAX_BYTES, files: 1 }, fileFilter: gymMediaFileFilter });

const single = (field) => (req, res, next) => upload.single(field)(req, res, (error) => {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") return res.status(413).json({ success: false, message: "Gym image must be 4 MB or smaller" });
  return res.status(error?.statusCode || 400).json({ success: false, message: error?.message || "Invalid Gym image upload" });
});

export const uploadGymCoverFile = single("cover");
export const uploadGymGalleryFile = single("gallery");
