alter table public.users
drop constraint if exists users_role_check;

alter table public.users
add constraint users_role_check
check (role in ('admin', 'referent', 'distributor'));

alter table public.users
add column if not exists sponsor_id uuid references public.users (id) on delete set null;

alter table public.users
add column if not exists sponsor_name text;

select pg_notify('pgrst', 'reload schema');
