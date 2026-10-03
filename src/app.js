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
import partnerSuccessRoutes from "./routes/partnerSuccess/partnerSuccess.routes.js";
import partnerApplicationRoutes from "./routes/partnerApplications/partnerApplication.routes.js";
import nutritionistRoutes from "./routes/nutritionists/nutritionist.routes.js";
import providerRoutes from "./routes/providers/provider.routes.js";
import adminRoutes from "./routes/admin/admin.routes.js";
import discoveryRoutes from "./routes/discovery/discovery.routes.js";
import favoriteRoutes from "./routes/favorites/favorite.routes.js";
import enquiryRoutes from "./routes/enquiries/enquiry.routes.js";
import bookingRoutes from "./routes/bookings/booking.routes.js";

const app = express();

/* ================================
   MIDDLEWARE
================================*/

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://gymssy.com",
  "https://www.gymssy.com",
  "https://admin.gymssy.com",
];

const protectedApiCors = cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin header
      // (Postman, server-to-server requests, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`❌ CORS blocked origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },

    credentials: true,
  });

// Categories and Cities are public, read-only reference data. A wildcard
// response avoids a cached origin-specific header being served to a different
// marketplace or Admin origin.
const publicReferenceDataCors = cors({
  origin: "*",
  methods: ["GET", "OPTIONS"],
  credentials: false,
});

app.use((req, res, next) => {
  const publicReferenceData = req.path === "/api/categories" || req.path.startsWith("/api/categories/") || req.path === "/api/cities" || req.path.startsWith("/api/cities/");
  if (publicReferenceData) {
    res.setHeader("Cache-Control", "no-store");
    return publicReferenceDataCors(req, res, next);
  }
  return protectedApiCors(req, res, next);
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
app.use("/api/recently-viewed", recentlyViewedRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/discover", discoveryRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/enquiries", enquiryRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/gyms", gymRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/partner-success", partnerSuccessRoutes);
app.use("/api/partner-applications", partnerApplicationRoutes);
app.use("/api/nutritionists", nutritionistRoutes);

export default app;
