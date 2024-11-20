const ParkingTransaction = require("../models/ParkingTransaction");
const ParkingVehicleType = require("../models/ParkingVehicleType");

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

const parkingStart = async (req, res) => {
  try {
    const { vehicleId, vehicleNumber } = req.body;

    const now = new Date();
    const parkingStartDateObj = new Date(now);
    const clientDate = now.toISOString();

    let billNo;
    let existingBillNo;

    if (!billNo) {
      do {
        billNo = generateRaceBillNo(clientDate);
        existingBillNo = await ParkingTransaction.findOne({ billNo });
      } while (existingBillNo);
    }

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
    });

    if (existingTransaction) {
      return errorResponse(
        res,
        400,
        "A parking for the vehicle already exists."
      );
    }

    const parkingTransaction = new ParkingTransaction({
      billNo,
      vehicle: vehicleId,
      start: parkingStartDateObj,
      transactionStatus: "Parked",
      paymentStatus: "Pending",
    });
    await parkingTransaction.save();

    await ParkingVehicleType.findByIdAndUpdate(vehicleId, {
      $push: { parkingTransactions: parkingTransaction._id },
    });

    return successResponse(
      res,
      200,
      "Parking created successfully.",
      parkingTransaction
    );
  } catch (err) {
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to create a new Sim Racing transaction."
    );
  }
};

const parkingCheckout = async (req, res) => {
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
        transactionTime: raceEndDateObj,
      },
      {
        new: true,
      }
    );

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }
    await SimRacingRig.findByIdAndUpdate(transaction.rig, {
      $unset: {
        activeRacer: "",
        activeTransaction: "",
      },
      $set: {
        rigStatus: "Pit Stop",
      },
    });

    await PaymentMode.findByIdAndUpdate(paymentMode, {
      $push: {
        simRacingTransactions: transactionId,
      },
    });

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to update transaction."
    );
  }
};

module.exports = {
  getAvailableVehicles,
  parkingStart,
};
