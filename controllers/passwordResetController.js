const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const roleList = require("../config/roleList");

const Admin = require("../models/Admin");
const { createAccessToken } = require("./utils/token");

require("dotenv").config();

function generateOTP() {
  const otp = Math.floor(100000 + Math.random() * 900000);
  return otp;
}

const forgotPassword = async (req, res) => {
  const { email } = req.body;

  //check for email and role
  if (!email) return res.sendStatus(400);

  let foundUser;

  foundUser = await Admin.findOne({
    email: email,
  });

  //404 status check
  if (!foundUser)
    return res
      .status(404)
      .send("User with provided credentials doesn't exists");

  // // Check if the email exists in your user database
  try {
    //generate OTP code
    const otpCode = generateOTP().toString();
    const hashedOTP = await bcrypt.hash(otpCode, 10);
    //save OTP code to the databse
    foundUser.OTP = hashedOTP;
    const resultUser = await foundUser.save();

    //create an access token to send to the client side
    const accessToken = createAccessToken(
      foundUser,
      foundUser.role,
      process.env.OTP_ACCESS_TOKEN_EXPIRATION_TIME
    );

    // Send the reset token to the user's email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      host: "smtp.ethereal.email",
      port: 465,
      secure: true, // Use `true` for port 465, `false` for all other ports
      auth: {
        user: process.env.NODEMAILER_USER,
        pass: process.env.NODEMAILER_PASS,
      },
    });
    const mailOptions = {
      from: {
        name: "Huwoma",
        address: "adarshdai@gmail.com",
      },
      to: foundUser.email,
      subject: "Password Reset OTP Code",
      text: `Please use this OTP code to reset your password. OTP code:${otpCode}`,
    };
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        res.status(500).send("Error sending email");
      } else {
        console.log(`Email sent: ${info.response}`);
        res.status(200).json({ accessToken });
      }
    });
  } catch (err) {
    console.error(`"error-message":${err.message}`);
    return res.sendStatus(400);
  }
};

const matchOTP = async (req, res) => {
  const { OTP } = req.body;

  // const authHeader = req.headers["authorization"];
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401); //Unauthorized
  const accessToken = authHeader.split(" ")[1];

  // const accessToken =token;
  if (!accessToken || !OTP) return res.sendStatus(401);

  //verify and decode access token and chech for the user
  //evaluate jwt for creating access token
  jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET,
    async (err, decoded) => {
      if (err || !decoded.UserInfo.email || !OTP) return res.sendStatus(403);

      const currentUserEmail = decoded.UserInfo.email;
      const role = decoded.UserInfo.role;

      try {
        // check for user found or not
        let foundUser;

        foundUser = await Admin.findOne({
          email: currentUserEmail,
        });

        if (!foundUser) return res.sendStatus(404);

        const otpMatch = await bcrypt.compare(OTP, foundUser.OTP);

        //otp is not matched
        if (!otpMatch) return res.sendStatus(401);

        //when otp is match
        //create access token from refresh token
        const accessToken = createAccessToken(
          foundUser,
          role,
          process.env.OTP_ACCESS_TOKEN_EXPIRATION_TIME
        );

        if (!accessToken)
          return res.status(400).send("Access Token creation fail");

        res.status(200).json({ accessToken });
      } catch (err) {
        console.error(`"error-message":${err.message}`);
        return res.sendStatus(400);
      }
    }
  );
};

const passwordReset = async (req, res) => {
  console.log(req.body);
  const { password } = req.body;
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.sendStatus(401); //Unauthorized

  const accessToken = authHeader.split(" ")[1];
  // const accessToken = token;
  if (!accessToken || !password)
    return res.status(401).json({
      message: "Unauthorized User",
    });

  // verify token and save new hashedPassword to db
  jwt.verify(
    accessToken,
    process.env.ACCESS_TOKEN_SECRET,
    async (err, decoded) => {
      if (err || !decoded.UserInfo.email)
        return res.sendStatus(403).send("Forbidden");

      const currentUserEmail = decoded.UserInfo.email;
      const role = decoded.UserInfo.role;

      try {
        // check for user found or not
        let foundUser;

        foundUser = await Admin.findOne({
          email: currentUserEmail,
        });

        if (!foundUser) return res.sendStatus(404).send("User not found");

        //when otp is match
        //create access token from refresh token
        const accessToken = createAccessToken(
          foundUser,
          role,
          process.env.OTP_ACCESS_TOKEN_EXPIRATION_TIME
        );

        if (!accessToken)
          return res.status(400).send("Access Token creation fail");

        //hash new password
        const newHashedPassword = await bcrypt.hash(password, 10);
        foundUser.password = newHashedPassword;
        foundUser.OTP = "";
        const updatedUser = await foundUser.save();
        updatedUser.password = undefined;
        updatedUser.refreshToken = undefined;
        return res.status(200).json({
          user: updatedUser,
        });
      } catch (err) {
        console.error(`"error-message":${err.message}`);
        return res.sendStatus(400);
      }
    }
  );
};
module.exports = { forgotPassword, matchOTP, passwordReset };
