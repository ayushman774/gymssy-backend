export const BOOKING_STATUSES = Object.freeze(["requested", "confirmed", "rejected", "cancelled", "completed"]);
export const BOOKING_TARGET_TYPES = Object.freeze(["gym", "trainer", "nutritionist"]);
export const BOOKING_TYPES = Object.freeze({
  gym: Object.freeze(["visit", "trial", "class", "membership"]),
  trainer: Object.freeze(["session", "trial"]),
  nutritionist: Object.freeze(["consultation"]),
});

export const CUSTOMER_BOOKING_TRANSITIONS = Object.freeze({
  requested: Object.freeze(["cancelled"]),
  confirmed: Object.freeze(["cancelled"]),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
  completed: Object.freeze([]),
});

export const PROVIDER_BOOKING_TRANSITIONS = Object.freeze({
  requested: Object.freeze(["confirmed", "rejected"]),
  confirmed: Object.freeze(["completed", "cancelled"]),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
  completed: Object.freeze([]),
});
