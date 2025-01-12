import winston from "winston";

const logger = winston.createLogger({
  level: "error",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log" }),
    new winston.transports.Console(),
  ],
});

export const successResponse = (res, code, message, data = null) => {
  return res.status(code).json({
    success: true,
    responseCode: code,
    message,
    data,
    error: false,
  });
};

export const errorResponse = (res, code, message, details = null) => {
  const logMessage = {
    timestamp: new Date().toISOString(),
    level: "error",
    responseCode: code,
    message,
    errorDetails: {
      message: details?.message || null,
      stack: details?.stack || null,
      ...details,
    },
    requestInfo: req
      ? {
          method: req.method,
          url: req.originalUrl,
          headers: req.headers,
          clientIp: req.ip,
          body: req.body,
          query: req.query,
          params: req.params,
        }
      : null,
  };

  logger.error(logMessage);

  return res.status(code).json({
    success: false,
    responseCode: code,
    message,
    error: {
      code,
      details,
    },
  });
};
