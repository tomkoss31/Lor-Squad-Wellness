-- =============================================================================
-- Chantier Paramètres Admin (2026-04-23)
--
--   1. Table distributor_transfers pour auditer les changements de parrain.
--   2. Table distributor_invitation_tokens pour inviter un distributeur
--      (email + sponsor). Même pattern que client_invitation_tokens.
--   3. RPC transfer_distributor_atomic() : change le sponsor d'un user en
--      une transaction + log dans distributor_transfers (atomique).
--   4. RPC helpers d'agrégation : lightweight stats queries pour l'onglet
--      Statistiques (évite du SQL à la main côté front).
--
-- activity_logs existe déjà dans schema.sql (vue dans diagnostic).
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

begin;

-- ─── 1. Table distributor_transfers ──────────────────────────────────────────
create table if not exists public.distributor_transfers (
  id uuid primary key default gen_random_uuid(),
  distributor_id uuid not null references public.users(id) on delete cascade,
  from_sponsor_id uuid references public.users(id) on delete set null,
  to_sponsor_id uuid not null references public.users(id) on delete cascade,
  transferred_by uuid not null references public.users(id) on delete cascade,
  transferred_at timestamptz not null default now(),
  notes text
);

create index if not exists idx_distributor_transfers_distri
  on public.distributor_transfers(distributor_id);

create index if not exists idx_distributor_transfers_recent
  on public.distributor_transfers(transferred_at desc);

alter table public.distributor_transfers enable row level security;

drop policy if exists "distri_transfers_admin_manage" on public.distributor_transfers;
create policy "distri_transfers_admin_manage"
  on public.distributor_transfers
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.distributor_transfers is
  'Chantier Paramètres Admin (2026-04-23) : audit trail des changements de '
  'parrain distributeur. Une ligne par transfert, jamais supprimée.';

-- ─── 2. Table distributor_invitation_tokens ──────────────────────────────────
create table if not exists public.distributor_invitation_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  first_name text,
  last_name text,
  sponsor_id uuid not null references public.users(id) on delete cascade,
  token text not null unique,
  invited_by uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists idx_distri_invite_token
  on public.distributor_invitation_tokens(token);

create index if not exists idx_distri_invite_sponsor
  on public.distributor_invitation_tokens(sponsor_id);

alter table public.distributor_invitation_tokens enable row level security;

drop policy if exists "distri_invite_admin_manage" on public.distributor_invitation_tokens;
create policy "distri_invite_admin_manage"
  on public.distributor_invitation_tokens
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

comment on table public.distributor_invitation_tokens is
  'Chantier Paramètres Admin (2026-04-23) : invitations pour créer un compte '
  'distributeur. Token 7 jours, consommation via magic-link + création compte.';

-- ─── 3. RPC transfer_distributor_atomic ──────────────────────────────────────
-- Change le sponsor_id d'un distributeur + log dans distributor_transfers,
-- atomique. Réservée aux admins via check is_admin() en tête de fonction.
-- Les clients (clients.distributor_id) restent attachés au distri transféré ;
-- seule la remontée via sponsor_id change.

create or replace function public.transfer_distributor_atomic(
  p_distributor_id uuid,
  p_new_sponsor_id uuid,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
as $$
declare
  current_admin uuid;
  old_sponsor_id uuid;
  transfer_id uuid;
begin
  -- Garde-fou : seuls les admins.
  if not public.is_admin() then
    raise exception 'Transfer distributeur réservé aux administrateurs.'
      using errcode = '42501';
  end if;

  current_admin := auth.uid();

  -- Validation des cibles.
  if p_distributor_id is null or p_new_sponsor_id is null then
    raise exception 'distributor_id et new_sponsor_id requis.';
  end if;
  if p_distributor_id = p_new_sponsor_id then
    raise exception 'Un distributeur ne peut pas être son propre parrain.';
  end if;

  -- Lookup old sponsor (pour l'audit).
  select sponsor_id into old_sponsor_id
  from public.users
  where id = p_distributor_id;

  if old_sponsor_id is not distinct from p_new_sponsor_id then
    raise exception 'Le distributeur est déjà rattaché à ce parrain.';
  end if;

  -- Mise à jour atomique : users.sponsor_id + sponsor_name dénormalisé.
  update public.users u
  set sponsor_id = p_new_sponsor_id,
      sponsor_name = (select name from public.users where id = p_new_sponsor_id)
  where u.id = p_distributor_id;

  -- Audit trail.
  insert into public.distributor_transfers
    (distributor_id, from_sponsor_id, to_sponsor_id, transferred_by, notes)
  values
    (p_distributor_id, old_sponsor_id, p_new_sponsor_id, current_admin, p_notes)
  returning id into transfer_id;

  -- Activity log (si la table existe déjà).
  begin
    insert into public.activity_logs
      (action, actor_id, actor_name, owner_user_id, target_user_id, target_user_name, summary, detail)
    select
      'transfer_distributor',
      current_admin,
      (select name from public.users where id = current_admin),
      p_distributor_id,
      p_distributor_id,
      (select name from public.users where id = p_distributor_id),
      format('Transfert de parrain : %s → %s',
        coalesce((select name from public.users where id = old_sponsor_id), 'aucun'),
        (select name from public.users where id = p_new_sponsor_id)),
      jsonb_build_object(
        'from_sponsor_id', old_sponsor_id,
        'to_sponsor_id', p_new_sponsor_id,
        'notes', p_notes
      );
  exception when undefined_table then
    -- activity_logs absente (environnement dev non migré) → skip silencieusement.
    null;
  end;

  return transfer_id;
end;
$$;

grant execute on function public.transfer_distributor_atomic(uuid, uuid, text) to authenticated;

-- ─── 4. RPC d'agrégation stats ──────────────────────────────────────────────
-- Retourne un json unique avec tous les KPIs de l'onglet Statistiques.
-- Scoping : l'admin voit tout, les non-admin n'ont pas accès (contrôle
-- effectué en tête via is_admin()).

create or replace function public.get_admin_stats()
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
  start_month timestamptz;
  three_months_ago timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Statistiques admin réservées.' using errcode = '42501';
  end if;

  start_month := date_trunc('month', now());
  three_months_ago := now() - interval '3 months';

  with
  distri_count as (
    select count(*) as total,
      count(*) filter (where active) as active_total,
      count(*) filter (where created_at >= start_month) as new_month
    from public.users
    where role in ('distributor', 'referent')
  ),
  retention as (
    select
      count(*) filter (
        where created_at <= three_months_ago
          and active
          and (last_access_at is null or last_access_at >= now() - interval '30 days')
      )::numeric as retained,
      nullif(count(*) filter (where created_at <= three_months_ago), 0)::numeric as base_pop
    from public.users
    where role in ('distributor', 'referent')
  ),
  clients_stats as (
    select
      count(*) as total,
      count(*) filter (where created_at >= start_month) as new_month
    from public.clients
  ),
  assessments_stats as (
    select count(*) as month_count
    from public.assessments
    where created_at >= start_month
  ),
  prospect_conv as (
    select
      count(*) filter (where status = 'converted')::numeric as converted,
      nullif(count(*), 0)::numeric as total
    from public.prospects
  ),
  pv_stats as (
    select coalesce(sum(pv), 0) as month_pv
    from public.pv_client_transactions
    where date >= start_month
  ),
  top_distri as (
    select jsonb_agg(
      jsonb_build_object('id', u.id, 'name', u.name, 'pv', t.pv_sum)
      order by t.pv_sum desc
    ) as top
    from (
      select responsible_id, sum(pv) as pv_sum
      from public.pv_client_transactions
      where date >= start_month
      group by responsible_id
      order by pv_sum desc
      limit 5
    ) t
    join public.users u on u.id = t.responsible_id
  ),
  msgs_stats as (
    select count(*) as month_count
    from public.client_messages
    where created_at >= start_month
  ),
  protocol_stats as (
    select count(*) as month_count
    from public.follow_up_protocol_log
    where sent_at >= start_month
  )
  select jsonb_build_object(
    'team', jsonb_build_object(
      'total', (select total from distri_count),
      'active_month', (select active_total from distri_count),
      'new_month', (select new_month from distri_count),
      'retention_3m_pct', (
        select case
          when (select base_pop from retention) is null then null
          else round(100.0 * (select retained from retention) / (select base_pop from retention), 1)
        end
      )
    ),
    'clients', jsonb_build_object(
      'total', (select total from clients_stats),
      'new_month', (select new_month from clients_stats),
      'assessments_month', (select month_count from assessments_stats),
      'conversion_pct', (
        select case
          when (select total from prospect_conv) is null then null
          else round(100.0 * (select converted from prospect_conv) / (select total from prospect_conv), 1)
        end
      )
    ),
    'pv', jsonb_build_object(
      'month_total', (select month_pv from pv_stats),
      'top5', coalesce((select top from top_distri), '[]'::jsonb)
    ),
    'activity', jsonb_build_object(
      'messages_month', (select month_count from msgs_stats),
      'protocol_sent_month', (select month_count from protocol_stats)
    ),
    'generated_at', now()
  ) into result;

  return result;
exception when undefined_table then
  -- Une table manque (pv_client_transactions, follow_up_protocol_log…) →
  -- retourne un jsonb avec seulement ce qu'on a pu calculer.
  return jsonb_build_object(
    'error', 'Certaines tables ne sont pas encore créées',
    'generated_at', now()
  );
end;
$$;

grant execute on function public.get_admin_stats() to authenticated;

commit;
