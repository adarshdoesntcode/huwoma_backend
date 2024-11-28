const express = require("express");
const router = express.Router();

const verifyRoles = require("../middleware/verifyRoles");
const ROLES_LIST = require("../config/roleList");

const systemActivityController = require("../controllers/systemActivityController");

router
  .route("/:param")
  .get(
    verifyRoles(ROLES_LIST.superAdmin, ROLES_LIST.admin),
    systemActivityController.getSystemActivity
  );

module.exports = router;
