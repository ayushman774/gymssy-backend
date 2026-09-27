import { getCloudinaryClient } from "../config/cloudinary.js";

export function uploadImageBuffer(
  buffer,
  { folder, publicId, transformation = [] },
) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("A non-empty image buffer is required");
  }

  const cloudinary = getCloudinaryClient();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder,
        public_id: publicId,
        overwrite: false,
        unique_filename: false,
        transformation,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
        });
      },
    );

    stream.end(buffer);
  });
}

export async function deleteImageByPublicId(publicId) {
  if (!publicId) return { result: "not_found" };

  const cloudinary = getCloudinaryClient();
  return cloudinary.uploader.destroy(publicId, {
    resource_type: "image",
    invalidate: true,
  });
}
