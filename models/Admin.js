const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const adminSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    fullname: {
      type: String,
      required: true,
    },
    photo: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    role: {
      type: [Number],
    },
    password: {
      type: String,
    },
    refreshToken: String,
    OTP: String,
    timeStamps: {
      type: Date,
      timestamps: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
