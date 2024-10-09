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
