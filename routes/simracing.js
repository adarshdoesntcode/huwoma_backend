const express = require("express");
const verifyRoles = require("../middleware/verifyRoles");
const ROLES_LIST = require("../config/roleList");
const simRacingController = require("../controllers/simRacingController");

const router = express.Router();

// ======================CUSTOMER=============================

router
  .route("/customer/find")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.findCustomer
  );
router
  .route("/customer/new")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.createCustomer
  );

router
  .route("/customers")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.getAllCustomers
  );

router
  .route("/customer/:id")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.getCustomerById
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.updateSimracingCustomer
  );

// ======================RIG=============================

router
  .route("/rigs")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.getAvailableRigs
  );

// ======================TRANSACTIONS=============================

router
  .route("/transaction/start")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.raceStart
  );
router
  .route("/transaction/pause")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.pauseRace
  );
router
  .route("/transaction/resume")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.resumeRace
  );
router
  .route("/transaction/changerig")
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.changeRig
  );

router
  .route("/transaction/rollback")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.rollbackFromCompleted
  );

router
  .route("/transactions")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.getSimracingTransactions
  );

router
  .route("/filteredtransactions")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    simRacingController.getFilteredSimRacingTransactions
  );

router
  .route("/transaction/booking")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.createNewBookingTransaction
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.raceStartFromBooking
  );

router
  .route("/checkoutdetails/:transactionId")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.getCheckoutDetails
  );

router
  .route("/transaction/checkout")
  .post(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.simracingCheckout
  );

router
  .route("/transaction/:id")

  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.cancelRace
  )
  .delete(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    simRacingController.deleteTransaction
  );

module.exports = router;
