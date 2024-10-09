const CarWashVehicleType = require("../models/CarWashVehicleType");
const PackageType = require("../models/PackageType");
const PaymentMode = require("../models/PaymentMode");
const ServiceType = require("../models/ServiceType");

//====================VEHICLE TYPE======================

const createVehicleType = async (req, res) => {
  try {
    const { vehicleTypeName, vehicleTypeFor, billAbbreviation, vehicleIcon } =
      req.body;

    if (!vehicleTypeName || !vehicleTypeFor || !billAbbreviation) {
      return res
        .status(400)
        .json({ message: "Please fill all required fields" });
    }

    const newVehicleType = new CarWashVehicleType({
      vehicleTypeName,
      vehicleTypeFor,
      billAbbreviation,
      vehicleIcon,
    });

    const savedVehicleType = await newVehicleType.save();

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

const getAllVehicleType = async (req, res) => {
  try {
    const activeVehicleTypes = await CarWashVehicleType.find({
      vehicleTypeOperational: true,
    })
      .populate({
        path: "services",
        match: { serviceTypeOperational: true }, // Only populate operational services
      })
      .populate({
        path: "packages",
        match: { packageTypeOperational: true }, // Only populate operational packages
      });

    if (activeVehicleTypes.length === 0) {
      return res.status(204).send(); // 204 No Content
    }

    res.status(200).json(activeVehicleTypes);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Server error" });
  }
};

const updateVehicleType = async (req, res) => {
  const { vehicleTypeId, updates } = req.body;

  try {
    const updatedVehicleType = await CarWashVehicleType.findOneAndUpdate(
      { _id: vehicleTypeId, vehicleTypeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedVehicleType) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }

    res.status(200).json(updatedVehicleType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteVehicleType = async (req, res) => {
  const { vehicleTypeId } = req.body;

  try {
    const vehicleType = await CarWashVehicleType.findOneAndUpdate(
      { _id: vehicleTypeId, vehicleTypeOperational: true },
      { vehicleTypeOperational: false },
      { new: true, runValidators: true }
    );

    if (!vehicleType) {
      return res.status(404).json({ error: "Vehicle type not found" });
    }

    await ServiceType.updateMany(
      { _id: { $in: vehicleType.services } },
      { serviceTypeOperational: false }
    );

    // await PackageType.updateMany(
    //   { _id: { $in: vehicleType.packages } },
    //   { packageTypeOperational: false }
    // );

    res.status(200).json({
      message:
        "Vehicle type and related services/packages deactivated successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

//====================SERVICE TYPE======================

const createServiceType = async (req, res) => {
  try {
    const {
      serviceTypeName,
      serviceDescription,
      billAbbreviation,
      serviceRate,
      includeParking,
      vehicleTypeId,
    } = req.body;

    const vehicleType = await CarWashVehicleType.findById(vehicleTypeId);
    if (!vehicleType) {
      return res.status(404).json({ message: "Vehicle type not found" });
    }

    const newService = new ServiceType({
      serviceTypeName,
      serviceDescription,
      billAbbreviation,
      serviceRate,
      includeParking,
      serviceVehicle: vehicleTypeId,
    });

    const savedService = await newService.save();

    vehicleType.services.push(savedService._id);
    await vehicleType.save();

    res.status(201).json({
      message: "Service created and linked to vehicle type successfully",
      data: savedService,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const getAllServiceType = async (req, res) => {
  try {
    const activeServiceTypes = await ServiceType.find({
      serviceTypeOperational: true,
    });

    if (activeServiceTypes.length === 0) {
      return res.status(204).send(); // 204 No Content
    }

    res.status(200).json(activeServiceTypes);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Server error" });
  }
};

const updateServiceType = async (req, res) => {
  const { serviceTypeId, updates } = req.body;

  try {
    const updatedServiceType = await ServiceType.findOneAndUpdate(
      { _id: serviceTypeId, serviceTypeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedServiceType) {
      return res.status(404).json({ error: "Service Type not found" });
    }

    res.status(200).json(updatedServiceType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deleteServiceType = async (req, res) => {
  const { serviceTypeId } = req.body;

  try {
    const serviceType = await ServiceType.findOneAndUpdate(
      { _id: serviceTypeId, serviceTypeOperational: true },
      {
        serviceTypeOperational: false,
      },
      { new: true, runValidators: true }
    );

    if (!serviceType) {
      return res.status(404).json({ error: "Service Type not found" });
    }

    res.status(200).json({
      message: "Service Type soft deleted successfully",
      serviceType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

//====================PACKAGE TYPE======================

const createPackageType = async (req, res) => {
  try {
    const {
      packageTypeName,
      packageContents,
      billAbbreviation,
      packageRate,
      includeParking,
      streakApplicable,
      vehicleTypeId,
    } = req.body;

    const vehicleType = await CarWashVehicleType.findById(vehicleTypeId);
    if (!vehicleType) {
      return res.status(404).json({ error: "Vehicle not found" });
    }

    const newPackageType = new PackageType({
      packageTypeName,
      packageContents,
      billAbbreviation,
      packageRate,
      includeParking,
      streakApplicable,
      packageVehicle: vehicleTypeId,
    });

    const savedService = await newPackageType.save();

    vehicleType.packages.push(newPackageType._id);
    await vehicleType.save();

    res.status(201).json({
      message: "Package type created successfully",
      data: savedService,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllPackageType = async (req, res) => {
  try {
    const activePackageTypes = await PackageType.find({
      packageTypeOperational: true,
    });
    if (activePackageTypes.length === 0) {
      return res.status(204).send();
    }

    res.status(200).json(activePackageTypes);
  } catch (err) {
    console.error(err);

    res.status(500).json({ error: "Server error" });
  }
};

const updatePackageType = async (req, res) => {
  const { packageTypeId, updates } = req.body;

  try {
    const updatedPackageType = await PackageType.findOneAndUpdate(
      { _id: packageTypeId, serviceTypeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedPackageType) {
      return res.status(404).json({ error: "Package Type not found" });
    }

    res.status(200).json(updatedPackageType);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deletePackageType = async (req, res) => {
  const { packageTypeId } = req.body;

  try {
    const packageType = await PackageType.findOneAndUpdate(
      { _id: packageTypeId, packageTypeOperational: true },
      {
        packageTypeOperational: false,
      },
      { new: true, runValidators: true }
    );

    if (!packageType) {
      return res.status(404).json({ error: "Package Type not found" });
    }

    res.status(200).json({
      message: "Service Type soft deleted successfully",
      data: packageType,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

//====================PAYMENT MODE======================

const createPaymentMode = async (req, res) => {
  const { paymentModeName, qrCodeData } = req.body;

  if (!paymentModeName) {
    return res.status(400).json({ error: "Payment mode name is required" });
  }

  try {
    const newPaymentMode = new PaymentMode({
      paymentModeName,
      qrCodeData: qrCodeData,
    });

    const savedPaymentMode = await newPaymentMode.save();

    res.status(201).json(savedPaymentMode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const getAllPaymentMode = async (req, res) => {
  try {
    // Find all payment modes where paymentModeOperational is true
    const activePaymentModes = await PaymentMode.find({
      paymentModeOperational: true,
    });

    if (activePaymentModes.length === 0) {
      return res.status(204).send(); // 204 No Content
    }

    // Return the active payment modes
    res.status(200).json(activePaymentModes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const updatePaymentMode = async (req, res) => {
  const { paymentModeId, updates } = req.body;

  try {
    // Find the payment mode by ID and update it
    const updatedPaymentMode = await PaymentMode.findOneAndUpdate(
      { _id: paymentModeId, paymentModeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    // Check if the payment mode was found and updated
    if (!updatedPaymentMode) {
      return res.status(404).json({ error: "Payment mode not found" });
    }

    // Return the updated payment mode
    res.status(200).json(updatedPaymentMode);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

const deletePaymentMode = async (req, res) => {
  const { paymentModeId } = req.body;

  try {
    const paymentMode = await PaymentMode.findOneAndUpdate(
      { _id: paymentModeId, paymentModeOperational: true },
      {
        paymentModeOperational: false,
      },
      { new: true, runValidators: true }
    );

    if (!paymentMode) {
      return res.status(404).json({ error: "Payment mode not found" });
    }

    res.status(200).json({
      message: "Payment mode soft deleted successfully",
      paymentMode,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
};

module.exports = {
  createVehicleType,
  getAllVehicleType,
  updateVehicleType,
  deleteVehicleType,
  createServiceType,
  getAllServiceType,
  updateServiceType,
  deleteServiceType,
  createPackageType,
  getAllPackageType,
  updatePackageType,
  deletePackageType,
  createPaymentMode,
  getAllPaymentMode,
  updatePaymentMode,
  deletePaymentMode,
};
