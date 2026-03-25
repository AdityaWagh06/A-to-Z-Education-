-- Run this in your Supabase SQL Editor to add support for file paths in tests

ALTER TABLE tests 
ADD COLUMN IF NOT EXISTS pdf_path text,
ADD COLUMN IF NOT EXISTS answer_sheet_path text;

-- Ensure users have purchased_tests column
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS purchased_tests jsonb default '[]'::jsonb;
