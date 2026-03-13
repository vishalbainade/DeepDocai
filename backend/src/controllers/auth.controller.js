import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/index.js';
import { generateOTP, storeOTP, verifyOTP } from '../services/otp.service.js';
import { sendOTPEmail, sendPasswordResetConfirmation } from '../services/email.service.js';

export const register = async (req, res) => {
  const requestStartTime = performance.now();
  console.log('\n[AUTH REQUEST]');
  console.log(`Login attempt received`);
  console.log(`User: ${req.body.email || 'unknown'}`);
  
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

    // Generate & Store OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'registration');

    // Create user with is_verified=false
    const userResult = await query(
      `INSERT INTO users (name, surname, email, password_hash, profession, country, state, city, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, surname, email`,
      [name, surname, email, passwordHash, profession || null, country || null, state || null, city || null, false]
    );

    // Dispatch email asynchronously (DO NOT AWAIT)
    sendOTPEmail(email, otp, 'registration')
      .catch(err => console.error('\n[ERROR][EMAIL WORKER]', err.message));

    const totalDuration = (performance.now() - requestStartTime).toFixed(2);
    console.log(`\n[API RESPONSE]`);
    console.log(`Response returned to client`);
    console.log(`Time: ${totalDuration}ms\n`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email',
      userId: userResult.rows[0].id,
    });
  } catch (error) {
    console.error('\n[ERROR][AUTH CONTROLLER]');
    console.error('Registration failed:', error.message);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
};

export const login = async (req, res) => {
  const requestStartTime = performance.now();
  console.log('\n[AUTH REQUEST]');
  console.log(`Login attempt received`);
  console.log(`User: ${req.body.email || 'unknown'}`);

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

    // Generate & Store OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'login');

    // Dispatch email asynchronously (DO NOT AWAIT)
    sendOTPEmail(email, otp, 'login')
      .catch(err => console.error('\n[ERROR][EMAIL WORKER]', err.message));

    const totalDuration = (performance.now() - requestStartTime).toFixed(2);
    console.log(`\n[API RESPONSE]`);
    console.log(`Response returned to client`);
    console.log(`Time: ${totalDuration}ms\n`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email. Please verify to complete login.',
      email: email,
    });
  } catch (error) {
    console.error('\n[ERROR][AUTH CONTROLLER]');
    console.error('Login error:', error.message);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
};

export const verifyOtpRequest = async (req, res) => {
  try {
    const { email, otp, type = 'registration' } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Use OTP service to verify and purge
    try {
      await verifyOTP(email, otp, type);
    } catch (otpError) {
      return res.status(400).json({ error: otpError.message });
    }

    if (type === 'registration') {
      // Update user to verified
      await query('UPDATE users SET is_verified = TRUE WHERE email = $1', [email]);
    }

    // Get user
    const userResult = await query(
      'SELECT id, name, surname, email, profession, country, state, city, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userResult.rows[0];

    // For login and registration, generate JWT token
    if (type === 'login' || type === 'registration') {
      const chatCountResult = await query(
        'SELECT COUNT(*) as count FROM chats WHERE user_id = $1',
        [user.id]
      );
      const hasExistingChats = parseInt(chatCountResult.rows[0].count) > 0;

      const token = jwt.sign(
        { userId: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(200).json({
        success: true,
        message: type === 'login' ? 'Login successful' : 'Account verified successfully',
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
    } else {
      // For password reset, just confirm success
      return res.status(200).json({
        success: true,
        message: 'OTP verified successfully',
      });
    }
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'OTP verification failed', message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  const requestStartTime = performance.now();
  console.log('\n[AUTH REQUEST]');
  console.log(`Forgot Password attempt received`);
  console.log(`User: ${req.body.email || 'unknown'}`);
  
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

    // Generate & Store OTP
    const otp = generateOTP();
    await storeOTP(email, otp, 'password_reset');

    // Dispatch email asynchronously
    sendOTPEmail(email, otp, 'password_reset')
      .catch(err => console.error('\n[ERROR][EMAIL WORKER]', err.message));

    const totalDuration = (performance.now() - requestStartTime).toFixed(2);
    console.log(`\n[API RESPONSE]`);
    console.log(`Response returned to client`);
    console.log(`Time: ${totalDuration}ms\n`);

    res.status(200).json({
      success: true,
      message: 'If the email exists, an OTP has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process request', message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    try {
      await verifyOTP(email, otp, 'password_reset');
    } catch (otpError) {
      return res.status(400).json({ error: otpError.message });
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

    // Send confirmation email asynchronously
    sendPasswordResetConfirmation(email, user.name)
      .catch(err => console.error('\n[ERROR][EMAIL WORKER]', err.message));

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Password reset failed', message: error.message });
  }
};
