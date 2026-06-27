const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Validate coupon
router.post('/validate', async (req, res) => {
  try {
    const { code, bookingAmount } = req.body;

    if (!code) {
      return res.status(400).json({ status: 'error', message: 'Coupon code required' });
    }

    const result = await pool.query(
      `SELECT * FROM coupons WHERE code = $1 AND is_active = true AND expiry_date > NOW()
       AND (usage_count < max_usage OR max_usage IS NULL)`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Invalid or expired coupon' });
    }

    const coupon = result.rows[0];
    let discount = 0;

    if (coupon.discount_percentage) {
      discount = (bookingAmount * coupon.discount_percentage) / 100;
    } else if (coupon.discount_amount) {
      discount = coupon.discount_amount;
    }

    res.json({
      status: 'success',
      message: 'Coupon is valid',
      coupon: {
        code: coupon.code,
        discount,
        discountType: coupon.discount_percentage ? 'percentage' : 'fixed'
      }
    });
  } catch (error) {
    logger.error('Validate coupon error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to validate coupon' });
  }
});

// Create coupon (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { code, discountPercentage, discountAmount, maxUsage, expiryDate } = req.body;

    if (!code || !expiryDate) {
      return res.status(400).json({ status: 'error', message: 'Code and expiry date required' });
    }

    const result = await pool.query(
      `INSERT INTO coupons (admin_id, code, discount_percentage, discount_amount, max_usage, expiry_date, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, code`,
      [req.user.userId, code, discountPercentage || null, discountAmount || null, maxUsage || null, expiryDate, true]
    );

    logger.info(`Coupon created: ${code}`);

    res.status(201).json({
      status: 'success',
      message: 'Coupon created successfully',
      coupon: result.rows[0]
    });
  } catch (error) {
    logger.error('Create coupon error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create coupon' });
  }
});

module.exports = router;
