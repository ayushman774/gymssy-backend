import mongoose from "mongoose";
import Category from "../../models/categories/Category.js";
import City from "../../models/cities/City.js";
import {
  getCategoryReferenceImpact,
  getCityGymReferenceCount,
} from "../../services/marketplaceSetupReference.service.js";

const CATEGORY_FIELDS = ["name", "slug", "type", "parentCategory", "icon", "description", "image", "count", "isActive", "order"];
const CATEGORY_UPDATE_FIELDS = ["name", "slug", "icon", "description", "image", "count", "isActive", "order"];
const CITY_FIELDS = ["name", "slug", "state", "country", "image", "isPopular", "isActive", "order"];

const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);
const normalizeSlug = (value) => typeof value === "string" ? value.trim().toLowerCase() : value;
const normalizeString = (value) => typeof value === "string" ? value.trim() : value;
const unsupported = (body, fields) => Object.keys(body || {}).filter((field) => !fields.includes(field)).sort();
const fieldError = (field, message) => ({ field, message });

function validationResponse(res, errors, unsupportedFields = []) {
  return res.status(400).json({
    success: false,
    message: unsupportedFields.length ? "Unsupported fields were submitted" : "Validation failed",
    ...(errors.length ? { errors } : {}),
    ...(unsupportedFields.length ? { unsupportedFields } : {}),
  });
}

function normalizeImage(image) {
  if (image === undefined) return undefined;
  if (!image || typeof image !== "object" || Array.isArray(image)) return null;
  const extra = Object.keys(image).filter((key) => !["url", "alt"].includes(key));
  if (extra.length) return null;
  if ((image.url !== undefined && typeof image.url !== "string") || (image.alt !== undefined && typeof image.alt !== "string")) return null;
  return { url: normalizeString(image.url || ""), alt: normalizeString(image.alt || "") };
}

async function slugConflict(Model, slug, excludeId) {
  if (!slug) return false;
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Boolean(await Model.exists(query));
}

async function categoryPayload(body, { creating = false, current = null } = {}) {
  const allowed = creating ? CATEGORY_FIELDS : CATEGORY_UPDATE_FIELDS;
  const badFields = unsupported(body, allowed);
  const errors = [];
  if (badFields.length) return { errors, unsupportedFields: badFields };

  const payload = {};
  for (const field of allowed) if (own(body, field)) payload[field] = body[field];
  for (const field of ["name", "slug", "icon", "description"]) if (own(payload, field)) payload[field] = normalizeString(payload[field]);
  if (own(payload, "slug")) payload.slug = normalizeSlug(payload.slug);
  if (creating) {
    if (!payload.name) errors.push(fieldError("name", "name is required"));
    if (!payload.slug) errors.push(fieldError("slug", "slug is required"));
    if (!["main", "subcategory"].includes(payload.type)) errors.push(fieldError("type", "type must be main or subcategory"));
  } else {
    if (own(payload, "name") && !payload.name) errors.push(fieldError("name", "name cannot be blank"));
    if (own(payload, "slug") && !payload.slug) errors.push(fieldError("slug", "slug cannot be blank"));
  }
  if (own(payload, "image")) {
    payload.image = normalizeImage(payload.image);
    if (!payload.image) errors.push(fieldError("image", "image may contain only url and alt strings"));
  }
  if (own(payload, "count") && (!Number.isFinite(payload.count) || payload.count < 0)) errors.push(fieldError("count", "count must be a non-negative number"));
  if (own(payload, "order") && !Number.isFinite(payload.order)) errors.push(fieldError("order", "order must be a number"));
  if (own(payload, "isActive") && typeof payload.isActive !== "boolean") errors.push(fieldError("isActive", "isActive must be a boolean"));

  if (creating && payload.type === "main") payload.parentCategory = null;
  if (creating && payload.type === "subcategory") {
    if (!mongoose.isValidObjectId(payload.parentCategory)) errors.push(fieldError("parentCategory", "a valid parentCategory is required"));
    else {
      const parent = await Category.findOne({ _id: payload.parentCategory, type: "main" }).lean();
      if (!parent) errors.push(fieldError("parentCategory", "parent main category was not found"));
    }
  }
  if (payload.slug && await slugConflict(Category, payload.slug, current?._id)) return { conflict: "A Category with this slug already exists" };
  return { payload, errors, unsupportedFields: [] };
}

async function cityPayload(body, current = null) {
  const badFields = unsupported(body, CITY_FIELDS);
  const errors = [];
  if (badFields.length) return { errors, unsupportedFields: badFields };
  const payload = {};
  for (const field of CITY_FIELDS) if (own(body, field)) payload[field] = body[field];
  for (const field of ["name", "slug", "state", "country"]) if (own(payload, field)) payload[field] = normalizeString(payload[field]);
  if (own(payload, "slug")) payload.slug = normalizeSlug(payload.slug);
  for (const field of ["name", "slug", "state"]) if (!current && !payload[field]) errors.push(fieldError(field, `${field} is required`));
  for (const field of ["name", "slug", "state"]) if (current && own(payload, field) && !payload[field]) errors.push(fieldError(field, `${field} cannot be blank`));
  if (own(payload, "image")) {
    payload.image = normalizeImage(payload.image);
    if (!payload.image) errors.push(fieldError("image", "image may contain only url and alt strings"));
  }
  for (const field of ["isPopular", "isActive"]) if (own(payload, field) && typeof payload[field] !== "boolean") errors.push(fieldError(field, `${field} must be a boolean`));
  if (own(payload, "order") && !Number.isFinite(payload.order)) errors.push(fieldError("order", "order must be a number"));
  if (payload.slug && await slugConflict(City, payload.slug, current?._id)) return { conflict: "A City with this slug already exists" };
  return { payload, errors, unsupportedFields: [] };
}

function invalidId(res, resource) {
  return res.status(400).json({ success: false, message: `Invalid ${resource} id` });
}

export async function getAdminCategories(req, res) {
  try {
    const categories = await Category.find({}).sort({ type: 1, order: 1, name: 1 }).lean();
    const mains = categories.filter((item) => item.type === "main" && !item.parentCategory);
    const data = mains.map((main) => ({ ...main, subcategories: categories.filter((item) => item.type === "subcategory" && String(item.parentCategory) === String(main._id)) }));
    const orphaned = categories.filter((item) => item.type === "subcategory" && !mains.some((main) => String(main._id) === String(item.parentCategory)));
    return res.status(200).json({ success: true, count: categories.length, data, orphaned });
  } catch (error) {
    console.error("Admin categories list error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Categories" });
  }
}

export async function getAdminCategoryById(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "Category");
    const category = await Category.findById(req.params.id).lean();
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    const references = await getCategoryReferenceImpact(category);
    return res.status(200).json({ success: true, data: { ...category, references } });
  } catch (error) {
    console.error("Admin Category detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Category" });
  }
}

export async function createAdminCategory(req, res) {
  try {
    const result = await categoryPayload(req.body, { creating: true });
    if (result.unsupportedFields?.length || result.errors?.length) return validationResponse(res, result.errors, result.unsupportedFields);
    if (result.conflict) return res.status(409).json({ success: false, message: result.conflict, field: "slug" });
    const category = await Category.create(result.payload);
    return res.status(201).json({ success: true, message: "Category created", data: category });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A Category with this slug already exists", field: "slug" });
    console.error("Admin Category create error:", error);
    return res.status(500).json({ success: false, message: "Failed to create Category" });
  }
}

export async function updateAdminCategory(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "Category");
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    const result = await categoryPayload(req.body, { current: category });
    if (result.unsupportedFields?.length || result.errors?.length) return validationResponse(res, result.errors, result.unsupportedFields);
    if (result.conflict) return res.status(409).json({ success: false, message: result.conflict, field: "slug" });
    const identityChanged = (own(result.payload, "name") && result.payload.name !== category.name) || (own(result.payload, "slug") && result.payload.slug !== category.slug);
    if (identityChanged) {
      const references = await getCategoryReferenceImpact(category);
      if (references.total > 0) return res.status(409).json({ success: false, message: "Referenced taxonomy identity cannot be renamed without a migration", references });
    }
    Object.assign(category, result.payload);
    await category.save();
    return res.status(200).json({ success: true, message: "Category updated", data: category });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A Category with this slug already exists", field: "slug" });
    console.error("Admin Category update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update Category" });
  }
}

export async function deleteAdminCategory(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "Category");
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });
    const references = await getCategoryReferenceImpact(category);
    if (references.total > 0) return res.status(409).json({ success: false, message: "Referenced Category cannot be deleted", references });
    await category.deleteOne();
    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Admin Category delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete Category" });
  }
}

export async function getAdminCities(req, res) {
  try {
    const cities = await City.aggregate([
      { $lookup: { from: "gyms", localField: "_id", foreignField: "city", as: "gymReferences" } },
      { $addFields: { gymCount: { $size: "$gymReferences" } } },
      { $project: { gymReferences: 0 } },
      { $sort: { order: 1, name: 1 } },
    ]);
    return res.status(200).json({ success: true, count: cities.length, data: cities });
  } catch (error) {
    console.error("Admin Cities list error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch Cities" });
  }
}

export async function getAdminCityById(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "City");
    const city = await City.findById(req.params.id).lean();
    if (!city) return res.status(404).json({ success: false, message: "City not found" });
    const gymCount = await getCityGymReferenceCount(city._id);
    return res.status(200).json({ success: true, data: { ...city, gymCount } });
  } catch (error) {
    console.error("Admin City detail error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch City" });
  }
}

export async function createAdminCity(req, res) {
  try {
    const result = await cityPayload(req.body);
    if (result.unsupportedFields?.length || result.errors?.length) return validationResponse(res, result.errors, result.unsupportedFields);
    if (result.conflict) return res.status(409).json({ success: false, message: result.conflict, field: "slug" });
    const city = await City.create(result.payload);
    return res.status(201).json({ success: true, message: "City created", data: city });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A City with this slug already exists", field: "slug" });
    console.error("Admin City create error:", error);
    return res.status(500).json({ success: false, message: "Failed to create City" });
  }
}

export async function updateAdminCity(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "City");
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ success: false, message: "City not found" });
    const result = await cityPayload(req.body, city);
    if (result.unsupportedFields?.length || result.errors?.length) return validationResponse(res, result.errors, result.unsupportedFields);
    if (result.conflict) return res.status(409).json({ success: false, message: result.conflict, field: "slug" });
    if (own(result.payload, "slug") && result.payload.slug !== city.slug) {
      const gymCount = await getCityGymReferenceCount(city._id);
      if (gymCount > 0) return res.status(409).json({ success: false, message: "A referenced City slug cannot change without redirect support", references: { gyms: gymCount } });
    }
    Object.assign(city, result.payload);
    await city.save();
    return res.status(200).json({ success: true, message: "City updated", data: city });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ success: false, message: "A City with this slug already exists", field: "slug" });
    console.error("Admin City update error:", error);
    return res.status(500).json({ success: false, message: "Failed to update City" });
  }
}

export async function deleteAdminCity(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res, "City");
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ success: false, message: "City not found" });
    const gymCount = await getCityGymReferenceCount(city._id);
    if (gymCount > 0) return res.status(409).json({ success: false, message: "A City referenced by Gyms cannot be deleted", references: { gyms: gymCount } });
    await city.deleteOne();
    return res.status(200).json({ success: true, message: "City deleted" });
  } catch (error) {
    console.error("Admin City delete error:", error);
    return res.status(500).json({ success: false, message: "Failed to delete City" });
  }
}
