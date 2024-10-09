const Admin = require("../models/Admin");

const handleLogout = async (req, res) => {
  //On client, also delete the access token

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

  //Delete  refreshToken from db
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

module.exports = { handleLogout };
