const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashTransactionSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "CarWashCustomer",
      required: true,
    },
    services: [
      {
        service: {
          type: Schema.Types.ObjectId,
          ref: "ServiceType",
        },
        start: {
          type: Date,
        },
        end: {
          type: Date,
        },
        cost: {
          type: Number,
          min: 0, // Ensure cost is non-negative
        },
      },
    ],
    packages: [
      {
        package: {
          type: Schema.Types.ObjectId,
          ref: "PackageType",
        },
        start: {
          type: Date,
        },
        end: {
          type: Date,
        },
        cost: {
          type: Number,
          min: 0, // Ensure cost is non-negative
        },
      },
    ],
    parking: {
      in: {
        type: Date,
      },
      out: {
        type: Date,
      },
      cost: {
        type: Number,
        min: 0, // Ensure cost is non-negative
      },
    },
    transactionStatus: {
      type: String,
      default: "QUEUE",
    },
    paymentStatus: {
      type: String,
      default: "PENDING",
    },
    billNo: {
      type: Number,
      min: 0,
      required: true,
    },
    transactionTime: {
      type: Date,
      required: true,
    },
    redeemed: {
      type: Boolean,
      default: false,
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
    vehicleNumber: {
      type: Number,
    },
    vehicleModel: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("CarWashTransaction", CarWashTransactionSchema);
