const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Get loyalty points
router.get('/points', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM loyalty_points WHERE user_id = $1',
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Loyalty account not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    logger.error('Get loyalty points error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch loyalty points' });
  }
});

// Redeem points
router.post('/redeem', authMiddleware, async (req, res) => {
  try {
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ status: 'error', message: 'Invalid points amount' });
    }

    const loyaltyResult = await pool.query(
      'SELECT * FROM loyalty_points WHERE user_id = $1',
      [req.user.userId]
    );

    if (loyaltyResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Loyalty account not found' });
    }

    const loyalty = loyaltyResult.rows[0];

    if (loyalty.points_balance < points) {
      return res.status(400).json({ status: 'error', message: 'Insufficient points' });
    }

    const newBalance = loyalty.points_balance - points;
    const discountAmount = (points * 100) / 1000;

    await pool.query(
      'UPDATE loyalty_points SET points_balance = $1 WHERE user_id = $2',
      [newBalance, req.user.userId]
    );

    logger.info(`Points redeemed: ${points}`);

    res.json({
      status: 'success',
      message: 'Points redeemed successfully',
      discountAmount,
      newBalance
    });
  } catch (error) {
    logger.error('Redeem points error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to redeem points' });
  }
});

module.exports = router;
