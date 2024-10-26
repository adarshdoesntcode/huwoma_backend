const express = require("express");
const verifyRoles = require("../middleware/verifyRoles");
const ROLES_LIST = require("../config/roleList");
const carWashController = require("../controllers/carWashController");

const router = express.Router();

//====================CUSTOMER======================

router
  .route("/customer/find")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.findCustomer
  );
router
  .route("/customer/new")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.createCustomer
  );

//====================TRANSACTION======================
router
  .route("/transaction/:id")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getTransactionForInspection
  )
  .delete(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.deleteTransaction
  );

router
  .route("/transactions")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getCarwashTransactions
  );

router
  .route("/transaction/1")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.transactionOne
  );
router
  .route("/transaction/2")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.transactionTwo
  );

module.exports = router;
