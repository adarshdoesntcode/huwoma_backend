const express = require("express");
const router = express.Router();
const carWashController = require("../controllers/carWashController");
const posController = require("../controllers/posController");

router.post("/login", posController.posLogin);

// ======================CUSTOMER=============================

router
  .route("/carwash/customer")
  .post(carWashController.createCustomer)
  .get(carWashController.getCustomer);

// ====================TRANSACTION=============================

module.exports = router;
