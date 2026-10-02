import dns from "node:dns";
import dotenv from "dotenv";
dotenv.config();

const dnsServers = process.env.DNS_SERVERS
  ?.split(",")
  .map((server) => server.trim())
  .filter(Boolean);

if (dnsServers?.length) {
  dns.setServers(dnsServers);
}

import app from "./app.js";
import connectDB from "./config/db.js";

// ============================================================
// ENVIRONMENT VALIDATION
// ============================================================

const requiredEnvVars = [
  "MONGO_URI",
  "JWT_SECRET",
  "ADMIN_CREATION_SECRET",
];

const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Critical Error: Missing environment variables: ${missingEnvVars.join(", ")}`);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`🚀 Gymssy API running on port ${PORT}`);
      console.log(`🌐 http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
