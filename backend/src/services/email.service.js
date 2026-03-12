import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const smtpPort = parseInt(process.env.SMTP_PORT || '465');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.hostinger.com',
  port: smtpPort,
  secure: smtpPort === 465, // true for 465 (SSL), false for 587 (STARTTLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendOTPEmail = async (email, otp, type = 'registration') => {
  let subject, title, message;
  
  if (type === 'registration') {
    subject = 'DeepDoc AI Account Verification OTP';
    title = 'Verify Your Account';
    message = 'Thank you for signing up for DeepDoc AI! Please use the OTP below to verify your account:';
  } else if (type === 'login') {
    subject = 'DeepDoc AI Login Verification OTP';
    title = 'Verify Your Login';
    message = 'Please use the OTP below to complete your login to DeepDoc AI:';
  } else {
    subject = 'DeepDoc AI Password Reset OTP';
    title = 'Reset Your Password';
    message = 'You requested to reset your password. Please use the OTP below to proceed:';
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">DeepDoc AI</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI Legal Assistant</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">${title}</h2>
        <p style="color: #666; font-size: 16px;">
          ${message}
        </p>
        <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
          <p style="font-size: 14px; color: #666; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your OTP Code</p>
          <p style="font-size: 36px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">${otp}</p>
        </div>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          This OTP will expire in <strong>5 minutes</strong>. If you didn't request this, please ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
          © ${new Date().getFullYear()} DeepDoc AI. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  // Validate email configuration
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('❌ Email configuration missing: SMTP_USER or SMTP_PASS not set');
    throw new Error('Email service not configured. Please set SMTP_USER and SMTP_PASS environment variables.');
  }

  try {
    console.log(`📧 Attempting to send ${type} OTP email to ${email}...`);
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"DeepDoc AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: html,
    });
    console.log(`✅ OTP email sent successfully (${type}):`, info.messageId);
    console.log(`   To: ${email}`);
    console.log(`   Subject: ${subject}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Error sending OTP email (${type}):`, error.message);
    console.error('   Full error:', error);
    
    // Provide more specific error messages
    if (error.code === 'EAUTH') {
      console.error('   Authentication failed. Check GMAIL_USER and GMAIL_APP_PASSWORD.');
    } else if (error.code === 'ECONNECTION') {
      console.error('   Connection failed. Check internet connection and Gmail SMTP settings.');
    }
    
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
};

export const sendPasswordResetConfirmation = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset Successful</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">DeepDoc AI</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">AI Legal Assistant</p>
      </div>
      <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e0e0e0; border-top: none;">
        <h2 style="color: #333; margin-top: 0;">Password Reset Successful</h2>
        <p style="color: #666; font-size: 16px;">
          Hello ${name},
        </p>
        <p style="color: #666; font-size: 16px;">
          Your password has been successfully reset. If you did not make this change, please contact our support team immediately.
        </p>
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #2e7d32; font-size: 14px;">
            <strong>Security Tip:</strong> Always use a strong, unique password for your account.
          </p>
        </div>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; margin: 0; text-align: center;">
          © ${new Date().getFullYear()} DeepDoc AI. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || `"DeepDoc AI" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'DeepDoc AI Password Reset Confirmation',
      html: html,
    });
    console.log('Password reset confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw new Error('Failed to send confirmation email');
  }
};

