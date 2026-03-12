-- Migration: Add 'login' type to OTP verifications table
-- This migration updates the CHECK constraint to include 'login' as a valid OTP type

-- Drop the existing constraint
ALTER TABLE otp_verifications DROP CONSTRAINT IF EXISTS otp_verifications_type_check;

-- Add the new constraint with 'login' type included
ALTER TABLE otp_verifications 
ADD CONSTRAINT otp_verifications_type_check 
CHECK (type IN ('registration', 'login', 'password_reset'));

