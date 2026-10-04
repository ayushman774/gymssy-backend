import { rateLimit } from "express-rate-limit";

import { rateLimitKey } from "./authRateLimit.middleware.js";

export const LOCATION_RATE_LIMIT_POLICY = Object.freeze({
  windowMs: 60 * 1000,
  limit: 60,
});

export const locationRateLimiter = rateLimit({
  ...LOCATION_RATE_LIMIT_POLICY,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: "Too many location requests. Please try again shortly.",
  }),
});
