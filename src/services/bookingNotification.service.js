import Notification from "../models/notifications/Notification.js";

export async function notifyBookingEvent(booking, status, actor) {
  if (!booking?._id) return;
  const bookingId = String(booking._id);
  const name = booking.serviceSnapshot?.name || booking.listingSnapshot?.name || "your booking";
  const recipients = [];
  if (status === "requested" && booking.provider) {
    recipients.push({ recipient: booking.provider, href: `/provider/bookings/${bookingId}`, title: "New booking request", message: `A customer requested ${name}.` });
  } else if (actor === "customer" && status === "cancelled" && booking.provider) {
    recipients.push({ recipient: booking.provider, href: `/provider/bookings/${bookingId}`, title: "Booking cancelled", message: `A customer cancelled their booking for ${name}.` });
  } else if (actor !== "customer" && booking.customer) {
    const titles = { confirmed: "Booking confirmed", rejected: "Booking rejected", cancelled: "Booking cancelled", completed: "Booking completed" };
    if (titles[status]) recipients.push({ recipient: booking.customer, href: `/bookings/${bookingId}`, title: titles[status], message: `Your booking for ${name} has been ${status}.` });
  }
  const eventAt = booking.statusHistory?.at(-1)?.changedAt || booking.createdAt || new Date();
  await Promise.all(recipients.map(async ({ recipient, ...details }) => {
    const type = `booking_${status}`;
    const eventKey = `${bookingId}:${status}:${actor}:${new Date(eventAt).toISOString()}:${String(recipient)}`;
    try { await Notification.updateOne({ eventKey }, { $setOnInsert: { recipient, booking: booking._id, eventKey, type, ...details } }, { upsert: true }); }
    catch (error) { if (error?.code !== 11000) console.error("Booking notification write failed:", error?.message); }
  }));
}
