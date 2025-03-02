const jwt = require("jsonwebtoken");
const POSAccess = require("../../models/POSAccess");

const createAccessToken = (foundUser, role, expirationTime) => {
  try {
    const accessToken = jwt.sign(
      {
        UserInfo: {
          email: foundUser.email,
          role: role,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: expirationTime }
    );
    return accessToken;
  } catch (err) {
    console.error(`error-message-access-token-creation:${err.message}`);
    return null;
  }
};

const createRefreshToken = (foundUser, expirationTime) => {
  try {
    const refreshToken = jwt.sign(
      { email: foundUser.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: expirationTime }
    );
    return refreshToken;
  } catch (err) {
    console.error(`error-message:${err.message}`);
    return null;
  }
};

const setCookie = (res, refreshToken) => {
  res.cookie("jwt", refreshToken, {
    httpOnly: true,
    sameSite: "Strict",
    secure: true,
    maxAge: 31 * 24 * 60 * 60 * 1000,
  });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  setCookie,
};
