const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

const jwt = require("jsonwebtoken");
const roleList = require("../config/roleList");
const { createAccessToken } = require("./createSetTokens/createAccessToken");
const { createRefreshToken } = require("./createSetTokens/createRefreshToken");
const { setCookie } = require("./createSetTokens/setCookie");

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        message: "Username and password are required to login!",
      });

    // check for user found or not
    let foundUser;

    foundUser = await Admin.findOne({
      email: email,
    }).exec();

    if (!foundUser)
      return res.status(401).json({
        message: "Unauthorized User", //401 ---> Unauthorized user
      });

    let match;
    try {
      //check for the password match
      match = await bcrypt.compare(password, foundUser.password);
    } catch (err) {
      console.error(`error-message: ${err.message}`);
      return res.status(401).json({
        message: "Unauthorized User", //401 ---> Unauthorized user
      });
    }

    if (match) {
      const role = Object.values(foundUser.role);

      //create JWTs for authorization
      //creating access token
      const accessToken = createAccessToken(
        foundUser,
        role,
        process.env.ACCESS_TOKEN_EXPIRATION_TIME
      );

      if (!accessToken)
        return res.status(400).send("Access Token creation fail");

      //creating refresh token
      const refreshToken = createRefreshToken(
        foundUser,
        process.env.REFRESH_TOKEN_EXPIRATION_TIME
      );

      if (!refreshToken)
        return res.status(400).send("Refresh Token creation fail");

      // sving refreshToken with currrent user
      foundUser.refreshToken = refreshToken;
      const result = await foundUser.save();
      // saving refreshToken to the cookie
      setCookie(res, refreshToken);

      foundUser.password = undefined;
      foundUser.refreshToken = undefined;

      //sending accessToken as an response
      return res.status(200).json({
        accessToken,
        user: foundUser,
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized User", //401 ---> Unauthorized user
      });
    }
  } catch (err) {
    console.log(`error-message`);
    return res.sendStatus(400);
  }
};

module.exports = { handleLogin };
