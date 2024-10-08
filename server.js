require("dotenv").config();
const express = require("express");
const app = express();
const path = require("path");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

// Import custom modules
const corsOptions = require("./config/corsOptions");
const verifyJWT = require("./middleware/verifyJWT");
const credentials = require("./middleware/credentials");
const connectDB = require("./config/dbConn");

const PORT = process.env.PORT || 3500;

// Connect MongoDB
connectDB();

// Middleware for handling credentials and CORS
app.use(credentials);
app.use(cors(corsOptions));

// Built-in middleware to handle URL-encoded and JSON data
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Middleware for parsing cookies
app.use(cookieParser());

// Serve static files (uncomment if needed)
// app.use(express.static(path.join(__dirname, "/public")));

// Define routes
app.use("/api/register", require("./routes/register"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/logout", require("./routes/logout"));

app.use("/api/refresh", require("./routes/refresh"));

app.use("/api/forgotPassword/email", require("./routes/forgotPassword"));
app.use("/api/forgotPassword/OTP", require("./routes/matchOTP"));
app.use("/api/forgotPassword/password", require("./routes/passwordReset"));

// JWT verification middleware (protects routes that come after this)
app.use(verifyJWT);

app.use("/api/settings", require("./routes/api/settings"));

// Additional secured routes (uncomment if needed)
// app.use("/api/user", require("./routes/getUserInformation"));
// app.use("/api/event", require("./routes/api/events"));
// app.use("/api/evaluator", require("./routes/api/evaluators"));
// app.use("/api/student", require("./routes/api/students"));
// app.use("/api/supervisor", require("./routes/api/supervisors"));

// Listen to the MongoDB connection event
mongoose.connection.once("open", () => {
  console.log("Connected to MongoDB");
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
