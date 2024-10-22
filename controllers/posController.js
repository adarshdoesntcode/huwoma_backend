const POSAccess = require("../models/POSAccess");
const jwt = require("jsonwebtoken");
const { successResponse, errorResponse } = require("./utils/reponse");

const posLogin = async (req, res) => {
  try {
    const { accessCode } = req.body;

    const posAccess = await POSAccess.findOne({ accessCode });
    if (!posAccess) {
      return errorResponse(res, 401, "Invalid access code.");
    }

    const accessToken = jwt.sign(
      { id: posAccess._id, name: posAccess.name, uuid: posAccess.uuid },
      process.env.ACCESS_TOKEN_SECRET
    );

    return successResponse(res, 200, "Login successful.", { accessToken });
  } catch (err) {
    return errorResponse(res, 500, "Server error.");
  }
};

module.exports = { posLogin };
