const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SimRacingRigSchema = new Schema(
  {
    rigName: {
      type: String,
      required: true,
    },
    rigStatus: {
      type: String,
      enum: ["On Track", "Pit Stop"],
      default: "Pit Stop",
    },
    rigOperational: {
      type: Boolean,
      default: true,
    },
    activeRacer: {
      type: Schema.Types.ObjectId,
      ref: "SimRacingCustomer",
    },
    activeTransaction: {
      type: Schema.Types.ObjectId,
      ref: "SimRacingTransaction",
    },
    // rigTransactions: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: "SimRacingTransaction",
    //   },
    // ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("SimRacingRig", SimRacingRigSchema);
