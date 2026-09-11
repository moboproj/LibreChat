function sendError(res, status, message, extra = {}) {
  const payload = {
    error: message,
    message,
    ...extra,
  };
  if (extra.valid === undefined && status >= 400) {
    // keep auth clients happy when they look for `valid`
  }
  return res.status(status).json(payload);
}

function fromException(res, error, fallbackStatus = 500) {
  const status = error.status || error.statusCode || fallbackStatus;
  const message = error.message || 'Internal Server Error';
  if (status >= 500) {
    console.error(message, error);
  }
  return sendError(res, status, message);
}

module.exports = {
  sendError,
  fromException,
};
