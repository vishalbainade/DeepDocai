import { query } from '../db/index.js';
import { sendOTPEmail, sendPasswordResetConfirmation } from './email.service.js';

/**
 * Generate a 6-digit OTP
 */
export const generateOTP = () => {
  const startTime = performance.now();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const duration = (performance.now() - startTime).toFixed(2);
  
  console.log(`\n[OTP GENERATION]`);
  console.log(`OTP generated: ******`);
  console.log(`Time: ${duration}ms`);
  
  return otp;
};

/**
 * Store an OTP in the database
 * 
 * @param {string} email 
 * @param {string} otp 
 * @param {string} type 'registration', 'login', or 'password_reset'
 * @returns {Promise<void>}
 */
export const storeOTP = async (email, otp, type) => {
  const startTime = performance.now();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    // Delete any existing OTP for this email and type
    await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, type]);

    // Store new OTP
    await query(
      'INSERT INTO otp_verifications (email, otp, type, expires_at) VALUES ($1, $2, $3, $4)',
      [email, otp, type, expiresAt]
    );
    
    const duration = (performance.now() - startTime).toFixed(2);
    console.log(`\n[DATABASE]`);
    console.log(`OTP stored successfully for ${email}`);
    console.log(`Time: ${duration}ms`);
  } catch (error) {
    console.error(`\n[ERROR][DATABASE]`);
    console.error(`Failed to store OTP`);
    console.error(`User: ${email}`);
    console.error(`Error: ${error.message}`);
    throw error;
  }
};

/**
 * Verify an OTP
 * 
 * @param {string} email 
 * @param {string} otp 
 * @param {string} type 
 * @returns {Promise<boolean>}
 * @throws Error if OTP is invalid, missing, or expired
 */
export const verifyOTP = async (email, otp, type) => {
  const validTypes = ['registration', 'login', 'password_reset'];
  if (!validTypes.includes(type)) {
    throw new Error('Invalid OTP type');
  }

  const otpResult = await query(
    'SELECT * FROM otp_verifications WHERE email = $1 AND type = $2 ORDER BY created_at DESC LIMIT 1',
    [email, type]
  );

  if (otpResult.rows.length === 0) {
    throw new Error('OTP not found. Please request a new one.');
  }

  const otpRecord = otpResult.rows[0];

  if (new Date() > new Date(otpRecord.expires_at)) {
    throw new Error('OTP has expired. Please request a new one.');
  }

  if (otpRecord.otp !== otp) {
    throw new Error('Invalid OTP');
  }

  // Delete used OTP to prevent reuse
  await query('DELETE FROM otp_verifications WHERE email = $1 AND type = $2', [email, type]);

  return true;
};
