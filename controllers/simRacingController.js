const SimRacingRig = require("../models/SimRacingRig");

const SimRacingCustomer = require("../models/SimRacingCustomer");
const SimRacingTransaction = require("../models/SimRacingTransaction");
const { errorResponse, successResponse } = require("./utils/reponse");
const { generateBillNo, generateRaceBillNo } = require("./utils/utils");
const PaymentMode = require("../models/PaymentMode");
const Configuration = require("../models/Configuration");
const jwt = require("jsonwebtoken");

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

const getAllCustomers = async (req, res) => {
  try {
    const customers = await SimRacingCustomer.aggregate([
      {
        $lookup: {
          from: "simracingtransactions",
          localField: "customerTransactions",
          foreignField: "_id",
          as: "transactions",
        },
      },
      {
        $addFields: {
          totalNetAmount: {
            $sum: "$transactions.netAmount",
          },
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    return successResponse(
      res,
      200,
      "Customers retrieved successfully",
      customers
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return errorResponse(res, 400, "Id is required.");
    }

    const customer = await SimRacingCustomer.findById(id).populate({
      path: "customerTransactions",
      populate: [
        {
          path: "rig",
        },
        { path: "customer" },
        { path: "paymentMode" },
      ],
      options: { sort: { createdAt: -1 } },
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

const updateSimracingCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { customerName, customerContact } = req.body;

    if (!id || !customerName || !customerContact) {
      return errorResponse(
        res,
        400,
        "Id, customerName, and customerContact are required."
      );
    }

    const customer = await SimRacingCustomer.findByIdAndUpdate(id, {
      customerName,
      customerContact,
    });

    if (!customer) {
      return errorResponse(res, 404, "Customer not found");
    }

    return successResponse(res, 200, "Customer updated successfully", customer);
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

const createNewBookingTransaction = async (req, res) => {
  try {
    const { customerId, bookingDeadline } = req.body;

    const now = new Date();
    const clientDate = now.toISOString();

    const bookingDeadlineDateObj = new Date(bookingDeadline);
    if (isNaN(bookingDeadlineDateObj.getTime())) {
      return errorResponse(res, 400, "Invalid date format");
    }

    if (!customerId || !bookingDeadline) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    let billNo;
    let existingBillNo;

    do {
      billNo = generateBillNo(clientDate);
      existingBillNo = await SimRacingTransaction.findOne({ billNo });
    } while (existingBillNo);

    const existingTransaction = await SimRacingTransaction.findOne({
      bookingDeadline: bookingDeadlineDateObj,
      transactionStatus: "Booked",
    });

    if (existingTransaction) {
      return errorResponse(
        res,
        400,
        "There is already an active booking at this time"
      );
    }

    const newTransaction = new SimRacingTransaction({
      customer: customerId,
      billNo,
      transactionStatus: "Booked",
      bookingDeadline,
    });

    await newTransaction.save();

    return successResponse(
      res,
      201,
      "Booking created successfully",
      newTransaction
    );
  } catch (error) {
    console.log("🚀 ~ createNewBookingTransaction ~ error:", error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getSimracingTransactions = async (req, res) => {
  try {
    const now = new Date();
    const nowDateObj = new Date(now);

    const startOfDay = new Date(nowDateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(nowDateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const operationalRigs = await SimRacingRig.aggregate([
      {
        $match: { rigOperational: true },
      },
      {
        $lookup: {
          from: "simracingtransactions",
          localField: "_id",
          foreignField: "rig",
          as: "rigTransactions",
        },
      },
      {
        $addFields: {
          completedPaidTransactionCount: {
            $size: {
              $filter: {
                input: "$rigTransactions",
                as: "transaction",
                cond: {
                  $and: [
                    { $eq: ["$$transaction.paymentStatus", "Paid"] },
                    { $eq: ["$$transaction.transactionStatus", "Completed"] },
                  ],
                },
              },
            },
          },
        },
      },
      {
        $project: { rigTransactions: 0 },
      },
    ]);

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
                $in: ["Active", "Booked"],
              },
            },
            { paymentStatus: "Pending" },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate("customer")
      .populate("rig")
      .populate("paymentMode");

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
        "A transaction for the  customer already exists."
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

const raceStartFromBooking = async (req, res) => {
  try {
    const { transactionId, rig, customer } = req.body;

    const now = new Date();
    const raceStartDateObj = new Date(now);

    if (isNaN(raceStartDateObj.getTime())) {
      return errorResponse(res, 400, "Invalid date format");
    }

    const existingCustomer = await SimRacingCustomer.findById(customer);
    if (!existingCustomer) {
      return errorResponse(res, 404, "Customer not found.");
    }

    const existingTransaction = await SimRacingTransaction.findOne({
      customer: customer,
      transactionStatus: {
        $not: {
          $in: ["Completed", "Cancelled", "Booked"],
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
        "There is already an ongoing transaction."
      );
    }

    const transaction = await SimRacingTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        customer: customer,
        transactionStatus: "Booked",
      },
      {
        transactionStatus: "Active",
        rig: rig,
        start: raceStartDateObj,
        $unset: { deleteAt: "" },
      }
    );
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    await SimRacingCustomer.findByIdAndUpdate(customer, {
      $push: { customerTransactions: transaction._id },
    });

    await SimRacingRig.findByIdAndUpdate(rig, {
      $set: {
        activeRacer: customer,
        activeTransaction: transaction._id,
        rigStatus: "On Track",
      },
      $push: { rigTransactions: transaction._id },
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
      "Server error. Failed to create transaction."
    );
  }
};

const getCheckoutDetails = async (req, res) => {
  try {
    const { transactionId } = req.params;

    const transaction = await SimRacingTransaction.findOne({
      _id: transactionId,
      transactionStatus: "Active",
      paymentStatus: "Pending",
    })
      .populate({
        path: "customer",
        populate: {
          path: "customerTransactions",
          match: {
            transactionStatus: "Completed",
            paymentStatus: "Paid",
          },
        },
      })
      .populate("rig");

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

const simracingCheckout = async (req, res) => {
  try {
    const {
      transactionId,
      paymentMode,

      grossAmount,
      discountAmount,
      netAmount,
    } = req.body;
    const now = new Date();
    const raceEndDateObj = new Date(now);

    const transaction = await SimRacingTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: "Active",
        paymentStatus: "Pending",
      },
      {
        transactionStatus: "Completed",
        paymentStatus: "Paid",
        paymentMode: paymentMode,
        paymentAmount: grossAmount,
        end: raceEndDateObj,
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
const cancelRace = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transaction = await SimRacingTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: { $in: ["Active", "Booked"] },
        paymentStatus: "Pending",
      },
      {
        transactionStatus: "Cancelled",
        paymentStatus: "Cancelled",
      },
      {
        new: true,
      }
    );

    await SimRacingRig.findByIdAndUpdate(transaction.rig, {
      $unset: {
        activeRacer: "",
        activeTransaction: "",
      },
      $set: {
        rigStatus: "Pit Stop",
      },
    });

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    return successResponse(
      res,
      200,
      "Race cancelled successfully.",
      transaction
    );
  } catch (err) {
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to cancel transaction."
    );
  }
};
const deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transaction = await SimRacingTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: { $in: ["Active", "Booked"] },
        paymentStatus: "Pending",
      },
      {
        transactionStatus: "Cancelled",
        paymentStatus: "Cancelled",
      },
      {
        new: true,
      }
    );

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    return successResponse(
      res,
      200,
      "Transaction cancelled successfully.",
      transaction
    );
  } catch (err) {
    return errorResponse(
      res,
      500,
      "Server error. Failed to cancel transaction."
    );
  }
};

const getFilteredSimRacingTransactions = async (req, res) => {
  try {
    const filter = req.body;
    const query = {};

    if (filter.timeRange?.from) {
      query.createdAt = {
        $gte: new Date(filter.timeRange.from),
        ...(filter.timeRange.to && { $lte: new Date(filter.timeRange.to) }),
      };
    }

    let transactionsQuery = SimRacingTransaction.find(query)
      .populate("rig")
      .sort({ createdAt: 1 })
      .populate("customer")
      .populate("paymentMode");

    const transactions = await transactionsQuery.exec();

    return successResponse(res, 200, "Transactions retrieved", transactions);
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

// ========================RACER UI=============================

const clientStartRace = async (req, res) => {
  try {
    const { coordinates } = req.body;
    if (!coordinates || !coordinates.longitude || !coordinates.latitude) {
      return errorResponse(res, 400, "Coordinates are required");
    }

    const radiusInRadians = 100 / 6371000;

    const configuration = await Configuration.findOne({
      simRacingCoordinates: {
        $geoWithin: {
          $centerSphere: [
            [coordinates.longitude, coordinates.latitude],
            radiusInRadians,
          ],
        },
      },
    }).select("simRacingCoordinates");

    if (!configuration) {
      return errorResponse(
        res,
        400,
        "Your current location is not in the SimRacing area"
      );
    }

    const key = req.headers.authorization;
    if (!key) {
      if (!req.body.id) {
        return errorResponse(res, 400, "No id provided");
      }
      const rig = await SimRacingRig.findOne({
        _id: req.body.id,
        rigOperational: true,
      });
      if (!rig) {
        return errorResponse(res, 404, "Rig not found");
      }
      if (rig.rigStatus === "On Track") {
        return errorResponse(res, 400, "This Rig is currently not available.");
      }
      return successResponse(res, 200, "RTR", rig);
    } else {
      const token = key.split(" ")[1];
      const decoded = jwt.verify(token, process.env.SIM_RACING_SECRET);
      const rig = await SimRacingRig.findOne({
        _id: req.body.id,
        rigOperational: true,
      });

      if (!rig) {
        return errorResponse(res, 404, "Rig not found");
      }

      if (
        rig.activeRacer?.toString() === decoded.customerId?.toString() &&
        rig.activeTransaction?.toString() === decoded.transactionId?.toString()
      ) {
        return successResponse(res, 200, "CTR");
      }
      if (rig.rigStatus === "On Track") {
        return errorResponse(res, 400, "This Rig is currently not available.");
      }
      return successResponse(res, 200, "RTR", rig);
    }
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const startRaceFromClient = async (req, res) => {
  try {
    const { customerName, customerContact, rigId } = req.body;

    const rig = await SimRacingRig.findOne({
      _id: rigId,
      rigStatus: "Pit Stop",
    });
    if (!rig) {
      return errorResponse(res, 400, "Rig is not available");
    }

    let customer = await SimRacingCustomer.findOne({ customerContact });

    if (!customer) {
      customer = new SimRacingCustomer({ customerName, customerContact });
      await customer.save();
    }
    const existingTransaction = await SimRacingTransaction.findOne({
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
        "A transaction for the  customer already exists."
      );
    }

    const now = new Date();
    const raceStartDateObj = new Date(now);
    const clientDate = now.toISOString();

    let billNo;
    let existingBillNo;

    do {
      billNo = generateRaceBillNo(clientDate);
      existingBillNo = await SimRacingTransaction.findOne({ billNo });
    } while (existingBillNo);

    const simRacingTransaction = new SimRacingTransaction({
      billNo,
      rig: rigId,
      customer: customer._id,
      start: raceStartDateObj,
      transactionStatus: "Active",
      paymentStatus: "Pending",
    });

    await simRacingTransaction.save();

    await SimRacingCustomer.findByIdAndUpdate(customer._id, {
      $push: { customerTransactions: simRacingTransaction._id },
    });

    await SimRacingRig.findByIdAndUpdate(rigId, {
      $set: {
        activeRacer: customer._id,
        activeTransaction: simRacingTransaction._id,
        rigStatus: "On Track",
      },
      $push: { rigTransactions: simRacingTransaction._id },
    });

    const tokenPayload = {
      transactionId: simRacingTransaction._id,
      customerId: customer._id,
      rigId: rigId,
    };

    const token = jwt.sign(tokenPayload, process.env.SIM_RACING_SECRET);

    return successResponse(
      res,
      201,
      "Sim Racing transaction started successfully.",
      {
        simRacingTransaction,
        simRacingKey: token,
      }
    );
  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      500,
      "Server error. Failed to start transaction.",
      error.message
    );
  }
};

const getTransactionForClient = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return errorResponse(res, 401, "Unauthorized");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.SIM_RACING_SECRET);

    const transaction = await SimRacingTransaction.findOne({
      _id: decoded.transactionId,
      customer: decoded.customerId,
      rig: decoded.rigId,
    })
      .populate("rig")
      .populate("customer");

    if (!transaction) {
      return errorResponse(res, 401, "Unauthorized");
    }

    if (["Completed", "Cancelled"].includes(transaction.transactionStatus)) {
      return errorResponse(res, 401, "FN");
    }

    return successResponse(res, 200, "Transaction found", transaction);
  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      500,
      "Server error. Failed to verify transaction.",
      error.message
    );
  }
};

module.exports = {
  createCustomer,
  findCustomer,
  getSimracingTransactions,
  getAvailableRigs,
  raceStart,
  deleteTransaction,
  cancelRace,
  createNewBookingTransaction,
  raceStartFromBooking,
  getCheckoutDetails,
  simracingCheckout,
  clientStartRace,
  startRaceFromClient,
  getTransactionForClient,
  getAllCustomers,
  getCustomerById,
  updateSimracingCustomer,
  getFilteredSimRacingTransactions,
};
