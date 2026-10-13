import Review from "../../models/reviews/Review.js";

const fail = (res, code, message) => res.status(code).json({ success: false, message });

export async function getAdminReviews(req, res) {
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20));
    const filter = {};
    if (req.query.status) {
      if (!["published", "hidden"].includes(req.query.status)) return fail(res, 400, "Invalid review status");
      filter.status = req.query.status;
    }
    if (req.query.listingType) {
      if (!["gym", "trainer", "nutritionist"].includes(req.query.listingType)) return fail(res, 400, "Invalid listing type");
      filter.listingType = req.query.listingType;
    }
    const [total, reviews] = await Promise.all([
      Review.countDocuments(filter),
      Review.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).populate("user", "name email").lean(),
    ]);
    return res.json({ success: true, data: reviews, pagination: { page, limit, total } });
  } catch (error) {
    console.error("Admin reviews error:", error);
    return fail(res, 500, "Failed to load reviews");
  }
}

export async function moderateReview(req, res) {
  try {
    const { status } = req.body || {};
    if (!["published", "hidden"].includes(status) || Object.keys(req.body).some((key) => key !== "status")) return fail(res, 400, "Invalid review status");
    const review = await Review.findByIdAndUpdate(req.params.id, { $set: { status } }, { new: true, runValidators: true });
    if (!review) return fail(res, 404, "Review not found");
    return res.json({ success: true, data: review });
  } catch (error) {
    if (error.name === "CastError") return fail(res, 400, "Invalid review ID");
    console.error("Moderate review error:", error);
    return fail(res, 500, "Failed to moderate review");
  }
}
