import mongoose from "mongoose";
import { randomUUID } from "node:crypto";

import User from "../../models/users/User.js";
import ProviderProfile from "../../models/providers/ProviderProfile.js";
import {
  uploadImageBuffer,
  deleteImageByPublicId,
} from "../../services/imageUpload.service.js";

const AVATAR_FOLDER = "gymssy/providers/avatars";
const AVATAR_TRANSFORMATION = [
  {
    width: 800,
    height: 800,
    crop: "fill",
    gravity: "auto",
    quality: "auto:good",
  },
];

function sendServerError(res, message) {
  return res.status(500).json({ success: false, message });
}

export function createAdminProviderAvatarHandlers({
  uploadImage = uploadImageBuffer,
  deleteImage = deleteImageByPublicId,
} = {}) {
  const uploadProviderAvatar = async (req, res) => {
    let uploadedImage = null;

    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider ID",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Avatar image is required",
        });
      }

      const provider = await User.findOne({ _id: id, role: "business" });
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider not found",
        });
      }

      const existingProfile = await ProviderProfile.findOne({
        user: provider._id,
      });
      const previousPublicId = existingProfile?.avatar?.publicId || "";

      uploadedImage = await uploadImage(req.file.buffer, {
        folder: AVATAR_FOLDER,
        publicId: `${provider._id}-${randomUUID()}`,
        transformation: AVATAR_TRANSFORMATION,
      });

      if (!uploadedImage?.url || !uploadedImage?.publicId) {
        throw new Error("Image service returned an incomplete upload result");
      }

      let profile;
      try {
        profile = await ProviderProfile.findOneAndUpdate(
          { user: provider._id },
          {
            $set: {
              avatar: {
                url: uploadedImage.url,
                publicId: uploadedImage.publicId,
                alt: `${provider.name || "Provider"} profile picture`,
              },
            },
            $setOnInsert: { user: provider._id },
          },
          {
            new: true,
            upsert: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          },
        );
      } catch (databaseError) {
        try {
          await deleteImage(uploadedImage.publicId);
        } catch {
          console.warn("Failed to clean up a newly uploaded provider avatar");
        }
        throw databaseError;
      }

      if (previousPublicId && previousPublicId !== uploadedImage.publicId) {
        try {
          await deleteImage(previousPublicId);
        } catch {
          console.warn("Failed to clean up the previous provider avatar");
        }
      }

      return res.status(200).json({
        success: true,
        message: "Provider avatar uploaded successfully",
        data: { profileExists: true, profile },
      });
    } catch (error) {
      console.error("Provider avatar upload failed:", error.message);
      return sendServerError(res, "Failed to upload provider avatar");
    }
  };

  const removeProviderAvatar = async (req, res) => {
    try {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid provider ID",
        });
      }

      const provider = await User.findOne({ _id: id, role: "business" });
      if (!provider) {
        return res.status(404).json({
          success: false,
          message: "Provider not found",
        });
      }

      const existingProfile = await ProviderProfile.findOne({
        user: provider._id,
      });

      if (!existingProfile) {
        return res.status(200).json({
          success: true,
          message: "Provider avatar removed successfully",
          data: { profileExists: false, profile: null },
        });
      }

      const previousPublicId = existingProfile.avatar?.publicId || "";
      const profile = await ProviderProfile.findOneAndUpdate(
        { user: provider._id },
        {
          $set: {
            avatar: { url: "", alt: "", publicId: "" },
          },
        },
        { new: true, runValidators: true },
      );

      if (previousPublicId) {
        try {
          await deleteImage(previousPublicId);
        } catch {
          console.warn("Failed to delete a removed provider avatar");
        }
      }

      return res.status(200).json({
        success: true,
        message: "Provider avatar removed successfully",
        data: { profileExists: true, profile },
      });
    } catch (error) {
      console.error("Provider avatar removal failed:", error.message);
      return sendServerError(res, "Failed to remove provider avatar");
    }
  };

  return { uploadProviderAvatar, removeProviderAvatar };
}

export const { uploadProviderAvatar, removeProviderAvatar } =
  createAdminProviderAvatarHandlers();
