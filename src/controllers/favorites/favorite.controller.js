import mongoose from "mongoose";
import Favorite from "../../models/favorites/Favorite.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";
import { DISCOVERY_MODEL_TARGETS, buildDiscoveryTaxonomyMap, loadDiscoveryClassificationContext, normalizeDiscoveryResult } from "../discovery/discovery.controller.js";

const TARGET_MODELS = Object.freeze({ gym: Gym, trainer: Trainer, nutritionist: Nutritionist });
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const IDS_LIMIT = 1000;

const badRequest = (res, message, field, details = {}) => res.status(400).json({ success: false, message, errors: [{ field, message }], ...details });

function positiveInteger(value, fallback, field, max) {
  if (value === undefined || value === "") return { value: fallback };
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` };
  const parsed = Number(value);
  return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed };
}

function identityError(targetType, targetId) {
  if (typeof targetType !== "string" || !TARGET_MODELS[targetType]) return { field: "targetType", message: "targetType must be gym, trainer, or nutritionist" };
  if (typeof targetId !== "string" || !mongoose.isValidObjectId(targetId)) return { field: "targetId", message: "targetId must be a valid MongoDB ObjectId" };
  return null;
}

export async function createFavorite(req, res) {
  try {
    const unsupportedFields = Object.keys(req.body || {}).filter((field) => !["targetType", "targetId"].includes(field));
    if (unsupportedFields.length) return badRequest(res, "Unsupported favorite fields", "body", { unsupportedFields });
    const { targetType, targetId } = req.body || {};
    const validation = identityError(targetType, targetId);
    if (validation) return badRequest(res, validation.message, validation.field);
    const target = await TARGET_MODELS[targetType].findOne(withPublicListingVisibility({ _id: targetId })).select("_id").lean();
    if (!target) return res.status(404).json({ success: false, message: "Published listing not found" });
    const favorite = await Favorite.findOneAndUpdate(
      { user: req.user.id, targetType, target: targetId },
      { $setOnInsert: { user: req.user.id, targetType, target: targetId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).lean();
    return res.status(200).json({ success: true, message: "Listing saved", data: { favoriteId: String(favorite._id), targetType, targetId: String(targetId), savedAt: favorite.createdAt } });
  } catch (error) {
    if (error?.code === 11000) {
      const favorite = await Favorite.findOne({ user: req.user.id, targetType: req.body?.targetType, target: req.body?.targetId }).lean();
      return res.status(200).json({ success: true, message: "Listing already saved", data: { favoriteId: String(favorite._id), targetType: favorite.targetType, targetId: String(favorite.target), savedAt: favorite.createdAt } });
    }
    console.error("Create favorite error:", error);
    return res.status(500).json({ success: false, message: "Failed to save listing" });
  }
}

async function normalizedListings(favorites) {
  const context = await loadDiscoveryClassificationContext();
  const taxonomy = buildDiscoveryTaxonomyMap(context);
  const listings = new Map();
  await Promise.all(DISCOVERY_MODEL_TARGETS.map(async (target) => {
    const ids = favorites.filter((item) => item.targetType === target.modelType).map((item) => item.target);
    if (!ids.length) return;
    const query = target.model.find(withPublicListingVisibility({ _id: { $in: ids } })).select(target.fields).populate("owner", "providerType");
    if (target.modelType === "gym") query.populate("city", "name slug state country");
    const docs = await query.lean();
    for (const doc of docs) listings.set(`${target.modelType}:${doc._id}`, normalizeDiscoveryResult(doc, target, taxonomy));
  }));
  return favorites.flatMap((favorite) => {
    const listing = listings.get(`${favorite.targetType}:${favorite.target}`);
    return listing ? [{ favoriteId: String(favorite._id), savedAt: favorite.createdAt, listing }] : [];
  });
}

export async function getFavorites(req, res) {
  try {
    const unsupported = Object.keys(req.query).filter((field) => !["page", "limit"].includes(field));
    if (unsupported.length) return badRequest(res, "Unsupported favorite query fields", "query", { unsupportedFields: unsupported });
    const page = positiveInteger(req.query.page, 1, "page", 1000);
    if (page.error) return badRequest(res, page.error, "page");
    const limit = positiveInteger(req.query.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT);
    if (limit.error) return badRequest(res, limit.error, "limit");
    const filter = { user: req.user.id };
    const [favorites, total] = await Promise.all([
      Favorite.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(),
      Favorite.countDocuments(filter),
    ]);
    return res.status(200).json({ success: true, data: await normalizedListings(favorites), pagination: { page: page.value, limit: limit.value, total, totalPages: Math.ceil(total / limit.value) } });
  } catch (error) {
    console.error("Get favorites error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch favorites" });
  }
}

export async function getFavoriteIds(req, res) {
  try {
    const favorites = await Favorite.find({ user: req.user.id }).sort({ createdAt: -1, _id: -1 }).limit(IDS_LIMIT).select("targetType target").lean();
    return res.status(200).json({ success: true, data: favorites.map((item) => ({ targetType: item.targetType, targetId: String(item.target) })), limit: IDS_LIMIT });
  } catch (error) {
    console.error("Get favorite IDs error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch favorite status" });
  }
}

export async function deleteFavorite(req, res) {
  try {
    const { targetType, targetId } = req.params;
    const validation = identityError(targetType, targetId);
    if (validation) return badRequest(res, validation.message, validation.field);
    const result = await Favorite.deleteOne({ user: req.user.id, targetType, target: targetId });
    return res.status(200).json({ success: true, message: "Listing removed from favorites", removed: result.deletedCount > 0 });
  } catch (error) {
    console.error("Delete favorite error:", error);
    return res.status(500).json({ success: false, message: "Failed to remove favorite" });
  }
}
