const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ParkingTransactionSchema = new Schema(
  {
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: "ParkingVehicleType",
    },
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
    transactionStatus: {
      type: String,
      enum: ["Parked", "Completed", "Cancelled"],
      default: "Parked",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Cancelled"],
      default: "Pending",
    },
    billNo: {
      type: String,
    },
    transactionTime: {
      type: Date,
    },
    vehicleNumber: {
      type: String,
    },
    paymentMode: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMode",
    },
    grossAmount: {
      type: Number,
      min: 0,
    },
    discountAmount: {
      type: Number,
      min: 0,
    },
    netAmount: {
      type: Number,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ParkingTransaction", ParkingTransactionSchema);
