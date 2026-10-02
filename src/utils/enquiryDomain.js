export const ENQUIRY_STATUSES = Object.freeze(["submitted", "viewed", "contacted", "closed"]);
export const ENQUIRY_INTENTS = Object.freeze(["general", "membership", "class", "trial", "training", "consultation"]);
export const ENQUIRY_TARGET_TYPES = Object.freeze(["gym", "trainer", "nutritionist"]);
export const PROVIDER_ENQUIRY_TRANSITIONS = Object.freeze({
  submitted: Object.freeze(["viewed", "contacted", "closed"]),
  viewed: Object.freeze(["contacted", "closed"]),
  contacted: Object.freeze(["closed"]),
  closed: Object.freeze([]),
});
