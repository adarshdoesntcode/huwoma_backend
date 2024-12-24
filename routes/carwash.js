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
router
  .route("/customers")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getAllCustomers
  );

router
  .route("/customer/:id")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getCustomerById
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.updateCarwashCustomer
  );

//====================TRANSACTION======================
router
  .route("/transaction/prefilter")
  .get(
    verifyRoles(ROLES_LIST.superAdmin),
    carWashController.getPreFilterTransactions
  );
router
  .route("/transaction/postfilter")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    carWashController.getPostFilterTransactions
  );

router
  .route("/transaction/edit")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getPreEditTransactionData
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.editCarwashTransaction
  );

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
  .route("/checkoutdetails/:customerId")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.getCheckoutDetails
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

router
  .route("/transaction/3")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.transactionThree
  );

router
  .route("/transaction/booking")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.createNewBookingTransaction
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.transactionStartFromBooking
  );

router
  .route("/transaction/rollback/pickup")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.rollbackFromPickup
  );

router
  .route("/transaction/rollback/completed")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    carWashController.rollbackFromCompleted
  );

module.exports = router;
