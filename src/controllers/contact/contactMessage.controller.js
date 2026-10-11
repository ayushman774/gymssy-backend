import ContactMessage from "../../models/contact/ContactMessage.js";

const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const safeText = (value, max) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function submitContactMessage(req, res) {
  try {
    const fullName = safeText(req.body.fullName, 120);
    const email = safeText(req.body.email, 254).toLowerCase();
    const message = safeText(req.body.message, 5000);
    if (!fullName || !validEmail(email) || !message || req.body.privacy !== true) {
      return res.status(400).json({ success: false, message: "Name, valid email, message and privacy consent are required." });
    }
    if (typeof req.body.message !== "string" || req.body.message.length > 5000) {
      return res.status(400).json({ success: false, message: "Message must be 5000 characters or fewer." });
    }
    const record = await ContactMessage.create({
      fullName, email, message, privacy: true,
      phone: safeText(req.body.phone, 30),
      subject: safeText(req.body.subject, 200),
      reason: safeText(req.body.reason, 100),
    });
    return res.status(201).json({ success: true, message: "Your message has been received.", data: { id: record.id } });
  } catch (error) {
    console.error("Contact message submission failed:", error);
    return res.status(500).json({ success: false, message: "Unable to send your message. Please try again." });
  }
}

export async function getAdminContactMessages(req, res) {
  try {
    const status = req.query.status || "";
    if (status && !["new", "replied"].includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = 20;
    const filter = status ? { status } : {};
    const [messages, total, unread] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments({ status: "new" }),
    ]);
    return res.json({ success: true, data: { messages, unread, pagination: { page, pages: Math.ceil(total / limit), total } } });
  } catch (error) {
    console.error("Load contact messages failed:", error);
    return res.status(500).json({ success: false, message: "Unable to load messages." });
  }
}

export async function replyToContactMessage(req, res) {
  try {
    const replyText = typeof req.body.reply === "string" ? req.body.reply.trim() : "";
    if (!replyText || replyText.length > 5000) return res.status(400).json({ success: false, message: "Reply must contain 1–5000 characters." });
    const record = await ContactMessage.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "Message not found." });
    if (record.status === "replied") return res.status(409).json({ success: false, message: "This message has already been replied to." });
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.CONTACT_REPLY_FROM;
    if (!apiKey || !from) return res.status(503).json({ success: false, message: "Email replies are not configured. Set RESEND_API_KEY and CONTACT_REPLY_FROM on the backend." });
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [record.email],
        subject: `Re: ${record.subject || "Your message to Gymssy"}`,
        text: replyText,
        reply_to: from,
      }),
    });
    if (!response.ok) {
      console.error("Contact reply email provider error:", response.status, await response.text());
      return res.status(502).json({ success: false, message: "Email delivery failed. Please try again." });
    }
    record.reply = { text: replyText, sentAt: new Date() };
    record.status = "replied";
    await record.save();
    return res.json({ success: true, message: "Reply emailed successfully.", data: record });
  } catch (error) {
    if (error.name === "CastError") return res.status(400).json({ success: false, message: "Invalid message ID." });
    console.error("Contact reply failed:", error);
    return res.status(500).json({ success: false, message: "Unable to send reply." });
  }
}
