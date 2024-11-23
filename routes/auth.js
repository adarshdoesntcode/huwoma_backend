const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const verifyJWT = require("../middleware/verifyJWT");

router.get("/register", verifyJWT, authController.handleNewAdmin);
router.post("/login", authController.handleLogin);
router.get("/refresh", authController.handleRefreshToken);
router.get("/logout", authController.handleLogout);

module.exports = router;
