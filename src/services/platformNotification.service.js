import Notification from "../models/notifications/Notification.js";
import User from "../models/users/User.js";

export async function notifyUsers({ recipients, eventKey, type, title, message, href }) {
  if (!eventKey || !type || !Array.isArray(recipients)) return;
  await Promise.all(recipients.filter(Boolean).map(async (recipient) => {
    const key = `${eventKey}:${String(recipient)}`;
    try {
      await Notification.updateOne({ eventKey: key }, { $setOnInsert: {
        recipient, eventKey: key, type, title, message, href,
      } }, { upsert: true });
    } catch (error) { if (error.code !== 11000) console.error("Platform notification failed:", error.message); }
  }));
}

export async function notifyAdmins({ eventKey, type, title, message, href }) {
  try {
    const admins = await User.find({ role: "admin", isActive: true }).select("_id").lean();
    await notifyUsers({ recipients: admins.map((admin) => admin._id), eventKey, type, title, message, href });
  } catch (error) { console.error("Admin notification dispatch failed:", error.message); }
}
