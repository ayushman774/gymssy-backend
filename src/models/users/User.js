import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    avatar: {
      url: {
        type: String,
        default: "",
      },
      alt: {
        type: String,
        default: "",
      },
    },

    role: {
      type: String,
      enum: ["user", "business", "admin"],
      default: "user",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

const User = mongoose.model("User", userSchema);

export default User;
