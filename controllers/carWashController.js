const CarWashCustomer = require("../models/CarWashCustomer");
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
    });
    // .populate("customerTransactions");

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

module.exports = { createCustomer, findCustomer };
