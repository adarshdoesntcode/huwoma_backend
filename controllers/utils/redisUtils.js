const redis = require("../../config/redisConn");

/**
 * Increment visitor count for a specific service and date.
 * @param {string} service - The service name (e.g., "carwash", "simracing", "parking").
 * @param {string} date - The date string in `YYYY-MM-DD` format.
 * @param {number} incrementBy - The number to increment by (default: 1).
 */
async function incrementVisitorCount(service, date, incrementBy = 1) {
  const key = `visitor_count:${service}`; // Generate the Redis hash key
  await redis.hincrby(key, date, incrementBy); // Increment the count for the given date
}

/**
 * Get visitor counts for a specific service.
 * @param {string} service - The service name (e.g., "carwash", "simracing", "parking").
 * @returns {Promise<Object>} - A key-value object where keys are dates and values are counts.
 */
async function getVisitorCounts(service) {
  const key = `visitor_count:${service}`;
  const data = await redis.hgetall(key); // Retrieve all date-count pairs for the service
  // Convert count strings to numbers
  Object.keys(data).forEach((date) => {
    data[date] = parseInt(data[date], 10);
  });
  return data;
}

module.exports = {
  incrementVisitorCount,
  getVisitorCounts,
};
