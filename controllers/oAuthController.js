require("dotenv").config();
const qs = require("qs");
const { default: axios } = require("axios");
const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Supervisor = require("../models/Supervisor");
const roleList = require("../config/roleList");
const {
  createAccessToken,
  createRefreshToken,
  setCookie,
} = require("./utils/token");
const {
  extractRollAndBatch,
} = require("./utility functions/extractRollAndBatch");
const {
  updateRollBatchAndStatus,
} = require("./utility functions/updateRollBatchAndStatus");
const {
  initializeProgressStatus,
} = require("./utility functions/initializeProgressStatus");

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

const getGoogleUser = async ({ id_token, access_token }) => {
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

const updateUserDetails = async (userModel, googleUser, role, refreshToken) => {
  const updatedUser = await userModel.findOneAndUpdate(
    {
      email: googleUser.email,
    },
    {
      email: googleUser.email,
      fullname: googleUser.name,
      photo: googleUser.picture,
      role: role,
      refreshToken: refreshToken,
    },
    {
      upsert: true,
      new: true,
    }
  );
  return updatedUser;
};

const googleOauthHandler = async (req, res) => {
  const { state } = req.query;
  const decodedState = decodeURIComponent(state);
  const { role, home_path } = JSON.parse(decodedState);
  try {
    // get the code from qs
    const code = req.query.code;

    const origin = req.get("host");

    const { id_token, access_token } = await getGoogleOAuthTokens(
      req,
      res,
      code
    );

    const googleUser = await getGoogleUser({ id_token, access_token });

    // jwt.decode(id_token);

    if (!googleUser.verified_email) {
      res.sendStatus(403).send("Google account is not verified");
    }

    let validUser, validUserModel, rollNumber, batchNumber, progressStatus;
    // let necessaryModel;
    if (role === roleList.Admin) {
      //validate admin email-->boolean state
      //just check whether the googleUser present in db inside admin collection or not
      validUser = await Admin.findOne({
        email: googleUser.email,
        role: { $in: [role] },
      }).exec();
      validUserModel = Admin;
    } else if (role === roleList.Student) {
      //validate student email-->boolean state
      // Define the regex pattern
      const studentEmailRegex = /^[a-zA-Z]+\.[0-9]{6}@ncit\.edu\.np$/;

      validUser = studentEmailRegex.test(googleUser.email);
      validUserModel = Student;

      //extract roll number and batch number from the email address of the student
      const { rollNo, batchNo } = extractRollAndBatch(googleUser.email);
      rollNumber = rollNo;
      batchNumber = batchNo;
    } else if (role === roleList.Supervisor) {
      //validate super email-->boolean state
      const supervisorEmailRegex =
        /^[a-zA-Z]+(?:\.[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(?:\.[a-zA-Z0-9]+)*\.edu\.np$/;
      // const studentEmailRegex = /^[a-zA-Z]+\.[0-9]{6}@ncit\.edu\.np$/;

      // const isStudentEmail = studentEmailRegex.test(googleUser.email);
      // validUser =
      //   supervisorEmailRegex.test(googleUser.email) && !isStudentEmail;
      validUser = supervisorEmailRegex.test(googleUser.email);
      validUserModel = Supervisor;
    } else {
      return res.sendStatus(401);
    }

    if (!validUser) {
      console.error("error-message:User doesn't exist");
      return res.redirect(`${process.env.CLIENT_BASE_URL}`);
    }

    console.log("entering into access token creation");
    //creating access token
    const accessToken = createAccessToken(
      googleUser,
      role,
      process.env.ACCESS_TOKEN_EXPIRATION_TIME
    );

    console.log("🚀 ~ googleOauthHandler ~ accessToken:", accessToken);
    if (!accessToken) return res.status(400).send("Access Token creation fail");
    //creating refresh token
    const refreshToken = createRefreshToken(
      googleUser,
      process.env.REFRESH_TOKEN_EXPIRATION_TIME
    );

    console.log("🚀 ~ googleOauthHandler ~ refreshToken:", refreshToken);
    if (!refreshToken)
      return res.status(400).send("Refresh Token creation fail");
    // upsert the user based on the role and model
    //function passing the role required model and refreshToken to save to the db
    const user = await updateUserDetails(
      validUserModel,
      googleUser,
      role,
      refreshToken
    );

    console.log("🚀 ~ googleOauthHandler ~ user:", user);
    //update rollnumber, batch number only if the googleUser is a student of the organization else skip the update function call
    if (validUserModel === Student) {
      //determine the progress status of the student on their project based on the year of their academic and setting the progress status to database
      if (!user.progressStatus) {
        progressStatus = initializeProgressStatus(batchNumber);
      }
      updateRollBatchAndStatus(
        res,
        googleUser.email,
        rollNumber,
        batchNumber,
        progressStatus
      );
    }

    // set cookie
    // saving refreshToken to the cookie
    setCookie(res, refreshToken);

    console.log("🚀 ~ googleOauthHandler ~ home_path:", home_path);
    // redirect back to client
    res.redirect(`${home_path}/${Number(role)}`);
  } catch (err) {
    console.log("🚀 ~ googleOauthHandler ~ home_path:", home_path);
    console.error(err.message);
    return res.redirect(`${home_path}`);
  }
};

module.exports = { googleOauthHandler };
