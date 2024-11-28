const SystemActivity = require("../models/SystemActivity");
const { successResponse, errorResponse } = require("./utils/reponse");

const getSystemActivity = async (req, res) => {
  try {
    const params = req.params;
    const filter = JSON.parse(params.param);

    const query = {};

    if (filter?.from) {
      query.activityDate = {
        $gte: new Date(filter.from),
        ...(filter.to && { $lte: new Date(filter.to) }),
      };
    }

    let transactionsQuery = SystemActivity.find(query)
      .populate("activityBy")
      .sort({ activityDate: -1 });

    const transactions = await transactionsQuery.exec();

    return successResponse(res, 200, "Transactions retrieved", transactions);
  } catch (err) {
    return errorResponse(res, 500, "Server error. Failed to retrieve");
  }
};

module.exports = {
  getSystemActivity,
};
