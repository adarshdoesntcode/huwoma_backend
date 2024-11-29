const redis = require("../config/redisConn");
const CarWashTransaction = require("../models/CarWashTransaction");
const ParkingTransaction = require("../models/ParkingTransaction");
const PaymentMode = require("../models/PaymentMode");
const SimRacingTransaction = require("../models/SimRacingTransaction");
const { getVisitorCounts } = require("./utils/redisUtils");
const { successResponse, errorResponse } = require("./utils/reponse");

const getDashboardData = async (req, res) => {
  try {
    const now = new Date();
    const nowDateObj = new Date(now);

    const startOfDay = new Date(nowDateObj);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(nowDateObj);
    endOfDay.setUTCHours(23, 59, 59, 999);

    let carwashTransactions;
    let simracingTransactions;
    let parkingTransactions;

    const cachedCarwashTransactions = await redis.get(
      "carwash:transactions_today"
    );
    if (cachedCarwashTransactions) {
      carwashTransactions = JSON.parse(cachedCarwashTransactions);
    } else {
      carwashTransactions = await CarWashTransaction.find({
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
        JSON.stringify(carwashTransactions),
        "EX",
        3600
      );
    }

    const cachedSimracingTransactions = await redis.get(
      "simracing:transactions_today"
    );

    if (cachedSimracingTransactions) {
      simracingTransactions = JSON.parse(cachedSimracingTransactions);
    } else {
      simracingTransactions = await SimRacingTransaction.find({
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

      await redis.set(
        "simracing:transactions_today",
        JSON.stringify(simracingTransactions),
        "EX",
        3600
      );
    }

    const cachedParkingTransactions = await redis.get(
      "parking:transactions_today"
    );

    if (cachedParkingTransactions) {
      parkingTransactions = JSON.parse(cachedParkingTransactions);
    } else {
      parkingTransactions = await ParkingTransaction.find({
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
        .populate("vehicle")
        .populate("paymentMode");

      await redis.set(
        "parking:transactions_today",
        JSON.stringify(parkingTransactions),
        "EX",
        3600
      );
    }

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

    const yesterday = new Date(Date.now() - 1000 * 60 * 60 * 24);
    const startOfYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate()
    );
    const endOfYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getDate() + 1
    );

    const carwashYesterday = await CarWashTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYesterday,
            $lt: endOfYesterday,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$netAmount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const simracingYesterday = await SimRacingTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYesterday,
            $lt: endOfYesterday,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$netAmount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const parkingYesterday = await ParkingTransaction.aggregate([
      {
        $match: {
          createdAt: {
            $gte: startOfYesterday,
            $lt: endOfYesterday,
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$netAmount",
          },
          count: {
            $sum: 1,
          },
        },
      },
    ]);

    const carwashYesterdayTotal =
      carwashYesterday.length > 0 ? carwashYesterday[0].total : 0;

    const simracingYesterdayTotal =
      simracingYesterday.length > 0 ? simracingYesterday[0].total : 0;
    const parkingYesterdayTotal =
      parkingYesterday.length > 0 ? parkingYesterday[0].total : 0;

    const carwashCounts = await getVisitorCounts("carwash");
    const simracingCounts = await getVisitorCounts("simracing");
    const parkingCounts = await getVisitorCounts("parking");

    const response = {
      carwashTransactions,
      simracingTransactions,
      parkingTransactions,
      activePaymentModes,
      yesterday: {
        carwash: {
          total: carwashYesterdayTotal,
          count: carwashYesterday[0]?.count || 0,
        },
        simracing: {
          total: simracingYesterdayTotal,
          count: simracingYesterday[0]?.count || 0,
        },
        parking: {
          total: parkingYesterdayTotal,
          count: parkingYesterday[0]?.count || 0,
        },
      },
      counts: {
        carwash: carwashCounts,
        simracing: simracingCounts,
        parking: parkingCounts,
      },
    };

    return successResponse(res, 200, "Dashboard data retrieved", response);
  } catch (err) {
    console.log(err);
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

module.exports = {
  getDashboardData,
};
