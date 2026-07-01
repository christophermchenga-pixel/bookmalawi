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

// Create support ticket
router.post('/tickets', authMiddleware, async (req, res) => {
  try {
    const { subject, message, priority } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ status: 'error', message: 'Subject and message required' });
    }

    const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const result = await pool.query(
      `INSERT INTO support_tickets (ticket_number, user_id, subject, message, status, priority, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, ticket_number, status`,
      [ticketNumber, req.user.userId, subject, message, 'open', priority || 'medium']
    );

    logger.info(`Support ticket created: ${ticketNumber}`);

    res.status(201).json({
      status: 'success',
      message: 'Ticket created successfully',
      ticket: result.rows[0]
    });
  } catch (error) {
    logger.error('Create ticket error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create ticket' });
  }
});

// Get user tickets
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT * FROM support_tickets WHERE user_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM support_tickets WHERE user_id = $1',
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
    logger.error('Get tickets error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch tickets' });
  }
});

module.exports = router;
