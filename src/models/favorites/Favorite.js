import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["gym", "trainer", "nutritionist"], required: true, index: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
}, { timestamps: true });

favoriteSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
favoriteSchema.index({ user: 1, createdAt: -1, _id: -1 });

export default mongoose.model("Favorite", favoriteSchema);
