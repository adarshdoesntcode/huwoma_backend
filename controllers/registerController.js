const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

const handleNewUser = async (req, res) => {
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

module.exports = { handleNewUser };
