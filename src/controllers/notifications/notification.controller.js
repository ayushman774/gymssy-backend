import mongoose from "mongoose";
import Notification from "../../models/notifications/Notification.js";

const serialize = (item) => ({ id: String(item._id), type: item.type, title: item.title, message: item.message, href: item.href, bookingId: item.booking ? String(item.booking) : null, readAt: item.readAt, createdAt: item.createdAt });

export async function listNotifications(req, res) {
  try {
    const page = Number(req.query.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 1000) return res.status(400).json({ success: false, message: "Invalid page" });
    const filter = { recipient: req.user.id };
    const [items, total, unread] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * 20).limit(20).lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ ...filter, readAt: null }),
    ]);
    return res.json({ success: true, data: items.map(serialize), unreadCount: unread, pagination: { page, limit: 20, total, totalPages: Math.ceil(total / 20) } });
  } catch (error) { console.error("Notification list failed:", error?.message); return res.status(500).json({ success: false, message: "Unable to load notifications" }); }
}

export async function markNotificationRead(req, res) {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid notification ID" });
    const item = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user.id }, { $set: { readAt: new Date() } }, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: "Notification not found" });
    return res.json({ success: true, data: serialize(item) });
  } catch (error) { console.error("Notification read failed:", error?.message); return res.status(500).json({ success: false, message: "Unable to update notification" }); }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany({ recipient: req.user.id, readAt: null }, { $set: { readAt: new Date() } });
    return res.json({ success: true, message: "Notifications marked as read" });
  } catch (error) { console.error("Notification update failed:", error?.message); return res.status(500).json({ success: false, message: "Unable to update notifications" }); }
}
