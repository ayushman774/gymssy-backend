import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";
import City from "../../models/cities/City.js";

/*
|--------------------------------------------------------------------------
| Provider Type -> Listing Model
|--------------------------------------------------------------------------
*/

const getListingConfig = (providerType) => {
  switch (providerType) {
    case "trainer":
    case "coach":
      return {
        model: Trainer,
        type: "trainer",
      };

    case "nutritionist":
      return {
        model: Nutritionist,
        type: "nutritionist",
      };

    case "gym_owner":
    case "fitness_centre_owner":
    case "wellness_centre_owner":
    case "sports_academy_owner":
    case "studio_owner":
      return {
        model: Gym,
        type: "gym",
      };

    case "other":
    default:
      return null;
  }
};

/*
|--------------------------------------------------------------------------
| Fields Provider Is Allowed To Create / Update
|--------------------------------------------------------------------------
|
| System-controlled fields such as owner, verification, ratings,
| featured status and activation status are intentionally excluded.
|--------------------------------------------------------------------------
*/

const GYM_CREATE_FIELDS = [
  "name",
  "slug",
  "category",
  "tags",
  "location",
  "coordinates",
  "phone",
  "email",
  "website",
  "description",
  "highlights",
  "priceFrom",
  "openNow",
  "images",
  "facilities",
  "memberships",
  "trainers",
  "classes",
  "timings",
  "city",
];

const GYM_UPDATE_FIELDS = [...GYM_CREATE_FIELDS];

const TRAINER_CREATE_FIELDS = [
  "name",
  "slug",
  "category",
  "role",
  "specialty",
  "experience",
  "sessions",
  "clients",
  "certifications",
  "specializations",
  "bio",
  "available",
  "image",
  "social",
  "href",
];

const TRAINER_UPDATE_FIELDS = [...TRAINER_CREATE_FIELDS];

const NUTRITIONIST_CREATE_FIELDS = [
  "name",
  "slug",
  "role",
  "specialty",
  "experience",
  "sessions",
  "clients",
  "certifications",
  "specializations",
  "bio",
  "available",
  "image",
  "social",
  "href",
];

const NUTRITIONIST_UPDATE_FIELDS = [...NUTRITIONIST_CREATE_FIELDS];

const REQUIRED_FIELDS = {
  gym: ["name", "slug", "category", "city"],
  trainer: [
    "name",
    "slug",
    "role",
    "specialty",
    "experience",
    "sessions",
    "clients",
  ],
  nutritionist: [
    "name",
    "slug",
    "role",
    "specialty",
    "experience",
    "sessions",
    "clients",
  ],
};

const FIELD_CONTRACTS = {
  gym: {
    create: GYM_CREATE_FIELDS,
    update: GYM_UPDATE_FIELDS,
  },
  trainer: {
    create: TRAINER_CREATE_FIELDS,
    update: TRAINER_UPDATE_FIELDS,
  },
  nutritionist: {
    create: NUTRITIONIST_CREATE_FIELDS,
    update: NUTRITIONIST_UPDATE_FIELDS,
  },
};

/*
|--------------------------------------------------------------------------
| Pick Only Allowed Fields
|--------------------------------------------------------------------------
*/

const pickAllowedFields = (body, allowedFields) => {
  const data = {};

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  return data;
};

const getUnsupportedFields = (body, allowedFields) => {
  const allowed = new Set(allowedFields);
  return Object.keys(body || {}).filter((field) => !allowed.has(field));
};

const normalizeRequiredStrings = (data, requiredFields) => {
  for (const field of requiredFields) {
    if (field === "city" || data[field] === undefined) continue;

    if (typeof data[field] === "string") {
      data[field] = data[field].trim();
      if (field === "slug") data[field] = data[field].toLowerCase();
    }
  }

  return data;
};

const getRequiredFieldErrors = (data, requiredFields) =>
  requiredFields.flatMap((field) => {
    const value = data[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === "string" && value.trim() === "");

    return missing
      ? [{ field, message: `${field} is required` }]
      : [];
  });

const sendValidationError = (res, errors) =>
  res.status(400).json({
    success: false,
    message: "Listing validation failed",
    errors,
  });

const sendUnsupportedFieldsError = (res, unsupportedFields) =>
  res.status(400).json({
    success: false,
    message: "Unsupported listing fields were submitted",
    unsupportedFields,
  });

const validateGymCity = async (city) => {
  if (!mongoose.Types.ObjectId.isValid(city)) {
    return { field: "city", message: "city must be a valid MongoDB ObjectId" };
  }

  const cityExists = await City.exists({ _id: city });
  if (!cityExists) {
    return { field: "city", message: "Referenced city does not exist" };
  }

  return null;
};

const slugExists = async (model, slug, excludeId = null) => {
  const query = { slug };
  if (excludeId) query._id = { $ne: excludeId };
  return Boolean(await model.exists(query));
};

const getMongooseValidationErrors = (error) =>
  Object.values(error.errors).map((validationError) => ({
    field: validationError.path,
    message: validationError.message,
  }));

export class ListingContractError extends Error {
  constructor(statusCode, payload) {
    super(payload.message);
    this.statusCode = statusCode;
    this.payload = payload;
  }
}

export const getListingUpdateUnsupportedFields = (type, body) =>
  getUnsupportedFields(body, FIELD_CONTRACTS[type]?.update || []);

export const prepareListingContentUpdate = async ({ model, type, listing, body }) => {
  const allowedFields = FIELD_CONTRACTS[type]?.update;
  if (!allowedFields) {
    throw new ListingContractError(400, { success: false, message: "Unsupported listing type" });
  }
  const unsupportedFields = getListingUpdateUnsupportedFields(type, body);
  if (unsupportedFields.length) {
    throw new ListingContractError(400, {
      success: false,
      message: "Unsupported listing fields were submitted",
      unsupportedFields,
    });
  }
  const updates = pickAllowedFields(body, allowedFields);
  if (!Object.keys(updates).length) {
    throw new ListingContractError(400, { success: false, message: "No valid listing fields provided for update" });
  }
  const requiredFields = REQUIRED_FIELDS[type];
  normalizeRequiredStrings(updates, requiredFields);
  const candidate = Object.fromEntries(requiredFields.map((field) => [
    field, updates[field] !== undefined ? updates[field] : listing[field],
  ]));
  const validationErrors = getRequiredFieldErrors(candidate, requiredFields);
  if (validationErrors.length) {
    throw new ListingContractError(400, { success: false, message: "Listing validation failed", errors: validationErrors });
  }
  if (type === "gym" && updates.city !== undefined) {
    const cityError = await validateGymCity(updates.city);
    if (cityError) throw new ListingContractError(400, { success: false, message: "Listing validation failed", errors: [cityError] });
  }
  if (updates.slug !== undefined && updates.slug !== listing.slug && await slugExists(model, updates.slug, listing._id)) {
    throw new ListingContractError(409, { success: false, message: "A listing with this slug already exists", field: "slug" });
  }
  if (updates.image) updates.image = { ...(listing.image?.toObject?.() || listing.image || {}), ...updates.image };
  if (updates.social) updates.social = { ...(listing.social?.toObject?.() || listing.social || {}), ...updates.social };
  if (type === "gym") {
    for (const field of ["location", "coordinates", "images"]) {
      if (updates[field] !== undefined) {
        const existing = listing[field]?.toObject?.() || listing[field] || {};
        updates[field] = { ...existing, ...updates[field] };
      }
    }
  }
  return updates;
};

export const prepareProviderOwnedListing = async ({
  providerType,
  ownerId,
  body,
}) => {
  const config = getListingConfig(providerType);
  if (!config) {
    throw new ListingContractError(400, {
      success: false,
      message: "This provider type does not have a supported marketplace listing",
    });
  }

  const allowedFields = FIELD_CONTRACTS[config.type].create;
  const unsupportedFields = getUnsupportedFields(body, allowedFields);
  if (unsupportedFields.length > 0) {
    throw new ListingContractError(400, {
      success: false,
      message: "Unsupported listing fields were submitted",
      unsupportedFields,
    });
  }

  const listingData = pickAllowedFields(body, allowedFields);
  const requiredFields = REQUIRED_FIELDS[config.type];
  normalizeRequiredStrings(listingData, requiredFields);
  const validationErrors = getRequiredFieldErrors(listingData, requiredFields);
  if (validationErrors.length > 0) {
    throw new ListingContractError(400, {
      success: false,
      message: "Listing validation failed",
      errors: validationErrors,
    });
  }

  if (config.type === "gym") {
    const cityError = await validateGymCity(listingData.city);
    if (cityError) {
      throw new ListingContractError(400, {
        success: false,
        message: "Listing validation failed",
        errors: [cityError],
      });
    }
  }

  if (await slugExists(config.model, listingData.slug)) {
    throw new ListingContractError(409, {
      success: false,
      message: "A listing with this slug already exists",
      field: "slug",
    });
  }

  if (config.type === "trainer" || config.type === "nutritionist") {
    listingData.id = `${config.type}-${randomUUID()}`;
  }

  listingData.owner = ownerId;
  listingData.featured = false;
  listingData.isActive = true;
  listingData.moderationStatus = "pending";

  if (config.type === "gym") listingData.verified = false;
  else listingData.isVerified = false;

  return { config, listingData };
};

/*
|--------------------------------------------------------------------------
| CREATE PROVIDER LISTING
|--------------------------------------------------------------------------
|
| POST /api/providers/listings
|
| Provider type is taken from the authenticated user.
|
| owner is ALWAYS assigned from req.user.id.
| It is NEVER accepted from req.body.
|--------------------------------------------------------------------------
*/

export const createProviderListing = async (req, res) => {
  try {
    const { config, listingData } = await prepareProviderOwnedListing({
      providerType: req.user.providerType,
      ownerId: req.user.id,
      body: req.body,
    });

    /*
    |--------------------------------------------------------------------------
    | Create listing
    |--------------------------------------------------------------------------
    */

    const listing = await config.model.create(listingData);

    return res.status(201).json({
      success: true,
      message: "Marketplace listing created successfully",
      data: {
        type: config.type,
        providerType: req.user.providerType,
        listing,
      },
    });
  } catch (error) {
    if (error instanceof ListingContractError) {
      return res.status(error.statusCode).json(error.payload);
    }

    console.error("Create provider listing error:", error);

    /*
    |--------------------------------------------------------------------------
    | Duplicate key
    |--------------------------------------------------------------------------
    */

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A listing with the same unique identifier already exists",
        error: error.keyValue || null,
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Mongoose validation
    |--------------------------------------------------------------------------
    */

    if (error.name === "ValidationError") {
      return sendValidationError(res, getMongooseValidationErrors(error));
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create marketplace listing",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET MY LISTINGS
|--------------------------------------------------------------------------
|
| GET /api/providers/listings
|
| Provider sees ONLY listings owned by their account.
|--------------------------------------------------------------------------
*/

export const getMyProviderListings = async (req, res) => {
  try {
    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "This provider type does not have a supported listing type",
      });
    }

    const listings = await config.model
      .find({
        owner: req.user.id,
      })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        type: config.type,
        providerType: req.user.providerType,
        count: listings.length,
        listings,
      },
    });
  } catch (error) {
    console.error("Get provider listings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider listings",
    });
  }
};

/*
|--------------------------------------------------------------------------
| GET SINGLE MY LISTING
|--------------------------------------------------------------------------
|
| GET /api/providers/listings/:id
|
| Ownership is ALWAYS checked.
|--------------------------------------------------------------------------
*/

export const getMyProviderListingById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "This provider type does not have a supported listing type",
      });
    }

    const listing = await config.model
      .findOne({
        _id: req.params.id,
        owner: req.user.id,
      })
      .lean();

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or you do not have access to it",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        type: config.type,
        providerType: req.user.providerType,
        listing,
      },
    });
  } catch (error) {
    console.error("Get provider listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch provider listing",
    });
  }
};

/*
|--------------------------------------------------------------------------
| UPDATE MY LISTING
|--------------------------------------------------------------------------
|
| PUT /api/providers/listings/:id
|
| Provider can update only provider-editable fields.
|--------------------------------------------------------------------------
*/

export const updateMyProviderListing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "This provider type does not have a supported listing type",
      });
    }

    const unsupportedFields = getListingUpdateUnsupportedFields(config.type, req.body);
    if (unsupportedFields.length) return sendUnsupportedFieldsError(res, unsupportedFields);

    /*
    |--------------------------------------------------------------------------
    | Ownership protection
    |--------------------------------------------------------------------------
    */

    const listing = await config.model.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or you do not have access to it",
      });
    }

    const updates = await prepareListingContentUpdate({ model: config.model, type: config.type, listing, body: req.body });

    Object.assign(listing, updates);

    await listing.save();

    return res.status(200).json({
      success: true,
      message: "Listing updated successfully",
      data: {
        type: config.type,
        providerType: req.user.providerType,
        listing,
      },
    });
  } catch (error) {
    if (error instanceof ListingContractError) return res.status(error.statusCode).json(error.payload);
    console.error("Update provider listing error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A listing with the same unique identifier already exists",
        error: error.keyValue || null,
      });
    }

    if (error.name === "ValidationError") {
      return sendValidationError(res, getMongooseValidationErrors(error));
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update listing",
    });
  }
};

/*
|--------------------------------------------------------------------------
| DELETE MY LISTING
|--------------------------------------------------------------------------
|
| DELETE /api/providers/listings/:id
|
| Provider can delete/deactivate their own listing.
| We use soft deletion (isActive: false) to preserve history/references,
| matching the platform's existing convention for deactivated entities.
|--------------------------------------------------------------------------
*/

export const deleteMyProviderListing = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid listing ID format",
      });
    }

    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "This provider type does not have a supported listing type",
      });
    }

    const listing = await config.model.findOne({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found or you do not have access to it",
      });
    }

    // Soft delete by setting isActive to false
    listing.isActive = false;
    await listing.save();

    return res.status(200).json({
      success: true,
      message: "Listing deactivated successfully",
    });
  } catch (error) {
    console.error("Delete provider listing error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to deactivate listing",
    });
  }
};
