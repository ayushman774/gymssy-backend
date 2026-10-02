import mongoose from "mongoose";
import Enquiry from "../../models/enquiries/Enquiry.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { escapeRegex } from "../../utils/regex.js";
import { ENQUIRY_STATUSES, ENQUIRY_INTENTS, PROVIDER_ENQUIRY_TRANSITIONS } from "../../utils/enquiryDomain.js";

const STATUSES = ENQUIRY_STATUSES;
const INTENTS = ENQUIRY_INTENTS;
const TRANSITIONS = PROVIDER_ENQUIRY_TRANSITIONS;
const TARGET_MODELS = Object.freeze({ gym: Gym, trainer: Trainer, nutritionist: Nutritionist });
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

function badRequest(res, message, field, details = {}) {
  return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details });
}

function positiveInteger(value, fallback, field, max) {
  if (value === undefined || value === "") return { value: fallback };
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` };
  const parsed = Number(value);
  return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed };
}

function clean(value) { return typeof value === "string" ? value.trim() : ""; }

function baseListing(item, available) {
  const snapshot = item.listingSnapshot || {};
  return {
    id: String(item.target), name: snapshot.name || "Unavailable listing", slug: snapshot.slug || "",
    entityType: snapshot.entityType || item.targetType, image: snapshot.imageUrl ? { url: snapshot.imageUrl, alt: snapshot.name || "" } : null,
    href: available ? `/provider/listings/${item.target}` : null, available,
  };
}

function serialize(item, available = true, preview = false) {
  const message = item.message || "";
  return {
    id: String(item._id), targetType: item.targetType, intent: item.intent, status: item.status,
    message: preview && message.length > 180 ? `${message.slice(0, 177)}...` : message,
    contact: { name: item.contact?.name || "", email: item.contact?.email || "", phone: item.contact?.phone || "" },
    context: { membershipName: item.context?.membershipName || "", className: item.context?.className || "" },
    listing: baseListing(item, available), createdAt: item.createdAt, updatedAt: item.updatedAt,
  };
}

async function availableKeys(items, providerId) {
  const result = new Set();
  await Promise.all(Object.entries(TARGET_MODELS).map(async ([type, Model]) => {
    const ids = items.filter((item) => item.targetType === type).map((item) => item.target);
    if (!ids.length) return;
    const docs = await Model.find({ _id: { $in: ids }, owner: providerId }).select("_id").lean();
    docs.forEach((doc) => result.add(`${type}:${doc._id}`));
  }));
  return result;
}

export async function getProviderEnquiries(req, res) {
  try {
    const unsupported = Object.keys(req.query || {}).filter((field) => !["page", "limit", "status", "intent", "search"].includes(field));
    if (unsupported.length) return badRequest(res, "Unsupported enquiry query fields", "query", { unsupportedFields: unsupported });
    const page = positiveInteger(req.query?.page, 1, "page", 1000);
    if (page.error) return badRequest(res, page.error, "page");
    const limit = positiveInteger(req.query?.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT);
    if (limit.error) return badRequest(res, limit.error, "limit");
    const status = clean(req.query?.status).toLowerCase();
    const intent = clean(req.query?.intent).toLowerCase();
    const search = clean(req.query?.search);
    if (status && !STATUSES.includes(status)) return badRequest(res, `status must be one of: ${STATUSES.join(", ")}`, "status");
    if (intent && !INTENTS.includes(intent)) return badRequest(res, `intent must be one of: ${INTENTS.join(", ")}`, "intent");
    if (search.length > MAX_SEARCH_LENGTH) return badRequest(res, `search must not exceed ${MAX_SEARCH_LENGTH} characters`, "search");
    const filter = { provider: req.user.id };
    if (status) filter.status = status;
    if (intent) filter.intent = intent;
    if (search) {
      const expression = new RegExp(escapeRegex(search), "i");
      filter.$or = ["contact.name", "contact.email", "contact.phone", "listingSnapshot.name", "message"].map((field) => ({ [field]: expression }));
    }
    const [items, total] = await Promise.all([
      Enquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(),
      Enquiry.countDocuments(filter),
    ]);
    const available = await availableKeys(items, req.user.id);
    return res.status(200).json({ success: true, data: items.map((item) => serialize(item, available.has(`${item.targetType}:${item.target}`), true)), pagination: { page: page.value, limit: limit.value, total, pages: Math.ceil(total / limit.value) } });
  } catch (error) {
    console.error("Provider enquiry list error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch provider enquiries" });
  }
}

export async function getProviderEnquirySummary(req, res) {
  try {
    const rows = await Enquiry.aggregate([{ $match: { provider: new mongoose.Types.ObjectId(String(req.user.id)) } }, { $group: { _id: "$status", count: { $sum: 1 } } }]);
    const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
    rows.forEach((row) => { if (STATUSES.includes(row._id)) counts[row._id] = row.count; });
    return res.status(200).json({ success: true, data: { total: STATUSES.reduce((sum, status) => sum + counts[status], 0), ...counts } });
  } catch (error) {
    console.error("Provider enquiry summary error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch enquiry summary" });
  }
}

export async function getProviderEnquiryById(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Enquiry ID must be a valid MongoDB ObjectId", "id");
    const ownership = { _id: req.params.id, provider: req.user.id };
    let item = await Enquiry.findOneAndUpdate({ ...ownership, status: "submitted" }, { $set: { status: "viewed" } }, { new: true }).lean();
    if (!item) item = await Enquiry.findOne(ownership).lean();
    if (!item) return res.status(404).json({ success: false, message: "Enquiry not found" });
    const available = await availableKeys([item], req.user.id);
    return res.status(200).json({ success: true, data: serialize(item, available.has(`${item.targetType}:${item.target}`)) });
  } catch (error) {
    console.error("Provider enquiry detail error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch enquiry" });
  }
}

export async function updateProviderEnquiryStatus(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Enquiry ID must be a valid MongoDB ObjectId", "id");
    const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
    const unsupported = Object.keys(body).filter((field) => field !== "status");
    if (unsupported.length) return badRequest(res, "Only status can be updated", "body", { unsupportedFields: unsupported });
    const nextStatus = clean(body.status).toLowerCase();
    if (!STATUSES.includes(nextStatus)) return badRequest(res, `status must be one of: ${STATUSES.join(", ")}`, "status");
    const ownership = { _id: req.params.id, provider: req.user.id };
    const current = await Enquiry.findOne(ownership).select("status").lean();
    if (!current) return res.status(404).json({ success: false, message: "Enquiry not found" });
    if (!TRANSITIONS[current.status]?.includes(nextStatus)) return res.status(409).json({ success: false, message: `Cannot transition enquiry from ${current.status} to ${nextStatus}`, allowedTransitions: TRANSITIONS[current.status] || [] });
    const updated = await Enquiry.findOneAndUpdate({ ...ownership, status: current.status }, { $set: { status: nextStatus } }, { new: true }).lean();
    if (!updated) return res.status(409).json({ success: false, message: "Enquiry status changed; refresh and try again" });
    const available = await availableKeys([updated], req.user.id);
    return res.status(200).json({ success: true, message: `Enquiry marked ${nextStatus}`, data: serialize(updated, available.has(`${updated.targetType}:${updated.target}`)) });
  } catch (error) {
    console.error("Provider enquiry status error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to update enquiry status" });
  }
}

export { STATUSES as PROVIDER_ENQUIRY_STATUSES, INTENTS as PROVIDER_ENQUIRY_INTENTS, TRANSITIONS as PROVIDER_ENQUIRY_TRANSITIONS };
