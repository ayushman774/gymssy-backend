import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  listingType: { type: String, enum: ["gym", "trainer", "nutritionist"], required: true },
  listingId: { type: mongoose.Schema.Types.ObjectId, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5, validate: { validator: Number.isInteger, message: "Rating must be a whole number" } },
  title: { type: String, trim: true, maxlength: 120, default: "" },
  text: { type: String, trim: true, required: true, minlength: 10, maxlength: 2000 },
  status: { type: String, enum: ["published", "hidden"], default: "published" },
}, { timestamps: true });
reviewSchema.index({ listingType: 1, listingId: 1, user: 1 }, { unique: true });
reviewSchema.index({ listingType: 1, listingId: 1, status: 1, createdAt: -1 });
export default mongoose.model("Review", reviewSchema);
