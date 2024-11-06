const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const CarWashTransactionSchema = new Schema(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: "CarWashCustomer",
      required: true,
    },
    service: {
      id: {
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
      actualRate: {
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
      enum: [
        "Booked",
        "In Queue",
        "Ready for Pickup",
        "Completed",
        "Cancelled",
      ],
      default: "In Queue",
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
    redeemed: {
      type: Boolean,
      default: false,
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
      type: String,
    },
  },
  {
    timestamps: true,
  }
);
CarWashTransactionSchema.index({ deleteAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("CarWashTransaction", CarWashTransactionSchema);
