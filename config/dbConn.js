const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true,
      serverSelectionTimeoutMS: 5000,
    });
  } catch (err) {
    console.error(err);
  }
};

module.exports = connectDB;
