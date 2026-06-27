const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// Register Customer
router.post('/register/customer', async (req, res) => {
  try {
    const { email, phone, name, password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ status: 'error', message: 'Email or phone required' });
    }
    if (!name || !password) {
      return res.status(400).json({ status: 'error', message: 'Name and password required' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (email, phone, name, password_hash, role, account_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, email, phone, name, role`,
      [email, phone, name, hashedPassword, 'customer', 'active']
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await pool.query(
      'INSERT INTO loyalty_points (user_id, points_balance, tier) VALUES ($1, 0, $2)',
      [user.id, 'bronze']
    );

    logger.info(`New customer registered: ${user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'Registration successful',
      user,
      token
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ status: 'error', message: 'Registration failed' });
  }
});

// Register Partner
router.post('/register/partner', async (req, res) => {
  try {
    const { businessName, businessType, email, phone, location, registrationNumber, bankAccount, password } = req.body;

    if (!businessName || !businessType || !email || !phone) {
      return res.status(400).json({ status: 'error', message: 'All fields required' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ status: 'error', message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const userResult = await client.query(
        `INSERT INTO users (email, phone, password_hash, role, account_status, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         RETURNING id`,
        [email, phone, hashedPassword, 'partner', 'active']
      );

      const userId = userResult.rows[0].id;

      await client.query(
        `INSERT INTO partners (user_id, business_name, business_type, location, registration_number, bank_account, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING id`,
        [userId, businessName, businessType, location, registrationNumber, bankAccount, 'pending']
      );

      await client.query('COMMIT');

      logger.info(`New partner registered: ${email}`);

      res.status(201).json({
        status: 'success',
        message: 'Partner registration successful. Awaiting admin approval.',
        userId
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Partner registration error:', error);
    res.status(500).json({ status: 'error', message: 'Partner registration failed' });
  }
});

// Login with Password
router.post('/login', async (req, res) => {
  try {
    const { emailOrPhone, password, userType } = req.body;

    if (!emailOrPhone || !password) {
      return res.status(400).json({ status: 'error', message: 'Email/Phone and password required' });
    }

    const result = await pool.query(
      `SELECT id, email, phone, password_hash, role, account_status
       FROM users
       WHERE (email = $1 OR phone = $1) AND role = $2`,
      [emailOrPhone, userType || 'customer']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.account_status === 'suspended') {
      return res.status(403).json({ status: 'error', message: 'Account is suspended' });
    }

    if (user.account_status === 'deleted') {
      return res.status(403).json({ status: 'error', message: 'Account does not exist' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    logger.info(`User logged in: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      userId: user.id,
      role: user.role
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ status: 'error', message: 'Login failed' });
  }
});

// Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    const { emailOrPhone } = req.body;

    if (!emailOrPhone) {
      return res.status(400).json({ status: 'error', message: 'Email or phone required' });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await pool.query(
      'UPDATE users SET otp_code = $1, otp_expires_at = $2 WHERE email = $3 OR phone = $3',
      [otp, otpExpiry, emailOrPhone]
    );

    logger.info(`OTP sent to: ${emailOrPhone}`);

    res.json({
      status: 'success',
      message: 'OTP sent successfully',
      otpSentTo: emailOrPhone,
      otp: process.env.NODE_ENV === 'development' ? otp : undefined // Show OTP in dev mode only
    });
  } catch (error) {
    logger.error('Send OTP error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to send OTP' });
  }
});

// Login with OTP
router.post('/login-otp', async (req, res) => {
  try {
    const { emailOrPhone, otp, userType } = req.body;

    if (!emailOrPhone || !otp) {
      return res.status(400).json({ status: 'error', message: 'Email/Phone and OTP required' });
    }

    const result = await pool.query(
      `SELECT id, email, phone, otp_code, otp_expires_at, role, account_status
       FROM users
       WHERE (email = $1 OR phone = $1) AND role = $2`,
      [emailOrPhone, userType || 'customer']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.otp_code !== otp || new Date() > user.otp_expires_at) {
      return res.status(401).json({ status: 'error', message: 'Invalid or expired OTP' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    await pool.query(
      'UPDATE users SET otp_code = NULL, otp_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    logger.info(`User logged in with OTP: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Login successful',
      token,
      userId: user.id,
      role: user.role
    });
  } catch (error) {
    logger.error('OTP login error:', error);
    res.status(500).json({ status: 'error', message: 'OTP login failed' });
  }
});

module.exports = router;
