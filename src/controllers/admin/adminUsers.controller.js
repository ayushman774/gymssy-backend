import mongoose from "mongoose";
import User from "../../models/users/User.js";

const fields = "name email phone avatar avatarPreset gender address isActive isEmailVerified createdAt updatedAt";
const serialize = (user) => ({
  id: String(user._id), name: user.name, email: user.email, phone: user.phone || "",
  avatar: user.avatar || { url: "", alt: "" }, avatarPreset: user.avatarPreset || "",
  gender: user.gender || "", address: user.address || {}, isActive: user.isActive,
  isEmailVerified: user.isEmailVerified, createdAt: user.createdAt, updatedAt: user.updatedAt,
});
export const getAdminUsers = async (req, res) => {
  try {
    const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1));
    const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 15));
    const status = String(req.query.status || "");
    if (status && !["active", "inactive"].includes(status)) return res.status(400).json({ success: false, message: "Invalid status filter" });
    const search = String(req.query.search || "").trim().slice(0, 100);
    const filter = { role: "user" };
    if (status) filter.isActive = status === "active";
    if (search) {
      const safe = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = ["name", "email", "phone"].map((key) => ({ [key]: { $regex: safe, $options: "i" } }));
    }
    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select(fields).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ]);
    return res.json({ success: true, data: { users: users.map(serialize), pagination: {
      page, limit, total, pages: Math.max(1, Math.ceil(total / limit)),
    } } });
  } catch (error) {
    console.error("Admin users list error:", error);
    return res.status(500).json({ success: false, message: "Unable to load customers" });
  }
};
export const getAdminUserById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid customer ID" });
    const user = await User.findOne({ _id: req.params.id, role: "user" }).select(fields).lean();
    if (!user) return res.status(404).json({ success: false, message: "Customer not found" });
    return res.json({ success: true, data: { user: serialize(user) } });
  } catch (error) {
    console.error("Admin customer details error:", error);
    return res.status(500).json({ success: false, message: "Unable to load customer" });
  }
};
