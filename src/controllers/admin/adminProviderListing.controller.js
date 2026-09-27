import mongoose from "mongoose";

import User from "../../models/users/User.js";
import {
  ListingContractError,
  prepareProviderOwnedListing,
} from "../providers/providerListing.controller.js";
import { normalizeAdminListing } from "./admin.controller.js";

export const createAdminProviderListing = async (req, res) => {
  try {
    const { providerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(providerId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider ID",
      });
    }

    const provider = await User.findById(providerId);
    if (!provider || provider.role !== "business") {
      return res.status(404).json({
        success: false,
        message: "Business provider not found",
      });
    }

    if (!provider.isActive) {
      return res.status(409).json({
        success: false,
        message: "Cannot create a listing for an inactive provider",
      });
    }

    const { config, listingData } = await prepareProviderOwnedListing({
      providerType: provider.providerType,
      ownerId: provider._id,
      body: req.body,
    });
    const listing = await config.model.create(listingData);

    return res.status(201).json({
      success: true,
      message: "Provider listing created successfully",
      data: {
        type: config.type,
        providerType: provider.providerType,
        listing: normalizeAdminListing(listing, config.type),
      },
    });
  } catch (error) {
    if (error instanceof ListingContractError) {
      return res.status(error.statusCode).json(error.payload);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A listing with the same unique identifier already exists",
        error: error.keyValue || null,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: "Listing validation failed",
        errors: Object.values(error.errors).map((item) => ({
          field: item.path,
          message: item.message,
        })),
      });
    }

    console.error("Admin provider listing creation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create provider listing",
    });
  }
};
