import mongoose from "mongoose";
const stateSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ["state", "union_territory"], required: true },
  country: { type: String, default: "India" },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });
export default mongoose.models.State || mongoose.model("State", stateSchema);
