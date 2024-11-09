const SimRacingRig = require("../models/SimRacingRig");

const SimRacingCustomer = require("../models/SimRacingCustomer");
const SimRacingTransaction = require("../models/SimRacingTransaction");
const { errorResponse, successResponse } = require("./utils/reponse");
const { generateBillNo, generateRaceBillNo } = require("./utils/utils");

// ======================CUSTOMER=============================

const createCustomer = async (req, res) => {
  try {
    const { customerName, customerContact } = req.body;

    if (!customerName || !customerContact) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    const existingCustomer = await SimRacingCustomer.findOne({
      customerContact,
    });

    if (existingCustomer) {
      return errorResponse(
        res,
        400,
        "Customer with this contact number already exists"
      );
    }

    const newCustomer = new SimRacingCustomer({
      customerName,
      customerContact,
    });

    await newCustomer.save();

    return successResponse(
      res,
      201,
      "Customer created successfully",
      newCustomer
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const findCustomer = async (req, res) => {
  try {
    const { customerContact } = req.body;

    const customer = await SimRacingCustomer.findOne({
      customerContact,
    });

    if (!customer) {
      return errorResponse(res, 404, "Customer not found");
    }

    return successResponse(
      res,
      200,
      "Customer retrieved successfully",
      customer
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

// ======================RIG=============================

const getAvailableRigs = async (req, res) => {
  try {
    const pitStopRigs = await SimRacingRig.find({
      rigStatus: "Pit Stop",
      rigOperational: true,
    });

    if (pitStopRigs.length === 0) {
      return errorResponse(res, 204, "No pit stop rigs are available.");
    }

    return successResponse(
      res,
      200,
      "Pit stop rigs retrieved successfully",
      pitStopRigs
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

// ======================TRANSACTIONS=============================

const getSimracingTransactions = async (req, res) => {
  try {
    const { date } = req.params;

    if (!date) {
      return errorResponse(res, 400, "Date is required.");
    }

    const dateObj = new Date(date);
    const startOfDay = new Date(
      Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        0,
        0,
        0,
        0
      )
    );

    const endOfDay = new Date(
      Date.UTC(
        dateObj.getUTCFullYear(),
        dateObj.getUTCMonth(),
        dateObj.getUTCDate(),
        23,
        59,
        59,
        999
      )
    );

    const operationalRigs = await SimRacingRig.find({ rigOperational: true });

    const transactions = await SimRacingTransaction.find({
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
            {
              end: {
                $gte: startOfDay,
                $lt: endOfDay,
              },
            },
          ],
        },
        {
          $or: [
            {
              transactionStatus: {
                $in: ["Active"],
              },
            },
            { paymentStatus: "Pending" },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("customer")
      .populate("rig");

    return successResponse(
      res,
      200,
      "Sim Racing transactions retrieved successfully.",
      {
        rigs: operationalRigs,
        transactions,
      }
    );
  } catch (err) {
    return errorResponse(
      res,
      500,
      "Server error. Failed to retrieve Sim Racing transactions."
    );
  }
};

const raceStart = async (req, res) => {
  try {
    const { rig, customer } = req.body;

    const now = new Date();
    const raceStartDateObj = new Date(now);
    const clientDate = now.toISOString();

    let billNo;
    let existingBillNo;

    if (!billNo) {
      do {
        billNo = generateRaceBillNo(clientDate);
        existingBillNo = await SimRacingTransaction.findOne({ billNo });
      } while (existingBillNo);
    }

    const existingTransaction = await SimRacingTransaction.findOne({
      rig: rig,
      customer: customer,
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
        "A transaction for the specified rig and customer already exists."
      );
    }

    const simRacingTransaction = new SimRacingTransaction({
      billNo,
      rig: rig,
      customer: customer,
      start: raceStartDateObj,
      transactionStatus: "Active",
      paymentStatus: "Pending",
    });
    await simRacingTransaction.save();

    await SimRacingCustomer.findByIdAndUpdate(customer, {
      $push: { customerTransactions: simRacingTransaction._id },
    });

    await SimRacingRig.findByIdAndUpdate(rig, {
      $set: {
        activeRacer: customer,
        activeTransaction: simRacingTransaction._id,
        rigStatus: "On Track",
      },
      $push: { rigTransactions: simRacingTransaction._id },
    });

    return successResponse(
      res,
      200,
      "Sim Racing transaction created successfully.",
      simRacingTransaction
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

module.exports = {
  createCustomer,
  findCustomer,
  getSimracingTransactions,
  getAvailableRigs,
  raceStart,
};
