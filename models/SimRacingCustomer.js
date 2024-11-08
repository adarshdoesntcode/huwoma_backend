const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SimRacingCustomerSchema = new Schema(
  {
    customerName: {
      type: String,
      required: true,
    },
    customerContact: {
      type: Number,
      required: true,
      unique: true,
    },
    cutomerAddress: {
      type: String,
    },
    customerTransactions: [
      {
        type: Schema.Types.ObjectId,
        ref: "SimRacingTransaction",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SimRacingCustomer", SimRacingCustomerSchema);
