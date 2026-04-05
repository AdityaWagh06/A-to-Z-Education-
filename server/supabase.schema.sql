-- Run this SQL in Supabase SQL Editor
create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  google_id text,
  role text not null default 'student' check (role in ('student','admin')),
  standard int,
  progress jsonb not null default '{"maths":{"lessonsCompleted":[],"testsTaken":[]},"english":{"lessonsCompleted":[],"testsTaken":[]},"marathi":{"lessonsCompleted":[],"testsTaken":[]},"intelligence":{"lessonsCompleted":[],"testsTaken":[]}}'::jsonb,
  purchased_tests jsonb not null default '[]'::jsonb,
  purchased_standard_boxes jsonb not null default '[]'::jsonb,
  mobile_no text,
  picture text,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists videos (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text not null,
  thumbnail text,
  subject text not null check (subject in ('maths','english','marathi','intelligence')),
  standard int not null check (standard in (2,3,4,5,6,7,8,9,10)),
  duration text,
  created_at timestamptz not null default now()
);

create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null check (subject in ('maths','english','marathi','intelligence')),
  standard int not null check (standard in (2,3,4,5,6,7,8,9,10)),
  price numeric not null default 0,
  questions jsonb not null default '[]'::jsonb,
  time_limit int not null default 15,
  is_locked boolean not null default false,
  pdf_path text,
  answer_sheet_path text,
  created_at timestamptz not null default now()
);

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  link text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists paid_standard_boxes (
  id uuid primary key default gen_random_uuid(),
  standard int not null unique check (standard in (2,3,4,5,6,7,8,9,10)),
  title text not null,
  description text,
  amount numeric not null check (amount > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists paid_standard_box_tests (
  box_id uuid not null references paid_standard_boxes(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (box_id, test_id)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  test_id uuid references tests(id) on delete cascade,
  box_id uuid references paid_standard_boxes(id) on delete set null,
  payment_type text not null default 'test' check (payment_type in ('test','standard_box')),
  standard_value int,
  razorpay_order_id text not null,
  razorpay_payment_id text,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending','completed','failed')),
  created_at timestamptz not null default now()
);
