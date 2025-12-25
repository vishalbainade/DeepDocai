import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { sendOTPEmail, sendPasswordResetConfirmation } from '../services/email.service.js';

const router = express.Router();

// Generate 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, surname, email, password, profession, country, state, city } = req.body;

    // Validation
    if (!name || !surname || !email || !password) {
      return res.status(400).json({ error: 'Name, surname, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing OTP for this email
    await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, 'registration']);

    // Store OTP
    await query(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'registration', expiresAt]
    );

    // Store user data temporarily (we'll create account after OTP verification)
    // For now, we'll just send OTP. User creation happens in verify-otp
    // Store hashed password in a temporary way - we'll use it in verify-otp
    // Actually, let's store user with is_verified=false, then update after OTP verification
    const userResult = await query(
      `INSERT INTO users (name, surname, email, password_hash, profession, country, state, city, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, surname, email`,
      [name, surname, email, passwordHash, profession || null, country || null, state || null, city || null, false]
    );

    // Send OTP email
    await sendOTPEmail(email, otp, 'registration');

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      userId: userResult.rows[0].id,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find OTP
    const otpResult = await query(
      'SELECT * FROM otp_verifications WHERE email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [email, 'registration']
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Update user to verified
    await query('UPDATE users SET is_verified = TRUE WHERE email = $1', [email]);

    // Delete used OTP
    await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, 'registration']);

    // Get user
    const userResult = await query(
      'SELECT id, name, surname, email, profession, country, state, city FROM users WHERE email = $1',
      [email]
    );

    const user = userResult.rows[0];

    // Check if user has existing chats (to determine if it's a new or returning user)
    // For new registrations, they won't have chats yet, so isNewUser will be true
    const chatCountResult = await query(
      'SELECT COUNT(*) as count FROM chats WHERE user_id = $1',
      [user.id]
    );
    const hasExistingChats = parseInt(chatCountResult.rows[0].count) > 0;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Account verified successfully',
      token,
      isNewUser: !hasExistingChats,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        profession: user.profession,
        country: user.country,
        state: user.state,
        city: user.city,
      },
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed', message: error.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const userResult = await query(
      'SELECT id, email, password_hash, name, surname, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];

    if (!user.is_verified) {
      return res.status(403).json({ error: 'Account not verified. Please verify your email first.' });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has existing chats (to determine if it's a new or returning user)
    const chatCountResult = await query(
      'SELECT COUNT(*) as count FROM chats WHERE user_id = $1',
      [user.id]
    );
    const hasExistingChats = parseInt(chatCountResult.rows[0].count) > 0;

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      isNewUser: !hasExistingChats,
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, name, city, profession } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const userResult = await query(
      'SELECT id, name, surname, email, profession, city FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists for security
      return res.status(200).json({
        success: true,
        message: 'If the email exists, an OTP has been sent.',
      });
    }

    const user = userResult.rows[0];

    // If personal details provided, verify them
    if (name && city && profession) {
      const nameMatch = user.name.toLowerCase() === name.toLowerCase();
      const cityMatch = user.city && user.city.toLowerCase() === city.toLowerCase();
      const professionMatch = user.profession && user.profession.toLowerCase() === profession.toLowerCase();

      if (!nameMatch || !cityMatch || !professionMatch) {
        return res.status(400).json({ error: 'Personal details do not match our records' });
      }
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Delete any existing OTP for this email
    await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, 'password_reset']);

    // Store OTP
    await query(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, 'password_reset', expiresAt]
    );

    // Send OTP email
    await sendOTPEmail(email, otp, 'password_reset');

    res.status(200).json({
      success: true,
      message: 'If the email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request', message: error.message });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Find OTP
    const otpResult = await query(
      'SELECT * FROM otp_verifications WHERE email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
      [email, 'password_reset']
    );

    if (otpResult.rows.length === 0) {
      return res.status(400).json({ error: 'OTP not found. Please request a new one.' });
    }

    const otpRecord = otpResult.rows[0];

    // Check if OTP expired
    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // Find user
    const userResult = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // Hash new password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await query('UPDATE users SET password_hash = $1 WHERE email = $2', [passwordHash, email]);

    // Delete used OTP
    await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, 'password_reset']);

    // Send confirmation email
    await sendPasswordResetConfirmation(email, user.name);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed', message: error.message });
  }
});

export default router;

