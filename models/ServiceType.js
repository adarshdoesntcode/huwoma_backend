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
      decision: {
        type: Boolean,
        default: false,
      },
      parkingBuffer: {
        type: Number,
      },
    },
    streakApplicable: {
      decision: {
        type: Boolean,
        default: false,
      },
      washCount: {
        type: Number,
      },
    },
    // serviceTransactions: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "CarWashTransaction",
    //   },
    // ],
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
