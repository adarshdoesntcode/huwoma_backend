require("dotenv").config();
const qs = require("qs");
const { default: axios } = require("axios");
const Admin = require("../models/Admin");

const roleList = require("../config/roleList");
const {
  createAccessToken,
  createRefreshToken,
  setCookie,
} = require("./utils/token");
const SystemActivity = require("../models/SystemActivity");

const getGoogleOAuthTokens = async (req, res, code) => {
  const url = "https://oauth2.googleapis.com/token";
  const values = {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SCERET,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URL,
    grant_type: "authorization_code",
  };
  try {
    const response = await axios.post(url, qs.stringify(values), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  } catch (err) {
    console.error(err.message);
  }
};

const getGoogleUser = async (id_token, access_token) => {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
      {
        headers: {
          Authorization: `Bearer ${id_token}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error(err.message);
  }
};

const updateUserDetails = async (userModel, googleUser, refreshToken) => {
  const updatedUser = await userModel.findOneAndUpdate(
    {
      email: googleUser.email,
    },
    {
      email: googleUser.email,
      photo: googleUser.picture,
      $push: {
        refreshTokens: {
          token: refreshToken,
          createdAt: new Date(),
        },
      },
    },
    {
      new: true,
    }
  );
  return updatedUser;
};

const googleOauthHandler = async (req, res) => {
  try {
    // get the code from qs
    const code = req.query.code;

    const { id_token, access_token } = await getGoogleOAuthTokens(
      req,
      res,
      code
    );

    const googleUser = await getGoogleUser(id_token, access_token);

    if (!googleUser.verified_email) {
      res.sendStatus(403).send("Google account is not verified");
    }

    let validUser, validUserModel;

    validUser = await Admin.findOne({
      email: googleUser.email,
    });

    if (!validUser) {
      console.error("error-message:User doesn't exist");
      return res.redirect(`${process.env.CLIENT_BASE_URL}`);
    }

    validUserModel = Admin;

    const role = Object.values(validUser.role);

    const accessToken = createAccessToken(
      googleUser,
      role,
      process.env.ACCESS_TOKEN_EXPIRATION_TIME
    );

    if (!accessToken) return res.status(400).send("Access Token creation fail");

    const refreshToken = createRefreshToken(
      googleUser,
      process.env.REFRESH_TOKEN_EXPIRATION_TIME
    );

    if (!refreshToken)
      return res.status(400).send("Refresh Token creation fail");

    const user = await updateUserDetails(
      validUserModel,
      googleUser,
      refreshToken
    );
    setCookie(res, refreshToken);

    new SystemActivity({
      description: `Administrator (${validUser.fullname}) logged in.`,
      activityType: "Login",
      systemModule: "Google OAuth",
      activityBy: validUser._id,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    res.redirect(`${process.env.CLIENT_BASE_URL}`);
  } catch (err) {
    console.error(err.message);
    return res.redirect(`${process.env.CLIENT_BASE_URL}/login`);
  }
};

module.exports = { googleOauthHandler };
