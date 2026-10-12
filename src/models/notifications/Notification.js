import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
  eventKey: { type: String, required: true, unique: true },
  type: { type: String, enum: ["booking_requested", "booking_confirmed", "booking_rejected", "booking_cancelled", "booking_completed"], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  href: { type: String, required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
export default mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
