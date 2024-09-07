const Admin = require("../models/Admin");
const bcrypt = require("bcrypt");

const handleNewUser = async (req, res) => {
  const { fullname, email, phoneNumber, role } = req.body;
  console.log("🚀 ~ handleNewUser ~ req.body:", req.body);

  // checkCredentials(req,res,{ fullname, email, photo, phoneNumber, program });
  if (!fullname || !email || !phoneNumber || !role)
    return res.status(400).json({
      message: "All credentials are required",
    });

  //checking for duplicate username || email
  let duplicate;

  duplicate = await Admin.findOne({ email: email });

  // status 409--> for conflict status
  if (duplicate)
    return res.status(409).json({
      message: "Duplicate Credentials.",
    }); //conflicting status

  try {
    //encrypt the password
    const password = "huwoma@123";
    const hashedPassword = await bcrypt.hash(password, 10);
    //creating and save to the database
    let result;

    result = await Admin.create({
      fullname: fullname,
      email: email,
      password: hashedPassword,
      phoneNumber: phoneNumber,
      role: [role],
    });

    //201--> successfully created
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
