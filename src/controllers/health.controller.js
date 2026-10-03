import mongoose from "mongoose";

import connectDB from "../config/db.js";

export function createHealthHandler({ connect = connectDB, connection = mongoose.connection } = {}) {
  return async function getHealth(req, res) {
    try {
      await connect();

      if (connection.readyState !== 1) {
        return res.status(503).json({
          success: false,
          message: "Gymssy API database is unavailable",
          status: { server: "up", database: "disconnected" },
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        success: true,
        message: "Gymssy API is running 🚀",
        status: { server: "up", database: "connected" },
        timestamp: new Date().toISOString(),
      });
    } catch {
      return res.status(503).json({
        success: false,
        message: "Gymssy API database is unavailable",
        status: { server: "up", database: "disconnected" },
        timestamp: new Date().toISOString(),
      });
    }
  };
}

export const getHealth = createHealthHandler();
