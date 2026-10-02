import mongoose from "mongoose";
import Enquiry from "../../models/enquiries/Enquiry.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { getMarketplaceClassification } from "../../utils/marketplaceClassification.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";

export const ENQUIRY_INTENTS = Object.freeze({
  gym: Object.freeze(["general", "membership", "class", "trial"]),
  trainer: Object.freeze(["general", "training", "trial"]),
  nutritionist: Object.freeze(["general", "consultation"]),
});

const TARGETS = Object.freeze({
  gym: { model: Gym, fields: "name slug owner images.cover" },
  trainer: { model: Trainer, fields: "name slug owner image.src" },
  nutritionist: { model: Nutritionist, fields: "name slug owner image.src" },
});
const TOP_LEVEL_FIELDS = new Set(["targetType", "targetId", "intent", "message", "contact", "context"]);
const CONTACT_FIELDS = new Set(["name", "email", "phone"]);
const CONTEXT_FIELDS = new Set(["membershipName", "className"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function errorResponse(res, message, field, details = {}) {
  return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details });
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function unsupportedFields(value, allowed) {
  return plainObject(value) ? Object.keys(value).filter((key) => !allowed.has(key)) : [];
}

function validateCreateBody(body) {
  if (!plainObject(body)) return { field: "body", message: "Request body must be an object" };
  const unsupported = unsupportedFields(body, TOP_LEVEL_FIELDS);
  if (unsupported.length) return { field: "body", message: "Unsupported enquiry fields", unsupportedFields: unsupported };
  const targetType = cleanString(body.targetType).toLowerCase();
  if (!TARGETS[targetType]) return { field: "targetType", message: "targetType must be gym, trainer, or nutritionist" };
  if (typeof body.targetId !== "string" || !mongoose.isValidObjectId(body.targetId)) return { field: "targetId", message: "targetId must be a valid MongoDB ObjectId" };
  const intent = cleanString(body.intent).toLowerCase();
  if (!ENQUIRY_INTENTS[targetType].includes(intent)) return { field: "intent", message: `${intent || "This intent"} is not supported for ${targetType} enquiries` };
  const message = cleanString(body.message);
  if (!message) return { field: "message", message: "message is required" };
  if (message.length > 2000) return { field: "message", message: "message must not exceed 2000 characters" };
  if (!plainObject(body.contact)) return { field: "contact", message: "contact must be an object" };
  const unsupportedContact = unsupportedFields(body.contact, CONTACT_FIELDS);
  if (unsupportedContact.length) return { field: "contact", message: "Unsupported contact fields", unsupportedFields: unsupportedContact.map((field) => `contact.${field}`) };
  const name = cleanString(body.contact.name);
  const email = cleanString(body.contact.email).toLowerCase();
  const phone = cleanString(body.contact.phone);
  if (!name) return { field: "contact.name", message: "contact name is required" };
  if (name.length > 100) return { field: "contact.name", message: "contact name must not exceed 100 characters" };
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return { field: "contact.email", message: "A valid contact email is required" };
  if (phone.length > 30) return { field: "contact.phone", message: "contact phone must not exceed 30 characters" };
  if (body.context !== undefined && !plainObject(body.context)) return { field: "context", message: "context must be an object" };
  const context = body.context || {};
  const unsupportedContext = unsupportedFields(context, CONTEXT_FIELDS);
  if (unsupportedContext.length) return { field: "context", message: "Unsupported context fields", unsupportedFields: unsupportedContext.map((field) => `context.${field}`) };
  const membershipName = cleanString(context.membershipName);
  const className = cleanString(context.className);
  if (membershipName.length > 150) return { field: "context.membershipName", message: "membershipName must not exceed 150 characters" };
  if (className.length > 150) return { field: "context.className", message: "className must not exceed 150 characters" };
  if (intent === "membership" && !membershipName) return { field: "context.membershipName", message: "membershipName is required for membership enquiries" };
  if (intent === "class" && !className) return { field: "context.className", message: "className is required for class enquiries" };
  return { value: { targetType, targetId: body.targetId, intent, message, contact: { name, email, phone }, context: { membershipName, className } } };
}

function listingSnapshot(listing, targetType) {
  const classification = getMarketplaceClassification(listing, targetType);
  const href = targetType === "gym" ? `/gym-detail/${listing.slug}` : targetType === "nutritionist" ? `/nutritionists/${listing.slug}` : `/trainers/${listing.slug}`;
  return {
    name: listing.name,
    slug: listing.slug,
    entityType: classification.listingType,
    imageUrl: targetType === "gym" ? listing.images?.cover || "" : listing.image?.src || "",
    href,
  };
}

function safeEnquiry(item, availability = true) {
  const snapshot = item.listingSnapshot || {};
  return {
    id: String(item._id), targetType: item.targetType, intent: item.intent, status: item.status,
    message: item.message, contact: item.contact, context: item.context,
    createdAt: item.createdAt, updatedAt: item.updatedAt,
    listing: { id: String(item.target), name: snapshot.name, slug: snapshot.slug, entityType: snapshot.entityType, image: snapshot.imageUrl ? { url: snapshot.imageUrl, alt: snapshot.name } : null, href: availability ? snapshot.href : null, available: availability },
  };
}

export async function createEnquiry(req, res) {
  try {
    const validation = validateCreateBody(req.body);
    if (validation.field) return errorResponse(res, validation.message, validation.field, validation.unsupportedFields ? { unsupportedFields: validation.unsupportedFields } : {});
    const input = validation.value;
    const config = TARGETS[input.targetType];
    const query = config.model.findOne(withPublicListingVisibility({ _id: input.targetId })).select(config.fields).populate("owner", "role providerType isActive");
    const listing = await query.lean();
    if (!listing) return res.status(404).json({ success: false, message: "Published listing not found" });
    const snapshot = listingSnapshot(listing, input.targetType);
    const provider = listing.owner?.role === "business" && listing.owner?.isActive !== false ? listing.owner._id : null;
    const enquiry = await Enquiry.create({ customer: req.user.id, targetType: input.targetType, target: input.targetId, provider, intent: input.intent, message: input.message, contact: input.contact, context: input.context, listingSnapshot: snapshot });
    return res.status(201).json({ success: true, message: "Your enquiry has been sent.", data: safeEnquiry(enquiry.toObject ? enquiry.toObject() : enquiry, true) });
  } catch (error) {
    if (error?.name === "ValidationError") return errorResponse(res, "Invalid enquiry details", "body");
    console.error("Create enquiry error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to submit enquiry" });
  }
}

function positiveInteger(value, fallback, field, max) {
  if (value === undefined || value === "") return { value: fallback };
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` };
  const parsed = Number(value);
  return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed };
}

async function availableTargetKeys(items) {
  const available = new Set();
  await Promise.all(Object.entries(TARGETS).map(async ([targetType, config]) => {
    const ids = items.filter((item) => item.targetType === targetType).map((item) => item.target);
    if (!ids.length) return;
    const docs = await config.model.find(withPublicListingVisibility({ _id: { $in: ids } })).select("_id").lean();
    docs.forEach((doc) => available.add(`${targetType}:${doc._id}`));
  }));
  return available;
}

export async function getMyEnquiries(req, res) {
  try {
    const unsupported = Object.keys(req.query || {}).filter((field) => !["page", "limit"].includes(field));
    if (unsupported.length) return errorResponse(res, "Unsupported enquiry query fields", "query", { unsupportedFields: unsupported });
    const page = positiveInteger(req.query?.page, 1, "page", 1000);
    if (page.error) return errorResponse(res, page.error, "page");
    const limit = positiveInteger(req.query?.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT);
    if (limit.error) return errorResponse(res, limit.error, "limit");
    const filter = { customer: req.user.id };
    const [items, total] = await Promise.all([Enquiry.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(), Enquiry.countDocuments(filter)]);
    const available = await availableTargetKeys(items);
    return res.status(200).json({ success: true, data: items.map((item) => safeEnquiry(item, available.has(`${item.targetType}:${item.target}`))), pagination: { page: page.value, limit: limit.value, total, totalPages: Math.ceil(total / limit.value) } });
  } catch (error) {
    console.error("Get enquiries error:", error?.message);
    return res.status(500).json({ success: false, message: "Failed to fetch enquiries" });
  }
}
