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

// Get all customers
router.get('/customers', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20, search } = req.query;
    let query = 'SELECT id, email, phone, name, account_status, created_at FROM users WHERE role = \'customer\'';
    const params = [];
    let paramIndex = 1;

    if (status !== 'all') {
      query += ` AND account_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      query += ` AND (email ILIKE $${paramIndex} OR phone ILIKE $${paramIndex} OR name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const customersResult = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = \'customer\'';

    res.json({
      status: 'success',
      data: customersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get customers error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch customers' });
  }
});

// Get all partners
router.get('/partners', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status = 'all', page = 1, limit = 20, search } = req.query;
    let query = `SELECT p.id, p.business_name, p.business_type, p.status, p.created_at, u.email, u.phone
                 FROM partners p JOIN users u ON p.user_id = u.id`;
    const params = [];
    let paramIndex = 1;

    if (status !== 'all') {
      query += ` WHERE p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      const connector = status === 'all' ? ' WHERE ' : ' AND ';
      query += `${connector}(p.business_name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const offset = (page - 1) * limit;
    query += ` ORDER BY p.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const partnersResult = await pool.query(query, params);
    const countResult = await pool.query('SELECT COUNT(*) FROM partners');

    res.json({
      status: 'success',
      data: partnersResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get partners error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch partners' });
  }
});

// Suspend customer
router.post('/suspend-customer/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, notes } = req.body;

    const result = await pool.query(
      `UPDATE users
       SET account_status = 'suspended', suspended_reason = $1, suspended_by = $2, suspended_at = NOW()
       WHERE id = $3 AND role = 'customer'
       RETURNING id, email`,
      [reason, req.user.userId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Customer not found' });
    }

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, target_name, reason, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [req.user.userId, 'suspend_customer', 'customer', userId, result.rows[0].email, reason, notes]
    );

    logger.info(`Customer suspended: ${result.rows[0].email}`);

    res.json({ status: 'success', message: 'Customer suspended successfully' });
  } catch (error) {
    logger.error('Suspend customer error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to suspend customer' });
  }
});

// Delete customer
router.post('/delete-customer/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason, notes } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const userResult = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
      if (userResult.rows.length === 0) throw new Error('Customer not found');

      const email = userResult.rows[0].email;

      await client.query(
        `UPDATE users SET account_status = 'deleted', email = $1, phone = NULL, name = 'Deleted User',
         deleted_at = NOW(), password_hash = NULL WHERE id = $2`,
        [`deleted_${userId}@bookmalawi.com`, userId]
      );

      await client.query('UPDATE bookings SET customer_id = NULL WHERE customer_id = $1', [userId]);

      await client.query(
        `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, target_name, reason, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [req.user.userId, 'delete_customer', 'customer', userId, email, reason, notes]
      );

      await client.query('COMMIT');

      logger.info(`Customer deleted: ${email}`);

      res.json({ status: 'success', message: 'Customer deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete customer error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete customer' });
  }
});

// Suspend partner
router.post('/suspend-partner/:partnerId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { reason, notes } = req.body;

    const partnerResult = await pool.query('SELECT business_name FROM partners WHERE id = $1', [partnerId]);
    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ status: 'error', message: 'Partner not found' });
    }

    await pool.query(
      `UPDATE partners SET status = 'suspended', suspended_reason = $1, suspended_by = $2, suspended_at = NOW()
       WHERE id = $3`,
      [reason, req.user.userId, partnerId]
    );

    await pool.query(
      `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, target_name, reason, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [req.user.userId, 'suspend_partner', 'partner', partnerId, partnerResult.rows[0].business_name, reason, notes]
    );

    logger.info(`Partner suspended: ${partnerResult.rows[0].business_name}`);

    res.json({ status: 'success', message: 'Partner suspended successfully' });
  } catch (error) {
    logger.error('Suspend partner error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to suspend partner' });
  }
});

// Delete partner
router.post('/delete-partner/:partnerId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { reason, notes } = req.body;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const partnerResult = await client.query('SELECT business_name, user_id FROM partners WHERE id = $1', [partnerId]);
      if (partnerResult.rows.length === 0) throw new Error('Partner not found');

      const { business_name, user_id } = partnerResult.rows[0];

      await client.query('UPDATE partners SET status = \'deleted\', deleted_at = NOW() WHERE id = $1', [partnerId]);
      await client.query('UPDATE users SET account_status = \'deleted\', deleted_at = NOW() WHERE id = $1', [user_id]);

      await client.query(
        `INSERT INTO admin_logs (admin_id, action_type, target_type, target_id, target_name, reason, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [req.user.userId, 'delete_partner', 'partner', partnerId, business_name, reason, notes]
      );

      await client.query('COMMIT');

      logger.info(`Partner deleted: ${business_name}`);

      res.json({ status: 'success', message: 'Partner deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Delete partner error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to delete partner' });
  }
});

// Get admin logs
router.get('/logs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT al.*, u.name as admin_name FROM admin_logs al
       JOIN users u ON al.admin_id = u.id
       ORDER BY al.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) FROM admin_logs');

    res.json({
      status: 'success',
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch logs' });
  }
});

module.exports = router;
