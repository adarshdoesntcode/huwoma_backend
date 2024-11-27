const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SystemActivitySchema = new Schema(
  {
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    activityType: {
      type: String,
      required: true,
      enum: [
        "Rollback",
        "Booking",
        "Create",
        "Login",
        "QR Scan",
        "Start Race",
        "Logout",
        "Update",
        "Cancelled",
        "Delete",
      ],
    },
    systemModule: {
      type: String,
      required: true,
      trim: true,
    },
    activityBy: {
      type: Schema.Types.Mixed,
      required: false,
    },
    activityIpAddress: {
      type: String,
    },
    userAgent: {
      type: String,
      required: false,
      trim: true,
    },
    activityDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SystemActivity", SystemActivitySchema);
