import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

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

const app = express();

/* ================================
   MIDDLEWARE
================================ */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://gymssy.com",
  "https://www.gymssy.com",
];

app.use(
  cors({
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
  }),
);

app.use(helmet());
app.use(morgan("dev"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

/* ================================
   HEALTH CHECK
================================ */

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Gymssy API is running 🚀",
  });
});

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
app.use("/api/gyms", gymRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/experiences", experienceRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/partner-success", partnerSuccessRoutes);
app.use("/api/partner-applications", partnerApplicationRoutes);
app.use("/api/nutritionists", nutritionistRoutes);

export default app;
