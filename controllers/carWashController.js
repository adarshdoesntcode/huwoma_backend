const CarWashCustomer = require("../models/CarWashCustomer");
const CarWashTransaction = require("../models/CarWashTransaction");
const { errorResponse, successResponse } = require("./utils/reponse");

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
    }).populate("customerTransactions");

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
        { createdAt: { $gte: startOfDay, $lt: endOfDay } },

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
      .populate("customer");

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

const transactionOne = async (req, res) => {
  try {
    const { service, billNo, vehicleNumber, customer } = req.body;

    const existingCustomer = await CarWashCustomer.findById(customer);
    if (!existingCustomer) {
      return errorResponse(res, 404, "Customer not found.");
    }

    const newTransaction = new CarWashTransaction({
      customer: customer,
      service: {
        id: service,
      },
      billNo,
      vehicleNumber: vehicleNumber,
    });

    await newTransaction.save();
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

module.exports = {
  createCustomer,
  findCustomer,
  transactionOne,
  getCarwashTransactions,
};
