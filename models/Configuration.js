const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ConfigurationSchema = new Schema(
  {
    simRacingCoordinates: {
      type: { type: String, enum: ["Point"] },
      coordinates: {
        type: [Number], // Array of numbers: [longitude, latitude]
      },
    },
  },
  {
    timestamps: true,
  }
);
ConfigurationSchema.index({ simRacingCorrdinates: "2dsphere" });

module.exports = mongoose.model("Configuration", ConfigurationSchema);
