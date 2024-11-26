const jwt = require("jsonwebtoken");
const roleList = require("../config/roleList");

const Admin = require("../models/Admin");
const redis = require("../config/redisConn");

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
        const cachedUser = await redis.get(`admin:${email}`);

        if (cachedUser) {
          freshUser = JSON.parse(cachedUser);
        } else {
          freshUser = await Admin.findOne({ email });
        }
      } else {
        return res.sendStatus(400);
      }

      if (!freshUser) return res.sendStatus(404);

      req.email = email;
      req.role = role;
      req.userId = freshUser._id;

      next();
    } catch (error) {
      return res.sendStatus(500);
    }
  });
};

module.exports = verifyJWT;
