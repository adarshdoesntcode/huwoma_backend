const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URI);
  } catch (err) {
    console.error(err);
  }
};

module.exports = connectDB;
