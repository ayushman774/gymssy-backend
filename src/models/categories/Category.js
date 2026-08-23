import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    type: {
      type: String,
      enum: ["main", "subcategory"],
      required: true,
      default: "subcategory",
    },

    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    icon: {
      type: String,
      default: "",
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    image: {
      url: {
        type: String,
        default: "",
        trim: true,
      },

      alt: {
        type: String,
        default: "",
        trim: true,
      },
    },

    count: {
      type: Number,
      default: 0,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Unique slug
categorySchema.index({ slug: 1 }, { unique: true });

// Main/subcategory queries
categorySchema.index({
  parentCategory: 1,
  isActive: 1,
  order: 1,
});

categorySchema.index({
  type: 1,
  isActive: 1,
  order: 1,
});

const Category = mongoose.model("Category", categorySchema);

export default Category;
