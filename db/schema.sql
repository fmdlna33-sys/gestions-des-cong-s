-- Enable extension
create extension if not exists "pgcrypto";

-- Users profile table (linked to auth.users)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  role text not null check (role in ('employee','manager','admin')),
  manager_id uuid references public.users(id),
  leave_mode text not null check (leave_mode in ('monthly_accrual','annual_deferred')),
  hire_date date not null,
  leave_balance numeric(8,2) default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('paid','unpaid','other')),
  custom_type_text text,
  start_date date not null,
  end_date date not null,
  is_half_day boolean not null default false,
  half_day_period text check (half_day_period in ('morning','afternoon')),
  status text not null default 'pending_manager',
  manager_status text not null default 'pending',
  admin_status text not null default 'pending',
  comment text,
  created_at timestamptz not null default now(),
  constraint valid_dates check (start_date <= end_date),
  constraint custom_type_required check (type <> 'other' or custom_type_text is not null)
);

create table if not exists public.company_closures (
  id bigint generated always as identity primary key,
  date date unique not null,
  label text not null
);

create table if not exists public.public_holidays (
  id bigint generated always as identity primary key,
  date date unique not null,
  label text not null
);

-- Helpful indexes
create index if not exists idx_leave_requests_user on public.leave_requests(user_id);
create index if not exists idx_leave_requests_dates on public.leave_requests(start_date, end_date);
create index if not exists idx_users_manager on public.users(manager_id);

-- RLS
alter table public.users enable row level security;
alter table public.leave_requests enable row level security;
alter table public.company_closures enable row level security;
alter table public.public_holidays enable row level security;

-- Users policies
create policy "users self read" on public.users
for select using (auth.uid() = id);

create policy "users managers read team" on public.users
for select using (
  exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.role in ('manager','admin')
  )
);

create policy "users self upsert" on public.users
for all using (auth.uid() = id) with check (auth.uid() = id);

-- Leave request policies
create policy "employees manage own requests" on public.leave_requests
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "managers read team requests" on public.leave_requests
for select using (
  exists (
    select 1 from public.users me
    join public.users emp on emp.id = leave_requests.user_id
    where me.id = auth.uid() and me.role = 'manager' and emp.manager_id = me.id
  )
);

create policy "managers update team requests" on public.leave_requests
for update using (
  exists (
    select 1 from public.users me
    join public.users emp on emp.id = leave_requests.user_id
    where me.id = auth.uid() and me.role = 'manager' and emp.manager_id = me.id
  )
);

create policy "admins full access requests" on public.leave_requests
for all using (
  exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin')
) with check (
  exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin')
);

-- Holidays/closures readable by all authenticated users
create policy "holidays read" on public.public_holidays for select using (auth.role() = 'authenticated');
create policy "closures read" on public.company_closures for select using (auth.role() = 'authenticated');

-- Admin maintain holidays/closures
create policy "admin holidays manage" on public.public_holidays
for all using (exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin'))
with check (exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin'));

create policy "admin closures manage" on public.company_closures
for all using (exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin'))
with check (exists (select 1 from public.users me where me.id = auth.uid() and me.role = 'admin'));
