const redis = require("../config/redisConn");
const CarWashCustomer = require("../models/CarWashCustomer");
const CarWashTransaction = require("../models/CarWashTransaction");
const CarWashVehicleType = require("../models/CarWashVehicleType");
const InspectionTemplate = require("../models/InspectionTemplate");
const PaymentMode = require("../models/PaymentMode");
const ServiceType = require("../models/ServiceType");
const SystemActivity = require("../models/SystemActivity");
const {
  incrementVisitorCount,
  decrementVisitorCount,
} = require("./utils/redisUtils");
const { errorResponse, successResponse } = require("./utils/reponse");
const { generateBillNo } = require("./utils/utils");
const mongoose = require("mongoose");

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
    const { customerContact, vehicleNumber, customerName } = req.body;

    let customer;

    if (customerContact && !vehicleNumber && !customerName) {
      customer = await CarWashCustomer.findOne({
        customerContact,
      }).populate({
        path: "customerTransactions",
        match: {
          transactionStatus: "Completed",
          paymentStatus: "Paid",
          redeemed: false,
        },
      });
    }

    if (!customerContact && !vehicleNumber && customerName) {
      customer = await CarWashCustomer.find({
        customerName: { $regex: new RegExp(customerName, "i") },
      }).populate({
        path: "customerTransactions",
        match: {
          transactionStatus: "Completed",
          paymentStatus: "Paid",
          redeemed: false,
        },
      });
    }

    if (!customerContact && vehicleNumber && !customerName) {
      const customersWithModels = await CarWashTransaction.aggregate([
        {
          $match: {
            vehicleNumber: { $regex: new RegExp(vehicleNumber, "i") },
          },
        },
        {
          $group: {
            _id: "$customer",
            models: {
              $addToSet: {
                model: "$vehicleModel",
                vehicleNumber: "$vehicleNumber",
                vehicleColor: "$vehicleColor",
              },
            },
          },
        },
      ]);

      const customers = customersWithModels.map((customer) => customer._id);

      customer = await CarWashCustomer.find({
        _id: { $in: customers },
      }).populate({
        path: "customerTransactions",
        match: {
          transactionStatus: "Completed",
          paymentStatus: "Paid",
          redeemed: false,
        },
      });

      customer = customer.map((customer) => {
        const customerWithModels = customersWithModels.find(
          (customerWithModel) =>
            customerWithModel._id.toString() === customer._id.toString()
        );

        return {
          ...customer._doc,
          vehicleModels: customerWithModels ? customerWithModels.models : [],
        };
      });
    }

    if (!customer) {
      return errorResponse(res, 404, "Customer not found");
    }
    if (customer.length === 0) {
      return errorResponse(res, 404, "Customer not found");
    }

    return successResponse(
      res,
      200,
      "Customer retrieved successfully",
      customer
    );
  } catch (error) {
    console.log("🚀 ~ findCustomer ~ error:", error);
    return errorResponse(res, 500, "Server error", error.message);
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

    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${customer.customerName}'s details updated.`,
      activityType: "Update",
      systemModule: "Carwash Customer",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(res, 200, "Customer updated successfully", customer);
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

// ====================TRANSACTION=============================

const getCarwashTransactions = async (req, res) => {
  try {
    const now = new Date();
    const nowDateObj = new Date(now);

    const startOfDay = new Date(nowDateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(nowDateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const hours = await redis.hgetall("carwash_hourly_count");

    let transactions = [];

    const cachedTransactions = await redis.get("carwash:transactions_today");

    if (cachedTransactions) {
      transactions = JSON.parse(cachedTransactions);
    } else {
      transactions = await CarWashTransaction.find({
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

      await redis.set(
        "carwash:transactions_today",
        JSON.stringify(transactions),
        "EX",
        3600
      );
    }

    return successResponse(res, 200, "Transactions retrieved successfully.", {
      hours,
      transactions,
    });
  } catch (err) {
    console.log(err);
    return errorResponse(res, 500, "Failed to retrieve transactions.");
  }
};

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

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      do {
        billNo = generateBillNo(clientDate);
        existingBillNo = await CarWashTransaction.findOne({ billNo }).session(
          session
        );
      } while (existingBillNo);

      const existingTransaction = await CarWashTransaction.findOne({
        bookingDeadline: bookingDeadlineDateObj,
        transactionStatus: "Booked",
      }).session(session);

      if (existingTransaction) {
        await session.abortTransaction();
        session.endSession();
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

      await newTransaction.save({ session });

      await redis.del("carwash:transactions_today");

      new SystemActivity({
        description: `Carwash Booking created for ${newTransaction.billNo}. `,
        activityType: "Booking",
        systemModule: "Vehicle Service",
        activityBy: req.userId,
        activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
        userAgent: req.headers["user-agent"],
      }).save();

      await session.commitTransaction();
      session.endSession();

      return successResponse(
        res,
        201,
        "Booking transaction created successfully",
        newTransaction
      );
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 500, "Server error", error.message);
    }
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const transactionStartFromBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      transactionId,
      service,
      vehicleNumber,
      vehicleModel,
      vehicleColor,
      customer,
      // serviceStart,
      serviceRate,
      actualRate,
      hour,
      today,
    } = req.body;

    const now = new Date();
    const serviceStartDateObj = new Date(now); // Using server-generated date for `serviceStart`

    // const serviceStartDateObj = new Date(serviceStart);

    if (isNaN(serviceStartDateObj.getTime())) {
      return errorResponse(res, 400, "Invalid date format");
    }

    const existingCustomer = await CarWashCustomer.findById(customer).session(
      session
    );
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
    }).session(session);

    const existingService = await ServiceType.findById(service).session(
      session
    );
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
        vehicleModel: vehicleModel,
        vehicleColor: vehicleColor,
      },
      {
        new: true,
        runValidators: true,
      }
    ).session(session);
    if (!transaction) {
      return errorResponse(res, 404, "Transaction not found.");
    }

    existingCustomer.customerTransactions.push(transaction._id);

    await existingCustomer.save({ session });

    await redis.del("carwash:transactions_today");
    redis.hincrby("carwash_hourly_count", hour, 1);

    if (today) {
      incrementVisitorCount("carwash", today, 1);
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to create transaction."
    );
  }
};

const transactionOne = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      service,
      vehicleNumber,
      vehicleColor,
      vehicleModel,
      customer,
      actualRate,
      serviceRate,
      hour,
      today,
    } = req.body;

    const now = new Date();
    const serviceStartDateObj = new Date(now);
    const clientDate = now.toISOString();

    let billNo;
    let existingBillNo;

    if (!billNo) {
      do {
        billNo = generateBillNo(clientDate);
        existingBillNo = await CarWashTransaction.findOne({ billNo }).session(
          session
        );
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
    }).session(session);

    if (existingTransaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(
        res,
        400,
        "There is already an active transaction for this service and vehicle number"
      );
    }

    const existingService = await ServiceType.findById(service).session(
      session
    );
    if (!existingService) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Service not found.");
    }

    const existingCustomer = await CarWashCustomer.findById(customer).session(
      session
    );
    if (!existingCustomer) {
      await session.abortTransaction();
      session.endSession();
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
      vehicleModel: vehicleModel,
      vehicleColor: vehicleColor,
    });

    const savedTransaction = await newTransaction.save({ session });
    existingCustomer.customerTransactions.push(savedTransaction._id);
    // existingService.serviceTransactions.push(savedTransaction._id);

    await existingCustomer.save({ session });
    // await existingService.save({ session });

    await redis.del("carwash:transactions_today");

    redis.hincrby("carwash_hourly_count", hour, 1);

    if (today) {
      incrementVisitorCount("carwash", today, 1);
    }

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      201,
      "Car wash transaction created successfully.",
      savedTransaction
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return errorResponse(
      res,
      500,
      "Server error. Failed to create transaction."
    );
  }
};

const transactionTwo = async (req, res) => {
  let session;
  try {
    const { transactionId, inspections } = req.body;

    const now = new Date();
    const serviceEndDateObj = new Date(now);

    session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await CarWashTransaction.findById(
      transactionId
    ).session(session);
    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Transaction not found.");
    }

    transaction.transactionStatus = "Ready for Pickup";
    transaction.service.end = serviceEndDateObj;
    transaction.inspections = inspections;

    await transaction.save({ session });

    await redis.del("carwash:transactions_today");

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return errorResponse(res, 500, "Failed to update transaction.");
  }
};

const transactionThree = async (req, res) => {
  let session;
  try {
    const {
      transactionId,
      serviceId,
      transactionStatus,
      paymentStatus,
      paymentMode,
      parkingIn,
      serviceCost,
      parkingOut,
      parkingCost,
      grossAmount,
      discountAmount,
      addOns,
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

    session = await mongoose.startSession();
    session.startTransaction();

    const transaction = await CarWashTransaction.findByIdAndUpdate(
      transactionId,
      {
        transactionStatus,
        paymentStatus,
        paymentMode,
        "service.cost": serviceCost,
        parking: {
          in: parkingInDateObj,
          out: parkingOutDateObj,
          cost: parkingCost,
        },
        transactionTime: transactionTimeDateObj,
        addOns,
        grossAmount,
        discountAmount,
        netAmount,
        redeemed,
      },
      { new: true, session }
    );

    if (!transaction) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Transaction not found.");
    }

    // await PaymentMode.findByIdAndUpdate(
    //   paymentMode,
    //   {
    //     $push: {
    //       carWashTransactions: transactionId,
    //     },
    //   },
    //   { session }
    // );

    if (redeemed && washCount) {
      console.log("🚀 ~ transactionThree ~ washCount:", washCount);
      const transactionsToUpdate = await CarWashTransaction.find(
        {
          customer: transaction.customer,
          paymentStatus: "Paid",
          transactionStatus: "Completed",
          "service.id": serviceId,
          redeemed: false,
        },
        null, // No projection
        {
          sort: { createdAt: 1 }, // Sort by `createdAt` ascending
          limit: washCount, // Limit the number of documents
          session, // Include session for atomicity
        }
      );

      // Extract the IDs of the transactions
      const transactionIds = transactionsToUpdate.map((doc) => doc._id);

      // Update only the limited documents
      await CarWashTransaction.updateMany(
        { _id: { $in: transactionIds } },
        {
          $set: { redeemed: true },
        },
        { session }
      );
    }

    await redis.del("carwash:transactions_today");

    await session.commitTransaction();
    session.endSession();

    return successResponse(
      res,
      200,
      "Transaction updated successfully.",
      transaction
    );
  } catch (err) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
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

    let paymentModes;
    const cachedPaymentModes = await redis.get("carwash:payment_modes");

    if (cachedPaymentModes) {
      paymentModes = JSON.parse(cachedPaymentModes);
    } else {
      paymentModes = await PaymentMode.find({
        paymentModeOperational: true,
      });
      await redis.set(
        "carwash:payment_modes",
        JSON.stringify(paymentModes),
        "EX",
        60 * 60 * 24
      );
    }

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

    let inspectionTemplates = await redis.get("carwash:inspection");

    if (!inspectionTemplates) {
      inspectionTemplates = await InspectionTemplate.find().select(
        "-__v -createdAt -updatedAt"
      );

      await redis.set(
        "carwash:inspection",
        JSON.stringify(inspectionTemplates),
        "EX",
        60 * 60 * 24
      );
    } else {
      inspectionTemplates = JSON.parse(inspectionTemplates);
    }

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

    new SystemActivity({
      description: `${transaction.billNo} terminated`,
      activityType: "Cancelled",
      systemModule: "Carwash Transaction",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    await redis.del("carwash:transactions_today");

    decrementVisitorCount(
      "carwash",
      transaction.createdAt.toISOString().slice(0, 10),
      1
    );

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
        serviceTypeOperational: true,
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

const rollbackFromPickup = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const transaction = await CarWashTransaction.findOne({
      _id: req.body.transactionId,
      transactionStatus: "Ready for Pickup",
    }).session(session);

    if (transaction.service.end) {
      const difference = Math.abs(
        new Date() - new Date(transaction.service.end)
      );
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      if (days <= 3) {
        transaction.transactionStatus = "In Queue";
        transaction.service.end = undefined;
        transaction.inspections = [];

        await transaction.save({ session });
        await redis.del("carwash:transactions_today");

        new SystemActivity({
          description: `${transaction.billNo} rolled back to "In Queue"`,
          activityType: "Rollback",
          systemModule: "Carwash Transaction",
          activityBy: req.userId,
          activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
          userAgent: req.headers["user-agent"],
        }).save();
        await session.commitTransaction();
        return successResponse(
          res,
          200,
          "Transaction status changed to In Queue",
          transaction
        );
      }
    }

    await session.abortTransaction();
    return errorResponse(res, 400, "Transaction cannot be rolled back");
  } catch (err) {
    await session.abortTransaction();
    return errorResponse(res, 500, "Server error. Failed to rollback");
  } finally {
    session.endSession();
  }
};

const rollbackFromCompleted = async (req, res) => {
  try {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const transaction = await CarWashTransaction.findOne({
        _id: req.body.transactionId,
        transactionStatus: "Completed",
      })
        .populate("service.id")
        .session(session);

      // await PaymentMode.updateOne(
      //   { _id: transaction.paymentMode },
      //   { $pull: { carWashTransactions: transaction._id } },
      //   { session: session }
      // );

      if (transaction.transactionTime) {
        const difference = Math.abs(
          new Date() - new Date(transaction.transactionTime)
        );
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        if (days <= 3) {
          transaction.transactionStatus = "Ready for Pickup";
          transaction.paymentStatus = "Pending";
          transaction.paymentMode = undefined;
          transaction.transactionTime = undefined;
          transaction.parking.in = undefined;
          transaction.parking.out = undefined;
          transaction.parking.cost = undefined;
          transaction.netAmount = undefined;
          transaction.discountAmount = undefined;
          transaction.grossAmount = undefined;
          transaction.inspections = [];

          if (
            transaction.redeemed &&
            transaction.service.id.streakApplicable.decision
          ) {
            transaction.redeemed = false;

            const transactionsToReset = await CarWashTransaction.find(
              {
                customer: transaction.customer,
                paymentStatus: "Paid",
                transactionStatus: "Completed",
                "service.id": transaction.service.id._id,
                redeemed: true,
              },
              null, // No projection
              {
                sort: { createdAt: 1 }, // Sort by `createdAt` in ascending order
                limit: transaction.service.id.streakApplicable.washCount, // Limit to the required wash count
                session, // Include the session for atomicity
              }
            );

            // Step 2: Extract the IDs of the transactions to reset
            const resetTransactionIds = transactionsToReset.map(
              (doc) => doc._id
            );

            // Step 3: Update only the selected documents
            await CarWashTransaction.updateMany(
              { _id: { $in: resetTransactionIds } },
              {
                $set: { redeemed: false }, // Reset `redeemed` field to `false`
              },
              { session } // Use the same session
            );
          }

          await transaction.save({ session: session });

          await redis.del("carwash:transactions_today");

          new SystemActivity({
            description: `${transaction.billNo} rolled back to "Ready for Pickup"`,
            activityType: "Rollback",
            systemModule: "Carwash Transaction",
            activityBy: req.userId,
            activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
            userAgent: req.headers["user-agent"],
          }).save();

          await session.commitTransaction();
          return successResponse(
            res,
            200,
            "Transaction status changed to In Queue",
            transaction
          );
        }
      }
      return errorResponse(res, 400, "Transaction cannot be rolled back");
    } catch (err) {
      await session.abortTransaction();
      console.log(err);
      return errorResponse(res, 500, "Server error. Failed to rollback");
    } finally {
      await session.endSession();
    }
  } catch (err) {
    console.log(err);
    return errorResponse(res, 500, "Server error. Failed to rollback");
  }
};

const getPreEditTransactionData = async (req, res) => {
  try {
    const vehicleTypes = await CarWashVehicleType.find({
      vehicleTypeOperational: true,
    }).populate({
      path: "services",
      match: {
        serviceTypeOperational: true,
      },
    });

    const paymentModes = await PaymentMode.find({
      paymentModeOperational: true,
    });

    return successResponse(res, 200, "Success", {
      vehicleTypes,
      paymentModes,
    });
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to get transaction");
  }
};

const editCarwashTransaction = async (req, res) => {
  const { transactionId, serviceId, vehicleNumber, vehicleModel, paymentMode } =
    req.body;
  let transaction;
  try {
    if (paymentMode) {
      const paymentModeObj = await PaymentMode.findById(paymentMode);
      if (!paymentModeObj) {
        return errorResponse(res, 404, "Payment mode not found");
      }

      transaction = await CarWashTransaction.findOneAndUpdate(
        {
          _id: transactionId,
          transactionStatus: { $in: ["Completed"] },
        },
        {
          paymentMode,
          vehicleNumber,
          vehicleModel,
        },
        { new: true }
      );
      if (!transaction) {
        return errorResponse(res, 404, "Transaction not found");
      }
    } else {
      const service = await ServiceType.findById(serviceId);
      if (!service) {
        return errorResponse(res, 404, "Service not found");
      }

      transaction = await CarWashTransaction.findOneAndUpdate(
        {
          _id: transactionId,
          transactionStatus: { $in: ["In Queue", "Ready for Pickup"] },
        },
        {
          "service.id": serviceId,
          "service.cost": service.serviceRate,
          "service.actualRate": service.serviceRate,
          vehicleNumber,
          vehicleModel,
        },
        { new: true }
      );
      if (!transaction) {
        return errorResponse(res, 404, "Transaction not found");
      }
    }

    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${transaction.billNo} edited.`,
      activityType: "Update",
      systemModule: "Carwash Transaction",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(res, 200, "Transaction updated", transaction);
  } catch (err) {
    console.log(err);
    return errorResponse(res, 500, "Server error");
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
  rollbackFromPickup,
  rollbackFromCompleted,
  editCarwashTransaction,
  getPreEditTransactionData,
};
