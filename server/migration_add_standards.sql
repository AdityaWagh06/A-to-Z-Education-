-- Create Standards Table
create table if not exists standards (
    id uuid primary key default gen_random_uuid(),
    label text not null unique,  -- e.g. "Standard 3" or just "3"
    value int not null unique,   -- e.g. 3
    is_active boolean default true,
    created_at timestamptz not null default now()
);

-- Seed initial data requested by user (3, 4, 5, 7)
insert into standards (label, value) values 
('3', 3),
('4', 4),
('5', 5),
('7', 7)
on conflict (value) do nothing;
