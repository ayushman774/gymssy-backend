import mongoose from "mongoose";
import Booking from "../../models/bookings/Booking.js";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import { getMarketplaceClassification } from "../../utils/marketplaceClassification.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";
import { BOOKING_STATUSES, BOOKING_TYPES, CUSTOMER_BOOKING_TRANSITIONS } from "../../utils/bookingDomain.js";

const TARGETS = Object.freeze({
  gym: { model: Gym, fields: "name slug owner images.cover memberships classes" },
  trainer: { model: Trainer, fields: "name slug owner image.src available specialty sessions" },
  nutritionist: { model: Nutritionist, fields: "name slug owner image.src available specialty sessions" },
});
const CREATE_FIELDS = new Set(["targetType", "targetId", "bookingType", "scheduledFor", "timezone", "contact", "note", "service"]);
const CONTACT_FIELDS = new Set(["name", "email", "phone"]);
const SERVICE_FIELDS = new Set(["name"]);
const CANCEL_FIELDS = new Set(["reason"]);
const LIST_FIELDS = new Set(["page", "limit", "status", "bookingType"]);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function badRequest(res, message, field, details = {}) { return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details }); }
function plainObject(value) { return value && typeof value === "object" && !Array.isArray(value); }
function clean(value) { return typeof value === "string" ? value.trim() : ""; }
function unsupported(value, allowlist) { return plainObject(value) ? Object.keys(value).filter((field) => !allowlist.has(field)) : []; }
function validTimezone(value) { try { new Intl.DateTimeFormat("en", { timeZone: value }).format(); return true; } catch { return false; } }
function positiveInteger(value, fallback, field, max) { if (value === undefined || value === "") return { value: fallback }; if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` }; const parsed = Number(value); return parsed < 1 || parsed > max ? { error: `${field} must be between 1 and ${max}` } : { value: parsed }; }

function validateCreate(body, now = Date.now()) {
  if (!plainObject(body)) return { field: "body", message: "Request body must be an object" };
  const extra = unsupported(body, CREATE_FIELDS); if (extra.length) return { field: "body", message: "Unsupported booking fields", unsupportedFields: extra };
  const targetType = clean(body.targetType).toLowerCase(); if (!TARGETS[targetType]) return { field: "targetType", message: "targetType must be gym, trainer, or nutritionist" };
  if (typeof body.targetId !== "string" || !mongoose.isValidObjectId(body.targetId)) return { field: "targetId", message: "targetId must be a valid MongoDB ObjectId" };
  const bookingType = clean(body.bookingType).toLowerCase(); if (!BOOKING_TYPES[targetType].includes(bookingType)) return { field: "bookingType", message: `${bookingType || "This booking type"} is not supported for ${targetType}` };
  if (typeof body.scheduledFor !== "string" || !ISO_WITH_ZONE.test(body.scheduledFor)) return { field: "scheduledFor", message: "scheduledFor must be an ISO 8601 date-time with Z or an explicit UTC offset" };
  const scheduledFor = new Date(body.scheduledFor); if (Number.isNaN(scheduledFor.getTime())) return { field: "scheduledFor", message: "scheduledFor must be a valid date-time" }; if (scheduledFor.getTime() <= now) return { field: "scheduledFor", message: "scheduledFor must be in the future" };
  const timezone = clean(body.timezone); if (!timezone || !validTimezone(timezone)) return { field: "timezone", message: "timezone must be a valid IANA time zone" };
  if (!plainObject(body.contact)) return { field: "contact", message: "contact must be an object" };
  const extraContact = unsupported(body.contact, CONTACT_FIELDS); if (extraContact.length) return { field: "contact", message: "Unsupported contact fields", unsupportedFields: extraContact.map((field) => `contact.${field}`) };
  const name = clean(body.contact.name); const email = clean(body.contact.email).toLowerCase(); const phone = clean(body.contact.phone);
  if (!name || name.length > 100) return { field: "contact.name", message: "contact name is required and must not exceed 100 characters" };
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return { field: "contact.email", message: "A valid contact email is required" };
  if (phone.length > 30) return { field: "contact.phone", message: "contact phone must not exceed 30 characters" };
  const note = clean(body.note); if (note.length > 2000) return { field: "note", message: "note must not exceed 2000 characters" };
  const requiresService = targetType === "gym" && ["class", "membership"].includes(bookingType);
  if (body.service !== undefined && !plainObject(body.service)) return { field: "service", message: "service must be an object" };
  const service = body.service || {}; const extraService = unsupported(service, SERVICE_FIELDS); if (extraService.length) return { field: "service", message: "Unsupported service fields", unsupportedFields: extraService.map((field) => `service.${field}`) };
  const serviceName = clean(service.name); if (requiresService && !serviceName) return { field: "service.name", message: `service name is required for ${bookingType} bookings` }; if (serviceName.length > 150) return { field: "service.name", message: "service name must not exceed 150 characters" }; if (!requiresService && serviceName) return { field: "service", message: `service is not accepted for ${bookingType} bookings` };
  return { value: { targetType, targetId: body.targetId, bookingType, scheduledFor, timezone, contact: { name, email, phone }, note, serviceName } };
}

function listingSnapshot(listing, targetType) { const classification = getMarketplaceClassification(listing, targetType); return { name: listing.name, slug: listing.slug, entityType: classification.listingType, imageUrl: targetType === "gym" ? listing.images?.cover || "" : listing.image?.src || "", href: targetType === "gym" ? `/gym-detail/${listing.slug}` : targetType === "nutritionist" ? `/nutritionists/${listing.slug}` : `/trainers/${listing.slug}` }; }

function serviceSnapshot(listing, input) {
  if (input.targetType === "gym" && ["class", "membership"].includes(input.bookingType)) {
    const source = input.bookingType === "class" ? listing.classes || [] : listing.memberships || [];
    const matches = source.filter((item) => clean(item.name).toLowerCase() === input.serviceName.toLowerCase());
    if (matches.length !== 1) return { error: matches.length ? "The selected service is ambiguous and cannot be booked online." : "The selected service is no longer available." };
    const item = matches[0];
    return { value: { type: input.bookingType, name: clean(item.name), duration: clean(item.duration), schedule: input.bookingType === "class" ? clean(item.schedule) : "", time: input.bookingType === "class" ? clean(item.time) : "", trainer: input.bookingType === "class" ? clean(item.trainer) : "", specialty: "", description: input.bookingType === "class" ? clean(item.description) : "", displayPrice: input.bookingType === "membership" && Number.isFinite(item.price) ? item.price : null, currency: input.bookingType === "membership" ? clean(item.currency) : "" } };
  }
  if (input.targetType === "trainer") return { value: { type: input.bookingType, name: input.bookingType === "trial" ? "Trial session" : "Training session", duration: "", trainer: listing.name, specialty: clean(listing.specialty), description: clean(listing.sessions), displayPrice: null, currency: "" } };
  if (input.targetType === "nutritionist") return { value: { type: input.bookingType, name: "Nutrition consultation", duration: "", trainer: "", specialty: clean(listing.specialty), description: clean(listing.sessions), displayPrice: null, currency: "" } };
  return { value: { type: input.bookingType, name: input.bookingType === "trial" ? "Trial visit" : "Gym visit", duration: "", trainer: "", specialty: "", description: "", displayPrice: null, currency: "" } };
}

function safeBooking(item) { const listing = item.listingSnapshot || {}; const resolution = item.resolution || {}; return { id: String(item._id), targetType: item.targetType, bookingType: item.bookingType, scheduledFor: item.scheduledFor, timezone: item.timezone, status: item.status, contact: item.contact, note: item.note || "", listing: { id: String(item.target), name: listing.name, slug: listing.slug, entityType: listing.entityType, image: listing.imageUrl ? { url: listing.imageUrl, alt: listing.name } : null, href: listing.href }, service: item.serviceSnapshot, resolution: ["rejected", "cancelled"].includes(item.status) ? { reason: resolution.reason || "", byRole: resolution.byRole || null, at: resolution.at || null } : null, statusHistory: (item.statusHistory || []).map((entry) => ({ status: entry.status, changedAt: entry.changedAt, changedByRole: entry.changedByRole, reason: entry.reason || "" })), createdAt: item.createdAt, updatedAt: item.updatedAt }; }

export async function createBooking(req, res) {
  try {
    const validation = validateCreate(req.body); if (validation.field) return badRequest(res, validation.message, validation.field, validation.unsupportedFields ? { unsupportedFields: validation.unsupportedFields } : {}); const input = validation.value;
    const config = TARGETS[input.targetType]; const listing = await config.model.findOne(withPublicListingVisibility({ _id: input.targetId })).select(config.fields).populate("owner", "role providerType isActive").lean();
    if (!listing) return res.status(404).json({ success: false, message: "Published listing not found" });
    if (!listing.owner || listing.owner.role !== "business" || listing.owner.isActive !== true) return res.status(409).json({ success: false, message: "This listing is not currently available for online booking." });
    if (input.targetType !== "gym" && listing.available === false) return res.status(409).json({ success: false, message: "This listing is not currently accepting booking requests." });
    const service = serviceSnapshot(listing, input); if (service.error) return res.status(409).json({ success: false, message: service.error });
    const changedAt = new Date(); const booking = await Booking.create({ customer: req.user.id, provider: listing.owner._id, targetType: input.targetType, target: input.targetId, bookingType: input.bookingType, scheduledFor: input.scheduledFor, timezone: input.timezone, contact: input.contact, listingSnapshot: listingSnapshot(listing, input.targetType), serviceSnapshot: service.value, note: input.note, status: "requested", statusHistory: [{ status: "requested", changedAt, changedByRole: "customer", reason: "" }] });
    return res.status(201).json({ success: true, message: "Your booking request has been sent to the provider.", data: safeBooking(booking.toObject ? booking.toObject() : booking) });
  } catch (error) { if (error?.name === "ValidationError") return badRequest(res, "Invalid booking details", "body"); console.error("Create booking error:", error?.message); return res.status(500).json({ success: false, message: "Failed to create booking request" }); }
}

export async function getMyBookings(req, res) {
  try { const extra = Object.keys(req.query || {}).filter((field) => !LIST_FIELDS.has(field)); if (extra.length) return badRequest(res, "Unsupported booking query fields", "query", { unsupportedFields: extra }); const page = positiveInteger(req.query?.page, 1, "page", 1000); if (page.error) return badRequest(res, page.error, "page"); const limit = positiveInteger(req.query?.limit, DEFAULT_LIMIT, "limit", MAX_LIMIT); if (limit.error) return badRequest(res, limit.error, "limit"); const status = clean(req.query?.status).toLowerCase(); const bookingType = clean(req.query?.bookingType).toLowerCase(); if (status && !BOOKING_STATUSES.includes(status)) return badRequest(res, `status must be one of: ${BOOKING_STATUSES.join(", ")}`, "status"); const allTypes = [...new Set(Object.values(BOOKING_TYPES).flat())]; if (bookingType && !allTypes.includes(bookingType)) return badRequest(res, "Unsupported bookingType", "bookingType"); const filter = { customer: req.user.id }; if (status) filter.status = status; if (bookingType) filter.bookingType = bookingType; const [items, total] = await Promise.all([Booking.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page.value - 1) * limit.value).limit(limit.value).lean(), Booking.countDocuments(filter)]); return res.status(200).json({ success: true, data: items.map(safeBooking), pagination: { page: page.value, limit: limit.value, total, totalPages: Math.ceil(total / limit.value) } }); } catch (error) { console.error("Get bookings error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch bookings" }); }
}

export async function getMyBookingById(req, res) {
  try { if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Booking ID must be a valid MongoDB ObjectId", "id"); const booking = await Booking.findOne({ _id: req.params.id, customer: req.user.id }).lean(); if (!booking) return res.status(404).json({ success: false, message: "Booking not found" }); return res.status(200).json({ success: true, data: safeBooking(booking) }); } catch (error) { console.error("Get booking error:", error?.message); return res.status(500).json({ success: false, message: "Failed to fetch booking" }); }
}

export async function cancelMyBooking(req, res) {
  try { if (!mongoose.isValidObjectId(req.params.id)) return badRequest(res, "Booking ID must be a valid MongoDB ObjectId", "id"); if (!plainObject(req.body || {})) return badRequest(res, "Request body must be an object", "body"); const extra = unsupported(req.body || {}, CANCEL_FIELDS); if (extra.length) return badRequest(res, "Unsupported cancellation fields", "body", { unsupportedFields: extra }); const reason = clean(req.body?.reason); if (reason.length > 500) return badRequest(res, "reason must not exceed 500 characters", "reason"); const current = await Booking.findOne({ _id: req.params.id, customer: req.user.id }).lean(); if (!current) return res.status(404).json({ success: false, message: "Booking not found" }); if (!CUSTOMER_BOOKING_TRANSITIONS[current.status]?.includes("cancelled")) return res.status(409).json({ success: false, message: `A ${current.status} booking cannot be cancelled.` }); if (current.status === "confirmed" && new Date(current.scheduledFor).getTime() <= Date.now()) return res.status(409).json({ success: false, message: "A confirmed booking cannot be cancelled after its scheduled time." }); const changedAt = new Date(); const updated = await Booking.findOneAndUpdate({ _id: current._id, customer: req.user.id, status: current.status }, { $set: { status: "cancelled", resolution: { reason, byRole: "customer", at: changedAt } }, $push: { statusHistory: { status: "cancelled", changedAt, changedByRole: "customer", reason } } }, { new: true, runValidators: true }).lean(); if (!updated) return res.status(409).json({ success: false, message: "Booking status changed before cancellation could be completed. Refresh and try again." }); return res.status(200).json({ success: true, message: "Booking cancelled.", data: safeBooking(updated) }); } catch (error) { if (error?.name === "ValidationError") return badRequest(res, "Invalid cancellation details", "body"); console.error("Cancel booking error:", error?.message); return res.status(500).json({ success: false, message: "Failed to cancel booking" }); }
}

export { validateCreate as validateBookingCreate, safeBooking as serializeCustomerBooking };
