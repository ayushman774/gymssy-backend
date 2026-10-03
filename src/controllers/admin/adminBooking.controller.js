import mongoose from "mongoose";
import Booking from "../../models/bookings/Booking.js";
import User from "../../models/users/User.js";
import ProviderProfile from "../../models/providers/ProviderProfile.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { escapeRegex } from "../../utils/regex.js";
import { isPubliclyVisibleListing } from "../../utils/publicListing.js";
import { BOOKING_STATUSES, BOOKING_TARGET_TYPES, BOOKING_TYPES } from "../../utils/bookingDomain.js";

const TARGET_MODELS = Object.freeze({ gym: Gym, trainer: Trainer, nutritionist: Nutritionist });
const ASSIGNMENTS = Object.freeze(["all", "assigned", "unassigned"]);
const ALLOWED_QUERY = Object.freeze(["page", "limit", "status", "bookingType", "targetType", "assignment", "search", "dateFrom", "dateTo"]);
const ALL_BOOKING_TYPES = Object.freeze([...new Set(Object.values(BOOKING_TYPES).flat())]);
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MAX_SEARCH_LENGTH = 100;

function badRequest(res, message, field, details = {}) { return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details }); }
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function positiveInteger(value, fallback, field, max) { if (value === undefined || value === "") return { value: fallback }; if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` }; const parsed = Number(value); return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed }; }
function parseDate(value, field) { if (value === undefined || value === "") return { value: null }; if (Array.isArray(value) || typeof value !== "string" || !ISO_WITH_ZONE.test(value)) return { error: `${field} must be an ISO 8601 date-time with Z or an explicit UTC offset` }; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? { error: `${field} must be a valid date-time` } : { value: parsed }; }

async function identityMaps(items) {
  const providerIds = [...new Set(items.map((item) => item.provider).filter(Boolean).map(String))];
  const customerIds = [...new Set(items.map((item) => item.customer).filter(Boolean).map(String))];
  const [providers, profiles, customers] = await Promise.all([
    providerIds.length ? User.find({ _id: { $in: providerIds }, role: "business" }).select("name providerType isActive").lean() : [],
    providerIds.length ? ProviderProfile.find({ user: { $in: providerIds } }).select("user businessName isActive").lean() : [],
    customerIds.length ? User.find({ _id: { $in: customerIds }, role: "user" }).select("name isActive").lean() : [],
  ]);
  const profileMap = new Map(profiles.map((profile) => [String(profile.user), profile]));
  return {
    providers: new Map(providers.map((user) => { const profile = profileMap.get(String(user._id)); return [String(user._id), { id: String(user._id), exists: true, accountName: user.name || "", businessName: profile?.businessName || "", providerType: user.providerType || null, isActive: Boolean(user.isActive), profileExists: Boolean(profile), profileActive: profile ? Boolean(profile.isActive) : false }]; })),
    customers: new Map(customers.map((user) => [String(user._id), { id: String(user._id), exists: true, name: user.name || "", isActive: Boolean(user.isActive) }])),
  };
}

function providerIdentity(item, providers) {
  if (!item.provider) return null;
  return providers.get(String(item.provider)) || { id: String(item.provider), exists: false, accountName: "Unavailable provider", businessName: "", providerType: null, isActive: false, profileExists: false, profileActive: false };
}

function historicalListing(item) { const value = item.listingSnapshot || {}; return { id: item.target ? String(item.target) : null, name: value.name || "Unavailable listing", slug: value.slug || "", entityType: value.entityType || item.targetType, image: value.imageUrl ? { url: value.imageUrl, alt: value.name || "" } : null, href: value.href || "" }; }
function historicalService(item) { const value = item.serviceSnapshot || {}; return { type: value.type || item.bookingType, name: value.name || "", duration: value.duration || "", schedule: value.schedule || "", time: value.time || "", trainer: value.trainer || "", specialty: value.specialty || "", description: value.description || "", displayPrice: Number.isFinite(value.displayPrice) ? value.displayPrice : null, currency: value.currency || "" }; }

function serializeList(item, maps, now = Date.now()) {
  const note = item.note || "";
  return { id: String(item._id), bookingType: item.bookingType, targetType: item.targetType, scheduledFor: item.scheduledFor, timezone: item.timezone, status: item.status, contact: { name: item.contact?.name || "", email: item.contact?.email || "", phone: item.contact?.phone || "" }, listing: historicalListing(item), service: historicalService(item), notePreview: note.length > 180 ? `${note.slice(0, 177)}...` : note, createdAt: item.createdAt, updatedAt: item.updatedAt, assignment: item.provider ? "assigned" : "unassigned", provider: providerIdentity(item, maps.providers), customer: item.customer ? maps.customers.get(String(item.customer)) || { id: String(item.customer), exists: false, name: "", isActive: false } : { id: null, exists: false, name: "", isActive: false }, flags: { pastRequested: item.status === "requested" && new Date(item.scheduledFor).getTime() < now, providerInactive: Boolean(item.provider) && providerIdentity(item, maps.providers)?.isActive !== true } };
}

async function currentListingDiagnostic(item) {
  const Model = TARGET_MODELS[item.targetType];
  if (!Model || !item.target) return { exists: false, active: false, moderationStatus: null, publiclyAvailable: false, currentOwnerId: null, ownershipChanged: false, adminListingHref: null };
  const listing = await Model.findById(item.target).select("_id owner isActive moderationStatus").lean();
  if (!listing) return { exists: false, active: false, moderationStatus: null, publiclyAvailable: false, currentOwnerId: null, ownershipChanged: false, adminListingHref: null };
  const currentOwnerId = listing.owner ? String(listing.owner) : null; const assignedProviderId = item.provider ? String(item.provider) : null;
  return { exists: true, active: Boolean(listing.isActive), moderationStatus: listing.moderationStatus || null, publiclyAvailable: isPubliclyVisibleListing(listing), currentOwnerId, ownershipChanged: currentOwnerId !== assignedProviderId, adminListingHref: `/admin/listings/${item.targetType}/${item.target}` };
}

export async function getAdminBookings(req, res) {
  try {
    const unsupported = Object.keys(req.query || {}).filter((field) => !ALLOWED_QUERY.includes(field)); if (unsupported.length) return badRequest(res, "Unsupported booking query fields", "query", { unsupportedFields: unsupported });
    const page = positiveInteger(req.query?.page, 1, "page", 1000); if (page.error) return badRequest(res, page.error, "page");
    const limit = positiveInteger(req.query?.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT); if (limit.error) return badRequest(res, limit.error, "limit");
    const status = clean(req.query?.status).toLowerCase(); const bookingType = clean(req.query?.bookingType).toLowerCase(); const targetType = clean(req.query?.targetType).toLowerCase(); const assignment = clean(req.query?.assignment).toLowerCase() || "all"; const search = clean(req.query?.search);
    if (status && !BOOKING_STATUSES.includes(status)) return badRequest(res, `status must be one of: ${BOOKING_STATUSES.join(", ")}`, "status");
    if (bookingType && !ALL_BOOKING_TYPES.includes(bookingType)) return badRequest(res, "Unsupported bookingType", "bookingType");
    if (targetType && !BOOKING_TARGET_TYPES.includes(targetType)) return badRequest(res, "targetType must be gym, trainer, or nutritionist", "targetType");
    if (!ASSIGNMENTS.includes(assignment)) return badRequest(res, "assignment must be all, assigned, or unassigned", "assignment");
    if (search.length > MAX_SEARCH_LENGTH) return badRequest(res, `search must not exceed ${MAX_SEARCH_LENGTH} characters`, "search");
    const dateFrom = parseDate(req.query?.dateFrom, "dateFrom"); if (dateFrom.error) return badRequest(res, dateFrom.error, "dateFrom"); const dateTo = parseDate(req.query?.dateTo, "dateTo"); if (dateTo.error) return badRequest(res, dateTo.error, "dateTo"); if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) return badRequest(res, "dateFrom must be before or equal to dateTo", "dateFrom");
    const filter = {}; if (status) filter.status = status; if (bookingType) filter.bookingType = bookingType; if (targetType) filter.targetType = targetType; if (assignment === "assigned") filter.provider = { $ne: null }; if (assignment === "unassigned") filter.provider = null; if (dateFrom.value || dateTo.value) filter.scheduledFor = { ...(dateFrom.value ? { $gte: dateFrom.value } : {}), ...(dateTo.value ? { $lte: dateTo.value } : {}) };
    if (search) { const expression = new RegExp(escapeRegex(search), "i"); filter.$or = ["contact.name", "contact.email", "contact.phone", "listingSnapshot.name", "serviceSnapshot.name", "note"].map((field) => ({ [field]: expression })); }
    const [items, total] = await Promise.all([Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(), Booking.countDocuments(filter)]); const maps = await identityMaps(items);
    return res.status(200).json({ success: true, data: items.map((item) => serializeList(item, maps)), pagination: { page: page.value, limit: limit.value, total, pages: Math.ceil(total / limit.value) } });
  } catch (error) { console.error("Admin booking list error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch admin bookings" }); }
}

export async function getAdminBookingSummary(req, res) {
  try { const now = new Date(); const [row] = await Booking.aggregate([{ $group: { _id: null, total: { $sum: 1 }, requested: { $sum: { $cond: [{ $eq: ["$status", "requested"] }, 1, 0] } }, confirmed: { $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] } }, rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } }, cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } }, upcomingConfirmed: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "confirmed"] }, { $gt: ["$scheduledFor", now] }] }, 1, 0] } }, pastRequested: { $sum: { $cond: [{ $and: [{ $eq: ["$status", "requested"] }, { $lt: ["$scheduledFor", now] }] }, 1, 0] } } } }]); const empty = { total: 0, requested: 0, confirmed: 0, rejected: 0, cancelled: 0, completed: 0, upcomingConfirmed: 0, pastRequested: 0 }; return res.status(200).json({ success: true, data: row ? Object.fromEntries(Object.keys(empty).map((key) => [key, row[key] || 0])) : empty }); }
  catch (error) { console.error("Admin booking summary error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch admin booking summary" }); }
}

export async function getAdminBookingById(req, res) {
  try { if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Booking ID must be a valid MongoDB ObjectId", "id"); const item = await Booking.findById(req.params.id).lean(); if (!item) return res.status(404).json({ success: false, message: "Booking not found" }); const maps = await identityMaps([item]); const base = serializeList(item, maps); const currentListing = await currentListingDiagnostic(item); return res.status(200).json({ success: true, data: { ...base, note: item.note || "", resolution: ["rejected", "cancelled"].includes(item.status) ? { reason: item.resolution?.reason || "", resolvedByRole: item.resolution?.byRole || null, resolvedAt: item.resolution?.at || null } : null, statusHistory: (item.statusHistory || []).map((entry) => ({ status: entry.status, changedAt: entry.changedAt, changedByRole: entry.changedByRole, reason: entry.reason || "" })), currentListing } }); }
  catch (error) { console.error("Admin booking detail error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch admin booking" }); }
}
