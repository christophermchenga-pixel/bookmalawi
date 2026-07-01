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

// Create ad (admin only)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { title, description, imageUrl, redirectLink, startDate, endDate, displayPosition } = req.body;

    if (!title || !imageUrl) {
      return res.status(400).json({ status: 'error', message: 'Title and image URL required' });
    }

    const result = await pool.query(
      `INSERT INTO ads (admin_id, title, description, image_url, redirect_link, start_date, end_date, status, display_position, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       RETURNING id, title, status`,
      [req.user.userId, title, description, imageUrl, redirectLink, startDate, endDate, 'active', displayPosition || 'carousel_top']
    );

    logger.info(`Ad created: ${title}`);

    res.status(201).json({
      status: 'success',
      message: 'Ad created successfully',
      ad: result.rows[0]
    });
  } catch (error) {
    logger.error('Create ad error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create ad' });
  }
});

// Get active ads
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, image_url, redirect_link, display_position
       FROM ads WHERE status = 'active' AND start_date <= NOW() AND end_date >= NOW()
       ORDER BY display_position DESC`
    );

    res.json({
      status: 'success',
      data: result.rows
    });
  } catch (error) {
    logger.error('Get active ads error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch ads' });
  }
});

module.exports = router;
