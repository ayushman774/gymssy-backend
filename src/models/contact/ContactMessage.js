import mongoose from "mongoose";

const contactMessageSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, default: "", maxlength: 30 },
  subject: { type: String, trim: true, default: "", maxlength: 200 },
  reason: { type: String, trim: true, default: "", maxlength: 100 },
  message: { type: String, required: true, trim: true, maxlength: 5000 },
  privacy: { type: Boolean, required: true },
  status: { type: String, enum: ["new", "replied"], default: "new", index: true },
  reply: { text: { type: String, default: "" }, sentAt: { type: Date, default: null } },
}, { timestamps: true });

export default mongoose.models.ContactMessage || mongoose.model("ContactMessage", contactMessageSchema);
