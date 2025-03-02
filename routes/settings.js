const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../config/roleList");
const verifyRoles = require("../middleware/verifyRoles");
const settingsController = require("../controllers/settingsController");
const authController = require("../controllers/authController");

//====================GENERAL======================
router
  .route("/general/:id")
  .put(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    authController.updateAdminProfile
  );

router
  .route("/admins")
  .get(verifyRoles(ROLES_LIST.superAdmin), authController.getAllAdmins)
  .post(verifyRoles(ROLES_LIST.superAdmin), authController.handleNewAdmin)
  .delete(verifyRoles(ROLES_LIST.superAdmin), authController.handleDeleteAdmin)
  .put(verifyRoles(ROLES_LIST.superAdmin), authController.handleUpdateAdmin);

//====================VEHICLE TYPE======================

router
  .route("/carwash/vehicletype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createVehicleType
  )
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getAllVehicleType
  )
  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updateVehicleType)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteVehicleType
  );
router
  .route("/carwash/vehicletype/:id")
  .get(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.getVehicleTypeById
  );
//====================SERVICE TYPE======================

router
  .route("/carwash/servicetype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createServiceType
  )

  .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updateServiceType)
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteServiceType
  );

router
  .route("/carwash/servicetype/:vehicleTypeId")
  .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getServiceType);
//====================PACKAGE TYPE======================

// router
//   .route("/carwash/packagetype")
//   .post(
//     verifyRoles(ROLES_LIST.superAdmin),
//     settingsController.createPackageType
//   )
//   .get(verifyRoles(ROLES_LIST.superAdmin), settingsController.getAllPackageType)
//   .put(verifyRoles(ROLES_LIST.superAdmin), settingsController.updatePackageType)
//   .delete(
//     verifyRoles(ROLES_LIST.superAdmin),
//     settingsController.deletePackageType
//   );

//====================INSPECTION======================

router
  .route("/carwash/inspection")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getInspectionTemplate
  )
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createInspectionTemplate
  );

//====================INSPECTION======================

router
  .route("/configuration")
  .get(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.getInspectionTemplate
  )
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createInspectionTemplate
  );

//====================SIM RACING RIG======================

router
  .route("/simracing")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getAllSimRacingRigs
  )
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createNewSimRacingRig
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.updateSimRacingRig
  )
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteSimRacingRig
  );

router
  .route("/simracing/location")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getSimRacingCoordinates
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.updateSimRacingCoordinates
  );

//====================PARKING======================

router
  .route("/parking")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getAllParkingVehicles
  )
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createParkingVehicleType
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.updateParkingVehicleType
  )
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deleteParkingVehicleType
  );

//====================PAYMENT MODE======================

router
  .route("/paymentmode")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createPaymentMode
  )
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getAllPaymentMode
  )
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deletePaymentMode
  )
  .put(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.updatePaymentMode
  );

//====================POS ACCESS======================

router
  .route("/pos-access")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    settingsController.getAllPOSAccess
  )
  .post(verifyRoles(ROLES_LIST.superAdmin), settingsController.createPOSAccess);

router
  .route("/pos-access/:id")
  .delete(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.deletePOSAccess
  );

module.exports = router;
