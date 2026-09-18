/**
 * Express Server Entry Point
 *
 * Initializes the Express application, configures security middleware (CORS, JSON parsing),
 * establishes the database connection, and mounts API route modules.
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const societyRoutes = require("./routes/societyRoutes");

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Configure cross-origin resource sharing and body parsing middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

// Mount core API route handlers
app.use("/api/societies", societyRoutes);

// Health check endpoint for monitoring server status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Establish database connection and start HTTP listener
const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();

module.exports = app;
