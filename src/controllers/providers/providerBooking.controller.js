import mongoose from "mongoose";
import Booking from "../../models/bookings/Booking.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { escapeRegex } from "../../utils/regex.js";
import { isPubliclyVisibleListing } from "../../utils/publicListing.js";
import { BOOKING_STATUSES, BOOKING_TARGET_TYPES, BOOKING_TYPES, PROVIDER_BOOKING_TRANSITIONS } from "../../utils/bookingDomain.js";

const TARGET_MODELS = Object.freeze({ gym: Gym, trainer: Trainer, nutritionist: Nutritionist });
const QUERY_FIELDS = new Set(["page", "limit", "status", "bookingType", "targetType", "search", "dateFrom", "dateTo"]);
const UPDATE_FIELDS = new Set(["status", "reason"]);
const ALL_BOOKING_TYPES = Object.freeze([...new Set(Object.values(BOOKING_TYPES).flat())]);
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

function badRequest(res, message, field, details = {}) { return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details }); }
function plainObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function positiveInteger(value, fallback, field, max) { if (value === undefined || value === "") return { value: fallback }; if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` }; const parsed = Number(value); return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed }; }
function parseInstant(value, field) { if (value === undefined || value === "") return { value: null }; if (Array.isArray(value) || typeof value !== "string" || !ISO_WITH_ZONE.test(value)) return { error: `${field} must be an ISO 8601 date-time with Z or an explicit UTC offset` }; const date = new Date(value); return Number.isNaN(date.getTime()) ? { error: `${field} must be a valid date-time` } : { value: date }; }

function snapshots(item) {
  const listing = item.listingSnapshot || {};
  return {
    listing: { id: String(item.target), name: listing.name || "Unavailable listing", slug: listing.slug || "", entityType: listing.entityType || item.targetType, image: listing.imageUrl ? { url: listing.imageUrl, alt: listing.name || "" } : null, href: listing.href || null },
    service: item.serviceSnapshot || null,
  };
}

function resolution(item) { const value = item.resolution || {}; return ["rejected", "cancelled"].includes(item.status) ? { reason: value.reason || "", byRole: value.byRole || null, at: value.at || null } : null; }
function history(item) { return (item.statusHistory || []).map((entry) => ({ status: entry.status, changedAt: entry.changedAt, changedByRole: entry.changedByRole, reason: entry.reason || "" })); }
function serializeList(item) { const snap = snapshots(item); const note = item.note || ""; return { id: String(item._id), targetType: item.targetType, bookingType: item.bookingType, scheduledFor: item.scheduledFor, timezone: item.timezone, status: item.status, contact: { name: item.contact?.name || "", email: item.contact?.email || "", phone: item.contact?.phone || "" }, ...snap, notePreview: note.length > 180 ? `${note.slice(0, 177)}...` : note, resolution: resolution(item), createdAt: item.createdAt, updatedAt: item.updatedAt }; }
function serializeDetail(item, currentListing) { return { ...serializeList(item), note: item.note || "", statusHistory: history(item), currentListing }; }

async function getCurrentListing(item, providerId) {
  const Model = TARGET_MODELS[item.targetType];
  if (!Model) return { exists: false, stillOwnedByProvider: false, active: false, publiclyAvailable: false, providerListingHref: null };
  const listing = await Model.findById(item.target).select("_id owner isActive moderationStatus").lean();
  if (!listing) return { exists: false, stillOwnedByProvider: false, active: false, publiclyAvailable: false, providerListingHref: null };
  const stillOwnedByProvider = Boolean(listing.owner && String(listing.owner) === String(providerId));
  return { exists: true, stillOwnedByProvider, active: Boolean(listing.isActive), publiclyAvailable: isPubliclyVisibleListing(listing), providerListingHref: stillOwnedByProvider ? `/provider/listings/${item.target}` : null };
}

export async function getProviderBookings(req, res) {
  try {
    const unsupportedFields = Object.keys(req.query || {}).filter((field) => !QUERY_FIELDS.has(field));
    if (unsupportedFields.length) return badRequest(res, "Unsupported booking query fields", "query", { unsupportedFields });
    const page = positiveInteger(req.query?.page, 1, "page", 1000); if (page.error) return badRequest(res, page.error, "page");
    const limit = positiveInteger(req.query?.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT); if (limit.error) return badRequest(res, limit.error, "limit");
    for (const field of ["status", "bookingType", "targetType", "search"]) if (Array.isArray(req.query?.[field])) return badRequest(res, `${field} must be a single value`, field);
    const status = clean(req.query?.status).toLowerCase(); const bookingType = clean(req.query?.bookingType).toLowerCase(); const targetType = clean(req.query?.targetType).toLowerCase(); const search = clean(req.query?.search);
    if (status && !BOOKING_STATUSES.includes(status)) return badRequest(res, `status must be one of: ${BOOKING_STATUSES.join(", ")}`, "status");
    if (bookingType && !ALL_BOOKING_TYPES.includes(bookingType)) return badRequest(res, "Unsupported bookingType", "bookingType");
    if (targetType && !BOOKING_TARGET_TYPES.includes(targetType)) return badRequest(res, "targetType must be gym, trainer, or nutritionist", "targetType");
    if (search.length > MAX_SEARCH_LENGTH) return badRequest(res, `search must not exceed ${MAX_SEARCH_LENGTH} characters`, "search");
    const dateFrom = parseInstant(req.query?.dateFrom, "dateFrom"); if (dateFrom.error) return badRequest(res, dateFrom.error, "dateFrom");
    const dateTo = parseInstant(req.query?.dateTo, "dateTo"); if (dateTo.error) return badRequest(res, dateTo.error, "dateTo");
    if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) return badRequest(res, "dateFrom must be before or equal to dateTo", "dateFrom");
    const filter = { provider: req.user.id }; if (status) filter.status = status; if (bookingType) filter.bookingType = bookingType; if (targetType) filter.targetType = targetType;
    if (dateFrom.value || dateTo.value) { filter.scheduledFor = {}; if (dateFrom.value) filter.scheduledFor.$gte = dateFrom.value; if (dateTo.value) filter.scheduledFor.$lte = dateTo.value; }
    if (search) { const expression = new RegExp(escapeRegex(search), "i"); filter.$or = ["contact.name", "contact.email", "contact.phone", "listingSnapshot.name", "serviceSnapshot.name", "note"].map((field) => ({ [field]: expression })); }
    const [items, total] = await Promise.all([Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(), Booking.countDocuments(filter)]);
    return res.status(200).json({ success: true, data: items.map(serializeList), pagination: { page: page.value, limit: limit.value, total, pages: Math.ceil(total / limit.value) } });
  } catch (error) { console.error("Provider booking list error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch provider bookings" }); }
}

export async function getProviderBookingSummary(req, res) {
  try {
    const now = new Date();
    const [row] = await Booking.aggregate([{ $match: { provider: new mongoose.Types.ObjectId(String(req.user.id)) } }, { $group: { _id: null, total: { $sum: 1 }, requested: { $sum: { $cond: [{ $eq: ["$status", "requested"] }, 1, 0] } }, confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, upcomingConfirmed: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "confirmed"] }, { $gt: ["$scheduledFor", now] }] }, 1, 0] } } } }]);
    const empty = { total: 0, requested: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0, upcomingConfirmed: 0 };
    return res.status(200).json({ success: true, data: row ? { total: row.total, requested: row.requested, confirmed: row.confirmed, rejected: row.rejected, cancelled: row.cancelled, completed: row.completed, upcomingConfirmed: row.upcomingConfirmed } : empty });
  } catch (error) { console.error("Provider booking summary error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch provider booking summary" }); }
}

export async function getProviderBookingById(req, res) {
  try { if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Booking ID must be a valid MongoDB ObjectId", "id"); const item = await Booking.findOne({ _id: req.params.id, provider: req.user.id }).lean(); if (!item) return res.status(404).json({ success: false, message: "Booking not found" }); const currentListing = await getCurrentListing(item, req.user.id); return res.status(200).json({ success: true, data: serializeDetail(item, currentListing) }); } catch (error) { console.error("Provider booking detail error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch provider booking" }); }
}

export async function updateProviderBookingStatus(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Booking ID must be a valid MongoDB ObjectId", "id");
    if (!plainObject(req.body)) return badRequest(res, "Request body must be an object", "body");
    const unsupportedFields = Object.keys(req.body).filter((field) => !UPDATE_FIELDS.has(field)); if (unsupportedFields.length) return badRequest(res, "Unsupported booking status fields", "body", { unsupportedFields });
    const status = clean(req.body.status).toLowerCase(); const reason = clean(req.body.reason);
    if (!BOOKING_STATUSES.includes(status) || status === "requested") return badRequest(res, "status must be confirmed, rejected, cancelled, or completed", "status");
    if (["rejected", "cancelled"].includes(status) && !reason) return badRequest(res, `reason is required when a booking is ${status}`, "reason");
    if (reason.length > 500) return badRequest(res, "reason must not exceed 500 characters", "reason");
    if (!["rejected", "cancelled"].includes(status) && reason) return badRequest(res, `reason is not accepted when status is ${status}`, "reason");
    const current = await Booking.findOne({ _id: req.params.id, provider: req.user.id }).select("status scheduledFor").lean();
    if (!current) return res.status(404).json({ success: false, message: "Booking not found" });
    if (!PROVIDER_BOOKING_TRANSITIONS[current.status]?.includes(status)) return res.status(409).json({ success: false, message: `A ${current.status} booking cannot transition to ${status}.` });
    const changedAt = new Date();
    if (status === "confirmed" && new Date(current.scheduledFor).getTime() <= changedAt.getTime()) return res.status(409).json({ success: false, message: "A past booking request cannot be confirmed." });
    if (status === "completed" && new Date(current.scheduledFor).getTime() > changedAt.getTime()) return res.status(409).json({ success: false, message: "A future booking cannot be marked completed." });
    const filter = { _id: current._id, provider: req.user.id, status: current.status };
    if (status === "confirmed") filter.scheduledFor = { $gt: changedAt };
    if (status === "completed") filter.scheduledFor = { $lte: changedAt };
    const update = { $set: { status, resolution: ["rejected", "cancelled"].includes(status) ? { reason, byRole: "provider", at: changedAt } : { reason: "", byRole: null, at: null } }, $push: { statusHistory: { status, changedAt, changedByRole: "provider", reason } } };
    const updated = await Booking.findOneAndUpdate(filter, update, { new: true, runValidators: true }).lean();
    if (!updated) return res.status(409).json({ success: false, message: "Booking status changed before this action could be completed. Refresh and try again." });
    return res.status(200).json({ success: true, message: `Booking ${status}.`, data: serializeDetail(updated, null) });
  } catch (error) { if (error?.name === "ValidationError") return badRequest(res, "Invalid booking status details", "body"); console.error("Provider booking status error:", error?.message); return res.status(500).json({ success: false, message: "Failed to update booking status" }); }
}
