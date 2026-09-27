import { createHash, randomUUID } from "node:crypto";

export const GYM_GALLERY_MAX_ITEMS = 20;

export function legacyGalleryId(gymId, index, url = "") {
  return `legacy-${createHash("sha256").update(`${gymId}:${index}:${url}`).digest("hex").slice(0, 24)}`;
}

export function ensureGymGalleryIds(gym) {
  const gallery = gym.images?.gallery || [];
  let changed = false;
  gallery.forEach((item, index) => {
    if (!item.id) { item.id = legacyGalleryId(gym._id, index, item.url); changed = true; }
  });
  return changed;
}

export function createManagedGalleryItem(upload, { alt = "", category = "gym" } = {}) {
  return { id: randomUUID(), url: upload.url, alt: alt.trim(), category: category.trim() || "gym", publicId: upload.publicId, width: upload.width ?? null, height: upload.height ?? null, format: upload.format || "" };
}

export function toAdminGymImages(gym) {
  const images = gym?.images || {};
  return {
    cover: images.cover || "",
    coverManaged: Boolean(images.coverMeta?.publicId),
    gallery: (images.gallery || []).map((item, index) => ({ id: item.id || legacyGalleryId(gym._id, index, item.url), url: item.url || "", alt: item.alt || "", category: item.category || "gym", managed: Boolean(item.publicId) })),
  };
}

export function toPublicGymImages(images = {}) {
  return { cover: images.cover || "", gallery: (images.gallery || []).map((item) => ({ url: item.url || "", alt: item.alt || "", category: item.category || "gym" })) };
}

export function sanitizeProviderGymImages(images) {
  if (!images || typeof images !== "object" || Array.isArray(images)) return images;
  const sanitized = {};
  if (typeof images.cover === "string") sanitized.cover = images.cover;
  if (Array.isArray(images.gallery)) sanitized.gallery = images.gallery.map((item) => ({ url: typeof item?.url === "string" ? item.url : "", alt: typeof item?.alt === "string" ? item.alt : "", category: typeof item?.category === "string" ? item.category : "gym" }));
  return sanitized;
}
