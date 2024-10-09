const express = require("express");
const verifyRoles = require("../middleware/verifyRoles");
const ROLES_LIST = require("../config/roleList");
const carWashController = require("../controllers/carWashController");

const router = express.Router();

//====================CUSTOMER======================

router
  .route("/customer")
  .post(verifyRoles(ROLES_LIST.superAdmin), carWashController.createCustomer)
  .get(verifyRoles(ROLES_LIST.superAdmin), carWashController.getCustomer);

module.exports = router;
