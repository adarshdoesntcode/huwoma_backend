const jwt = require("jsonwebtoken");

const verifyRoles = (...allowedRoles) => {
  return async (req, res, next) => {
    if (!req?.role) return res.sendStatus(401);
    const rolesArray = [...allowedRoles];

    const result = req.role
      .map((role) => rolesArray.includes(role))
      .find((val) => val === true);
    if (!result) return res.sendStatus(401);
    next();
  };
};

module.exports = verifyRoles;
