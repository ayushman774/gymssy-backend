import mongoose from "mongoose";

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  phone: { type: String, trim: true, maxlength: 30, default: "" },
}, { _id: false });

const contextSchema = new mongoose.Schema({
  membershipName: { type: String, trim: true, maxlength: 150, default: "" },
  className: { type: String, trim: true, maxlength: 150, default: "" },
}, { _id: false });

const listingSnapshotSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  entityType: { type: String, required: true, trim: true },
  imageUrl: { type: String, default: "" },
  href: { type: String, required: true, trim: true },
}, { _id: false });

const enquirySchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  targetType: { type: String, enum: ["gym", "trainer", "nutritionist"], required: true },
  target: { type: mongoose.Schema.Types.ObjectId, required: true },
  provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
  intent: { type: String, enum: ["general", "membership", "class", "trial", "training", "consultation"], required: true },
  message: { type: String, required: true, trim: true, maxlength: 2000 },
  contact: { type: contactSchema, required: true },
  context: { type: contextSchema, default: () => ({}) },
  listingSnapshot: { type: listingSnapshotSchema, required: true },
  status: { type: String, enum: ["submitted", "viewed", "contacted", "closed"], default: "submitted", required: true },
}, { timestamps: true });

enquirySchema.index({ customer: 1, createdAt: -1, _id: -1 });
enquirySchema.index({ provider: 1, createdAt: -1, _id: -1 });

const Enquiry = mongoose.models.Enquiry || mongoose.model("Enquiry", enquirySchema);
export default Enquiry;
