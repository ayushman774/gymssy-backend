import multer from "multer";

export const PROVIDER_AVATAR_MAX_BYTES = 4 * 1024 * 1024;
export const PROVIDER_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function providerAvatarFileFilter(_req, file, callback) {
  if (!PROVIDER_AVATAR_MIME_TYPES.has(file.mimetype)) {
    const error = new Error("Avatar must be a JPEG, PNG, or WebP image");
    error.statusCode = 400;
    return callback(error);
  }

  return callback(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: PROVIDER_AVATAR_MAX_BYTES,
    files: 1,
  },
  fileFilter: providerAvatarFileFilter,
});

export function uploadProviderAvatarFile(req, res, next) {
  upload.single("avatar")(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          success: false,
          message: "Avatar image must be 4 MB or smaller",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Invalid avatar upload",
      });
    }

    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message || "Invalid avatar upload",
    });
  });
}
