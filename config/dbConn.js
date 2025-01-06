const mongoose = require("mongoose");
const redis = require("./redisConn");

const connectDB = async (retries = 5) => {
  let attempt = 0;

  const connectWithRetry = async () => {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Database Connected ✅");
    } catch (error) {
      attempt += 1;
      console.error(
        `MongoDB connection error (Attempt ${attempt}): ${error.message}`
      );

      if (attempt < retries) {
        console.log("Retrying connection...");
        connectWithRetry();
      } else {
        console.error("Max retry attempts reached. Exiting...");
        process.exit(1);
      }
    }
  };

  connectWithRetry();
};

const connectRedisMiddleware = async (req, res, next) => {
  try {
    if (redis.isConnected) {
      return next();
    }
    await connectRedis();
    next();
  } catch (error) {
    console.error(`Redis connection error: ${error.message}`);
    next(error);
  }
};

const connectRedis = async () => {
  try {
    await redis.ping();
    redis.isConnected = true;
    console.log("Redis Connected ✅");
  } catch (error) {
    console.error(`Redis connection error: ${error.message}`);
    redis.isConnected = false;
  }
};

module.exports = { connectRedis, connectDB, connectRedisMiddleware };
