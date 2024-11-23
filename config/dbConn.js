const mongoose = require("mongoose");

const connectDB = async (retries = 5) => {
  let attempt = 0;

  const connectWithRetry = async () => {
    try {
      // Try to connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Database Connected ✅");
    } catch (error) {
      attempt += 1;
      console.error(
        `MongoDB connection error (Attempt ${attempt}): ${error.message}`
      );

      if (attempt < retries) {
        // If the connection fails, retry immediately
        console.log("Retrying connection...");
        connectWithRetry(); // Call the function recursively
      } else {
        // If all retries are exhausted, exit the process
        console.error("Max retry attempts reached. Exiting...");
        process.exit(1);
      }
    }
  };

  connectWithRetry(); // Initiate the first connection attempt
};

module.exports = connectDB;
