const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PackageTypeSchema = new Schema(
  {
    packageTypeName: {
      type: String,
      required: true,
    },
    packageContents: [
      {
        packageServiceName: {
          type: String,
          required: true,
        },

        billAbbreviation: {
          type: String,
          required: true,
        },
        packageServiceRate: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    packageTypeOperational: {
      type: Boolean,
      default: true,
    },
    billAbbreviation: {
      type: String,
      required: true,
    },
    packageRate: {
      type: Number,
      required: true,
      min: 0,
    },
    includeParking: {
      type: Boolean,
      default: false,
    },
    streakApplicable: {
      type: Boolean,
      default: true,
    },
    packageVehicle: {
      type: Schema.Types.ObjectId,
      ref: "CarWashVehicleType",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PackageType", PackageTypeSchema);
