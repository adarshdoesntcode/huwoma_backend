const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ParkingVehicleTypeSchema = new Schema(
  {
    vehicleTypeName: {
      type: String,
      required: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    vehicleIcon: {
      type: String,
    },
    billAbbreviation: {
      type: String,
      required: true,
    },
    totalAccomodationCapacity: {
      type: Number,
      required: true,
      min: 0,
    },
    currentlyAccomodated: {
      type: Number,
      min: 0,
    },
    vehicleTypeOperational: {
      type: Boolean,
      default: true,
    },
    parkingTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "ParkingTransaction",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ParkingVehicleType", ParkingVehicleTypeSchema);
