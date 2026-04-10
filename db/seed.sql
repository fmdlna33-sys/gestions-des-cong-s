-- Seed minimal v2
-- Les profils sont créés automatiquement par trigger auth.users.
-- Exécutez d'abord la création des comptes Auth via Supabase Auth UI/API.

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

-- Exemple: affecter un manager à un employé (adapter avec vos vrais emails)
-- update public.users emp
-- set manager_id = mgr.id
-- from public.users mgr
-- where emp.email = 'employee@flowleave.app' and mgr.email = 'manager@flowleave.app';
