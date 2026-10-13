import mongoose from "mongoose";
import Review from "../../models/reviews/Review.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";

const models = { gym: Gym, trainer: Trainer, nutritionist: Nutritionist };
const validId = (id) => mongoose.isValidObjectId(id);
const fail = (res, code, message) => res.status(code).json({ success: false, message });
async function visibleListing(type, id) {
  if (!models[type] || !validId(id)) return null;
  return models[type].findOne(withPublicListingVisibility({ _id: id })).select("_id").lean();
}
const parseReview = (body) => {
  const keys = Object.keys(body || {});
  if (keys.some((key) => !["rating", "title", "text"].includes(key))) return { error: "Unsupported review fields" };
  const rating = body?.rating;
  const title = body?.title ?? "";
  const text = body?.text;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: "Rating must be an integer between 1 and 5" };
  if (typeof title !== "string" || title.trim().length > 120) return { error: "Title must be at most 120 characters" };
  if (typeof text !== "string" || text.trim().length < 10 || text.trim().length > 2000) return { error: "Review must contain 10 to 2000 characters" };
  return { rating, title: title.trim(), text: text.trim() };
};
const output = (doc) => ({ id: doc._id, listingType: doc.listingType, listingId: doc.listingId, rating: doc.rating, title: doc.title, text: doc.text, createdAt: doc.createdAt, updatedAt: doc.updatedAt, user: doc.user && typeof doc.user === "object" && doc.user.name ? { name: doc.user.name } : undefined });

export async function listReviews(req, res) {
  try {
    const { type, id } = req.params;
    if (!models[type] || !validId(id)) return fail(res, 400, "Invalid listing");
    if (!await visibleListing(type, id)) return fail(res, 404, "Listing not found");
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(20, Number.parseInt(req.query.limit, 10) || 10));
    const filter = { listingType: type, listingId: id, status: "published" };
    const [total, reviews, stats] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name").lean(),
      Review.aggregate([{ $match: { listingType: type, listingId: new mongoose.Types.ObjectId(id), status: "published" } }, { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } }]),
    ]);
    return res.json({ success: true, data: reviews.map(output), pagination: { page, limit, total }, summary: { rating: stats[0]?.average ?? 0, reviewCount: stats[0]?.count ?? 0 } });
  } catch (error) { console.error("List reviews error:", error); return fail(res, 500, "Failed to load reviews"); }
}
export async function upsertReview(req, res) {
  try {
    const { type, id } = req.params;
    if (!models[type] || !validId(id)) return fail(res, 400, "Invalid listing");
    if (!await visibleListing(type, id)) return fail(res, 404, "Listing not found");
    const data = parseReview(req.body);
    if (data.error) return fail(res, 400, data.error);
    const filter = { listingType: type, listingId: id, user: req.user.id };
    const existing = await Review.findOne(filter);
    if (existing) return fail(res, 409, "You already reviewed this listing. Use PATCH to edit your review.");
    const review = await Review.create({ ...filter, ...data });
    return res.status(201).json({ success: true, data: output(review) });
  } catch (error) {
    if (error.code === 11000) return fail(res, 409, "You already reviewed this listing");
    console.error("Create review error:", error); return fail(res, 500, "Failed to submit review");
  }
}
export async function updateReview(req, res) {
  try {
    const { type, id } = req.params;
    if (!models[type] || !validId(id)) return fail(res, 400, "Invalid listing");
    const data = parseReview(req.body);
    if (data.error) return fail(res, 400, data.error);
    const review = await Review.findOneAndUpdate({ listingType: type, listingId: id, user: req.user.id }, { $set: data }, { new: true, runValidators: true });
    if (!review) return fail(res, 404, "Your review was not found");
    return res.json({ success: true, data: output(review) });
  } catch (error) { console.error("Update review error:", error); return fail(res, 500, "Failed to update review"); }
}
export async function deleteReview(req, res) {
  try {
    const { type, id } = req.params;
    if (!models[type] || !validId(id)) return fail(res, 400, "Invalid listing");
    const review = await Review.findOneAndDelete({ listingType: type, listingId: id, user: req.user.id });
    if (!review) return fail(res, 404, "Your review was not found");
    return res.json({ success: true, message: "Review deleted" });
  } catch (error) { console.error("Delete review error:", error); return fail(res, 500, "Failed to delete review"); }
}
