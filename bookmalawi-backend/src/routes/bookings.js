const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

// Create booking
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { accommodationId, checkInDate, checkOutDate, numGuests, roomType, specialRequests, emergencyContactName, emergencyContactPhone } = req.body;

    if (!accommodationId || !checkInDate || !checkOutDate) {
      return res.status(400).json({ status: 'error', message: 'Missing required fields' });
    }

    const bookingNumber = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const result = await pool.query(
      `INSERT INTO bookings (booking_number, customer_id, accommodation_id, check_in_date, check_out_date,
                            num_guests, room_type, special_requests, emergency_contact_name, emergency_contact_phone,
                            status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       RETURNING id, booking_number, status`,
      [bookingNumber, req.user.userId, accommodationId, checkInDate, checkOutDate, numGuests, roomType, specialRequests, emergencyContactName, emergencyContactPhone, 'pending']
    );

    const booking = result.rows[0];
    logger.info(`Booking created: ${booking.booking_number}`);

    res.status(201).json({
      status: 'success',
      message: 'Booking created successfully',
      booking
    });
  } catch (error) {
    logger.error('Create booking error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to create booking' });
  }
});

// Get user bookings
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    let query = 'SELECT * FROM bookings WHERE customer_id = $1';
    const params = [req.user.userId];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, (page - 1) * limit);

    const bookingsResult = await pool.query(query, params);
    const countQuery = 'SELECT COUNT(*) FROM bookings WHERE customer_id = $1';
    const countResult = await pool.query(countQuery, [req.user.userId]);

    res.json({
      status: 'success',
      data: bookingsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get bookings error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch bookings' });
  }
});

// Get booking details
router.get('/:bookingId', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;

    const result = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND customer_id = $2',
      [bookingId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    res.json({ status: 'success', data: result.rows[0] });
  } catch (error) {
    logger.error('Get booking error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch booking' });
  }
});

// Cancel booking
router.post('/:bookingId/cancel', authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;

    const result = await pool.query(
      `UPDATE bookings SET status = 'cancelled', cancellation_reason = $1, cancelled_at = NOW()
       WHERE id = $2 AND customer_id = $3
       RETURNING id, booking_number`,
      [reason, bookingId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Booking not found' });
    }

    logger.info(`Booking cancelled: ${result.rows[0].booking_number}`);

    res.json({ status: 'success', message: 'Booking cancelled successfully' });
  } catch (error) {
    logger.error('Cancel booking error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to cancel booking' });
  }
});

module.exports = router;
