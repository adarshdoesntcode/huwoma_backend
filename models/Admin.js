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

    OTP: {
      type: String,
      expires: "15m",
    },
  },
  {
    timestamps: true,
  }
);

adminSchema.index({ email: 1 });

module.exports = mongoose.model("Admin", adminSchema);
