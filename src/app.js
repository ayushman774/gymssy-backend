import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";
import { getHealth } from "./controllers/health.controller.js";

import categoryRoutes from "./routes/categories/category.routes.js";
import recentlyViewedRoutes from "./routes/recentlyViewed/recentlyViewed.routes.js";
import authRoutes from "./routes/auth/auth.routes.js";
import gymRoutes from "./routes/gyms/gym.routes.js";
import trainerRoutes from "./routes/trainers/trainer.routes.js";
import experienceRoutes from "./routes/experiences/experience.routes.js";
import cityRoutes from "./routes/cities/city.routes.js";
import stateRoutes from "./routes/cities/state.routes.js";
import partnerSuccessRoutes from "./routes/partnerSuccess/partnerSuccess.routes.js";
import partnerApplicationRoutes from "./routes/partnerApplications/partnerApplication.routes.js";
import nutritionistRoutes from "./routes/nutritionists/nutritionist.routes.js";
import providerRoutes from "./routes/providers/provider.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import discoveryRoutes from "./routes/discovery/discovery.routes.js";
import favoriteRoutes from "./routes/favorites/favorite.routes.js";
import enquiryRoutes from "./routes/enquiries/enquiry.routes.js";
import bookingRoutes from "./routes/bookings/booking.routes.js";
import reviewRoutes from "./routes/reviews/review.routes.js";
import notificationRoutes from "./routes/notifications/notification.routes.js";
import locationRoutes from "./routes/locations/location.routes.js";
import contactMessageRoutes from "./routes/contact/contactMessage.routes.js";

const app = express();

/* ================================
   MIDDLEWARE
================================*/

const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:5173",
  "https://gymssy.com",
  "https://www.gymssy.com",
  "https://admin.gymssy.com",
]);

const isPublicReferenceData = (path) =>
  path === "/api/categories" || path.startsWith("/api/categories/") ||
  path === "/api/cities" || path.startsWith("/api/cities/") ||
  path === "/api/states" || path.startsWith("/api/states/");

// Apply CORS before auth, database access, and all routes. This ensures
// browser preflight OPTIONS requests never require an admin token.
const apiCors = cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    console.warn("CORS rejected origin:", origin);
    return callback(null, false);
  },
  methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  credentials: true,
  optionsSuccessStatus: 204,
  maxAge: 600,
});
const referenceCors = cors({
  origin: "*",
  methods: ["GET", "HEAD", "OPTIONS"],
  credentials: false,
  optionsSuccessStatus: 204,
  maxAge: 600,
});

app.use((req, res, next) => {
  res.setHeader("Vary", "Origin");
  // Never let a cached CORS preflight from one origin affect another.
  if (req.method === "OPTIONS") res.setHeader("Cache-Control", "no-store");
  if (isPublicReferenceData(req.path)) {
    res.setHeader("Cache-Control", "no-store");
    return referenceCors(req, res, next);
  }
  return apiCors(req, res, next);
});

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================================
   HEALTH CHECK
================================ */

app.get("/api/health", getHealth);

/* ================================
   DATABASE CONNECTION
================================ */

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("❌ Database connection error:", error);

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

/* ================================
   API ROUTES
================================ */

app.use("/api/categories", categoryRoutes);
app.use("/api/states", stateRoutes);
app.use("/api/recently-viewed", recentlyViewedRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/discover", discoveryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/contact-messages", contactMessageRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/partner-success", partnerSuccessRoutes);
app.use("/api/partner-applications", partnerApplicationRoutes);
app.use("/api/nutritionists", nutritionistRoutes);

export default app;
