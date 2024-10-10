const express = require("express");
const router = express.Router();
const passwordResetController = require("../controllers/passwordResetController");

router.post("/email", passwordResetController.forgotPassword);
router.post("/otp", passwordResetController.matchOTP);
router.post("/password", passwordResetController.passwordReset);

module.exports = router;
