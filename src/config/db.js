import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined");
    }

    // Already connected
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    // Connection is already being established
    if (mongoose.connection.readyState === 2) {
      return mongoose.connection;
    }

    const connection = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 0,
    });

    console.log("✅ MongoDB connected");

    return connection.connection;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    throw error;
  }
};

export default connectDB;
