import Category from "../../models/categories/Category.js";
import City from "../../models/cities/City.js";
import Gym from "../../models/gyms/Gym.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import Trainer from "../../models/trainers/Trainer.js";
import User from "../../models/users/User.js";
import {
  MARKETPLACE_LISTING_TYPES,
  buildMarketplaceListingTypeFilter,
  buildMarketplaceTaxonomyFilter,
  combineMarketplaceFilters,
  getMarketplaceClassification,
} from "../../utils/marketplaceClassification.js";
import { withPublicListingVisibility } from "../../utils/publicListing.js";
import { escapeRegex } from "../../utils/regex.js";

const ALLOWED_QUERY_FIELDS = new Set(["search", "category", "subcategory", "type", "entity", "city", "page", "limit", "sort", "lat", "lng", "radius"]);
const ALLOWED_SORTS = new Set(["recommended", "rating", "reviews", "newest"]);
const MAX_SEARCH_LENGTH = 100;
const MAX_LIMIT = 50;
const MAX_PAGE = 1000;
const DEFAULT_RADIUS_KM = 10;
const MIN_RADIUS_KM = 0.1;
const MAX_RADIUS_KM = 100;

export const DISCOVERY_MODEL_TARGETS = Object.freeze([
  { model: Gym, modelType: "gym", rank: 0, fields: "name slug owner category tags location.area location.state images.cover verified rating reviewCount featured priceFrom city createdAt" },
  { model: Trainer, modelType: "trainer", rank: 1, fields: "name slug owner category role specialty experience image isVerified rating reviews featured createdAt" },
  { model: Nutritionist, modelType: "nutritionist", rank: 2, fields: "name slug owner role specialty experience image isVerified rating reviews featured createdAt" },
]);

function validationError(res, message, field, details = {}) {
  return res.status(400).json({ success: false, message, errors: [{ field, message }], ...details });
}

function parsePositiveInteger(value, fallback, { field, max }) {
  if (value === undefined || value === "") return { value: fallback };
  if (Array.isArray(value) || !/^\d+$/.test(String(value))) return { error: `${field} must be a positive integer` };
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max && parsed > max)) {
    return { error: max ? `${field} must be between 1 and ${max}` : `${field} must be a positive integer` };
  }
  return { value: parsed };
}

function normalizedQueryValue(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function buildSearchFilter(modelType, search) {
  if (!search) return {};
  const expression = new RegExp(escapeRegex(search), "i");
  const fields = modelType === "gym"
    ? ["name", "category", "tags", "location.area", "location.city", "description", "highlights"]
    : ["name", "role", "specialty", "specializations", "bio"];
  return { $or: fields.map((field) => ({ [field]: expression })) };
}

function mongoSort(modelType, sort) {
  if (sort === "newest") return { createdAt: -1, _id: 1 };
  if (sort === "rating") return { rating: -1, [modelType === "gym" ? "reviewCount" : "reviews"]: -1, createdAt: -1, _id: 1 };
  if (sort === "reviews") return { [modelType === "gym" ? "reviewCount" : "reviews"]: -1, rating: -1, createdAt: -1, _id: 1 };
  return { featured: -1, rating: -1, [modelType === "gym" ? "reviewCount" : "reviews"]: -1, createdAt: -1, _id: 1 };
}

function comparePrimitive(left, right, direction = -1) {
  if (left === right) return 0;
  return left > right ? direction : -direction;
}

function compareDiscoveryResults(left, right, sort) {
  const fields = sort === "newest"
    ? [["createdAtValue", -1]]
    : sort === "rating"
      ? [["rating", -1], ["reviewCount", -1], ["createdAtValue", -1]]
      : sort === "reviews"
        ? [["reviewCount", -1], ["rating", -1], ["createdAtValue", -1]]
        : [["featured", -1], ["rating", -1], ["reviewCount", -1], ["createdAtValue", -1]];
  for (const [field, direction] of fields) {
    const comparison = comparePrimitive(left[field], right[field], direction);
    if (comparison) return comparison;
  }
  return left.modelRank - right.modelRank || String(left.id).localeCompare(String(right.id));
}

function taxonomySubcategorySlugs(doc, modelType, classification, taxonomy) {
  if (modelType === "nutritionist") return ["nutrition"];
  const slugs = [];
  if (modelType === "trainer" && classification.mainCategory === "fitness" && classification.listingType === "trainer") {
    slugs.push("personal-trainers");
  }
  const values = modelType === "gym" ? doc.tags || [] : doc.role ? [doc.role] : [];
  const categoryMap = taxonomy.get(classification.mainCategory);
  for (const value of values) {
    const slug = categoryMap?.get(String(value).toLowerCase());
    if (slug && !slugs.includes(slug)) slugs.push(slug);
  }
  return slugs;
}

export function normalizeDiscoveryResult(doc, target, taxonomy) {
  const classification = getMarketplaceClassification(doc, target.modelType);
  const isGym = target.modelType === "gym";
  const image = isGym
    ? { url: doc.images?.cover || "", alt: doc.images?.gallery?.[0]?.alt || doc.name || "" }
    : { url: doc.image?.src || "", alt: doc.image?.alt || doc.name || "" };
  const city = isGym && doc.city && typeof doc.city === "object"
    ? { id: String(doc.city._id), name: doc.city.name, slug: doc.city.slug, state: doc.city.state, country: doc.city.country }
    : null;
  const result = {
    id: String(doc._id),
    slug: doc.slug,
    entityType: classification.listingType,
    mainCategory: classification.mainCategory,
    subcategories: taxonomySubcategorySlugs(doc, target.modelType, classification, taxonomy),
    name: doc.name,
    image,
    rating: doc.rating ?? 0,
    reviewCount: isGym ? doc.reviewCount ?? 0 : doc.reviews ?? 0,
    verified: isGym ? Boolean(doc.verified) : Boolean(doc.isVerified),
    featured: Boolean(doc.featured),
    location: isGym ? { city, area: doc.location?.area || "", state: doc.location?.state || city?.state || "" } : null,
    price: isGym && Number.isFinite(doc.priceFrom) && doc.priceFrom > 0 ? { from: doc.priceFrom, currency: "₹" } : null,
    summary: isGym
      ? { category: doc.category || "", tags: Array.isArray(doc.tags) ? doc.tags : [] }
      : { role: doc.role || "", specialty: doc.specialty || "", experience: doc.experience || "" },
    href: target.modelType === "gym"
      ? `/gym-detail/${doc.slug}`
      : target.modelType === "nutritionist"
        ? `/nutritionists/${doc.slug}`
        : `/trainers/${doc.slug}`,
  };
  if (isGym && Number.isFinite(doc.distanceMeters)) {
    result.distance = { value: Math.round((doc.distanceMeters / 1000) * 10) / 10, unit: "km" };
  }
  Object.defineProperties(result, {
    createdAtValue: { value: doc.createdAt ? new Date(doc.createdAt).getTime() : 0 },
    modelRank: { value: target.rank },
  });
  return result;
}

function parseFiniteQueryNumber(value, field) {
  if (value === undefined || value === "") return { missing: true };
  if (Array.isArray(value) || typeof value !== "string" || value.trim() === "" || !Number.isFinite(Number(value))) {
    return { error: `${field} must be a finite number` };
  }
  return { value: Number(value) };
}

export function buildNearbyPipeline({ filter, latitude, longitude, radiusKm, sort, explicitSort, skip, limit }) {
  const resultSort = explicitSort ? mongoSort("gym", sort) : { distanceMeters: 1, _id: 1 };
  return [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        key: "geoLocation",
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: filter,
      },
    },
    { $sort: resultSort },
    {
      $facet: {
        docs: [{ $skip: skip }, { $limit: limit }],
        metadata: [{ $count: "total" }],
      },
    },
  ];
}

export async function loadDiscoveryClassificationContext() {
  const providerTypes = [...new Set(Object.values(MARKETPLACE_LISTING_TYPES).flatMap((config) => config.providerTypes))];
  const [owners, categories] = await Promise.all([
    User.find({ role: "business", providerType: { $in: providerTypes } }).select("_id providerType").lean(),
    Category.find({ isActive: true }).lean(),
  ]);
  const ownerIdsByProviderType = Object.fromEntries(providerTypes.map((providerType) => [providerType, []]));
  for (const owner of owners) ownerIdsByProviderType[owner.providerType]?.push(owner._id);
  const recognizedOwnerIdsByModel = {
    gym: Object.values(MARKETPLACE_LISTING_TYPES).filter((config) => config.modelType === "gym").flatMap((config) => config.providerTypes.flatMap((providerType) => ownerIdsByProviderType[providerType])),
    trainer: Object.values(MARKETPLACE_LISTING_TYPES).filter((config) => config.modelType === "trainer").flatMap((config) => config.providerTypes.flatMap((providerType) => ownerIdsByProviderType[providerType])),
  };
  const mainCategories = categories.filter((item) => item.type === "main" && !item.parentCategory);
  const mainBySlug = new Map(mainCategories.map((item) => [item.slug, item]));
  const subcategories = categories.filter((item) => item.type === "subcategory");
  return { ownerIdsByProviderType, recognizedOwnerIdsByModel, mainCategories, mainBySlug, subcategories };
}

export function buildDiscoveryTaxonomyMap(context) {
  const result = new Map(context.mainCategories.map((main) => [main.slug, new Map()]));
  const mainSlugById = new Map(context.mainCategories.map((main) => [String(main._id), main.slug]));
  for (const subcategory of context.subcategories) {
    const mainSlug = mainSlugById.get(String(subcategory.parentCategory));
    if (mainSlug) result.get(mainSlug)?.set(subcategory.name.toLowerCase(), subcategory.slug);
  }
  return result;
}

export const getDiscoveryListings = async (req, res) => {
  let diagnosticContext = {
    search: "",
    category: "",
    subcategory: "",
    type: "",
    entity: "",
    city: "",
    sort: "recommended",
    page: 1,
    limit: 20,
    latitude: null,
    longitude: null,
    radiusKm: null,
  };
  try {
    const unsupportedFields = Object.keys(req.query).filter((field) => !ALLOWED_QUERY_FIELDS.has(field));
    if (unsupportedFields.length) return validationError(res, "Unsupported discovery query fields", "query", { unsupportedFields });
    for (const [field, value] of Object.entries(req.query)) {
      if (Array.isArray(value)) return validationError(res, `${field} must be supplied once`, field);
    }

    const pageResult = parsePositiveInteger(req.query.page, 1, { field: "page", max: MAX_PAGE });
    if (pageResult.error) return validationError(res, pageResult.error, "page");
    const limitResult = parsePositiveInteger(req.query.limit, 20, { field: "limit", max: MAX_LIMIT });
    if (limitResult.error) return validationError(res, limitResult.error, "limit");
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search.length > MAX_SEARCH_LENGTH) return validationError(res, `search must not exceed ${MAX_SEARCH_LENGTH} characters`, "search");

    const categorySlug = normalizedQueryValue(req.query.category);
    const subcategorySlug = normalizedQueryValue(req.query.subcategory);
    const listingType = normalizedQueryValue(req.query.type);
    const entity = normalizedQueryValue(req.query.entity);
    const citySlug = normalizedQueryValue(req.query.city);
    const sort = normalizedQueryValue(req.query.sort) || "recommended";
    const explicitSort = typeof req.query.sort === "string" && req.query.sort.trim() !== "";
    const latitudeResult = parseFiniteQueryNumber(req.query.lat, "lat");
    const longitudeResult = parseFiniteQueryNumber(req.query.lng, "lng");
    const hasLatitude = !latitudeResult.missing;
    const hasLongitude = !longitudeResult.missing;
    if (latitudeResult.error) return validationError(res, latitudeResult.error, "lat");
    if (longitudeResult.error) return validationError(res, longitudeResult.error, "lng");
    if (hasLatitude !== hasLongitude) return validationError(res, "lat and lng must be supplied together", hasLatitude ? "lng" : "lat");
    if (hasLatitude && (latitudeResult.value < -90 || latitudeResult.value > 90)) return validationError(res, "lat must be between -90 and 90", "lat");
    if (hasLongitude && (longitudeResult.value < -180 || longitudeResult.value > 180)) return validationError(res, "lng must be between -180 and 180", "lng");
    const hasCoordinates = hasLatitude && hasLongitude;
    const radiusResult = parseFiniteQueryNumber(req.query.radius, "radius");
    if (radiusResult.error) return validationError(res, radiusResult.error, "radius");
    if (!hasCoordinates && !radiusResult.missing) return validationError(res, "radius requires lat and lng", "radius");
    const radiusKm = radiusResult.missing ? DEFAULT_RADIUS_KM : radiusResult.value;
    if (hasCoordinates && (radiusKm < MIN_RADIUS_KM || radiusKm > MAX_RADIUS_KM)) {
      return validationError(res, `radius must be between ${MIN_RADIUS_KM} and ${MAX_RADIUS_KM} kilometers`, "radius");
    }
    diagnosticContext = {
      search,
      category: categorySlug,
      subcategory: subcategorySlug,
      type: listingType,
      entity,
      city: citySlug,
      sort,
      page: pageResult.value,
      limit: limitResult.value,
      latitude: hasCoordinates ? latitudeResult.value : null,
      longitude: hasCoordinates ? longitudeResult.value : null,
      radiusKm: hasCoordinates ? radiusKm : null,
    };
    if (listingType && !MARKETPLACE_LISTING_TYPES[listingType]) return validationError(res, "Invalid listing type", "type");
    if (entity && entity !== "venue") return validationError(res, "Invalid entity. Allowed value: venue", "entity");
    if (entity === "venue" && listingType && MARKETPLACE_LISTING_TYPES[listingType].modelType !== "gym") {
      return validationError(res, "Venue discovery supports only Gym-model listing types", "type");
    }
    if (!ALLOWED_SORTS.has(sort)) return validationError(res, `Invalid sort. Allowed values: ${[...ALLOWED_SORTS].join(", ")}`, "sort");

    const context = await loadDiscoveryClassificationContext();
    let mainCategory = categorySlug ? context.mainBySlug.get(categorySlug) : null;
    if (categorySlug && !mainCategory) return validationError(res, "Unknown or inactive marketplace category", "category");
    let selectedSubcategory = null;
    if (subcategorySlug) {
      selectedSubcategory = context.subcategories.find((item) => item.slug === subcategorySlug);
      if (!selectedSubcategory) return validationError(res, "Unknown or inactive marketplace subcategory", "subcategory");
      const parent = context.mainCategories.find((item) => String(item._id) === String(selectedSubcategory.parentCategory));
      if (!parent) return validationError(res, "Marketplace subcategory has no active parent category", "subcategory");
      if (mainCategory && String(selectedSubcategory.parentCategory) !== String(mainCategory._id)) {
        return validationError(res, `Subcategory ${subcategorySlug} does not belong to ${categorySlug}`, "subcategory");
      }
      mainCategory ||= parent;
    }

    const fixedTypeCategory = { fitness_centre: "fitness", wellness_centre: "wellness", sports_academy: "sports", nutritionist: "wellness" }[listingType];
    if (mainCategory && fixedTypeCategory && mainCategory.slug !== fixedTypeCategory) {
      return validationError(res, `${listingType} listings cannot belong to ${mainCategory.slug}`, "type");
    }
    if (listingType === "nutritionist" && selectedSubcategory && selectedSubcategory.slug !== "nutrition") {
      return validationError(res, "Nutritionists are classified only under Wellness / Nutrition", "subcategory");
    }

    let city = null;
    if (citySlug) {
      if (listingType && MARKETPLACE_LISTING_TYPES[listingType].modelType !== "gym") {
        return validationError(res, "City filtering is only supported for Gym-model listings", "city");
      }
      city = await City.findOne({ slug: citySlug, isActive: true }).lean();
      if (!city) return validationError(res, "Unknown or inactive city", "city");
    }

    const requestedModelType = listingType ? MARKETPLACE_LISTING_TYPES[listingType].modelType : null;
    if (hasCoordinates && requestedModelType && requestedModelType !== "gym") {
      return validationError(res, "Nearby discovery supports only physical venue listings", "type");
    }
    const targets = DISCOVERY_MODEL_TARGETS.filter((target) => (!requestedModelType || target.modelType === requestedModelType) && (!city || target.modelType === "gym") && (entity !== "venue" || target.modelType === "gym") && (!hasCoordinates || target.modelType === "gym"));
    const fetchLimit = (pageResult.value - 1) * limitResult.value + limitResult.value;
    const skip = (pageResult.value - 1) * limitResult.value;
    const queryResults = await Promise.all(targets.map(async (target) => {
      const typeFilter = buildMarketplaceListingTypeFilter({ listingType, modelType: target.modelType, ...context });
      if (typeFilter === null) return { target, total: 0, docs: [] };
      const taxonomyFilter = mainCategory
        ? buildMarketplaceTaxonomyFilter({ modelType: target.modelType, categorySlug: mainCategory.slug, mainCategory, selectedSubcategory, activeMainCategories: context.mainCategories, ownerIdsByProviderType: context.ownerIdsByProviderType })
        : {};
      if (taxonomyFilter === null) return { target, total: 0, docs: [] };
      const operationalFilter = withPublicListingVisibility(city ? { city: city._id } : {});
      const filter = combineMarketplaceFilters(operationalFilter, typeFilter, taxonomyFilter, buildSearchFilter(target.modelType, search));
      if (hasCoordinates) {
        const [aggregation = { docs: [], metadata: [] }] = await target.model.aggregate(buildNearbyPipeline({
          filter,
          latitude: latitudeResult.value,
          longitude: longitudeResult.value,
          radiusKm,
          sort,
          explicitSort,
          skip,
          limit: limitResult.value,
        }));
        const docs = await target.model.populate(aggregation.docs || [], [
          { path: "owner", select: "providerType" },
          { path: "city", select: "name slug state country" },
        ]);
        return { target, docs, total: aggregation.metadata?.[0]?.total || 0 };
      }
      const query = target.model.find(filter).select(target.fields).populate("owner", "providerType");
      if (target.modelType === "gym") query.populate("city", "name slug state country");
      const [docs, total] = await Promise.all([
        query.sort(mongoSort(target.modelType, sort)).limit(fetchLimit).lean(),
        target.model.countDocuments(filter),
      ]);
      return { target, docs, total };
    }));

    const taxonomy = buildDiscoveryTaxonomyMap(context);
    const normalizedResults = queryResults
      .flatMap(({ docs, target }) => docs.map((doc) => normalizeDiscoveryResult(doc, target, taxonomy)));
    const merged = hasCoordinates && !explicitSort
      ? normalizedResults
      : normalizedResults.sort((left, right) => compareDiscoveryResults(left, right, sort));
    const total = queryResults.reduce((sum, result) => sum + result.total, 0);
    const pageData = hasCoordinates ? merged : merged.slice(skip, skip + limitResult.value);

    return res.status(200).json({
      success: true,
      data: pageData,
      pagination: {
        page: pageResult.value,
        limit: limitResult.value,
        total,
        totalPages: Math.ceil(total / limitResult.value),
      },
    });
  } catch (error) {
    console.error("Discovery request failed", {
      ...diagnosticContext,
      error: error?.message || "Unknown error",
    }, error);
    return res.status(500).json({ success: false, message: "Failed to discover marketplace listings" });
  }
};

export const DISCOVERY_LIMITS = Object.freeze({
  maxPage: MAX_PAGE,
  maxLimit: MAX_LIMIT,
  maxSearchLength: MAX_SEARCH_LENGTH,
  defaultRadiusKm: DEFAULT_RADIUS_KM,
  minRadiusKm: MIN_RADIUS_KM,
  maxRadiusKm: MAX_RADIUS_KM,
});
