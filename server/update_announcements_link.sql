-- Add link column to announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS link text;
