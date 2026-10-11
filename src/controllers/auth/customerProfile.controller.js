import User from "../../models/users/User.js";

const genders = ["", "male", "female", "other", "prefer_not_to_say"];
const addressFields = ["line1", "area", "city", "state", "pincode"];
const presets = Array.from({ length: 12 }, (_, i) => "avatar-" + (i + 1));
const allowed = ["name", "gender", "address", "avatarPreset", "avatar"];

export const updateCustomerProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) return res.status(404).json({ success: false, message: "Account not found" });
    if (user.role !== "user") return res.status(403).json({ success: false, message: "Customer account required" });
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ success: false, message: "Invalid profile data" });
    const unexpected = Object.keys(body).filter((key) => !allowed.includes(key));
    if (unexpected.length) return res.status(400).json({ success: false, message: "Unsupported profile fields", fields: unexpected });
    if ("name" in body) {
      if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 100) return res.status(400).json({ success: false, message: "Invalid name" });
      user.name = body.name.trim();
    }
    if ("gender" in body) {
      if (!genders.includes(body.gender)) return res.status(400).json({ success: false, message: "Invalid gender" });
      user.gender = body.gender;
    }
    if ("address" in body) {
      if (!body.address || typeof body.address !== "object" || Array.isArray(body.address) || Object.keys(body.address).some((key) => !addressFields.includes(key))) return res.status(400).json({ success: false, message: "Invalid address" });
      const next = {};
      for (const field of addressFields) {
        const value = body.address[field] ?? "";
        if (typeof value !== "string" || value.length > 180) return res.status(400).json({ success: false, message: "Invalid address field" });
        next[field] = value.trim();
      }
      user.address = next;
      user.markModified("address");
    }
    if ("avatarPreset" in body) {
      if (typeof body.avatarPreset !== "string" || (body.avatarPreset !== "" && !presets.includes(body.avatarPreset))) return res.status(400).json({ success: false, message: "Invalid avatar preset" });
      user.avatarPreset = body.avatarPreset;
      user.avatar = { url: "", alt: "" };
    }
    if ("avatar" in body) {
      // Accept only HTTPS image URLs. Uploads must first be stored through a trusted media service.
      const avatar = body.avatar;
      if (!avatar || typeof avatar !== "object" || Array.isArray(avatar) || Object.keys(avatar).some((key) => !["url", "alt"].includes(key))) return res.status(400).json({ success: false, message: "Invalid avatar" });
      const url = avatar.url ?? "";
      if (typeof url !== "string" || url.length > 2048 || (url && !/^https:\/\//i.test(url))) return res.status(400).json({ success: false, message: "Invalid avatar URL" });
      user.avatar = { url, alt: "Customer profile picture" };
      user.avatarPreset = "";
    }
    await user.save();
    return res.json({ success: true, message: "Profile updated", data: { user: {
      id: user.id, name: user.name, email: user.email, phone: user.phone, role: user.role,
      avatar: user.avatar, avatarPreset: user.avatarPreset, gender: user.gender, address: user.address,
      isActive: user.isActive, isEmailVerified: user.isEmailVerified
    } } });
  } catch (error) {
    console.error("Update customer profile error:", error);
    return res.status(500).json({ success: false, message: "Unable to update profile" });
  }
};
