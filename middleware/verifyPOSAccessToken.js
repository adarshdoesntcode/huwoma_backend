const jwt = require("jsonwebtoken");
const POSAccess = require("../models/POSAccess");
const { errorResponse } = require("../controllers/utils/reponse");

const verifyPOSAccessToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer "))
    return errorResponse(res, 401, "Invalid Token.");

  const token = authHeader.split(" ")[1];

  if (!token) {
    return errorResponse(res, 401, "Access token is required.");
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    if (!decoded) {
      return errorResponse(res, 403, "Invalid token.");
    }

    const posAccess = await POSAccess.findOne({
      _id: decoded.id,
      uuid: decoded.uuid,
    });

    if (!posAccess) {
      return errorResponse(res, 404, "Invalid access.");
    }

    req.pos = posAccess;
    next();
  } catch (err) {
    return errorResponse(res, 403, "Invalid or expired access token.");
  }
};

module.exports = verifyPOSAccessToken;
