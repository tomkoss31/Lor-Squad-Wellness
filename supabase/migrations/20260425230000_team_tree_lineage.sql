-- Chantier Team Tree Lineage (2026-04-25).
-- Infrastructure SQL pour l'onglet "Mon équipe" :
--   · colonne parent_user_id sur users (alias sémantique de sponsor_id)
--   · trigger de synchronisation bi-directionnelle sponsor_id ↔ parent_user_id
--   · helper récursif is_in_user_subtree pour RLS sur arbre profond
--   · 3 RPCs : get_team_tree, get_distributor_stats, get_team_ranking
--   · policy RLS users élargie pour visibilité récursive descendante
--
-- IDEMPOTENT : rejouable sans casse. La colonne parent_user_id est ajoutée
-- avec IF NOT EXISTS, les triggers et fonctions avec CREATE OR REPLACE,
-- la policy avec drop-if-exists préalable.
--
-- Sécurité : les RPCs sont SECURITY INVOKER (pas SECURITY DEFINER) pour
-- que les policies RLS standard s'appliquent → un distri simple ne voit
-- que son sous-arbre descendant, un admin voit tout.

-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 1 — Colonne parent_user_id + backfill + trigger sync
-- ═══════════════════════════════════════════════════════════════════════

alter table public.users
  add column if not exists parent_user_id uuid references public.users(id) on delete set null;

create index if not exists idx_users_parent on public.users(parent_user_id);

-- Backfill : parent_user_id reflète sponsor_id (source de vérité historique)
update public.users
set parent_user_id = sponsor_id
where parent_user_id is distinct from sponsor_id;

comment on column public.users.parent_user_id is
  'Alias sémantique de sponsor_id (parrain direct). Synchronisé par trigger users_sync_parent_sponsor.';

-- Trigger : toute écriture sur sponsor_id ou parent_user_id met à jour
-- l'autre pour garder les 2 colonnes alignées en permanence.
create or replace function public.users_sync_parent_sponsor()
returns trigger
language plpgsql
as $$
begin
  -- INSERT / UPDATE : si un seul des 2 est fourni, copier sur l'autre
  if tg_op = 'INSERT' then
    if new.parent_user_id is null and new.sponsor_id is not null then
      new.parent_user_id := new.sponsor_id;
    elsif new.sponsor_id is null and new.parent_user_id is not null then
      new.sponsor_id := new.parent_user_id;
    end if;
    return new;
  end if;

  -- UPDATE : détecter lequel a changé et propager
  if new.sponsor_id is distinct from old.sponsor_id then
    new.parent_user_id := new.sponsor_id;
  elsif new.parent_user_id is distinct from old.parent_user_id then
    new.sponsor_id := new.parent_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists users_sync_parent_sponsor_trigger on public.users;
create trigger users_sync_parent_sponsor_trigger
  before insert or update on public.users
  for each row execute function public.users_sync_parent_sponsor();


-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 2 — Helper récursif is_in_user_subtree
-- ═══════════════════════════════════════════════════════════════════════
-- Retourne true si target_user est dans la descendance de viewer_user
-- (incluant viewer_user lui-même). Utilisé par les policies RLS pour
-- permettre à un référent/distri de voir toute sa sous-équipe, pas juste
-- ses filleuls directs.

create or replace function public.is_in_user_subtree(
  target_user uuid,
  viewer_user uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with recursive subtree as (
    select id from public.users where id = viewer_user
    union
    select u.id from public.users u
    inner join subtree s on u.parent_user_id = s.id
  )
  select exists (select 1 from subtree where id = target_user);
$$;

comment on function public.is_in_user_subtree(uuid, uuid) is
  'Retourne true si target_user est dans le sous-arbre descendant de viewer_user (récursif via parent_user_id).';


-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 3 — Policy RLS users élargie pour visibilité récursive
-- ═══════════════════════════════════════════════════════════════════════
-- La policy existante "users select self or admin" laisse voir self + admin
-- + filleuls directs (via sponsor_id). On ajoute une policy supplémentaire
-- pour la visibilité récursive descendante (admin voit tout, distri voit
-- son sous-arbre complet).
--
-- Les 2 policies sont PERMISSIVE et OR-ées par Postgres → cumulatif.

drop policy if exists "users_select_subtree" on public.users;
create policy "users_select_subtree"
  on public.users
  for select
  to authenticated
  using (
    public.is_in_user_subtree(users.id, auth.uid())
  );

comment on policy "users_select_subtree" on public.users is
  'Chantier Team Tree (2026-04-25) : un user voit toute sa descendance récursive (filleuls, petits-filleuls, etc.) en plus de la policy existante self/admin.';


-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 4 — RPC get_team_tree(root_user_id)
-- ═══════════════════════════════════════════════════════════════════════
-- Retourne la liste plate de l'arbre descendant à partir d'une racine
-- avec KPIs agrégés par user. Dépend de RLS pour la scope de visibilité.
-- Limite profondeur à 10 niveaux pour éviter les boucles infinies si
-- jamais un cycle existe.

create or replace function public.get_team_tree(root_user_id uuid)
returns table (
  user_id uuid,
  parent_id uuid,
  depth int,
  name text,
  email text,
  role text,
  title text,
  active boolean,
  created_at timestamptz,
  clients_count int,
  active_clients_count int,
  prospects_count int,
  subteam_count int
)
language sql
stable
security invoker
set search_path = public
as $$
  with recursive tree as (
    select u.id as uid, u.parent_user_id as parent_uid, 0 as depth
    from public.users u
    where u.id = root_user_id
    union all
    select u.id, u.parent_user_id, t.depth + 1
    from public.users u
    inner join tree t on u.parent_user_id = t.uid
    where t.depth < 10
  )
  select
    u.id as user_id,
    u.parent_user_id as parent_id,
    t.depth,
    u.name,
    u.email,
    u.role,
    u.title,
    u.active,
    u.created_at,
    (select count(*)::int from public.clients c where c.distributor_id = u.id) as clients_count,
    (select count(*)::int from public.clients c
      where c.distributor_id = u.id
        and coalesce(c.lifecycle_status, 'active') not in ('stopped', 'lost')
    ) as active_clients_count,
    (select count(*)::int from public.prospects p where p.distributor_id = u.id) as prospects_count,
    (select count(*)::int from public.users sub where sub.parent_user_id = u.id) as subteam_count
  from tree t
  inner join public.users u on u.id = t.uid
  order by t.depth asc, u.name asc;
$$;

comment on function public.get_team_tree(uuid) is
  'Arbre descendant depuis root_user_id avec KPIs agrégés (clients_count, prospects_count, subteam_count).';


-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 5 — RPC get_distributor_stats(user_id, period_start)
-- ═══════════════════════════════════════════════════════════════════════
-- Stats détaillées d'un distributeur sur une période donnée :
-- · clients actifs + delta période
-- · prospects totaux + "chauds"
-- · taille sous-équipe récursive
-- · taux rétention prospects→clients
-- · taux fidélisation clients

create or replace function public.get_distributor_stats(
  p_user_id uuid,
  p_period_start timestamptz
)
returns table (
  active_clients_count int,
  active_clients_delta int,
  prospects_count int,
  prospects_hot_count int,
  subteam_count int,
  retention_prospects_pct numeric,
  retention_prospects_converted int,
  retention_prospects_total int,
  retention_clients_pct numeric,
  retention_clients_still_active int,
  retention_clients_total int
)
language sql
stable
security invoker
set search_path = public
as $$
  with
    user_clients as (
      select c.*
      from public.clients c
      where c.distributor_id = p_user_id
    ),
    user_prospects as (
      select p.*
      from public.prospects p
      where p.distributor_id = p_user_id
    ),
    -- Clients actifs en ce moment (ni stopped ni lost)
    active_now as (
      select * from user_clients
      where coalesce(lifecycle_status, 'active') not in ('stopped', 'lost')
    ),
    -- Nouveaux clients démarrés dans la période
    clients_delta as (
      select count(*)::int as n from user_clients
      where start_date is not null
        and start_date >= p_period_start::date
    ),
    -- Clients actifs AVANT le début de la période (pour fidélisation)
    clients_at_period_start as (
      select * from user_clients
      where start_date is not null and start_date < p_period_start::date
    ),
    still_active as (
      select count(*)::int as n from clients_at_period_start
      where coalesce(lifecycle_status, 'active') not in ('stopped', 'lost')
    ),
    -- Prospects sur la période et conversions
    prospects_in_period as (
      select * from user_prospects
      where created_at >= p_period_start
    ),
    prospects_converted as (
      select count(*)::int as n from prospects_in_period
      where status = 'converted' or converted_client_id is not null
    ),
    -- Sous-équipe récursive
    subteam as (
      with recursive tree as (
        select id from public.users where parent_user_id = p_user_id
        union
        select u.id from public.users u inner join tree t on u.parent_user_id = t.id
      )
      select count(*)::int as n from tree
    )
  select
    (select count(*)::int from active_now) as active_clients_count,
    (select n from clients_delta) as active_clients_delta,
    (select count(*)::int from user_prospects) as prospects_count,
    (select count(*)::int from user_prospects where status in ('scheduled', 'done')) as prospects_hot_count,
    (select n from subteam) as subteam_count,
    case
      when (select count(*) from prospects_in_period) > 0
      then round(((select n from prospects_converted)::numeric / (select count(*) from prospects_in_period)::numeric) * 100, 0)
      else null
    end as retention_prospects_pct,
    (select n from prospects_converted) as retention_prospects_converted,
    (select count(*)::int from prospects_in_period) as retention_prospects_total,
    case
      when (select count(*) from clients_at_period_start) > 0
      then round(((select n from still_active)::numeric / (select count(*) from clients_at_period_start)::numeric) * 100, 0)
      else null
    end as retention_clients_pct,
    (select n from still_active) as retention_clients_still_active,
    (select count(*)::int from clients_at_period_start) as retention_clients_total;
$$;

comment on function public.get_distributor_stats(uuid, timestamptz) is
  'Stats détaillées d''un distributeur sur une période : KPIs + rétention + fidélisation.';


-- ═══════════════════════════════════════════════════════════════════════
-- PARTIE 6 — RPC get_team_ranking(root_user_id, period_start, limit)
-- ═══════════════════════════════════════════════════════════════════════
-- Classement top N par score composite :
--   +3 pts par nouveau client (start_date dans la période)
--   +1 pt par nouveau prospect dans la période
--   +2 pts bonus si rétention prospects > 60% OU fidélisation > 60%
-- La racine est exclue du classement (on ne se classe pas soi-même).

create or replace function public.get_team_ranking(
  p_root_user_id uuid,
  p_period_start timestamptz,
  p_limit int default 3
)
returns table (
  user_id uuid,
  name text,
  clients_delta int,
  prospects_period int,
  retention_prospects_pct numeric,
  retention_clients_pct numeric,
  score int
)
language sql
stable
security invoker
set search_path = public
as $$
  with recursive tree as (
    select id from public.users where id = p_root_user_id
    union all
    select u.id from public.users u inner join tree t on u.parent_user_id = t.id
  ),
  per_user as (
    select
      u.id as user_id,
      u.name,
      (
        select count(*)::int from public.clients c
        where c.distributor_id = u.id
          and c.start_date is not null
          and c.start_date >= p_period_start::date
      ) as clients_delta,
      (
        select count(*)::int from public.prospects p
        where p.distributor_id = u.id and p.created_at >= p_period_start
      ) as prospects_period,
      (
        select case
          when count(*) > 0
          then round((count(*) filter (where status = 'converted' or converted_client_id is not null)::numeric / count(*)::numeric) * 100, 0)
          else null
        end
        from public.prospects
        where distributor_id = u.id and created_at >= p_period_start
      ) as retention_prospects_pct,
      (
        with at_start as (
          select * from public.clients
          where distributor_id = u.id and start_date is not null and start_date < p_period_start::date
        )
        select case
          when (select count(*) from at_start) > 0
          then round(((select count(*) from at_start where coalesce(lifecycle_status, 'active') not in ('stopped', 'lost'))::numeric / (select count(*) from at_start)::numeric) * 100, 0)
          else null
        end
      ) as retention_clients_pct
    from public.users u
    where u.id in (select id from tree)
      and u.id <> p_root_user_id
  )
  select
    user_id,
    name,
    clients_delta,
    prospects_period,
    retention_prospects_pct,
    retention_clients_pct,
    (
      clients_delta * 3
      + prospects_period * 1
      + case when coalesce(retention_prospects_pct, 0) > 60 or coalesce(retention_clients_pct, 0) > 60 then 2 else 0 end
    )::int as score
  from per_user
  order by score desc, name asc
  limit p_limit;
$$;

comment on function public.get_team_ranking(uuid, timestamptz, int) is
  'Classement top N par score composite (+3/client, +1/prospect, bonus +2 si rétention >60%).';
