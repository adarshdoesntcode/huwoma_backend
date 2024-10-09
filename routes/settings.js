const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../config/roleList");
const verifyRoles = require("../middleware/verifyRoles");
const settingsController = require("../controllers/settingsController");

//====================VEHICLE TYPE======================

router
  .route("/carwash/vehicletype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createVehicleType
  )
  .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getAllVehicleType)
  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updateVehicleType)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteVehicleType
  );

//====================SERVICE TYPE======================

router
  .route("/carwash/servicetype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createServiceType
  )
  .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getAllServiceType)
  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updateServiceType)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteServiceType
  );

//====================PACKAGE TYPE======================

router
  .route("/carwash/packagetype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createPackageType
  )
  .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getAllPackageType)
  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updatePackageType)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deletePackageType
  );

//====================PAYMENT MODE======================

router
  .route("/paymentmode")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createPaymentMode
  )
  .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getAllPaymentMode)
  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updatePaymentMode)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deletePaymentMode
  );

module.exports = router;
