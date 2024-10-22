const jwt = require("jsonwebtoken");
require("dotenv").config();
const roleList = require("../config/roleList");

const Admin = require("../models/Admin");

const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401);

  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
    if (err) return res.sendStatus(403);

    let freshUser;
    const email = decoded.UserInfo?.email;
    const role = decoded.UserInfo?.role;

    if (!email || !role) {
      return res.status(400).json({ message: "Invalid token" });
    }

    try {
      if (role.includes(roleList.admin) || role.includes(roleList.superAdmin)) {
        freshUser = await Admin.findOne({ email });
      } else {
        return res.sendStatus(400); // Bad request if role doesn't match
      }

      if (!freshUser) return res.sendStatus(404); // Not found if no user is found

      req.email = email;
      req.role = role;
      req.userId = freshUser._id;
      next();
    } catch (error) {
      return res.sendStatus(500); // Internal server error
    }
  });
};

module.exports = verifyJWT;
