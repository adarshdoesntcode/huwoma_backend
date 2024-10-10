const jwt = require("jsonwebtoken");

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
    sameSite: "None",
    secure: true,
    maxAge: 24 * 60 * 60 * 1000,
    // domain: "project-phoenix-omega.vercel.app", using coleascing operator TODO
  });
};

module.exports = { createAccessToken, createRefreshToken, setCookie };
