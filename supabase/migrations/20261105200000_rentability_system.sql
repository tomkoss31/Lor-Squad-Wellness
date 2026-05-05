-- =============================================================================
-- Système Rentabilité — Phase A (2026-05-05)
--
-- Calcule en € la marge brute d'un distri sur le mois en cours, dérivée
-- de :
--   - revenus = somme(prix × qty) des pv_client_products actifs du mois
--   - marge % = lookup dans herbalife_margins selon users.current_rank
--
-- Choix V1 (validés Thomas 2026-05-05) :
--   - On n'inclut PAS la conso perso dans le calcul (V1 = juste marge
--     brute sur les ventes app). Évite le piège Bizworks.
--   - Seuils universels rouge<200€/orange 200-500€/vert>500€ pour
--     l'instant. Personnalisable plus tard si besoin.
--   - Visible admin + référent (sa propre + ses filleuls) + distri
--     (sa propre uniquement).
-- =============================================================================

begin;

-- ─── 1. Table herbalife_margins ──────────────────────────────────────────
create table if not exists public.herbalife_margins (
  rank text primary key,
  margin_pct numeric not null check (margin_pct >= 0 and margin_pct <= 100),
  label text,
  updated_at timestamptz not null default now()
);

comment on table public.herbalife_margins is
  'Marge personnelle Herbalife par rang (Phase A rentabilité 2026-05-05). '
  'Source de vérité = plan marketing Herbalife officiel. À mettre à jour '
  'si Herbalife modifie la grille (rare).';

-- Seed des 12 paliers Herbalife (cf. types/domain.ts HerbalifeRank)
insert into public.herbalife_margins (rank, margin_pct, label) values
  ('distributor_25',          25, 'Distributeur'),
  ('senior_consultant_35',    35, 'Senior Consultant'),
  ('success_builder_42',      42, 'Success Builder'),
  ('supervisor_50',           50, 'Supervisor'),
  ('active_supervisor_50',    50, 'Active Supervisor'),
  ('world_team_50',           50, 'World Team'),
  ('active_world_team_50',    50, 'Active World Team'),
  ('get_team_50',             50, 'GET Team'),
  ('get_team_2500_50',        50, 'GET Team 2500'),
  ('millionaire_50',          50, 'Millionaire Team'),
  ('millionaire_7500_50',     50, 'Millionaire 7500'),
  ('presidents_50',           50, 'President''s Team')
on conflict (rank) do update set
  margin_pct = excluded.margin_pct,
  label = excluded.label,
  updated_at = now();

-- RLS : tout le monde peut lire (config publique), admin only en write.
alter table public.herbalife_margins enable row level security;

drop policy if exists "margins_public_read" on public.herbalife_margins;
create policy "margins_public_read" on public.herbalife_margins
  for select using (auth.uid() is not null);

drop policy if exists "margins_admin_write" on public.herbalife_margins;
create policy "margins_admin_write" on public.herbalife_margins
  for all using (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.users where id = auth.uid() and role = 'admin')
  );

-- ─── 2. RPC get_user_rentability ─────────────────────────────────────────
-- Retourne, pour un user donné et un mois (default = mois courant) :
--   - revenue_brut         : somme(price × qty) des produits actifs ce mois
--   - margin_pct           : selon current_rank
--   - margin_eur           : revenue_brut × margin_pct / 100
--   - rank_label           : libellé humain du rang
--   - products_count       : nb de pv_client_products actifs ce mois
--   - top_programs         : array JSON des 5 programmes les plus rentables
--   - prev_month_eur       : marge du mois précédent (pour comparaison delta)
--   - projection_eur       : projection fin de mois (au prorata jours écoulés)
--
-- Sécurité : admin bypass + check ancestry (un caller voit son propre
-- sous-arbre uniquement, identique à get_team_engagement).
drop function if exists public.get_user_rentability(uuid, date);

create function public.get_user_rentability(
  p_user_id uuid,
  p_month date default null
)
returns table (
  user_id uuid,
  user_name text,
  rank text,
  rank_label text,
  margin_pct numeric,
  revenue_brut numeric,
  margin_eur numeric,
  products_count int,
  top_programs jsonb,
  prev_month_eur numeric,
  projection_eur numeric,
  month_start date,
  month_end date,
  days_elapsed int,
  days_in_month int
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_caller uuid := auth.uid();
  v_is_admin boolean := false;
  v_month date;
  v_month_start date;
  v_month_end date;
  v_prev_month_start date;
  v_prev_month_end date;
  v_now timestamptz := now();
  v_days_elapsed int;
  v_days_in_month int;
begin
  if v_caller is null then
    raise exception 'access denied';
  end if;

  select exists (select 1 from public.users where id = v_caller and role = 'admin')
  into v_is_admin;

  -- Sécurité : un non-admin ne peut requêter que son propre sous-arbre
  if not v_is_admin and v_caller <> p_user_id then
    if not exists (
      with recursive ancestors as (
        select u.id, u.sponsor_id from public.users u where u.id = p_user_id
        union all
        select u.id, u.sponsor_id
        from public.users u
        join ancestors a on u.id = a.sponsor_id
      )
      select 1 from ancestors where id = v_caller
    ) then
      raise exception 'access denied: not your sub-tree';
    end if;
  end if;

  -- Mois cible : default = mois courant
  v_month := coalesce(p_month, date_trunc('month', v_now)::date);
  v_month_start := date_trunc('month', v_month)::date;
  v_month_end := (v_month_start + interval '1 month' - interval '1 day')::date;
  v_prev_month_start := (v_month_start - interval '1 month')::date;
  v_prev_month_end := (v_month_start - interval '1 day')::date;

  v_days_in_month := extract(day from v_month_end)::int;
  -- Pour le mois en cours uniquement, sinon = days_in_month
  if v_month_start = date_trunc('month', v_now)::date then
    v_days_elapsed := extract(day from v_now)::int;
  else
    v_days_elapsed := v_days_in_month;
  end if;

  return query
  with target_user as (
    select u.id, u.name, u.current_rank::text as rank
    from public.users u
    where u.id = p_user_id
  ),
  -- Marge selon le rang du user
  margin_lookup as (
    select tu.id as user_id, tu.name, tu.rank,
           coalesce(m.margin_pct, 25) as margin_pct,
           coalesce(m.label, tu.rank) as rank_label
    from target_user tu
    left join public.herbalife_margins m on m.rank = tu.rank
  ),
  -- Produits actifs ce mois pour ce distri (via responsible_id ou via clients.distributor_id)
  -- pv_client_products n'a pas forcément un champ responsible_id stable :
  -- on remonte via clients.distributor_id qui est la source de vérité.
  current_products as (
    select pcp.id,
           pcp.client_id,
           pcp.product_name,
           pcp.quantity_start as qty,
           pcp.price_public_per_unit as price,
           pcp.start_date,
           pcp.active
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = p_user_id
      and pcp.active = true
      and pcp.start_date >= v_month_start
      and pcp.start_date <= v_month_end
  ),
  prev_products as (
    select pcp.quantity_start as qty,
           pcp.price_public_per_unit as price
    from public.pv_client_products pcp
    join public.clients c on c.id = pcp.client_id
    where c.distributor_id = p_user_id
      and pcp.active = true
      and pcp.start_date >= v_prev_month_start
      and pcp.start_date <= v_prev_month_end
  ),
  agg_current as (
    select coalesce(sum(price * qty), 0) as revenue,
           count(*)::int as products_count
    from current_products
  ),
  agg_prev as (
    select coalesce(sum(price * qty), 0) as revenue
    from prev_products
  ),
  top_5 as (
    select jsonb_build_object(
      'product_name', product_name,
      'qty', qty,
      'revenue', price * qty
    ) as item
    from current_products
    order by (price * qty) desc
    limit 5
  ),
  top_5_agg as (
    select coalesce(jsonb_agg(item), '[]'::jsonb) as items from top_5
  )
  select
    ml.user_id,
    ml.name,
    ml.rank,
    ml.rank_label,
    ml.margin_pct,
    ac.revenue::numeric as revenue_brut,
    round(ac.revenue * ml.margin_pct / 100, 2) as margin_eur,
    ac.products_count,
    t5.items as top_programs,
    round(ap.revenue * ml.margin_pct / 100, 2) as prev_month_eur,
    case
      when v_days_elapsed > 0 and v_days_elapsed < v_days_in_month then
        round((ac.revenue * ml.margin_pct / 100) * v_days_in_month::numeric / v_days_elapsed::numeric, 2)
      else
        round(ac.revenue * ml.margin_pct / 100, 2)
    end as projection_eur,
    v_month_start,
    v_month_end,
    v_days_elapsed,
    v_days_in_month
  from margin_lookup ml
  cross join agg_current ac
  cross join agg_prev ap
  cross join top_5_agg t5;
end;
$$;

grant execute on function public.get_user_rentability(uuid, date) to authenticated;

comment on function public.get_user_rentability is
  'Phase A Rentabilité (2026-05-05) : retourne la marge brute en € d''un '
  'distri pour un mois donné, dérivée des pv_client_products × marge selon '
  'rang Herbalife. Inclut projection fin de mois et comparaison vs mois '
  'précédent. Sécurité : ancestry-check pour les non-admin.';

commit;
