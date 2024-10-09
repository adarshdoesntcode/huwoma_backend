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
      // required: true,
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
