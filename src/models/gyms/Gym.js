import mongoose from "mongoose";

const galleryImageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default: "",
    },
    alt: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      default: "gym",
    },
  },
  { _id: false },
);

const facilitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    icon: {
      type: String,
      default: "",
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const membershipFeatureSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    included: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const membershipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    duration: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
    },
    originalPrice: {
      type: Number,
      default: null,
    },
    currency: {
      type: String,
      default: "₹",
    },
    billingPeriod: {
      type: String,
      default: "",
    },
    savings: {
      type: String,
      default: null,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: "default",
    },
    features: {
      type: [membershipFeatureSchema],
      default: [],
    },
    cta: {
      type: String,
      default: "Choose Plan",
    },
  },
  { _id: false },
);

const trainerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      trim: true,
    },
    specialization: {
      type: String,
      default: "",
    },
    experience: {
      type: String,
      default: "",
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    sessionPrice: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      default: "₹",
    },
    certifications: {
      type: [String],
      default: [],
    },
    image: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    available: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const classSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    schedule: {
      type: String,
      default: "",
    },
    time: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "",
    },
    trainer: {
      type: String,
      default: "",
    },
    level: {
      type: String,
      default: "All Levels",
    },
    spots: {
      type: Number,
      default: 0,
    },
    spotsLeft: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const timingSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      required: true,
    },
    open: {
      type: String,
      default: "",
    },
    close: {
      type: String,
      default: "",
    },
    isOpen: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false },
);

const reviewUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
    initials: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: reviewUserSchema,
      default: {},
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    date: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    text: {
      type: String,
      default: "",
    },
    verifiedVisit: {
      type: Boolean,
      default: false,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false },
);

const ratingBreakdownSchema = new mongoose.Schema(
  {
    stars: {
      type: Number,
      min: 1,
      max: 5,
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { _id: false },
);

const gymSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    verified: {
      type: Boolean,
      default: false,
    },

    category: {
      type: String,
      required: true,
      trim: true,
    },

    tags: {
      type: [String],
      default: [],
    },

    location: {
      area: {
        type: String,
        default: "",
      },
      city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      pincode: {
        type: String,
        default: "",
      },
      address: {
        type: String,
        default: "",
      },
      landmark: {
        type: String,
        default: "",
      },
      parking: {
        type: String,
        default: "",
      },
    },

    coordinates: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },

    distance: {
      type: Number,
      default: null,
    },

    phone: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    website: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    highlights: {
      type: [String],
      default: [],
    },

    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    priceFrom: {
      type: Number,
      default: 0,
    },

    openNow: {
      type: Boolean,
      default: true,
    },

    images: {
      cover: {
        type: String,
        default: "",
      },
      gallery: {
        type: [galleryImageSchema],
        default: [],
      },
    },

    facilities: {
      type: [facilitySchema],
      default: [],
    },

    memberships: {
      type: [membershipSchema],
      default: [],
    },

    trainers: {
      type: [trainerSchema],
      default: [],
    },

    classes: {
      type: [classSchema],
      default: [],
    },

    timings: {
      type: [timingSchema],
      default: [],
    },

    reviews: {
      type: [reviewSchema],
      default: [],
    },

    ratingBreakdown: {
      type: [ratingBreakdownSchema],
      default: [],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    featured: {
      type: Boolean,
      default: false,
    },

    city: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "City",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

const Gym = mongoose.model("Gym", gymSchema);

export default Gym;
