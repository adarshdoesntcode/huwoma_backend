const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashTransactionSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "CarWashCustomer",
      required: true,
    },
    services: {
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
        min: 0,
      },
    },
    packages: {
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
        min: 0,
      },
    },
    parking: {
      in: {
        type: Date,
      },
      out: {
        type: Date,
      },
      cost: {
        type: Number,
        min: 0,
      },
    },
    transactionStatus: {
      type: String,
      default: "QUEUED",
    },
    paymentStatus: {
      type: String,
      default: "PENDING",
    },
    billNo: {
      type: Number,
      min: 0,
    },
    transactionTime: {
      type: Date,
    },
    redeemed: {
      type: Boolean,
      default: false,
    },
    paymentMode: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMode",
    },
    inspections: [
      {
        categoryName: String,
        items: [
          {
            itemName: String,
            response: Boolean,
          },
        ],
      },
    ],
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
