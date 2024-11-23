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
    refreshTokens: [
      {
        token: {
          type: String,
        },
        createdAt: {
          type: Date,
          default: Date.now,
          expires: "30d",
        },
      },
    ],
    OTP: {
      type: String,
      expires: "15m",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Admin", adminSchema);
