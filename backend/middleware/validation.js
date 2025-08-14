const { validationResult, checkSchema } = require('express-validator');

// Middleware to check validation results
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Auth validation schemas
exports.registerSchema = {
  email: {
    isEmail: true,
    trim: true,
    normalizeEmail: true,
    errorMessage: 'Invalid email address'
  },
  username: {
    trim: true,
    isLength: {
      options: { min: 3, max: 30 },
      errorMessage: 'Username must be between 3 and 30 characters'
    },
    matches: {
      options: /^[a-zA-Z0-9_]+$/,
      errorMessage: 'Username can only contain letters, numbers and underscores'
    }
  },
  password: {
    isLength: {
      options: { min: 6 },
      errorMessage: 'Password must be at least 6 characters long'
    }
  }
};

exports.loginSchema = {
  email: {
    isEmail: true,
    trim: true,
    normalizeEmail: true,
    errorMessage: 'Invalid email address'
  },
  password: {
    notEmpty: true,
    errorMessage: 'Password is required'
  }
};

// Media item validation schemas
exports.addItemSchema = {
  apiId: {
    isInt: true,
    errorMessage: 'API ID must be an integer'
  },
  mediaType: {
    isIn: {
      options: [['movie', 'tv', 'anime']],
      errorMessage: 'Invalid media type'
    }
  },
  status: {
    optional: true,
    isIn: {
      options: [['planToWatch', 'watching', 'completed']],
      errorMessage: 'Invalid status'
    }
  }
};

exports.updateItemSchema = {
  status: {
    optional: true,
    isIn: {
      options: [['planToWatch', 'watching', 'completed']],
      errorMessage: 'Invalid status'
    }
  },
  rating: {
    optional: true,
    isInt: {
      options: { min: 1, max: 10 },
      errorMessage: 'Rating must be between 1 and 10'
    }
  },
  selfNote: {
    optional: true,
    isString: true,
    trim: true,
    isLength: {
      options: { max: 1000 },
      errorMessage: 'Note must not exceed 1000 characters'
    }
  },
  watchedSeasons: {
    optional: true,
    isArray: true,
    errorMessage: 'Watched seasons must be an array'
  },
  'watchedSeasons.*': {
    optional: true,
    isInt: {
      options: { min: 1 },
      errorMessage: 'Season numbers must be positive integers'
    }
  }
};
