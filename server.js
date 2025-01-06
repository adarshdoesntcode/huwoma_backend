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
const ROLES_LIST = require("./config/roleList");

const verifyPOSAccessToken = require("./middleware/verifyPOSAccessToken");
const {
  connectDB,
  connectRedis,
  connectRedisMiddleware,
} = require("./config/dbConn");
const verifyRoles = require("./middleware/verifyRoles");
const { getDashboardData } = require("./controllers/dashboardController");

const PORT = process.env.PORT || 3500;
app.set("trust proxy", true);
app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());
app.use(connectRedisMiddleware);

connectDB(5);
// connectRedis();

// Define routes

app.use("/", require("./routes/api"));

app.use("/api/startrace", require("./routes/client-sim-racing"));
app.use("/api/myrace", require("./routes/client-sim-racing"));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/oauth", require("./routes/oauth"));
app.use("/api/password-reset", require("./routes/password-reset"));
app.use("/api/pos-auth", require("./routes/pos"));

app.use("/api/simracing", verifyJWT, require("./routes/simracing"));
app.use("/api/pos", verifyPOSAccessToken, require("./routes/pos"));
app.use("/api/settings", verifyJWT, require("./routes/settings"));
app.use("/api/carwash", verifyJWT, require("./routes/carwash"));
app.use("/api/parking", verifyJWT, require("./routes/parking"));
app.use("/api/systemactivity", verifyJWT, require("./routes/system-activity"));
app.use(
  "/api/dashboard",
  verifyJWT,
  verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
  getDashboardData
);

if (process.env.NODE_ENV !== "production") {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server Running on Port : ${PORT} 🚀🚀`);
  });
}

module.exports = app;
