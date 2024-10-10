const express = require("express");
const router = express.Router();
const oAuthController = require("../controllers/oAuthController");

router.get("/google", oAuthController.googleOauthHandler);

module.exports = router;
