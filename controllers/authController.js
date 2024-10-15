const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const roleList = require("../config/roleList");
const {
  createAccessToken,
  createRefreshToken,
  setCookie,
} = require("./utils/token");

const handleNewAdmin = async (req, res) => {
  const { fullname, email, phoneNumber, role } = req.body;

  if (!fullname || !email || !phoneNumber || !role)
    return res.status(400).json({
      message: "All credentials are required",
    });

  let duplicate;

  duplicate = await Admin.findOne({ email: email });

  if (duplicate)
    return res.status(409).json({
      message: "Duplicate Credentials.",
    });

  try {
    const password = "huwoma@123";
    const hashedPassword = await bcrypt.hash(password, 10);
    let result;

    result = await Admin.create({
      fullname: fullname,
      email: email,
      password: hashedPassword,
      phoneNumber: phoneNumber,
      role: [role],
    });

    res.status(201).json({
      message: `New User ${fullname} has been created!`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(email, password);
    if (!email || !password)
      return res.status(400).json({
        message: "Username and password are required to login!",
      });

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
      match = await bcrypt.compare(password, foundUser.password);
    } catch (err) {
      console.error(`error-message: ${err.message}`);
      return res.status(401).json({
        message: "Unauthorized User", //401 ---> Unauthorized user
      });
    }

    if (match) {
      const role = Object.values(foundUser.role);

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

      foundUser.refreshToken = refreshToken;
      const result = await foundUser.save();

      setCookie(res, refreshToken);

      foundUser.password = undefined;
      foundUser.refreshToken = undefined;

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

const handleLogout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(204); //No Content

  const refreshToken = cookies.jwt;
  console.log("🚀 ~ handleLogout ~ refreshToken:", refreshToken);
  // check for user found or not
  const foundUser = await Admin.findOne({ refreshToken });

  if (!foundUser) {
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    return res.sendStatus(403);
  }

  foundUser.refreshToken = "";
  const result = await foundUser.save();
  console.log("🚀 ~ handleLogout ~ result:", result);

  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });

  res.sendStatus(204);
};

const handleRefreshToken = async (req, res) => {
  try {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401); //Unauthorized

    const refreshToken = cookies.jwt;
    // check for user found or not
    const foundUser = await Admin.findOne({ refreshToken });

    if (!foundUser) return res.sendStatus(403);

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, decoded) => {
        if (err || foundUser.email !== decoded.email)
          return res.sendStatus(403);

        const role = Object.values(foundUser.role);

        const accessToken = createAccessToken(
          foundUser,
          role,
          process.env.ACCESS_TOKEN_EXPIRATION_TIME
        );

        foundUser.password = undefined;
        foundUser.refreshToken = undefined;
        res.json({ accessToken, user: foundUser });
      }
    );
  } catch (err) {
    console.log(`error-message:${err.message}`);
    return res.sendStatus(400);
  }
};

module.exports = {
  handleNewAdmin,
  handleLogin,
  handleLogout,
  handleRefreshToken,
};
