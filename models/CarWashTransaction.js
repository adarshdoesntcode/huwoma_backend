const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashTransactionSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarWashTransaction", CarWashTransactionSchema);
