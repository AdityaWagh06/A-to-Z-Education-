-- Add mobile_no and picture columns to users table

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mobile_no text,
ADD COLUMN IF NOT EXISTS picture text,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
