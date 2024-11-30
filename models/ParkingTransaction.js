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

ParkingTransactionSchema.index({ createdAt: 1, transactionTime: 1 });
ParkingTransactionSchema.index({ transactionStatus: 1 });
ParkingTransactionSchema.index({ paymentStatus: 1 });
ParkingTransactionSchema.index({ createdAt: -1 });
ParkingTransactionSchema.index({ vehicle: 1 });
ParkingTransactionSchema.index({ paymentMode: 1 });

module.exports = mongoose.model("ParkingTransaction", ParkingTransactionSchema);
