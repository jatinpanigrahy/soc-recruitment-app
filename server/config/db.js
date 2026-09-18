/**
 * Database Connection Module
 *
 * Establishes a connection to MongoDB using Mongoose.
 * Attempts connection to the specified MONGO_URI. If unreachable,
 * gracefully initializes an embedded in-memory MongoDB instance
 * to enable zero-configuration local development.
 */

const mongoose = require("mongoose");

const connectDB = async () => {
  const uri =
    process.env.MONGO_URI || "mongodb://127.0.0.1:27017/soc_recruitment";

  try {
    // Attempt standard MongoDB connection with a 2.5s server selection timeout
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
  } catch (err) {
    console.warn(`[Database] Standard MongoDB connection at ${uri} unavailable.`);
    console.log(`[Database] Starting embedded in-memory MongoDB for local development...`);

    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongod = await MongoMemoryServer.create();
      const memUri = mongod.getUri();
      const conn = await mongoose.connect(memUri);
      console.log(`[Database] In-memory MongoDB connected successfully at: ${memUri}`);
    } catch (memErr) {
      console.error("[Database] Failed to initialize in-memory MongoDB:", memErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;

