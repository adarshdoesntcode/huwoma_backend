const { default: mongoose } = require("mongoose");
const ParkingTransaction = require("../models/ParkingTransaction");
const ParkingVehicleType = require("../models/ParkingVehicleType");
const PaymentMode = require("../models/PaymentMode");
const { successResponse, errorResponse } = require("./utils/reponse");
const { generateParkingBillNo } = require("./utils/utils");

const getAvailableVehicles = async (req, res) => {
  try {
    const parkingVehicles = await ParkingVehicleType.find({
      vehicleTypeOperational: true,
    });

    if (parkingVehicles.length === 0) {
      return errorResponse(res, 204, "No vehicles are available.");
    }

    return successResponse(
      res,
      200,
      "Vehicles retrieved successfully",
      parkingVehicles
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getParkingTransactions = async (req, res) => {
  try {
    const now = new Date();
    const nowDateObj = new Date(now);

    const startOfDay = new Date(nowDateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(nowDateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const operationalVehicles = await ParkingVehicleType.find({
      vehicleTypeOperational: true,
    });

    const transactions = await ParkingTransaction.find({
      $or: [
        {
          $or: [
            {
              createdAt: {
                $gte: startOfDay,
                $lt: endOfDay,
              },
            },
            {
              transactionTime: {
                $gte: startOfDay,
                $lt: endOfDay,
              },
            },
          ],
        },
        {
          $or: [{ transactionStatus: "Parked" }, { paymentStatus: "Pending" }],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("vehicle")
      .populate("paymentMode");
    return successResponse(
      res,
      200,
      "Parking transactions retrieved successfully",
      {
        vehicles: operationalVehicles,
        transactions,
      }
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};
const parkingStart = async (req, res) => {
  const session = await ParkingTransaction.startSession();

  try {
    session.startTransaction();

    const { vehicleId, vehicleNumber } = req.body;

    const now = new Date();
    const parkingStartDateObj = new Date(now);
    const clientDate = now.toISOString();

    let billNo;
    let existingBillNo;

    // Find the vehicle
    const vehicle = await ParkingVehicleType.findById(vehicleId).session(
      session
    );

    if (!vehicle) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Vehicle not found.");
    }

    // Check parking capacity
    if (vehicle.currentlyAccomodated >= vehicle.totalAccomodationCapacity) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(
        res,
        400,
        "No parking space available for the given vehicle."
      );
    }

    // Generate unique bill number
    if (!billNo) {
      do {
        billNo = generateParkingBillNo(clientDate);
        existingBillNo = await ParkingTransaction.findOne({ billNo }).session(
          session
        );
      } while (existingBillNo);
    }

    // Check if there's an existing active transaction for the vehicle
    const existingTransaction = await ParkingTransaction.findOne({
      vehicleNumber: vehicleNumber,
      transactionStatus: {
        $not: {
          $in: ["Completed", "Cancelled"],
        },
      },
      paymentStatus: {
        $not: {
          $in: ["Paid", "Cancelled"],
        },
      },
    }).session(session);

    if (existingTransaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(
        res,
        400,
        "A parking for the vehicle already exists."
      );
    }

    // Create new parking transaction
    const parkingTransaction = new ParkingTransaction({
      billNo,
      vehicle: vehicleId,
      vehicleNumber: vehicleNumber,
      start: parkingStartDateObj,
      transactionStatus: "Parked",
      paymentStatus: "Pending",
    });

    await parkingTransaction.save({ session });

    // Update vehicle's current accommodation and transactions
    await ParkingVehicleType.findByIdAndUpdate(
      vehicleId,
      {
        $inc: { currentlyAccomodated: 1 },
        $push: { parkingTransactions: parkingTransaction._id },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      200,
      "Parking created successfully.",
      parkingTransaction
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to create a new Sim Racing transaction."
    );
  }
};

const getCheckoutDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await ParkingTransaction.findOne({
      _id: transactionId,
      transactionStatus: "Parked",
      paymentStatus: "Pending",
    }).populate("vehicle");

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    const paymentModes = await PaymentMode.find({
      paymentModeOperational: true,
    });

    return successResponse(
      res,
      200,
      "Checkout details retrieved successfully.",
      {
        transaction,
        paymentModes,
      }
    );
  } catch (err) {
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to retrieve checkout details."
    );
  }
};

const parkingCheckout = async (req, res) => {
  let session;
  try {
    const {
      transactionId,
      paymentMode,
      grossAmount,
      discountAmount,
      netAmount,
    } = req.body;
    const now = new Date();
    const parkingEndDateObj = new Date(now);

    session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await ParkingTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: "Parked",
        paymentStatus: "Pending",
      },
      {
        transactionStatus: "Completed",
        paymentStatus: "Paid",
        paymentMode: paymentMode,
        paymentAmount: grossAmount,
        end: parkingEndDateObj,
        discountAmount: discountAmount,
        netAmount: netAmount,
        transactionTime: parkingEndDateObj,
      },
      {
        new: true,
        session,
      }
    );

    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Transaction not found.");
    }

    await ParkingVehicleType.findByIdAndUpdate(
      transaction.vehicle,
      {
        $inc: { currentlyAccomodated: -1 },
      },
      { session }
    );

    const paymentModeExists = await PaymentMode.findById(paymentMode).session(
      session
    );
    if (!paymentModeExists) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Payment mode not found.");
    }

    await PaymentMode.findByIdAndUpdate(
      paymentMode,
      {
        $push: {
          parkingTransactions: transactionId,
        },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    console.error(err);
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return errorResponse(
      res,
      500,
      "Server error. Failed to update transaction."
    );
  }
};

const deleteParkingTransaction = async (req, res) => {
  const { transactionId } = req.params;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await ParkingTransaction.findByIdAndUpdate(
      transactionId,
      {
        transactionStatus: "Cancelled",
        paymentStatus: "Cancelled",
      },
      {
        session,
        new: true,
      }
    );

    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Transaction not found.");
    }

    await ParkingVehicleType.findByIdAndUpdate(
      transaction.vehicle,
      {
        $inc: { currentlyAccomodated: -1 },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return successResponse(res, 200, "Transaction deleted successfully.");
  } catch (err) {
    console.error(err);
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    return errorResponse(
      res,
      500,
      "Server error. Failed to delete transaction."
    );
  }
};

const getFilteredParkingTransactions = async (req, res) => {
  try {
    const filter = req.body;
    const query = {};

    if (filter.timeRange?.from) {
      query.createdAt = {
        $gte: new Date(filter.timeRange.from),
        ...(filter.timeRange.to && { $lte: new Date(filter.timeRange.to) }),
      };
    }

    let transactionsQuery = ParkingTransaction.find(query)
      .populate("vehicle")
      .populate("paymentMode")
      .sort({ createdAt: 1 });

    const transactions = await transactionsQuery.exec();

    return successResponse(res, 200, "Transactions retrieved", transactions);
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

module.exports = {
  getAvailableVehicles,
  parkingStart,
  getCheckoutDetails,
  parkingCheckout,
  getParkingTransactions,
  deleteParkingTransaction,
  getFilteredParkingTransactions,
};
