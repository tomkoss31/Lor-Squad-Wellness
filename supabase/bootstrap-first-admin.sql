-- 1. Cree d'abord le compte dans Supabase Auth
-- 2. Remplace les valeurs ci-dessous
-- 3. Execute ce script une seule fois pour le premier admin

insert into public.users (id, name, email, role, active, title)
select
  au.id,
  'Admin principal',
  au.email,
  'admin',
  true,
  'Lor''Squad Wellness'
from auth.users au
where au.email = 'admin@lorsquadwellness.app'
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active,
  title = excluded.title;
