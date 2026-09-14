import Gym from "../../models/gyms/Gym.js";
import Trainer from "../../models/trainers/Trainer.js";
import Nutritionist from "../../models/nutritionists/Nutritionist.js";

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

const GYM_ALLOWED_FIELDS = [
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

const TRAINER_ALLOWED_FIELDS = [
  "id",
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

const NUTRITIONIST_ALLOWED_FIELDS = [
  "id",
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
    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message:
          "This provider type does not have a supported marketplace listing",
      });
    }

    let allowedFields = [];

    if (config.type === "gym") {
      allowedFields = GYM_ALLOWED_FIELDS;
    }

    if (config.type === "trainer") {
      allowedFields = TRAINER_ALLOWED_FIELDS;
    }

    if (config.type === "nutritionist") {
      allowedFields = NUTRITIONIST_ALLOWED_FIELDS;
    }

    const listingData = pickAllowedFields(req.body, allowedFields);

    /*
    |--------------------------------------------------------------------------
    | Basic validation
    |--------------------------------------------------------------------------
    */

    if (!listingData.name || !String(listingData.name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Listing name is required",
      });
    }

    listingData.name = String(listingData.name).trim();

    /*
    |--------------------------------------------------------------------------
    | Gym validation
    |--------------------------------------------------------------------------
    */

    if (config.type === "gym") {
      if (!listingData.slug || !String(listingData.slug).trim()) {
        return res.status(400).json({
          success: false,
          message: "Listing slug is required",
        });
      }

      listingData.slug = String(listingData.slug).trim().toLowerCase();

      if (!listingData.category || !String(listingData.category).trim()) {
        return res.status(400).json({
          success: false,
          message: "Gym category is required",
        });
      }

      if (!listingData.city) {
        return res.status(400).json({
          success: false,
          message: "City is required",
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Trainer / Nutritionist ID
    |--------------------------------------------------------------------------
    |
    | These models require their own `id` field.
    | Generate one if frontend doesn't provide it.
    |--------------------------------------------------------------------------
    */

    if (
      (config.type === "trainer" || config.type === "nutritionist") &&
      (!listingData.id || !String(listingData.id).trim())
    ) {
      listingData.id = `${config.type}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
    }

    /*
    |--------------------------------------------------------------------------
    | Trainer / Nutritionist slug
    |--------------------------------------------------------------------------
    |
    | Their schemas require slug.
    |--------------------------------------------------------------------------
    */

    if (
      (config.type === "trainer" || config.type === "nutritionist") &&
      (!listingData.slug || !String(listingData.slug).trim())
    ) {
      return res.status(400).json({
        success: false,
        message: "Listing slug is required",
      });
    }

    if (
      (config.type === "trainer" || config.type === "nutritionist") &&
      listingData.slug
    ) {
      listingData.slug = String(listingData.slug).trim().toLowerCase();
    }

    /*
    |--------------------------------------------------------------------------
    | OWNERSHIP
    |--------------------------------------------------------------------------
    |
    | Never accept owner from req.body.
    |
    | The authenticated user's ID becomes the owner.
    |--------------------------------------------------------------------------
    */

    listingData.owner = req.user.id;

    /*
    |--------------------------------------------------------------------------
    | Provider-created listings are not verified automatically.
    |--------------------------------------------------------------------------
    */

    if (config.type === "gym") {
      listingData.verified = false;
      listingData.featured = false;
      listingData.isActive = true;
    }

    if (config.type === "trainer" || config.type === "nutritionist") {
      listingData.isVerified = false;
      listingData.featured = false;
      listingData.isActive = true;
    }

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
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Listing validation failed",
        errors: validationErrors,
      });
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
    const config = getListingConfig(req.user.providerType);

    if (!config) {
      return res.status(400).json({
        success: false,
        message: "This provider type does not have a supported listing type",
      });
    }

    let allowedFields = [];

    if (config.type === "gym") {
      allowedFields = GYM_ALLOWED_FIELDS;
    }

    if (config.type === "trainer") {
      allowedFields = TRAINER_ALLOWED_FIELDS;
    }

    if (config.type === "nutritionist") {
      allowedFields = NUTRITIONIST_ALLOWED_FIELDS;
    }

    const updates = pickAllowedFields(req.body, allowedFields);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid listing fields provided for update",
      });
    }

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
    console.error("Update provider listing error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A listing with the same unique identifier already exists",
        error: error.keyValue || null,
      });
    }

    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));

      return res.status(400).json({
        success: false,
        message: "Listing validation failed",
        errors: validationErrors,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update listing",
    });
  }
};
