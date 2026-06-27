const jwt = require('jsonwebtoken');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
};

const adminMiddleware = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Admin access required'
    });
  }
  next();
};

const partnerMiddleware = (req, res, next) => {
  if (req.user?.role !== 'partner') {
    return res.status(403).json({
      status: 'error',
      message: 'Partner access required'
    });
  }
  next();
};

const customerMiddleware = (req, res, next) => {
  if (req.user?.role !== 'customer') {
    return res.status(403).json({
      status: 'error',
      message: 'Customer access required'
    });
  }
  next();
};

module.exports = { authMiddleware, adminMiddleware, partnerMiddleware, customerMiddleware };
