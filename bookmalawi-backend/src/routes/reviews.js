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

// Submit review
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { bookingId, partnerId, rating, title, comment } = req.body;

    if (!bookingId || !partnerId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ status: 'error', message: 'Invalid review data' });
    }

    const result = await pool.query(
      `INSERT INTO reviews (booking_id, customer_id, partner_id, rating, title, comment, verified_purchase, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id, rating, title`,
      [bookingId, req.user.userId, partnerId, rating, title, comment, true]
    );

    logger.info(`Review submitted for partner ${partnerId}`);

    res.status(201).json({
      status: 'success',
      message: 'Review submitted successfully',
      review: result.rows[0]
    });
  } catch (error) {
    logger.error('Submit review error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit review' });
  }
});

// Get partner reviews
router.get('/partner/:partnerId', async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT r.*, u.name as customer_name FROM reviews r
       JOIN users u ON r.customer_id = u.id
       WHERE r.partner_id = $1 AND r.is_visible = true
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [partnerId, limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM reviews WHERE partner_id = $1', [partnerId]);

    res.json({
      status: 'success',
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get reviews error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch reviews' });
  }
});

module.exports = router;
