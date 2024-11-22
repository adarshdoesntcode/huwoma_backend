const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../config/roleList");

const parkingController = require("../controllers/parkingController");
const verifyRoles = require("../middleware/verifyRoles");

router
  .route("/transactions")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    parkingController.getParkingTransactions
  );

router
  .route("/checkoutdetails/:transactionId")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    parkingController.getCheckoutDetails
  );

router
  .route("/transaction/checkout")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    parkingController.parkingCheckout
  );

router
  .route("/transaction/:transactionId")
  .delete(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    parkingController.deleteParkingTransaction
  );

router
  .route("/start")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    parkingController.parkingStart
  );

module.exports = router;
