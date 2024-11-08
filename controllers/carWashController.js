const CarWashCustomer = require("../models/CarWashCustomer");
const CarWashTransaction = require("../models/CarWashTransaction");
const CarWashVehicleType = require("../models/CarWashVehicleType");
const InspectionTemplate = require("../models/InspectionTemplate");
const PaymentMode = require("../models/PaymentMode");
const ServiceType = require("../models/ServiceType");
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

const getAllCustomers = async (req, res) => {
  try {
    const customers = await CarWashCustomer.aggregate([
      {
        $lookup: {
          from: "carwashtransactions",
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

    const customer = await CarWashCustomer.findById(id).populate({
      path: "customerTransactions",
      populate: [
        {
          path: "service.id",
          populate: {
            path: "serviceVehicle",
          },
        },
        { path: "customer" },
        { path: "paymentMode" },
      ],
      options: { sort: { createdAt: -1 } },
    });

    if (!customer) {
      return errorResponse(res, 404, "Customer not found");
    }

    const activeVehicleTypes = await CarWashVehicleType.find({
      vehicleTypeOperational: true,
    }).populate({
      path: "services",
      match: {
        serviceTypeOperational: true,
        "streakApplicable.decision": true,
      },
    });

    return successResponse(res, 200, "Customer retrieved successfully", {
      customer,
      activeVehicleTypes,
    });
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const updateCarwashCustomer = async (req, res) => {
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

    const customer = await CarWashCustomer.findByIdAndUpdate(id, {
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

// ====================TRANSACTION=============================

const getCarwashTransactions = async (req, res) => {
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

    const transactions = await CarWashTransaction.find({
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
              "service.end": {
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
    console.log(err);
    return errorResponse(res, 500, "Failed to retrieve transactions.");
  }
};

const createNewBookingTransaction = async (req, res) => {
  try {
    const {
      customerId,
      bookingDeadline,
      //  clientDate
    } = req.body;

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
      existingBillNo = await CarWashTransaction.findOne({ billNo });
    } while (existingBillNo);

    const existingTransaction = await CarWashTransaction.findOne({
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
      // serviceStart,
      serviceRate,
      actualRate,
    } = req.body;

    const now = new Date();
    const serviceStartDateObj = new Date(now); // Using server-generated date for `serviceStart`

    // const serviceStartDateObj = new Date(serviceStart);

    if (isNaN(serviceStartDateObj.getTime())) {
      return errorResponse(res, 400, "Invalid date format");
    }

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

    const existingService = await ServiceType.findById(service);
    if (!existingService) {
      return errorResponse(res, 404, "Service not found.");
    }

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
          start: serviceStartDateObj,
          cost: serviceRate,
          actualRate,
        },
        $unset: { deleteAt: "" },
        vehicleNumber: vehicleNumber,
      }
    );
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    existingCustomer.customerTransactions.push(transaction._id);
    existingService.serviceTransactions.push(transaction._id);

    await existingCustomer.save();
    await existingService.save();
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
    const {
      service,
      vehicleNumber,
      customer,
      // serviceStart,
      actualRate,
      serviceRate,
      // clientDate,
    } = req.body;

    const now = new Date();
    const serviceStartDateObj = new Date(now); // Using server-generated date for `serviceStart`
    const clientDate = now.toISOString();

    // const serviceStartDateObj = new Date(serviceStart);
    // if (isNaN(serviceStartDateObj.getTime())) {
    //   return errorResponse(res, 400, "Invalid date format");
    // }

    let billNo;
    let existingBillNo;

    if (!billNo) {
      do {
        billNo = generateBillNo(clientDate);
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

    const existingService = await ServiceType.findById(service);
    if (!existingService) {
      return errorResponse(res, 404, "Service not found.");
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
        start: serviceStartDateObj,
        cost: serviceRate,
        actualRate,
      },
      billNo,
      vehicleNumber: vehicleNumber,
    });

    const savedTransaction = await newTransaction.save();
    existingCustomer.customerTransactions.push(savedTransaction._id);
    existingService.serviceTransactions.push(savedTransaction._id);

    await existingCustomer.save();
    await existingService.save();

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
    const {
      transactionId,
      inspections,
      // serviceEnd
    } = req.body;

    const now = new Date();
    const serviceEndDateObj = new Date(now); // Using server-generated date for `serviceStart`

    // const serviceEndDateObj = new Date(serviceEnd);
    // if (isNaN(serviceEndDateObj.getTime())) {
    //   return errorResponse(res, 400, "Invalid date format");
    // }

    const transaction = await CarWashTransaction.findById(transactionId);
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    transaction.transactionStatus = "Ready for Pickup";
    transaction.service.end = serviceEndDateObj;
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
      // transactionTime,
      grossAmount,
      discountAmount,
      netAmount,
      redeemed,
      washCount,
    } = req.body;

    let parkingInDateObj = undefined;
    let parkingOutDateObj = undefined;

    if (parkingIn) {
      parkingInDateObj = new Date(parkingIn);
      if (isNaN(parkingInDateObj.getTime())) {
        return errorResponse(res, 400, "Invalid date format");
      }
    }

    if (parkingOut) {
      parkingOutDateObj = new Date(parkingOut);
      if (isNaN(parkingOutDateObj.getTime())) {
        return errorResponse(res, 400, "Invalid date format");
      }
    }

    const now = new Date();
    const transactionTimeDateObj = new Date(now);

    if (isNaN(transactionTimeDateObj.getTime())) {
      return errorResponse(res, 400, "Invalid date format");
    }

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
          in: parkingInDateObj,
          out: parkingOutDateObj,
          cost: parkingCost,
        },
        transactionTime: transactionTimeDateObj,
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
    if (!customerId) {
      return errorResponse(res, 404, "No Customer ID.");
    }

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

const getPreFilterTransactions = async (req, res) => {
  try {
    const vehicleTypes = await CarWashVehicleType.find({
      $or: [
        { services: { $exists: true, $not: { $size: 0 } } },
        { vehicleTypeOperational: true },
      ],
    }).populate({
      path: "services",
      match: {
        $or: [
          { serviceTypeOperational: true },
          { serviceTransactions: { $exists: true, $not: { $size: 0 } } },
        ],
      },
    });

    return successResponse(
      res,
      200,
      "Vehicle types retrieved successfully.",
      vehicleTypes
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

const getPostFilterTransactions = async (req, res) => {
  try {
    const filter = req.body;
    const query = {};

    if (filter.timeRange?.from) {
      query.createdAt = {
        $gte: new Date(filter.timeRange.from),
        ...(filter.timeRange.to && { $lte: new Date(filter.timeRange.to) }),
      };
    }

    if (filter.transactionStatus) {
      query.transactionStatus = filter.transactionStatus;
    }

    if (filter.paymentStatus) {
      query.paymentStatus = filter.paymentStatus;
    }

    if (filter.serviceId) {
      query["service.id"] = filter.serviceId;
    }

    let transactionsQuery = CarWashTransaction.find(query)
      .populate("service.id")
      .sort({ createdAt: 1 })
      .populate({
        path: "service.id",
        populate: {
          path: "serviceVehicle",
        },
      })
      .populate("customer")
      .populate("paymentMode");
    if (filter.vehicleId) {
      transactionsQuery = transactionsQuery.populate({
        path: "service.id",
        match: { serviceVehicle: filter.vehicleId },
        populate: {
          path: "serviceVehicle",
        },
      });
    }

    const transactions = await transactionsQuery.exec();

    const filteredTransactions = filter.vehicleId
      ? transactions.filter((t) => t.service.id)
      : transactions;

    return successResponse(
      res,
      200,
      "Transactions retrieved",
      filteredTransactions
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

module.exports = {
  getAllCustomers,
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
  getPreFilterTransactions,
  getPostFilterTransactions,
  getCustomerById,
  updateCarwashCustomer,
};
