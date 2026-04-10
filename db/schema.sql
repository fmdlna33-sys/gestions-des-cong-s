-- FlowLeave v2 - Schéma complet (recréation)
create extension if not exists "pgcrypto";

-- Nettoyage (utile si vous recommencez depuis zéro)
drop table if exists public.leave_requests cascade;
drop table if exists public.company_closures cascade;
drop table if exists public.public_holidays cascade;
drop table if exists public.users cascade;

drop function if exists public.handle_new_auth_user() cascade;
drop function if exists public.current_user_role() cascade;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null check (role in ('employee','manager','admin')) default 'employee',
  manager_id uuid references public.users(id) on delete set null,
  leave_mode text not null check (leave_mode in ('monthly_accrual','annual_deferred')) default 'monthly_accrual',
  hire_date date not null default current_date,
  leave_balance numeric(8,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('paid','unpaid','other')),
  custom_type_text text,
  start_date date not null,
  end_date date not null,
  is_half_day boolean not null default false,
  half_day_period text check (half_day_period in ('morning','afternoon')),
  status text not null default 'pending_manager' check (status in ('pending_manager','pending_admin','approved','rejected','cancel_pending','cancelled')),
  manager_status text not null default 'pending' check (manager_status in ('pending','approved','rejected')),
  admin_status text not null default 'pending' check (admin_status in ('pending','approved','rejected')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_dates check (start_date <= end_date),
  constraint custom_type_required check (type <> 'other' or coalesce(nullif(trim(custom_type_text), ''), '') <> ''),
  constraint half_day_period_required check ((is_half_day = false and half_day_period is null) or (is_half_day = true and half_day_period is not null))
);

create table public.company_closures (
  id bigint generated always as identity primary key,
  date date unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create table public.public_holidays (
  id bigint generated always as identity primary key,
  date date unique not null,
  label text not null,
  created_at timestamptz not null default now()
);

create index idx_leave_requests_user_id on public.leave_requests(user_id);
create index idx_leave_requests_status on public.leave_requests(status, manager_status, admin_status);
create index idx_users_manager_id on public.users(manager_id);

-- Helpers
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
  v_local text;
  v_role text := 'employee';
begin
  v_email := lower(coalesce(new.email, ''));
  v_local := split_part(v_email, '@', 1);

  if v_local = 'evan.sarrazin' then
    v_role := 'admin';
  end if;

  insert into public.users (id, email, role, hire_date, leave_mode, leave_balance)
  values (new.id, v_email, v_role, current_date, 'monthly_accrual', 0)
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

-- RLS
alter table public.users enable row level security;
alter table public.leave_requests enable row level security;
alter table public.company_closures enable row level security;
alter table public.public_holidays enable row level security;

-- USERS
create policy "users read authenticated" on public.users
for select using (auth.role() = 'authenticated');

create policy "users update self" on public.users
for update using (auth.uid() = id)
with check (auth.uid() = id and role = (select role from public.users where id = auth.uid()));

-- LEAVE REQUESTS
create policy "employees create own requests" on public.leave_requests
for insert with check (auth.uid() = user_id);

create policy "employees read own requests" on public.leave_requests
for select using (
  auth.uid() = user_id
  or public.current_user_role() in ('manager','admin')
);

create policy "employees update own pending" on public.leave_requests
for update using (
  auth.uid() = user_id and manager_status = 'pending' and admin_status = 'pending'
)
with check (auth.uid() = user_id);

create policy "managers update team requests" on public.leave_requests
for update using (
  public.current_user_role() in ('manager','admin')
  and exists (
    select 1
    from public.users u
    where u.id = leave_requests.user_id
      and (u.manager_id = auth.uid() or public.current_user_role() = 'admin')
  )
)
with check (public.current_user_role() in ('manager','admin'));

-- HOLIDAYS/CLOSURES
create policy "special days read" on public.company_closures
for select using (auth.role() = 'authenticated');

create policy "public holidays read" on public.public_holidays
for select using (auth.role() = 'authenticated');

create policy "admin manage closures" on public.company_closures
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');

create policy "admin manage holidays" on public.public_holidays
for all using (public.current_user_role() = 'admin')
with check (public.current_user_role() = 'admin');
