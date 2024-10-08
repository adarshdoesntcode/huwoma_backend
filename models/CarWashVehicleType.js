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
    packages: [
      {
        type: Schema.Types.ObjectId,
        ref: "PackageType",
      },
    ],
    vehicleIcon: {
      type: String,
    },
    vehicleTypeOperational: {
      type: Boolean,
      required: true,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarWashVehicleType", CarWashVehicleTypeSchema);
