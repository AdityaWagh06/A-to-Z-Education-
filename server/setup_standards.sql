-- Run this in your Supabase SQL Editor to create the standards table

create table if not exists standards (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value int not null unique,
  created_at timestamptz not null default now()
);

-- Remove the hardcoded CHECK constraints on videos and tests so you can add any class
-- (If these constraints don't exist, this might fail, so wrap in a transaction or just run)
ALTER TABLE videos DROP CONSTRAINT IF EXISTS videos_standard_check;
ALTER TABLE tests DROP CONSTRAINT IF EXISTS tests_standard_check;

-- Optional: Insert initial data 
-- insert into standards (label, value) values 
-- ('Class 1', 1),
-- ('Class 2', 2),
-- ('Class 3', 3),
-- ('Class 4', 4),
-- ('Class 5', 5),
-- ('Class 6', 6),
-- ('Class 7', 7)
-- on conflict (value) do nothing;
