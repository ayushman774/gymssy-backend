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


const APPLICATION_STATUSES = ["pending", "contacted", "approved", "rejected"];

export const getAdminPartnerApplications = async (req, res) => {
  try {
    const { status = "", search = "" } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    if (status && !APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid application status." });
    }
    const filter = {};
    if (status) filter.status = status;
    if (typeof search === "string" && search.trim()) {
      const escaped = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      filter.$or = [
        { businessName: pattern }, { ownerName: pattern },
        { email: pattern }, { phone: pattern }, { city: pattern },
      ];
    }
    const [applications, total, counts] = await Promise.all([
      PartnerApplication.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      PartnerApplication.countDocuments(filter),
      PartnerApplication.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
    ]);
    const summary = { total: 0, pending: 0, contacted: 0, approved: 0, rejected: 0 };
    for (const row of counts) {
      if (row._id in summary) summary[row._id] = row.count;
      summary.total += row.count;
    }
    return res.json({
      success: true,
      data: { applications, summary, pagination: { page, limit, total, pages: Math.ceil(total / limit) } },
    });
  } catch (error) {
    console.error("Admin partner applications error:", error);
    return res.status(500).json({ success: false, message: "Unable to load partner applications." });
  }
};

export const updateAdminPartnerApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!APPLICATION_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid application status." });
    }
    const application = await PartnerApplication.findByIdAndUpdate(
      req.params.id,
      { $set: { status } },
      { new: true, runValidators: true },
    );
    if (!application) return res.status(404).json({ success: false, message: "Application not found." });
    return res.json({ success: true, message: "Application status updated.", data: application });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid application ID." });
    console.error("Update partner application error:", error);
    return res.status(500).json({ success: false, message: "Unable to update application." });
  }
};
