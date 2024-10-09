const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashCustomerSchema = new Schema(
  {
    cutomerName: {
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
    customerTransactions: {
      type: Schema.Types.ObjectId,
      ref: "CarWashTransaction",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarWashCustomer", CarWashCustomerSchema);
