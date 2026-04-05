-- Add paid standard boxes and standard-box purchase support
-- Run this in Supabase SQL Editor

alter table users
add column if not exists purchased_standard_boxes jsonb not null default '[]'::jsonb;

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

alter table payments
alter column test_id drop not null;

alter table payments
add column if not exists box_id uuid references paid_standard_boxes(id) on delete set null;

alter table payments
add column if not exists payment_type text not null default 'test' check (payment_type in ('test','standard_box'));

alter table payments
add column if not exists standard_value int;

create index if not exists idx_paid_standard_boxes_standard on paid_standard_boxes(standard);
create index if not exists idx_paid_standard_box_tests_box_id on paid_standard_box_tests(box_id);
create index if not exists idx_paid_standard_box_tests_test_id on paid_standard_box_tests(test_id);
create index if not exists idx_payments_payment_type on payments(payment_type);
create index if not exists idx_users_purchased_standard_boxes on users using gin (purchased_standard_boxes);
