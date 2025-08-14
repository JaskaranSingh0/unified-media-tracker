// Custom error class for API errors
class APIError extends Error {
  constructor(message, status = 500, code = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Handle mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      error: 'Duplicate Error',
      message: 'This value already exists',
      field: Object.keys(err.keyPattern)[0]
    });
  }

  // Handle jwt errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid Token',
      message: 'Your session has expired. Please log in again.'
    });
  }

  // Handle API errors
  if (err instanceof APIError) {
    return res.status(err.status).json({
      error: err.name,
      message: err.message,
      code: err.code
    });
  }

  // Handle rate limit errors from external APIs
  if (err.response && err.response.status === 429) {
    return res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: 'Too many requests. Please try again later.'
    });
  }

  // Default error
  res.status(500).json({
    error: 'Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred'
      : err.message
  });
};

module.exports = {
  APIError,
  errorHandler
};
