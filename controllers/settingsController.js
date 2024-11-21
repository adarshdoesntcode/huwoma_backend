const CarWashVehicleType = require("../models/CarWashVehicleType");
const PackageType = require("../models/PackageType");
const PaymentMode = require("../models/PaymentMode");
const ServiceType = require("../models/ServiceType");
const Configuration = require("../models/Configuration");
const InspectionTemplate = require("../models/InspectionTemplate");

const { errorResponse, successResponse } = require("./utils/reponse");

const POSAccess = require("../models/POSAccess");
const SimRacingRig = require("../models/SimRacingRig");

//====================VEHICLE TYPE======================

const createVehicleType = async (req, res) => {
  try {
    const { vehicleTypeName, billAbbreviation, vehicleIcon } = req.body;

    if (!vehicleTypeName || !billAbbreviation) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    const newVehicleType = new CarWashVehicleType({
      vehicleTypeName,
      billAbbreviation,
      vehicleIcon,
    });

    const savedVehicleType = await newVehicleType.save();

    return successResponse(
      res,
      201,
      "Vehicle type created successfully!",
      savedVehicleType
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getAllVehicleType = async (req, res) => {
  try {
    const activeVehicleTypes = await CarWashVehicleType.find({
      vehicleTypeOperational: true,
    }).populate({
      path: "services",
      match: { serviceTypeOperational: true },
    });

    if (activeVehicleTypes.length === 0) {
      return successResponse(res, 204, "No Content", activeVehicleTypes);
    }

    return successResponse(
      res,
      200,
      "Active vehicle types with service",
      activeVehicleTypes
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getVehicleTypeById = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleType = await CarWashVehicleType.findById(id).populate({
      path: "services",
      match: { serviceTypeOperational: true },
    });

    if (!vehicleType) {
      return successResponse(res, 404, "Vehicle type not found");
    }

    return successResponse(
      res,
      200,
      "Vehicle type with service and package",
      vehicleType
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
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
      return errorResponse(res, 404, "Vehicle type not found");
    }

    return successResponse(
      res,
      200,
      "Vehicle type updated successfully",
      updatedVehicleType
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Server error", err.message);
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
      return errorResponse(res, 404, "Vehicle Type not found");
    }

    await ServiceType.updateMany(
      { _id: { $in: vehicleType.services } },
      { serviceTypeOperational: false }
    );

    return successResponse(res, 200, "Config deactivated", vehicleType);
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

//====================SERVICE TYPE======================

const createServiceType = async (req, res) => {
  try {
    const { services, vehicleTypeId } = req.body;

    const vehicleType = await CarWashVehicleType.findById(vehicleTypeId);
    if (!vehicleType) {
      return errorResponse(res, 404, "Vehicle type not found");
    }

    const savedServices = [];

    for (const service of services) {
      const {
        serviceTypeName,
        serviceDescription,
        billAbbreviation,
        streakApplicable,
        serviceRate,
        includeParking,
      } = service;

      const newService = new ServiceType({
        serviceTypeName,
        serviceDescription,
        billAbbreviation,
        serviceRate,
        streakApplicable,
        includeParking,
        serviceVehicle: vehicleTypeId,
      });

      const savedService = await newService.save();
      savedServices.push(savedService);

      vehicleType.services.push(savedService._id);
    }

    await vehicleType.save();

    return successResponse(
      res,
      201,
      "Services created and linked to vehicle type successfully",
      savedServices
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getServiceType = async (req, res) => {
  try {
    const { vehicleTypeId } = req.params;

    if (!vehicleTypeId) {
      return errorResponse(res, 400, "Vehicle type ID is required");
    }

    const vehicleType = await CarWashVehicleType.findById(vehicleTypeId);

    if (!vehicleType) {
      return errorResponse(res, 404, "Vehicle type not found");
    }

    const activeServiceTypes = await ServiceType.find({
      serviceTypeOperational: true,
      serviceVehicle: vehicleTypeId,
    }).select(
      "-__v -createdAt -updatedAt -serviceVehicle -serviceTypeOperational -serviceTransactions"
    );

    if (activeServiceTypes.length === 0) {
      return successResponse(res, 204, "No active service types found", []);
    }

    return successResponse(
      res,
      200,
      "Active service types",
      activeServiceTypes
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Server error", err.message);
  }
};

const updateServiceType = async (req, res) => {
  const { vehicleTypeId, services } = req.body;

  try {
    const vehicleType = await CarWashVehicleType.findById(
      vehicleTypeId
    ).populate("services");

    if (!vehicleType) {
      return errorResponse(res, 404, "Vehicle type not found");
    }

    const existingServiceIds = vehicleType.services.map((service) =>
      service._id.toString()
    );
    const updatedServiceIds = services
      .map((service) => service._id)
      .filter(Boolean);

    const servicesToDeactivate = existingServiceIds.filter(
      (id) => !updatedServiceIds.includes(id)
    );

    await ServiceType.updateMany(
      { _id: { $in: servicesToDeactivate } },
      { serviceTypeOperational: false }
    );

    const updatedOrCreatedServices = [];

    for (const service of services) {
      if (service._id) {
        const updatedService = await ServiceType.findByIdAndUpdate(
          service._id,
          service,
          {
            new: true,
            runValidators: true,
          }
        );

        if (!updatedService) {
          errorResponse(res, 404, "Service not found");
        }
        updatedOrCreatedServices.push(updatedService._id.toString());
      } else {
        const newService = new ServiceType({
          ...service,
          serviceVehicle: vehicleTypeId,
        });
        const savedService = await newService.save();
        updatedOrCreatedServices.push(savedService._id.toString());
      }
    }

    const allServiceIds = [
      ...new Set([
        ...vehicleType.services.map((s) => s._id.toString()),
        ...updatedOrCreatedServices,
      ]),
    ];

    vehicleType.services = allServiceIds;
    await vehicleType.save();

    return successResponse(
      res,
      200,
      "Services updated successfully",
      vehicleType
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponse(res, 409, "Duplicate service entry", error.message);
    }
    return errorResponse(res, 500, "Server error", error.message);
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
      { _id: packageTypeId, packageTypeOperational: true },
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

//====================INSPECTION======================

const createInspectionTemplate = async (req, res) => {
  const { inspections } = req.body;

  try {
    const providedIds = inspections.filter((i) => i._id).map((i) => i._id);

    const existingInspections = await InspectionTemplate.find();

    const inspectionsToRemove = existingInspections.filter(
      (inspection) => !providedIds.includes(inspection._id.toString())
    );

    for (const inspection of inspectionsToRemove) {
      await InspectionTemplate.findByIdAndDelete(inspection._id);
    }

    const createdInspections = [];
    const updatedInspections = [];

    // Process each inspection
    for (const inspection of inspections) {
      if (inspection._id) {
        const updatedInspection = await InspectionTemplate.findByIdAndUpdate(
          inspection._id,
          { $set: inspection },
          { new: true, runValidators: true }
        );

        if (updatedInspection) {
          updatedInspections.push(updatedInspection);
        } else {
          return errorResponse(
            res,
            404,
            `Inspection with _id ${inspection._id} not found.`
          );
        }
      } else {
        const newInspection = new InspectionTemplate(inspection);
        const savedInspection = await newInspection.save();
        createdInspections.push(savedInspection);
      }
    }

    return successResponse(res, 200, "Inspections processed successfully", {
      ...updatedInspections,
      ...createdInspections,
    });
  } catch (error) {
    return errorResponse(
      res,
      500,
      "Server error. Could not process inspections.",
      error.message
    );
  }
};

const getInspectionTemplate = async (req, res) => {
  try {
    const inspectionTemplates = await InspectionTemplate.find().select(
      "-__v -createdAt -updatedAt"
    );

    if (!inspectionTemplates || inspectionTemplates.length === 0) {
      return successResponse(
        res,
        204,
        "No inspection templates found",
        inspectionTemplates
      );
    }

    return successResponse(
      res,
      200,
      "Inspection templates fetched successfully",
      inspectionTemplates
    );
  } catch (error) {
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const updateInspectionTemplate = async (req, res) => {
  try {
    const { templateId, categories } = req.body;
    console.log(templateId, categories);
    const updatedTemplate = await InspectionTemplate.findByIdAndUpdate(
      templateId,
      { categories },
      { new: true }
    );

    if (!updatedTemplate) {
      return errorResponse(res, 404, "Inspection template not found");
    }

    return successResponse(
      res,
      200,
      "Inspection template updated successfully",
      updatedTemplate
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

//====================SIM RACING======================

const createNewSimRacingRig = async (req, res) => {
  const { rigName } = req.body;

  if (!rigName) {
    return errorResponse(res, 400, "Rig name is required");
  }

  const newRig = new SimRacingRig({
    rigName,
  });

  try {
    const savedRig = await newRig.save();
    return successResponse(
      res,
      201,
      "New Sim Racing rig created successfully",
      savedRig
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const updateSimRacingRig = async (req, res) => {
  const { rigId, rigName } = req.body;

  if (!rigId || !rigName) {
    return errorResponse(res, 400, "Rig ID and Rig Name are required");
  }

  try {
    const updatedRig = await SimRacingRig.findByIdAndUpdate(
      rigId,
      { $set: { rigName } },
      { new: true }
    );

    if (!updatedRig) {
      return errorResponse(res, 404, "Sim Racing rig not found");
    }

    return successResponse(
      res,
      200,
      "Sim Racing rig updated successfully",
      updatedRig
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const deleteSimRacingRig = async (req, res) => {
  const { rigId } = req.body;

  if (!rigId) {
    return errorResponse(res, 400, "Rig ID is required");
  }

  try {
    const activeRig = await SimRacingRig.findOne({
      _id: rigId,
      activeRacer: { $exists: true },
      activeTransaction: { $exists: true },
    });

    if (activeRig) {
      return errorResponse(res, 400, "Rig is currently active with a racer");
    }

    const rig = await SimRacingRig.findByIdAndUpdate(
      rigId,
      { $set: { rigOperational: false } },
      { new: true }
    );

    if (!rig) {
      return errorResponse(res, 404, "Sim Racing rig not found");
    }

    return successResponse(
      res,
      200,
      "Sim Racing rig deleted successfully",
      rig
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getAllSimRacingRigs = async (req, res) => {
  try {
    const operationalRigs = await SimRacingRig.find({ rigOperational: true });
    return successResponse(
      res,
      200,
      "Operational Sim Racing rigs fetched successfully",
      operationalRigs
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const updateSimRacingCoordinates = async (req, res) => {
  try {
    const { simRacingCoordinates } = req.body;

    if (!simRacingCoordinates) {
      return errorResponse(res, 400, "Sim racing coordinates are required");
    }

    const configuration = await Configuration.findOneAndUpdate(
      {},
      {
        simRacingCoordinates,
      },
      {
        upsert: true,
        new: true,
      }
    );

    return successResponse(
      res,
      200,
      "Location updated successfully",
      configuration
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const getSimRacingCoordinates = async (req, res) => {
  try {
    const configuration = await Configuration.findOne().select(
      "simRacingCoordinates"
    );
    return successResponse(
      res,
      200,
      "Configuration fetched successfully",
      configuration
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

//====================PAYMENT MODE======================

const createPaymentMode = async (req, res) => {
  const { paymentModeName, qrCodeData } = req.body;

  if (!paymentModeName) {
    return errorResponse(res, 400, "Payment mode name is required");
  }

  try {
    const newPaymentMode = new PaymentMode({
      paymentModeName,
      qrCodeData: qrCodeData,
    });

    const savedPaymentMode = await newPaymentMode.save();

    return successResponse(
      res,
      201,
      "Payment mode created successfully",
      savedPaymentMode
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error");
  }
};

const getAllPaymentMode = async (req, res) => {
  try {
    const activePaymentModes = await PaymentMode.find({
      paymentModeOperational: true,
    });

    if (activePaymentModes.length === 0) {
      return successResponse(res, 204, "No active payment modes found");
    }

    return successResponse(
      res,
      200,
      "Active payment modes fetched successfully",
      activePaymentModes
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error", err.message);
  }
};

const updatePaymentMode = async (req, res) => {
  const { paymentModeId, updates } = req.body;

  try {
    const updatedPaymentMode = await PaymentMode.findOneAndUpdate(
      { _id: paymentModeId, paymentModeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedPaymentMode) {
      return errorResponse(res, 404, "Payment mode not found");
    }

    return successResponse(
      res,
      200,
      "Payment mode updated successfully",
      updatedPaymentMode
    );
  } catch (err) {
    console.error(err);
    return errorResponse(res, 500, "Server error");
  }
};

const deletePaymentMode = async (req, res) => {
  const { paymentModeId } = req.body;

  try {
    const paymentMode = await PaymentMode.findOneAndUpdate(
      { _id: paymentModeId, paymentModeOperational: true },
      { paymentModeOperational: false },
      { new: true, runValidators: true }
    );

    if (!paymentMode) {
      return errorResponse(res, 404, "Payment mode not found");
    }

    return successResponse(
      res,
      200,
      "Payment mode soft deleted successfully",
      paymentMode
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error");
  }
};

//====================POS ACCESS======================

const createPOSAccess = async (req, res) => {
  try {
    const { name } = req.body;

    let accessCode;
    let isUnique = false;

    while (!isUnique) {
      accessCode = Math.floor(100000 + Math.random() * 900000);

      const existingAccess = await POSAccess.findOne({ accessCode });
      if (!existingAccess) {
        isUnique = true;
      }
    }

    const newPOSAccess = new POSAccess({
      name,
      accessCode,
    });
    await newPOSAccess.save();

    return successResponse(
      res,
      201,
      "POS Access created successfully.",
      newPOSAccess
    );
  } catch (err) {
    return errorResponse(res, 500, "Server error.");
  }
};

const getAllPOSAccess = async (req, res) => {
  try {
    const posAccessList = await POSAccess.find({});

    if (posAccessList.length === 0) {
      return successResponse(res, 204, "No Content");
    }

    return successResponse(
      res,
      200,
      "POS Access list retrieved successfully.",
      posAccessList
    );
  } catch (err) {
    return errorResponse(res, 500, "Failed to retrieve POS Access list.");
  }
};

const deletePOSAccess = async (req, res) => {
  try {
    const { id } = req.params;

    const posAccess = await POSAccess.findById(id);
    if (!posAccess) {
      return errorResponse(res, 404, "POS Access not found.");
    }

    await POSAccess.deleteOne({ _id: id });
    return successResponse(res, 200, "POS Access deleted successfully.");
  } catch (err) {
    return errorResponse(res, 500, "Failed to delete POS Access.");
  }
};

module.exports = {
  createVehicleType,
  getAllVehicleType,
  getVehicleTypeById,
  updateVehicleType,
  deleteVehicleType,
  createServiceType,
  getServiceType,
  updateServiceType,
  deleteServiceType,
  createPackageType,
  getAllPackageType,
  updatePackageType,
  deletePackageType,
  createInspectionTemplate,
  getInspectionTemplate,
  updateInspectionTemplate,
  createPaymentMode,
  getAllPaymentMode,
  updatePaymentMode,
  deletePaymentMode,
  createPOSAccess,
  getAllPOSAccess,
  deletePOSAccess,
  createNewSimRacingRig,
  updateSimRacingRig,
  deleteSimRacingRig,
  getAllSimRacingRigs,
  getSimRacingCoordinates,
  updateSimRacingCoordinates,
};
