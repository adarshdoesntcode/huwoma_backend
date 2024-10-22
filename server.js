require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

// Import custom modules
const corsOptions = require("./config/corsOptions");
const verifyJWT = require("./middleware/verifyJWT");
const credentials = require("./middleware/credentials");
const connectDB = require("./config/dbConn");

const PORT = process.env.PORT || 3500;

connectDB();

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

// Define routes
app.use("/", require("./routes/api"));
app.use("/api/auth", require("./routes/auth"));
// app.use("/api/oauth", require("./routes/oauth"));
app.use("/api/password-reset/", require("./routes/password-reset"));

app.use(verifyJWT);

app.use("/api/settings", require("./routes/settings"));
app.use("/api/carwash", require("./routes/carwash"));

mongoose.connection.once("open", () => {
  console.log("Database Connected ✅");
  app.listen(PORT, () => console.log(`Server Running on Port : ${PORT} 🚀🚀`));
});

module.exports = app;
