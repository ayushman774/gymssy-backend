import net from "node:net";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

const rateLimitKey = (req) => {
  const netlifyIp = req.get("x-nf-client-connection-ip");
  const clientIp = process.env.NETLIFY === "true" && net.isIP(netlifyIp)
    ? netlifyIp
    : req.ip;

  return ipKeyGenerator(clientIp || "unknown");
};

const jsonHandler = (_req, res) => res.status(429).json({
  success: false,
  message: "Too many authentication attempts. Please try again later.",
});

const createAuthLimiter = ({ windowMs, limit, skipSuccessfulRequests = false }) => rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  keyGenerator: rateLimitKey,
  skipSuccessfulRequests,
  handler: jsonHandler,
});

export const loginRateLimiter = createAuthLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
});

export const registrationRateLimiter = createAuthLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

export const adminCreationRateLimiter = createAuthLimiter({
  windowMs: 60 * 60 * 1000,
  limit: 10,
});

export { createAuthLimiter, rateLimitKey };
