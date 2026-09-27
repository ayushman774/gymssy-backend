import Category from "../models/categories/Category.js";

const changedFields = {
  gym: ["category", "tags"],
  trainer: ["category", "role"],
};

export function isTaxonomyChange(type, body = {}) {
  return (changedFields[type] || []).some((field) => body[field] !== undefined);
}

export async function validateAndNormalizeListingTaxonomy({ type, candidate, model }) {
  if (!changedFields[type]) return { normalized: {}, errors: [] };
  const rawCategory = candidate.category ?? model?.schema?.path("category")?.defaultValue;
  if (!rawCategory || typeof rawCategory !== "string") return { normalized: {}, errors: [{ field: "category", message: "category must match an active main category" }] };
  const normalizedInput = rawCategory.trim();
  const main = await Category.findOne({ type: "main", parentCategory: null, isActive: true, $or: [{ name: normalizedInput }, { slug: normalizedInput.toLowerCase() }] }).lean();
  if (!main) return { normalized: {}, errors: [{ field: "category", message: "category must match an active main category" }] };
  const subs = await Category.find({ type: "subcategory", parentCategory: main._id, isActive: true }).lean();
  const names = new Set(subs.map((item) => item.name));
  if (type === "gym") {
    const tags = candidate.tags ?? [];
    if (!Array.isArray(tags) || tags.some((tag) => typeof tag !== "string")) return { normalized: {}, errors: [{ field: "tags", message: "tags must be an array of subcategory names" }] };
    const trimmed = tags.map((tag) => tag.trim());
    if (new Set(trimmed).size !== trimmed.length) return { normalized: {}, errors: [{ field: "tags", message: "tags must not contain duplicates" }] };
    const invalid = trimmed.filter((tag) => !names.has(tag));
    if (invalid.length) return { normalized: {}, errors: [{ field: "tags", message: `tags must belong to ${main.name}`, invalidValues: invalid }] };
    return { normalized: { category: main.name, tags: trimmed }, errors: [] };
  }
  const role = candidate.role;
  if (typeof role !== "string" || !names.has(role.trim())) return { normalized: {}, errors: [{ field: "role", message: `role must be an active subcategory of ${main.name}` }] };
  return { normalized: { category: main.slug, role: role.trim() }, errors: [] };
}
