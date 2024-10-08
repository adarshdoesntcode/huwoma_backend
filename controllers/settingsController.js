const CarWashVehicleType = require("../models/CarWashVehicleType");
const ServiceType = require("../models/ServiceType");

const createVehicleType = async (req, res) => {
  try {
    // Extract data from request body
    const { vehicleTypeName, vehicleTypeFor, vehicleIcon } = req.body;

    // Validate required fields
    if (!vehicleTypeName || !vehicleTypeFor) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    // Create new Vehicle Type instance
    const newVehicleType = new CarWashVehicleType({
      vehicleTypeName,
      vehicleTypeFor,
      vehicleIcon, // Optional field, so it can be undefined
    });

    // Save to database
    const savedVehicleType = await newVehicleType.save();

    // Send success response
    res.status(201).json({
      message: "Vehicle type created successfully!",
      vehicleType: savedVehicleType,
    });
  } catch (error) {
    // Handle any error
    console.error(error);
    res.status(500).json({ message: "Server error, please try again later." });
  }
};

const createServiceType = async (req, res) => {
  try {
    const {
      serviceTypeName,
      serviceDescription,
      billAbbreviation,
      serviceRate,
      includeParking,
      packageOnly,
      vehicleTypeId,
    } = req.body;

    // Check if the vehicleTypeId is valid and the vehicle exists
    const vehicleType = await CarWashVehicleType.findById(vehicleTypeId);
    if (!vehicleType) {
      return res.status(404).json({ message: "Vehicle type not found" });
    }

    // Create a new service
    const newService = new ServiceType({
      serviceTypeName,
      serviceDescription,
      serviceTypeOperational: true, // Defaulting operational to true
      billAbbreviation,
      serviceRate,
      includeParking,
      packageOnly,
      serviceVehicle: vehicleTypeId, // Reference to the vehicle type
    });

    // Save the new service to the database
    const savedService = await newService.save();

    // Add the service reference to the vehicle's services array
    vehicleType.services.push(savedService._id);
    await vehicleType.save();

    // Return the newly created service
    res.status(201).json({
      message: "Service created and linked to vehicle type successfully",
      service: savedService,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { createVehicleType, createServiceType };
