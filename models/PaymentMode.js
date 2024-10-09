const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const PaymentModeSchema = new Schema(
  {
    paymentModeName: {
      type: String,
      required: true,
    },
    carWashTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "CarWashTransaction",
      },
    ],
    simRacingTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "SimRacingTransaction",
      },
    ],
    parkingTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "ParkingTransaction",
      },
    ],
    qrCodeData: {
      type: String,
    },
    paymentModeOperational: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("PaymentMode", PaymentModeSchema);
