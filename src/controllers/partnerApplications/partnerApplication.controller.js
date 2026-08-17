import PartnerApplication from "../../models/partnerApplications/PartnerApplication.js";

export const createPartnerApplication = async (req, res) => {
  try {
    const {
      businessName,
      ownerName,
      email,
      phone,
      businessType,
      city,
      address,
      website,
      message,
      agreed,
    } = req.body;

    // Required fields
    if (
      !businessName ||
      !ownerName ||
      !email ||
      !phone ||
      !businessType ||
      !city ||
      !address
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Terms & Privacy agreement
    if (agreed !== true) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the Terms of Service and Privacy Policy.",
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address.",
      });
    }

    // Indian mobile validation
    const cleanPhone = phone.replace(/\s/g, "");

    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid 10-digit Indian mobile number.",
      });
    }

    const application = await PartnerApplication.create({
      businessName: businessName.trim(),
      ownerName: ownerName.trim(),
      email: email.trim().toLowerCase(),
      phone: cleanPhone,
      businessType: businessType.trim(),
      city: city.trim(),
      address: address.trim(),
      website: website?.trim() || "",
      message: message?.trim() || "",
      agreed: true,
    });

    return res.status(201).json({
      success: true,
      message: "Your partner application has been submitted successfully.",
      data: {
        id: application._id,
        businessName: application.businessName,
        status: application.status,
      },
    });
  } catch (error) {
    console.error("Create partner application error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit partner application.",
    });
  }
};
