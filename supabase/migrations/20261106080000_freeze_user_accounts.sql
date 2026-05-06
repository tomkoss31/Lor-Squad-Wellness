-- =============================================================================
-- Freeze user accounts (2026-05-06)
--
-- Permet a un admin de geler temporairement le compte d'un distri qui
-- n'utilise pas l'app, sans le supprimer. Cas d'usage Thomas : Alexandre
-- a fait creer un compte mais ne se connecte jamais -> on gele son acces
-- pour qu'il :
--    1. ne pollue plus les stats XP / podium / rentab agreges
--    2. tombe sur un ecran "Patience" avec un bouton "Demander reactivation"
--       au lieu de pouvoir agir dans l'app
--
-- Si plus tard le compte n'est toujours pas actif, on pourra le supprimer
-- definitivement (delete cascade), mais ce n'est pas dans le scope ici.
--
-- COLONNES :
--   - users.frozen_at timestamptz : NULL = compte actif, NOT NULL = gele
--   - users.frozen_by uuid : admin qui a gele (audit)
--   - users.frozen_reason text : note libre admin (optionnel)
--
-- TABLE unfreeze_requests : stocke les demandes de reactivation envoyees
-- par les users geles. L'admin les verra dans son dashboard.
-- =============================================================================

begin;

-- 1. Colonnes users
alter table public.users
  add column if not exists frozen_at timestamptz,
  add column if not exists frozen_by uuid references public.users(id) on delete set null,
  add column if not exists frozen_reason text;

create index if not exists idx_users_frozen on public.users(frozen_at)
  where frozen_at is not null;

comment on column public.users.frozen_at is
  'Timestamp gel du compte (admin). NULL = actif, NOT NULL = gele -> redirige sur /frozen + exclu des stats XP/podium.';

-- 2. Table unfreeze_requests
create table if not exists public.unfreeze_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.users(id) on delete set null
);

create index if not exists idx_unfreeze_requests_user on public.unfreeze_requests(user_id, created_at desc);
create index if not exists idx_unfreeze_requests_pending on public.unfreeze_requests(created_at desc)
  where status = 'pending';

comment on table public.unfreeze_requests is
  'Demandes de reactivation envoyees par des users geles. Admin les voit + resoud.';

-- 3. RLS unfreeze_requests
alter table public.unfreeze_requests enable row level security;

drop policy if exists "unfreeze_requests_self_insert" on public.unfreeze_requests;
create policy "unfreeze_requests_self_insert"
  on public.unfreeze_requests
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "unfreeze_requests_self_read" on public.unfreeze_requests;
create policy "unfreeze_requests_self_read"
  on public.unfreeze_requests
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "unfreeze_requests_admin_all" on public.unfreeze_requests;
create policy "unfreeze_requests_admin_all"
  on public.unfreeze_requests
  for all
  to authenticated
  using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  )
  with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- 4. RPC freeze_user / unfreeze_user (admin only)
drop function if exists public.freeze_user(uuid, text);
create function public.freeze_user(p_target_user_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_caller is null then
    raise exception 'access denied: not authenticated';
  end if;

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'access denied: admin only';
  end if;

  update public.users
  set frozen_at = now(),
      frozen_by = v_caller,
      frozen_reason = p_reason
  where id = p_target_user_id
    and id <> v_caller; -- jamais geler soi-meme
end;
$$;

drop function if exists public.unfreeze_user(uuid);
create function public.unfreeze_user(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_caller is null then
    raise exception 'access denied: not authenticated';
  end if;

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  if not v_is_admin then
    raise exception 'access denied: admin only';
  end if;

  update public.users
  set frozen_at = null,
      frozen_by = null,
      frozen_reason = null
  where id = p_target_user_id;

  -- Marque toutes les unfreeze_requests pending de cet user comme resolues
  update public.unfreeze_requests
  set status = 'approved',
      resolved_at = now(),
      resolved_by = v_caller
  where user_id = p_target_user_id
    and status = 'pending';
end;
$$;

grant execute on function public.freeze_user(uuid, text) to authenticated;
grant execute on function public.unfreeze_user(uuid) to authenticated;

commit;
