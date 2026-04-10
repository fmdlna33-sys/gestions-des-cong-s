-- Correctif RLS: supprime la récursion infinie sur public.users.
-- À exécuter une fois sur la base existante.

alter table public.users enable row level security;

drop policy if exists "users self read" on public.users;
drop policy if exists "users managers read team" on public.users;
drop policy if exists "users authenticated read" on public.users;

create policy "users self read" on public.users
for select using (auth.uid() = id);

create policy "users authenticated read" on public.users
for select using (auth.role() = 'authenticated');
