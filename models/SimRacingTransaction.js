const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SimRacingTransactionSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "SimRacingCustomer",
      required: true,
    },
    rig: {
      type: Schema.Types.ObjectId,
      ref: "SimRacingRig",
    },
    start: {
      type: Date,
    },
    end: {
      type: Date,
    },
    pauseHistory: [
      {
        pausedAt: { type: Date },
        resumedAt: { type: Date },
      },
    ],
    transactionStatus: {
      type: String,
      enum: ["Active", "Paused", "Completed", "Cancelled", "Booked"],
      default: "Active",
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
    bookingDeadline: {
      type: Date,
    },
    deleteAt: {
      type: Date,
      default: function () {
        return this.bookingDeadline
          ? new Date(this.bookingDeadline.getTime() + 15 * 60000)
          : undefined;
      },
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
SimRacingTransactionSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });
SimRacingTransactionSchema.index({ createdAt: 1, transactionTime: 1, end: 1 });
SimRacingTransactionSchema.index({ transactionStatus: 1 });
SimRacingTransactionSchema.index({ paymentStatus: 1 });
SimRacingTransactionSchema.index({ createdAt: -1 });
SimRacingTransactionSchema.index({ customer: 1 });
SimRacingTransactionSchema.index({ rig: 1 });
SimRacingTransactionSchema.index({ paymentMode: 1 });

module.exports = mongoose.model(
  "SimRacingTransaction",
  SimRacingTransactionSchema
);
