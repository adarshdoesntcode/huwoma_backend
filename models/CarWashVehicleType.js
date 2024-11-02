const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashVehicleTypeSchema = new Schema(
  {
    vehicleTypeName: {
      type: String,
      required: true,
    },
    services: [
      {
        type: Schema.Types.ObjectId,
        ref: "ServiceType",
      },
    ],
    vehicleIcon: {
      type: String,
    },
    billAbbreviation: {
      type: String,
      required: true,
    },
    vehicleTypeOperational: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarWashVehicleType", CarWashVehicleTypeSchema);
