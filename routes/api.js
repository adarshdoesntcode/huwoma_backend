const express = require("express");
const router = express.Router();

router.get("/api", (req, res) => {
  res.send("api is running fine");
});
module.exports = router;
