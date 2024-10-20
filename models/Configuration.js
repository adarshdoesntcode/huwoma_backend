const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConfigurationSchema = new Schema(
  {
    streakCount: {
      type: Number,
      default: 5,
      min: 0,
      required: true,
    },
    parkingBuffer: {
      type: Number,
      default: 60,
      min: 0,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Configuration", ConfigurationSchema);
