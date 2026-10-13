import mongoose from "mongoose";
import Review from "../../models/reviews/Review.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";

const models = { gym: Gym, trainer: Trainer, nutritionist: Nutritionist };
export async function getProviderListingReviews(req, res) {
  try {
    const { type, id } = req.params;
    if (!models[type] || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid listing" });
    }
    const owned = await models[type].exists({ _id: id, owner: req.user.id });
    if (!owned) return res.status(404).json({ success: false, message: "Listing not found" });
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { listingType: type, listingId: new mongoose.Types.ObjectId(id) };
    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name").lean(),
    ]);
    return res.json({ success: true, data: reviews.map(r => ({
      id: r._id, listingType: r.listingType, listingId: r.listingId,
      user: { name: r.user?.name || "Gymssy customer" }, rating: r.rating,
      title: r.title, text: r.text, status: r.status, createdAt: r.createdAt,
    })), pagination: { page, limit, total } });
  } catch (error) {
    console.error("Provider listing reviews error:", error);
    return res.status(500).json({ success: false, message: "Failed to load listing reviews" });
  }
}
