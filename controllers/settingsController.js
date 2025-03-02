const CarWashVehicleType = require("../models/CarWashVehicleType");
// const PackageType = require("../models/PackageType");
const PaymentMode = require("../models/PaymentMode");
const ServiceType = require("../models/ServiceType");
const Configuration = require("../models/Configuration");
const InspectionTemplate = require("../models/InspectionTemplate");

const { errorResponse, successResponse } = require("./utils/reponse");
const mongoose = require("mongoose");
const POSAccess = require("../models/POSAccess");
const SimRacingRig = require("../models/SimRacingRig");
const ParkingVehicleType = require("../models/ParkingVehicleType");
const redis = require("../config/redisConn");
const SystemActivity = require("../models/SystemActivity");

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
    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${vehicleTypeName} created.`,
      activityType: "Create",
      systemModule: "Carwash Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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
    let activeVehicleTypes;

    const cachedVehicles = await redis.get("carwash:vehicles");

    if (!cachedVehicles) {
      activeVehicleTypes = await CarWashVehicleType.find({
        vehicleTypeOperational: true,
      }).populate({
        path: "services",
        match: { serviceTypeOperational: true },
      });
      await redis.set(
        "carwash:vehicles",
        JSON.stringify(activeVehicleTypes),
        "EX",
        60 * 60 * 24
      );
    } else {
      activeVehicleTypes = JSON.parse(cachedVehicles);
    }

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

    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${updatedVehicleType.vehicleTypeName} updated.`,
      activityType: "Update",
      systemModule: "Carwash Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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

    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${vehicleType.vehicleTypeName} and its services deleted.`,
      activityType: "Delete",
      systemModule: "Carwash Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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

    const session = await mongoose.startSession();
    session.startTransaction();

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

      const savedService = await newService.save({ session });
      savedServices.push(savedService);

      vehicleType.services.push(savedService._id);
    }

    await vehicleType.save({ session });

    await session.commitTransaction();
    await session.endSession();

    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${vehicleType.vehicleTypeName}'s services created.`,
      activityType: "Create",
      systemModule: "Vehicle Service",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(
      res,
      201,
      "Services created and linked to vehicle type successfully",
      savedServices
    );
  } catch (error) {
    console.error(error);

    await session.abortTransaction();
    await session.endSession();

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
      "-__v -createdAt -updatedAt -serviceVehicle -serviceTypeOperational"
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

    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${vehicleType.vehicleTypeName}'s services updated.`,
      activityType: "Update",
      systemModule: "Vehicle Service",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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
    await redis.del("carwash:vehicles");
    await redis.del("carwash:transactions_today");

    new SystemActivity({
      description: `${serviceType.serviceTypeName}' deleted.`,
      activityType: "Delete",
      systemModule: "Vehicle Service",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    res.status(200).json({
      message: "Service Type soft deleted successfully",
      serviceType,
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

    await redis.set(
      "carwash:inspection",
      JSON.stringify([...updatedInspections, ...createdInspections]),
      "EX",
      60 * 60 * 24
    );

    await redis.del("carwash:transactions_today");

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

    await redis.del("simracing:rig");
    await redis.del("simracing:transactions_today");

    new SystemActivity({
      description: `${savedRig.rigName} created.`,
      activityType: "Create",
      systemModule: "SimRacing Rig",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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

    await redis.del("simracing:rig");
    await redis.del("simracing:transactions_today");

    new SystemActivity({
      description: `${updatedRig.rigName} updated.`,
      activityType: "Update",
      systemModule: "SimRacing Rig",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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

    await redis.del("simracing:rig");
    await redis.del("simracing:transactions_today");

    new SystemActivity({
      description: `${rig.rigName} deleted.`,
      activityType: "Delete",
      systemModule: "SimRacing Rig",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

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
    let operationalRigs;

    const cachedRigs = await redis.get("simracing:rig");

    if (cachedRigs) {
      operationalRigs = JSON.parse(cachedRigs);
    } else {
      operationalRigs = await SimRacingRig.find({ rigOperational: true });
      await redis.set(
        "simracing:rig",
        JSON.stringify(operationalRigs),
        "EX",
        60 * 60 * 24
      );
    }

    if (operationalRigs.length === 0) {
      return errorResponse(res, 204, "No operational Sim Racing rigs");
    }

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
    await redis.del("simracing:coordinates");
    await redis.del("simracing:transactions_today");

    new SystemActivity({
      description: `Sim racing coordinates updated.`,
      activityType: "Update",
      systemModule: "SimRacing Coordinates",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    });
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
    let configuration;

    const cachedCoordinates = await redis.get("simracing:coordinates");

    if (cachedCoordinates) {
      configuration = JSON.parse(cachedCoordinates);
    } else {
      configuration = await Configuration.findOne().select(
        "simRacingCoordinates"
      );
      await redis.set(
        "simracing:coordinates",
        JSON.stringify(configuration),
        "EX",
        60 * 60 * 24
      );
    }

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

// =======================PARKING=======================

const getAllParkingVehicles = async (req, res) => {
  try {
    let parkingVehicles;

    const cachedVehicles = await redis.get("parking:vehicles");

    if (cachedVehicles) {
      parkingVehicles = JSON.parse(cachedVehicles);
    } else {
      parkingVehicles = await ParkingVehicleType.find({
        vehicleTypeOperational: true,
      });
      await redis.set(
        "parking:vehicles",
        JSON.stringify(parkingVehicles),
        "EX",
        60 * 60 * 24
      );
    }

    if (parkingVehicles.length === 0) {
      return errorResponse(res, 204, "No parking vehicles available");
    }

    return successResponse(
      res,
      200,
      "Parking vehicles fetched successfully",
      parkingVehicles
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const createParkingVehicleType = async (req, res) => {
  try {
    const {
      vehicleTypeName,
      rate,
      vehicleIcon,
      billAbbreviation,
      totalAccomodationCapacity,
    } = req.body;

    if (
      !vehicleTypeName ||
      !rate ||
      !billAbbreviation ||
      !totalAccomodationCapacity
    ) {
      return errorResponse(res, 400, "Please fill all required fields");
    }

    const newParkingVehicleType = new ParkingVehicleType({
      vehicleTypeName,
      rate,
      vehicleIcon,
      billAbbreviation,
      totalAccomodationCapacity,
      currentlyAccomodated: 0,
    });

    const savedParkingVehicleType = await newParkingVehicleType.save();

    await redis.del("parking:vehicles");
    await redis.del("parking:transactions_today");

    new SystemActivity({
      description: `${savedParkingVehicleType.vehicleTypeName} created.`,
      activityType: "Create",
      systemModule: "Parking Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(
      res,
      201,
      "Parking vehicle type created successfully!",
      savedParkingVehicleType
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const updateParkingVehicleType = async (req, res) => {
  const { vehicleTypeId, updates } = req.body;

  try {
    const updatedParkingVehicleType = await ParkingVehicleType.findOneAndUpdate(
      { _id: vehicleTypeId, vehicleTypeOperational: true },
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedParkingVehicleType) {
      return errorResponse(res, 404, "Parking vehicle type not found");
    }

    await redis.del("parking:vehicles");
    await redis.del("parking:transactions_today");

    new SystemActivity({
      description: `${updatedParkingVehicleType.vehicleTypeName} updated.`,
      activityType: "Update",
      systemModule: "Parking Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(
      res,
      200,
      "Parking vehicle type updated successfully",
      updatedParkingVehicleType
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, 500, "Server error", error.message);
  }
};

const deleteParkingVehicleType = async (req, res) => {
  const { vehicleTypeId } = req.body;

  try {
    const vehicleType = await ParkingVehicleType.findOneAndUpdate(
      { _id: vehicleTypeId, vehicleTypeOperational: true },
      { vehicleTypeOperational: false },
      { new: true, runValidators: true }
    );

    if (!vehicleType) {
      return errorResponse(res, 404, "Parking vehicle type not found");
    }

    await redis.del("parking:vehicles");
    await redis.del("parking:transactions_today");

    new SystemActivity({
      description: `${vehicleType.vehicleTypeName} deleted.`,
      activityType: "Delete",
      systemModule: "Parking Vehicle",
      activityBy: req.userId,
      activityIpAddress: req.headers["x-forwarded-for"] || req.ip,
      userAgent: req.headers["user-agent"],
    }).save();

    return successResponse(
      res,
      200,
      "Parking vehicle type deactivated successfully",
      vehicleType
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

    await redis.del("payment:all");
    await redis.del("carwash:transactions_today");
    await redis.del("simracing:transactions_today");
    await redis.del("parking:transactions_today");

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
    let activePaymentModes;

    const cachedPayment = await redis.get("payment:all");

    if (!cachedPayment) {
      activePaymentModes = await PaymentMode.find({
        paymentModeOperational: true,
      });
      if (activePaymentModes) {
        await redis.set(
          "payment:all",
          JSON.stringify(activePaymentModes),
          "EX",
          60 * 60 * 24
        );
      }
    } else {
      activePaymentModes = JSON.parse(cachedPayment);
    }

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

    await redis.del("payment:all");
    await redis.del("carwash:transactions_today");
    await redis.del("simracing:transactions_today");
    await redis.del("parking:transactions_today");

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

    await redis.del("payment:all");
    await redis.del("carwash:transactions_today");
    await redis.del("simracing:transactions_today");
    await redis.del("parking:transactions_today");

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
  // createPackageType,
  // getAllPackageType,
  // updatePackageType,
  // deletePackageType,
  createInspectionTemplate,
  getInspectionTemplate,
  // updateInspectionTemplate,
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
  getAllParkingVehicles,
  createParkingVehicleType,
  updateParkingVehicleType,
  deleteParkingVehicleType,
};
