const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ServiceTypeSchema = new Schema(
  {
    serviceTypeName: {
      type: String,
      required: true,
    },
    serviceDescription: {
      type: [String],
    },
    serviceTypeOperational: {
      type: Boolean,
      default: true,
    },
    billAbbreviation: {
      type: String,
      required: true,
    },
    serviceRate: {
      type: Number,
      required: true,
      min: 0,
    },
    includeParking: {
      type: Boolean,
      required: true,
      default: false,
    },
    streakApplicable: {
      type: Boolean,
      default: true,
    },
    serviceVehicle: {
      type: Schema.Types.ObjectId,
      ref: "CarWashVehicleType",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ServiceType", ServiceTypeSchema);
