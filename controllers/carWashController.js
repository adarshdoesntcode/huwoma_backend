const { ca } = require("date-fns/locale");
const CarWashCustomer = require("../models/CarWashCustomer");
const CarWashTransaction = require("../models/CarWashTransaction");
const CarWashVehicleType = require("../models/CarWashVehicleType");
const InspectionTemplate = require("../models/InspectionTemplate");
const PaymentMode = require("../models/PaymentMode");
const { errorResponse, successResponse } = require("./utils/reponse");
const { generateBillNo } = require("./utils/utils");

// ======================CUSTOMER=============================

const createCustomer = async (req, res) => {
  try {
    const { customerName, customerContact } = req.body;

    if (!customerName || !customerContact) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    const existingCustomer = await CarWashCustomer.findOne({ customerContact });

    if (existingCustomer) {
      return errorResponse(
        res,
        400,
        "Customer with this contact number already exists"
      );
    }

    const newCustomer = new CarWashCustomer({
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

    const customer = await CarWashCustomer.findOne({
      customerContact,
    }).populate({
      path: "customerTransactions",
      match: {
        transactionStatus: "Completed",
        paymentStatus: "Paid",
        redeemed: false,
      },
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
    return errorResponse(res, 500, "Server error", error.mess);
  }
};

// ====================TRANSACTION=============================

const getCarwashTransactions = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return errorResponse(res, 400, "Date is required.");
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const transactions = await CarWashTransaction.find({
      $or: [
        {
          $or: [
            { createdAt: { $gte: startOfDay, $lt: endOfDay } },
            { transactionTime: { $gte: startOfDay, $lt: endOfDay } },
            { "service.end": { $gte: startOfDay, $lt: endOfDay } },
          ],
        },
        {
          $or: [
            {
              transactionStatus: {
                $in: ["Booked", "In Queue", "Ready for Pickup"],
              },
            },
            { paymentStatus: "Pending" },
          ],
        },
      ],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: "service.id",
        populate: {
          path: "serviceVehicle",
        },
      })
      .populate("customer")
      .populate({
        path: "customer",
        populate: {
          path: "customerTransactions",
          match: {
            transactionStatus: "Completed",
            paymentStatus: "Paid",
            redeemed: false,
          },
        },
      })
      .populate("paymentMode");

    return successResponse(
      res,
      200,
      "Transactions retrieved successfully.",
      transactions
    );
  } catch (err) {
    return errorResponse(res, 500, "Failed to retrieve transactions.");
  }
};

const createNewBookingTransaction = async (req, res) => {
  try {
    const { customerId, bookingDeadline } = req.body;

    if (!customerId || !bookingDeadline) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    let billNo;
    let existingBillNo;

    do {
      billNo = generateBillNo();
      existingBillNo = await CarWashTransaction.findOne({ billNo });
    } while (existingBillNo);

    const existingTransaction = await CarWashTransaction.findOne({
      bookingDeadline,
      transactionStatus: "Booked",
    });

    if (existingTransaction) {
      return errorResponse(
        res,
        400,
        "There is already an active booking at this time"
      );
    }

    const newTransaction = new CarWashTransaction({
      customer: customerId,
      billNo,
      transactionStatus: "Booked",
      bookingDeadline,
    });

    await newTransaction.save();

    return successResponse(
      res,
      201,
      "Booking transaction created successfully",
      newTransaction
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const transactionStartFromBooking = async (req, res) => {
  try {
    const {
      transactionId,
      service,
      vehicleNumber,
      customer,
      serviceStart,
      serviceRate,
    } = req.body;

    const existingCustomer = await CarWashCustomer.findById(customer);
    if (!existingCustomer) {
      return errorResponse(res, 404, "Customer not found.");
    }

    const existingTransaction = await CarWashTransaction.findOne({
      "service.id": service,
      vehicleNumber,
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
        "There is already an active transaction for this service and vehicle number"
      );
    }

    const transaction = await CarWashTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: "Booked",
      },
      {
        transactionStatus: "In Queue",
        service: {
          id: service,
          start: serviceStart,
          cost: serviceRate,
        },
        $unset: { deleteAt: "" },
        vehicleNumber: vehicleNumber,
      }
    );
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    existingCustomer.customerTransactions.push(transaction._id);
    await existingCustomer.save();
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

const transactionOne = async (req, res) => {
  try {
    const { service, vehicleNumber, customer, serviceStart, serviceRate } =
      req.body;

    let billNo;
    let existingBillNo;

    if (!billNo) {
      do {
        billNo = generateBillNo();
        existingBillNo = await CarWashTransaction.findOne({ billNo });
      } while (existingBillNo);
    }

    const existingTransaction = await CarWashTransaction.findOne({
      "service.id": service,
      vehicleNumber,
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
        "There is already an active transaction for this service and vehicle number"
      );
    }

    const existingCustomer = await CarWashCustomer.findById(customer);
    if (!existingCustomer) {
      return errorResponse(res, 404, "Customer not found.");
    }

    const newTransaction = new CarWashTransaction({
      customer: customer,
      transactionStatus: "In Queue",
      service: {
        id: service,
        start: serviceStart,
        cost: serviceRate,
      },
      billNo,
      vehicleNumber: vehicleNumber,
    });

    // await newTransaction.save();
    const savedTransaction = await newTransaction.save();
    existingCustomer.customerTransactions.push(savedTransaction._id);
    await existingCustomer.save();

    return successResponse(
      res,
      201,
      "Car wash transaction created successfully.",
      savedTransaction
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

const transactionTwo = async (req, res) => {
  try {
    const { transactionId, inspections, serviceEnd } = req.body;

    const transaction = await CarWashTransaction.findById(transactionId);
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    transaction.transactionStatus = "Ready for Pickup";
    transaction.service.end = serviceEnd;
    transaction.inspections = inspections;

    await transaction.save();

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Failed to update transaction.");
  }
};

const transactionThree = async (req, res) => {
  try {
    const {
      transactionId,
      serviceId,
      transactionStatus,
      paymentStatus,
      paymentMode,
      parkingIn,
      parkingOut,
      parkingCost,
      transactionTime,
      grossAmount,
      discountAmount,
      netAmount,
      redeemed,
      washCount,
    } = req.body;

    if (!transactionId) {
      return errorResponse(res, 400, "Transaction ID is required.");
    }

    if (!paymentMode) {
      return errorResponse(res, 400, "Payment mode is required.");
    }

    if (redeemed && !washCount) {
      return errorResponse(
        res,
        400,
        "Wash count is required when redeemed is true."
      );
    }

    const transaction = await CarWashTransaction.findByIdAndUpdate(
      transactionId,
      {
        transactionStatus,
        paymentStatus,
        paymentMode,
        parking: {
          in: parkingIn,
          out: parkingOut,
          cost: parkingCost,
        },
        transactionTime,
        grossAmount,
        discountAmount,
        netAmount,
        redeemed,
      },
      { new: true }
    );

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    const paymentModeObj = await PaymentMode.findByIdAndUpdate(paymentMode, {
      $push: {
        carWashTransactions: transactionId,
      },
    });

    if (redeemed && washCount) {
      const updatedTransactions = await CarWashTransaction.updateMany(
        {
          paymentStatus: "Paid",
          transactionStatus: "Completed",
          "service.id": serviceId,
        },
        {
          $set: {
            redeemed: true,
          },
        },
        {
          sort: {
            createdAt: 1,
          },
          limit: washCount,
        }
      );
    }

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Failed to update transaction.");
  }
};

const getCheckoutDetails = async (req, res) => {
  try {
    const customerId = req.params.customerId;

    const customer = await CarWashCustomer.findById(customerId).populate({
      path: "customerTransactions",
      match: {
        transactionStatus: "Completed",
        paymentStatus: "Paid",
        redeemed: false,
      },
      populate: {
        path: "service.id",
        match: {
          "streakApplicable.decision": true,
          serviceTypeOperational: true,
        },
        populate: {
          path: "serviceVehicle",
        },
      },
    });
    if (!customer) {
      return errorResponse(res, 404, "Customer not found.");
    }

    customer.customerTransactions = customer.customerTransactions.filter(
      (transaction) => transaction.service.id
    );

    const paymentModes = await PaymentMode.find({
      paymentModeOperational: true,
    });

    return successResponse(
      res,
      200,
      "Checkout details retrieved successfully.",
      {
        customer,

        paymentModes,
      }
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Failed to get checkout details.");
  }
};

const getTransactionForInspection = async (req, res) => {
  try {
    const transactionId = req.params.id;

    const transaction = await CarWashTransaction.findById(transactionId)
      .populate({
        path: "service.id",
        populate: {
          path: "serviceVehicle",
        },
      })
      .populate("customer");

    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    const inspectionTemplates = await InspectionTemplate.find().select(
      "-__v -createdAt -updatedAt"
    );

    return successResponse(
      res,
      200,
      "Transaction and inspection templates retrieved successfully.",
      {
        transaction,
        inspectionTemplates,
      }
    );
  } catch (err) {
    return errorResponse(
      res,
      500,
      "Server error. Failed to retrieve transaction."
    );
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transactionId = req.params.id;
    console.log("🚀 ~ deleteTransaction ~ transactionId:", transactionId);

    const transaction = await CarWashTransaction.findOneAndUpdate(
      {
        _id: transactionId,
        transactionStatus: { $in: ["In Queue", "Booked"] },
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

module.exports = {
  createCustomer,
  findCustomer,
  transactionOne,
  transactionTwo,
  transactionThree,
  getCarwashTransactions,
  getTransactionForInspection,
  deleteTransaction,
  getCheckoutDetails,
  createNewBookingTransaction,
  transactionStartFromBooking,
};
