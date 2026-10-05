/**
 * Express Server Entry Point
 *
 * Initializes the Express application, configures security middleware (CORS, JSON parsing,
 * Mongo query sanitization), establishes the MongoDB database connection, auto-provisions
 * a super administrator if configured, mounts authentication and resource routers,
 * and attaches centralized error handling.
 */

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const societyRoutes = require("./routes/societyRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const errorHandler = require("./middleware/errorMiddleware");
const User = require("./models/User");
const Society = require("./models/Society");

// Load environment variables from .env file
dotenv.config();

// Initialize Express application
const app = express();
const PORT = process.env.PORT || 5000;

// Configure Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  }),
);

// Body parser middleware: parse incoming JSON request payloads
app.use(express.json());

// Sanitize user inputs to prevent MongoDB Operator Injection ($ and . keys)
app.use(mongoSanitize());

// Mount core API route handlers
app.use("/api/auth", authRoutes);
app.use("/api/societies", societyRoutes);
app.use("/api/applications", applicationRoutes);


// Health check endpoint for uptime and deployment monitoring
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Centralized error handling middleware (must be registered as the very last middleware)
app.use(errorHandler);

/**
 * Establish database connection, perform initial bootstrap checks,
 * and start HTTP server listener.
 */
const start = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Auto-Admin Creation: Provision initial super admin if missing and env credentials exist
    const superAdminExists = await User.findOne({ role: "super_admin" });
    if (!superAdminExists && process.env.SUPER_ADMIN_EMAIL && process.env.SUPER_ADMIN_PASSWORD) {
      const email = process.env.SUPER_ADMIN_EMAIL.trim().toLowerCase();
      const username = process.env.SUPER_ADMIN_USERNAME || email.split("@")[0] || "superadmin";

      await User.create({
        username,
        email,
        password: process.env.SUPER_ADMIN_PASSWORD,
        fullName: "System Super Admin",
        role: "super_admin",
      });
      console.log(`[Database] Auto-provisioned super admin account: ${email}`);
    }

    // Auto-seed initial societies if database is fresh/empty (development only)
    if (process.env.NODE_ENV !== "production") {
      const count = await Society.countDocuments();
      if (count === 0) {
        const { sampleSocieties } = require("./seed");
        await Society.insertMany(sampleSocieties);
        console.log("[Database] Fresh database detected: auto-seeded sample societies.");
      }
    }

    // Start listening on configured port
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

module.exports = app;

