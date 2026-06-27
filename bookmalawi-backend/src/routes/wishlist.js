const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware, customerMiddleware } = require('../middleware/auth');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Add to wishlist
router.post('/', authMiddleware, customerMiddleware, async (req, res) => {
  try {
    const { accommodationId } = req.body;

    if (!accommodationId) {
      return res.status(400).json({ status: 'error', message: 'Accommodation ID required' });
    }

    const result = await pool.query(
      `INSERT INTO wishlists (user_id, accommodation_id, created_at)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [req.user.userId, accommodationId]
    );

    logger.info(`Item added to wishlist: accommodation ${accommodationId}`);

    res.status(201).json({
      status: 'success',
      message: 'Added to wishlist'
    });
  } catch (error) {
    logger.error('Add to wishlist error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add to wishlist' });
  }
});

// Get wishlist
router.get('/', authMiddleware, customerMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM wishlists WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM wishlists WHERE user_id = $1',
      [req.user.userId]
    );

    res.json({
      status: 'success',
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get wishlist error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch wishlist' });
  }
});

// Remove from wishlist
router.delete('/:wishlistId', authMiddleware, customerMiddleware, async (req, res) => {
  try {
    const { wishlistId } = req.params;

    await pool.query(
      'DELETE FROM wishlists WHERE id = $1 AND user_id = $2',
      [wishlistId, req.user.userId]
    );

    logger.info(`Item removed from wishlist: ${wishlistId}`);

    res.json({
      status: 'success',
      message: 'Removed from wishlist'
    });
  } catch (error) {
    logger.error('Remove from wishlist error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove from wishlist' });
  }
});

module.exports = router;
