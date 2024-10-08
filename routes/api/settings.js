const express = require("express");
const router = express.Router();
const ROLES_LIST = require("../../config/roleList");
const verifyRoles = require("../../middleware/verifyRoles");
const settingsController = require("../../controllers/settingsController");

router
  .route("/carwash/vehicletype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createVehicleType
  );

router
  .route("/carwash/servicetype")
  .post(
    verifyRoles(ROLES_LIST.superAdmin),
    settingsController.createServiceType
  );

module.exports = router;
