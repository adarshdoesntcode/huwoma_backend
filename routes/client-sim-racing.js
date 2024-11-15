const simRacingController = require("../controllers/simRacingController");
const express = require("express");

const router = express.Router();

router.route("/1").post(simRacingController.clientStartRace);
router.route("/2").post(simRacingController.startRaceFromClient);

router.route("/transaction").get(simRacingController.getTransactionForClient);

module.exports = router;
