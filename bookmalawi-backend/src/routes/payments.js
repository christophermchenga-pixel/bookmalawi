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

// Process payment
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const { bookingId, paymentType, amount, paymentMethod } = req.body;

    if (!bookingId || !paymentType || !amount || !paymentMethod) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const bookingResult = await pool.query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const platformCommission = (amount * (parseFloat(process.env.PLATFORM_COMMISSION_PERCENTAGE) || 2.5)) / 100;
    const partnerReceives = amount - platformCommission;

    const result = await pool.query(
      `INSERT INTO payments (booking_id, customer_id, partner_id, total_amount, deposit_amount, remaining_balance,
                            payment_type, amount_paid, payment_method, payment_status, transaction_id, paid_at,
                            platform_commission, partner_receives, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), $12, $13, NOW(), NOW() + INTERVAL '3 months')
       RETURNING id, transaction_id, payment_status`,
      [bookingId, req.user.userId, 1, amount, paymentType === 'deposit' ? amount : 0, paymentType === 'balance' ? 0 : amount,
       paymentType, amount, paymentMethod, 'completed', transactionId, platformCommission, partnerReceives]
    );

    await pool.query(
      'UPDATE bookings SET status = $1 WHERE id = $2',
      [paymentType === 'full_payment' ? 'confirmed' : 'pending', bookingId]
    );

    logger.info(`Payment processed: ${transactionId}`);

    res.json({
      status: 'success',
      message: 'Payment processed successfully',
      payment: result.rows[0]
    });
  } catch (error) {
    logger.error('Process payment error:', error);
    res.status(500).json({ status: 'error', message: 'Payment processing failed' });
  }
});

// Get payment history
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      'SELECT * FROM payments WHERE customer_id = $1 ORDER BY paid_at DESC LIMIT $2 OFFSET $3',
      [req.user.userId, limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM payments WHERE customer_id = $1', [req.user.userId]);

    res.json({
      status: 'success',
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get payment history error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch payment history' });
  }
});

module.module = router;
