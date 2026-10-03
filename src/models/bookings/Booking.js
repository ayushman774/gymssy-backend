import mongoose from "mongoose";
import { BOOKING_STATUSES, BOOKING_TARGET_TYPES, BOOKING_TYPES } from "../../utils/bookingDomain.js";

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
}, { _id: false });

const listingSnapshotSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: "" },
  href: { type: String, required: true, trim: true },
}, { _id: false });

const serviceSnapshotSchema = new mongoose.Schema({
  type: { type: String, required: true, trim: true },
  name: { type: String, required: true, trim: true },
  duration: { type: String, default: "", trim: true },
  schedule: { type: String, default: "", trim: true },
  time: { type: String, default: "", trim: true },
  trainer: { type: String, default: "", trim: true },
  specialty: { type: String, default: "", trim: true },
  description: { type: String, default: "", trim: true },
  displayPrice: { type: Number, default: null },
  currency: { type: String, default: "", trim: true },
}, { _id: false });

const statusHistorySchema = new mongoose.Schema({
  status: { type: String, enum: BOOKING_STATUSES, required: true },
  changedAt: { type: Date, required: true },
  changedByRole: { type: String, enum: ["customer", "provider", "system"], required: true },
  reason: { type: String, trim: true, maxlength: 500, default: "" },
}, { _id: false });

const resolutionSchema = new mongoose.Schema({
  reason: { type: String, trim: true, maxlength: 500, default: "" },
  byRole: { type: String, enum: ["customer", "provider", "system"], default: null },
  at: { type: Date, default: null },
}, { _id: false });

const bookingSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: BOOKING_TARGET_TYPES, required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  bookingType: { type: String, enum: [...new Set(Object.values(BOOKING_TYPES).flat())], required: true, trim: true },
  scheduledFor: { type: Date, required: true },
  timezone: { type: String, required: true, trim: true, maxlength: 100 },
  status: { type: String, enum: BOOKING_STATUSES, default: "requested", required: true },
  contact: { type: contactSchema, required: true },
  listingSnapshot: { type: listingSnapshotSchema, required: true },
  serviceSnapshot: { type: serviceSnapshotSchema, required: true },
  note: { type: String, trim: true, maxlength: 2000, default: "" },
  resolution: { type: resolutionSchema, default: () => ({}) },
  statusHistory: { type: [statusHistorySchema], default: [] },
}, { timestamps: true });

bookingSchema.index({ customer: 1, createdAt: -1, _id: -1 });
bookingSchema.index({ customer: 1, status: 1, createdAt: -1, _id: -1 });
bookingSchema.index({ provider: 1, createdAt: -1, _id: -1 });
bookingSchema.index({ provider: 1, status: 1, createdAt: -1, _id: -1 });
bookingSchema.index({ targetType: 1, target: 1, scheduledFor: 1 });

const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);
export default Booking;
