const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const {
  createAccessToken,
  createRefreshToken,
  setCookie,
} = require("./utils/token");
const { errorResponse, successResponse } = require("./utils/reponse");
const { sendEmail } = require("./mailController");
const roleList = require("../config/roleList");
const SystemActivity = require("../models/SystemActivity");
const redis = require("../config/redisConn");

const handleNewAdmin = async (req, res) => {
  const { fullname, email, phoneNumber, role, confirmPassword, password } =
    req.body;

  if (
    !fullname ||
    !email ||
    !phoneNumber ||
    !role ||
    !password ||
    !confirmPassword
  )
    return errorResponse(res, 400, "All credentials are required");

  let duplicate;

  duplicate = await Admin.findOne({ email: email });

  if (duplicate) return errorResponse(res, 409, "Duplicate Credentials.");

  if (password !== confirmPassword) {
    return errorResponse(
      res,
      400,
      "New password and confirm password do not match"
    );
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = await Admin.create({
      fullname: fullname,
      email: email,
      password: hashedPassword,
      phoneNumber: phoneNumber,
      role: [role],
    });

    await redis.set(`admin:${newAdmin.email}`, JSON.stringify(newAdmin));
    await redis.del("admin:all");

    await sendEmail({
      to: email,
      subject: "New Admin",
      html: `
      <p>Hi ${fullname},</p>
      <p>Your account has been created. Please login with the following credentials:</p>
      <ul>
        <li>Email: ${email}</li>
        <li>Password: ${password}</li>
      </ul>
      <p>Please reset your password as soon as possible.</p>
      <p>Thank You.</p>
      `,
      fromName: "Huwoma",
    });

    new SystemActivity({
      description: `New administrator (${fullname}) added.`,
      activityType: "Create",
      systemModule: "Authentication",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    successResponse(res, 201, `New Admin ${fullname} has been created!`);
  } catch (err) {
    errorResponse(res, 500, err.message);
  }
};

const getAllAdmins = async (req, res) => {
  try {
    let admins = await redis.get("admin:all");
    if (!admins) {
      admins = await Admin.find().select("-password -refreshToken -OTP");
      if (admins) {
        await redis.set("admin:all", JSON.stringify(admins));
      }
    } else {
      admins = JSON.parse(admins);
    }
    // const admins = await Admin.find().select("-password -refreshToken -OTP");
    return successResponse(res, 200, "All Admins", admins);
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

const handleUpdateAdmin = async (req, res) => {
  const { adminId, fullname, email, phoneNumber, role } = req.body;

  try {
    const adminToUpdate = await Admin.findById(adminId);

    if (!adminToUpdate) {
      return errorResponse(res, 404, "Admin not found.");
    }

    if (fullname) adminToUpdate.fullname = fullname;
    if (email) adminToUpdate.email = email;
    if (phoneNumber) adminToUpdate.phoneNumber = phoneNumber;
    if (role) adminToUpdate.role = role;

    await adminToUpdate.save();

    await redis.set(
      `admin:${adminToUpdate.email}`,
      JSON.stringify(adminToUpdate)
    );
    await redis.del("admin:all");

    return successResponse(res, 200, "Admin updated successfully");
  } catch (err) {
    return errorResponse(res, 500, err.message);
  }
};

const handleDeleteAdmin = async (req, res) => {
  try {
    const { adminId } = req.body;

    const adminToDelete = await Admin.findById(adminId);

    if (!adminToDelete) {
      return errorResponse(res, 404, "Admin not found.");
    }

    const superAdmins = await Admin.countDocuments({
      role: { $in: [roleList.superAdmin] },
    });

    if (superAdmins <= 1 && adminToDelete.role.includes(roleList.superAdmin)) {
      return errorResponse(res, 403, "Cannot delete the last Super Admin.");
    }

    await Admin.findByIdAndDelete(adminId);

    await redis.del(`admin:${adminToDelete.email}`);
    await redis.del("admin:all");

    return successResponse(
      res,
      200,
      "Admin deleted successfully!",
      adminToDelete
    );
  } catch (err) {
    return errorResponse(res, 500, `Error: ${err.message}`);
  }
};

const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({
        message: "Username and password are required to login!",
      });

    let foundUser;

    const cachedUser = await redis.get(`admin:${email.toLowerCase()}`);

    if (cachedUser) {
      foundUser = JSON.parse(cachedUser);
    } else {
      foundUser = await Admin.findOne({
        email: email,
      });
      if (foundUser) {
        await redis.set(`admin:${email}`, JSON.stringify(foundUser));
      }
    }

    if (!foundUser)
      return res.status(401).json({
        message: "Unauthorized User",
      });

    let match;
    try {
      match = await bcrypt.compare(password, foundUser.password);
    } catch (err) {
      console.error(`error-message: ${err.message}`);
      return res.status(401).json({
        message: "Unauthorized User",
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

      await redis.set(
        `refresh:${refreshToken}`,
        JSON.stringify(foundUser),
        "EX",
        30 * 24 * 60 * 60
      );

      setCookie(res, refreshToken);

      foundUser.password = undefined;
      foundUser.refreshTokens = undefined;

      new SystemActivity({
        description: `Administrator (${foundUser.fullname}) logged in.`,
        activityType: "Login",
        systemModule: "Authentication",
        activityBy: foundUser._id,
        activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
        userAgent: req.headers["user-agent"],
      }).save();

      return res.status(200).json({
        accessToken,
        user: foundUser,
      });
    } else {
      return res.status(401).json({
        message: "Unauthorized User",
      });
    }
  } catch (err) {
    console.log(err);
    return res.sendStatus(400);
  }
};

const handleLogout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(204); // No Content

  const refreshToken = cookies.jwt;

  // Check if user exists with the provided refresh token
  const foundUser = await redis.get(`refresh:${refreshToken}`);
  // const foundUser = await Admin.findOne({
  //   "refreshTokens.token": refreshToken,
  // });

  if (!foundUser) {
    // Clear the cookie regardless of whether the user is found to prevent abuse
    res.clearCookie("jwt", {
      httpOnly: true,
      sameSite: "None",
      secure: true,
    });
    return res.sendStatus(403); // Forbidden
  }

  // Filter out the refresh token being logged out
  // foundUser.refreshTokens = foundUser.refreshTokens.filter(
  //   (tokenObj) => tokenObj.token !== refreshToken
  // );

  // await foundUser.save();

  await redis.del(`refresh:${refreshToken}`);

  // Clear the JWT cookie
  res.clearCookie("jwt", {
    httpOnly: true,
    sameSite: "None",
    secure: true,
  });

  new SystemActivity({
    description: `Administrator (${foundUser.fullname}) logged out.`,
    activityType: "Logout",
    systemModule: "Authentication",
    activityBy: foundUser._id,
    activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
    userAgent: req.headers["user-agent"],
  }).save();

  res.sendStatus(204); // No Content
};

const handleRefreshToken = async (req, res) => {
  try {
    const cookies = req.cookies;

    if (!cookies?.jwt) return res.sendStatus(401); //Unauthorized

    const refreshToken = cookies.jwt;
    // check for user found or not
    const cachedUser = await redis.get(`refresh:${refreshToken}`);

    // if (!user) {
    //   return res.sendStatus(403); //Forbidden
    // }
    // const foundUser = await Admin.findOne({
    //   "refreshTokens.token": refreshToken, // Searches for a specific token in the refreshTokens array
    // });

    if (!cachedUser) return res.sendStatus(403);

    const foundUser = JSON.parse(cachedUser);

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
        foundUser.refreshTokens = undefined;
        res.json({ accessToken, user: foundUser });
      }
    );
  } catch (err) {
    console.log(`error-message:${err.message}`);
    return res.sendStatus(400);
  }
};

const updateAdminProfile = async (req, res) => {
  const { id } = req.params;
  const {
    fullname,
    email,
    phoneNumber,
    currentPassword,
    newPassword,
    confirmPassword,
  } = req.body;

  let admin;
  try {
    admin = await Admin.findById(id);

    if (!admin) {
      return errorResponse(res, 404, "Admin not found");
    }

    if (fullname) {
      admin.fullname = fullname;
      await admin.save();
      const { password, refreshToken, ...adminData } = admin.toObject();
      return successResponse(
        res,
        200,
        "Fullname updated successfully",
        adminData
      );
    }

    if (email) {
      admin.email = email;
      await admin.save();
      const { password, refreshToken, ...adminData } = admin.toObject();
      return successResponse(res, 200, "Email updated successfully", adminData);
    }

    if (phoneNumber) {
      admin.phoneNumber = phoneNumber;
      await admin.save();
      const { password, refreshToken, ...adminData } = admin.toObject();
      return successResponse(
        res,
        200,
        "Phone number updated successfully",
        adminData
      );
    }

    if (currentPassword && newPassword && confirmPassword) {
      const isPasswordCorrect = await bcrypt.compare(
        currentPassword,
        admin.password
      );

      if (!isPasswordCorrect) {
        return errorResponse(res, 401, "Current password is incorrect");
      }

      if (newPassword !== confirmPassword) {
        return errorResponse(
          res,
          400,
          "New password and confirm password do not match"
        );
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      admin.password = hashedPassword;
      await admin.save();

      return successResponse(res, 200, "Password updated successfully");
    }

    return errorResponse(res, 400, "Invalid request data");
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  } finally {
    await redis.del(`admin:${admin.email}`);
    await redis.del(`admin:all`);
  }
};

module.exports = {
  handleNewAdmin,
  handleLogin,
  handleLogout,
  handleRefreshToken,
  updateAdminProfile,
  getAllAdmins,
  handleDeleteAdmin,
  handleUpdateAdmin,
};
