-- Incremental migration: assign individual tests to paid standard boxes
-- Safe to run after migration_add_paid_standard_boxes.sql

create table if not exists paid_standard_box_tests (
  box_id uuid not null references paid_standard_boxes(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (box_id, test_id)
);

create index if not exists idx_paid_standard_box_tests_box_id on paid_standard_box_tests(box_id);
create index if not exists idx_paid_standard_box_tests_test_id on paid_standard_box_tests(test_id);
