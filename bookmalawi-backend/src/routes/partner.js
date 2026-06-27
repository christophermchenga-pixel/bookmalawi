const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, partnerMiddleware } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Get partner bookings
router.get('/bookings', authMiddleware, partnerMiddleware, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const partnerResult = await pool.query(
      'SELECT id FROM partners WHERE user_id = $1',
      [req.user.userId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Partner not found' });
    }

    const partnerId = partnerResult.rows[0].id;
    let query = 'SELECT * FROM bookings WHERE partner_id = $1';
    const params = [partnerId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, (page - 1) * limit);

    const bookingsResult = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM bookings WHERE partner_id = $1', [partnerId]);

    res.json({
      status: 'success',
      data: bookingsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get partner bookings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch bookings' });
  }
});

// Get partner revenue
router.get('/revenue', authMiddleware, partnerMiddleware, async (req, res) => {
  try {
    const partnerResult = await pool.query(
      'SELECT id FROM partners WHERE user_id = $1',
      [req.user.userId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Partner not found' });
    }

    const partnerId = partnerResult.rows[0].id;

    const result = await pool.query(
      `SELECT 
        SUM(partner_receives) as total_revenue,
        COUNT(*) as total_transactions,
        AVG(partner_receives) as avg_transaction
       FROM transactions WHERE partner_id = $1 AND status = 'completed'`,
      [partnerId]
    );

    res.json({
      status: 'success',
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Get partner revenue error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch revenue' });
  }
});

module.exports = router;
