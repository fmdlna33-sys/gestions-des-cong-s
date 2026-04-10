-- Replace UUIDs with your auth.users IDs from Supabase after creating users.
insert into public.users (id, email, role, manager_id, leave_mode, hire_date, leave_balance)
values
  ('00000000-0000-0000-0000-000000000001','employee@flowleave.app','employee','00000000-0000-0000-0000-000000000002','monthly_accrual','2024-01-15',12.50),
  ('00000000-0000-0000-0000-000000000002','manager@flowleave.app','manager',null,'monthly_accrual','2022-03-01',18.00),
  ('00000000-0000-0000-0000-000000000003','admin@flowleave.app','admin',null,'annual_deferred','2021-04-10',25.00)
on conflict (id) do nothing;

insert into public.public_holidays (date, label) values
  ('2026-01-01', 'New Year''s Day'),
  ('2026-05-25', 'Memorial Day'),
  ('2026-07-04', 'Independence Day'),
  ('2026-09-07', 'Labor Day'),
  ('2026-11-26', 'Thanksgiving'),
  ('2026-12-25', 'Christmas')
on conflict (date) do nothing;

insert into public.company_closures (date, label) values
  ('2026-08-14', 'Summer Closure'),
  ('2026-12-24', 'Winter Closure')
on conflict (date) do nothing;

insert into public.leave_requests (
  user_id, type, custom_type_text, start_date, end_date, is_half_day,
  half_day_period, status, manager_status, admin_status, comment
)
values
  ('00000000-0000-0000-0000-000000000001','paid',null,'2026-04-20','2026-04-22',false,null,'pending_admin','approved','pending','Family trip'),
  ('00000000-0000-0000-0000-000000000001','other','Medical appointment','2026-05-02','2026-05-02',true,'morning','approved','approved','approved','Routine check'),
  ('00000000-0000-0000-0000-000000000001','unpaid',null,'2026-06-10','2026-06-12',false,null,'rejected','rejected','rejected','Personal matters');
