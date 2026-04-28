-- =============================================================================
-- Client VIP Program (Herbalife Client Privilegie) — 2026-04-28
--
-- Implementation du programme Client Privilegie Herbalife dans Lor'Squad :
--   - Niveaux : Bronze (-15%) / Silver (-25%) / Gold (-35%) / Ambassadeur (-42%)
--   - Bronze : 1ere commande passee
--   - Silver : 100 pts cumul lifetime
--   - Gold : 500 pts cumul lifetime
--   - Ambassadeur : 1000 pts en glissant 3 mois (seul cycle temporel)
--   - 1 PV (perso ou descendant) = 1 pt pour TOUS les ascendants
--   - Profondeur d arbre ILLIMITEE
--   - Pas de decroissance : le client garde son palier a vie
--
-- =============================================================================

begin;

-- ─── 1. Extension table clients ──────────────────────────────────────────────
alter table public.clients
  add column if not exists vip_herbalife_id text,        -- ID 21XY1234567 (11 chars)
  add column if not exists vip_sponsor_client_id uuid,   -- nullable, parrainage
  add column if not exists vip_started_at timestamptz,   -- date d activation
  add column if not exists vip_status text default 'none' -- 'none/bronze/silver/gold/ambassador'
    check (vip_status in ('none', 'bronze', 'silver', 'gold', 'ambassador'));

-- FK self-reference clients(id) — on autorise on delete set null pour
-- ne pas casser la chaine si un client est supprime.
do $alter$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clients_vip_sponsor_fk'
  ) then
    alter table public.clients
      add constraint clients_vip_sponsor_fk
      foreign key (vip_sponsor_client_id) references public.clients(id) on delete set null;
  end if;
end;
$alter$;

create index if not exists idx_clients_vip_sponsor on public.clients(vip_sponsor_client_id);
create index if not exists idx_clients_vip_status on public.clients(vip_status);

-- ─── 2. Table client_referral_intentions ─────────────────────────────────────
-- Form "Mes prospects à recommander" rempli par le client dans la sandbox VIP.
-- Le coach voit ces prospects sur la fiche client et peut les transformer.
create table if not exists public.client_referral_intentions (
  id uuid primary key default gen_random_uuid(),
  referrer_client_id uuid not null references public.clients(id) on delete cascade,
  prospect_first_name text not null,
  relationship text,        -- 'family' / 'work' / 'sport' / 'friend' / 'other'
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'contacted', 'converted', 'lost')),
  contacted_at timestamptz,
  converted_at timestamptz,
  converted_to_client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_referral_intentions_referrer
  on public.client_referral_intentions(referrer_client_id);

create index if not exists idx_referral_intentions_status
  on public.client_referral_intentions(status);

alter table public.client_referral_intentions enable row level security;

-- Policy : le coach voit / gere les intentions de SES clients (via clients.distributor_id).
drop policy if exists "intentions_coach_manage" on public.client_referral_intentions;
create policy "intentions_coach_manage"
  on public.client_referral_intentions
  for all
  to authenticated
  using (
    exists (
      select 1 from public.clients cli
      where cli.id = referrer_client_id
        and (cli.distributor_id = auth.uid() or exists (
          select 1 from public.users where "id" = auth.uid() and role = 'admin'
        ))
    )
  )
  with check (
    exists (
      select 1 from public.clients cli
      where cli.id = referrer_client_id
        and (cli.distributor_id = auth.uid() or exists (
          select 1 from public.users where "id" = auth.uid() and role = 'admin'
        ))
    )
  );

-- ─── 3. RPC get_client_vip_status (recursif) ─────────────────────────────────
-- Calcule l etat VIP courant d un client :
--   - PV cumule lifetime (perso + tous descendants, profondeur illimitee)
--   - PV cumule glissant 3 mois (pour Ambassadeur)
--   - Niveau effectif (palier atteint + bump Ambassadeur si applicable)
--   - Remise applicable (-15/-25/-35/-42)
--   - Threshold pour palier suivant
create or replace function public.get_client_vip_status(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_3m_start date := (current_date - interval '3 months')::date;
  v_pv_lifetime numeric;
  v_pv_3m numeric;
  v_has_first_order boolean;
  v_level text;
  v_discount int;
  v_next_threshold int;
  v_descendants_count int;
  v_branch_count int;
begin
  -- Verify client exists
  if not exists (select 1 from public.clients where id = p_client_id) then
    return jsonb_build_object('error', 'client_not_found');
  end if;

  -- Calcule l ensemble des descendants (recursif, profondeur illimitee).
  -- Inclut le client lui-meme dans la liste pour additionner ses propres PV.
  with recursive tree as (
    select p_client_id::uuid as id, 0 as depth
    union all
    select cli.id, t.depth + 1
    from public.clients cli
    join tree t on cli.vip_sponsor_client_id = t.id
  ),
  pv_lifetime as (
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.id = tx.client_id
  ),
  pv_3m as (
    select coalesce(sum(tx.pv * coalesce(tx.quantity, 1)), 0)::numeric as pv
    from public.pv_transactions tx
    join tree t on t.id = tx.client_id
    where tx.date >= v_3m_start
  ),
  first_order as (
    select exists (
      select 1 from public.pv_transactions where client_id = p_client_id limit 1
    ) as has_order
  ),
  branch_stats as (
    select
      (select count(*) from tree where depth > 0)::int as desc_count,
      (select count(*) from tree where depth = 1)::int as direct_count
  )
  select
    pv_lifetime.pv,
    pv_3m.pv,
    first_order.has_order,
    branch_stats.desc_count,
    branch_stats.direct_count
  into v_pv_lifetime, v_pv_3m, v_has_first_order, v_descendants_count, v_branch_count
  from pv_lifetime, pv_3m, first_order, branch_stats;

  -- Determine palier
  if v_pv_3m >= 1000 then
    v_level := 'ambassador';
    v_discount := 42;
    v_next_threshold := 1000; -- max
  elsif v_pv_lifetime >= 500 then
    v_level := 'gold';
    v_discount := 35;
    v_next_threshold := 1000; -- pour atteindre Ambassadeur (en 3 mois)
  elsif v_pv_lifetime >= 100 then
    v_level := 'silver';
    v_discount := 25;
    v_next_threshold := 500;
  elsif v_has_first_order then
    v_level := 'bronze';
    v_discount := 15;
    v_next_threshold := 100;
  else
    v_level := 'none';
    v_discount := 0;
    v_next_threshold := 1; -- 1 commande pour debloquer Bronze
  end if;

  return jsonb_build_object(
    'client_id', p_client_id,
    'pv_lifetime', round(v_pv_lifetime)::int,
    'pv_3m', round(v_pv_3m)::int,
    'has_first_order', v_has_first_order,
    'level', v_level,
    'discount_pct', v_discount,
    'next_threshold', v_next_threshold,
    'descendants_count', v_descendants_count,
    'direct_referrals_count', v_branch_count,
    'is_ambassador_eligible', v_pv_3m >= 1000,
    'computed_at', now()
  );
end;
$function$;

revoke all on function public.get_client_vip_status(uuid) from public, anon;
grant execute on function public.get_client_vip_status(uuid) to authenticated, anon;

-- ─── 4. RPC get_client_referral_tree (JSON arbre recursif) ───────────────────
-- Retourne l arbre complet des descendants pour visualisation cote coach + client.
-- Inclut PV cumule par noeud (perso) et nom des clients.
create or replace function public.get_client_referral_tree(p_client_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_3m_start date := (current_date - interval '3 months')::date;
  v_tree jsonb;
begin
  if not exists (select 1 from public.clients where id = p_client_id) then
    return jsonb_build_object('error', 'client_not_found');
  end if;

  -- CTE recursive : aplatit l arbre en liste de noeuds avec parent_id pour
  -- permettre au front de reconstruire la structure.
  with recursive tree as (
    select
      p_client_id::uuid as id,
      null::uuid as parent_id,
      0 as depth
    union all
    select
      cli.id,
      cli.vip_sponsor_client_id as parent_id,
      t.depth + 1
    from public.clients cli
    join tree t on cli.vip_sponsor_client_id = t.id
  ),
  enriched as (
    select
      t.id,
      t.parent_id,
      t.depth,
      cli.first_name || ' ' || cli.last_name as full_name,
      cli.vip_status,
      coalesce((
        select sum(tx.pv * coalesce(tx.quantity, 1))::int
        from public.pv_transactions tx where tx.client_id = t.id
      ), 0) as pv_personal,
      coalesce((
        select sum(tx.pv * coalesce(tx.quantity, 1))::int
        from public.pv_transactions tx
        where tx.client_id = t.id and tx.date >= v_3m_start
      ), 0) as pv_personal_3m
    from tree t
    join public.clients cli on cli.id = t.id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'parent_id', e.parent_id,
    'depth', e.depth,
    'full_name', e.full_name,
    'vip_status', e.vip_status,
    'pv_personal', e.pv_personal,
    'pv_personal_3m', e.pv_personal_3m
  ) order by e.depth, e.full_name), '[]'::jsonb) into v_tree
  from enriched e;

  return jsonb_build_object(
    'root_client_id', p_client_id,
    'nodes', v_tree,
    'computed_at', now()
  );
end;
$function$;

revoke all on function public.get_client_referral_tree(uuid) from public, anon;
grant execute on function public.get_client_referral_tree(uuid) to authenticated, anon;

-- ─── 5. RPC record_client_referral_intention ─────────────────────────────────
-- Le client (via PWA, token-auth) renseigne un prospect dans le form "Mes
-- prospects a recommander". Verifie le token + insert.
create or replace function public.record_client_referral_intention(
  p_token text,
  p_first_name text,
  p_relationship text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id text;
  v_client_uuid uuid;
  v_intention_id uuid;
begin
  if p_first_name is null or length(trim(p_first_name)) < 1 then
    return jsonb_build_object('error', 'first_name_required');
  end if;

  select caa.client_id into v_client_id
  from public.client_app_accounts caa
  where caa.token = p_token limit 1;

  if v_client_id is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  -- Cast en uuid (assume client_id text est bien un uuid valide)
  begin
    v_client_uuid := v_client_id::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  insert into public.client_referral_intentions
    (referrer_client_id, prospect_first_name, relationship, notes)
  values
    (v_client_uuid, trim(p_first_name), p_relationship, p_notes)
  returning id into v_intention_id;

  return jsonb_build_object(
    'success', true,
    'intention_id', v_intention_id
  );
end;
$function$;

revoke all on function public.record_client_referral_intention(text, text, text, text) from public;
grant execute on function public.record_client_referral_intention(text, text, text, text) to anon, authenticated;

-- ─── 6. RPC list_client_referral_intentions (cote coach) ────────────────────
create or replace function public.list_client_referral_intentions(p_client_id uuid)
returns table (
  id uuid,
  prospect_first_name text,
  relationship text,
  notes text,
  status text,
  created_at timestamptz,
  contacted_at timestamptz,
  converted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin
  -- Authorization : coach proprio du client OU admin
  if not exists (
    select 1 from public.clients cli
    where cli.id = p_client_id
      and (cli.distributor_id = auth.uid() or exists (
        select 1 from public.users where "id" = auth.uid() and role = 'admin'
      ))
  ) then
    raise exception 'access denied';
  end if;

  return query
  select
    cri.id, cri.prospect_first_name, cri.relationship,
    cri.notes, cri.status, cri.created_at,
    cri.contacted_at, cri.converted_at
  from public.client_referral_intentions cri
  where cri.referrer_client_id = p_client_id
  order by cri.created_at desc;
end;
$function$;

grant execute on function public.list_client_referral_intentions(uuid) to authenticated;

-- ─── 7. RPC versions token-auth (cote client app) ──────────────────────────

create or replace function public.get_client_vip_status_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id_text text;
  v_client_uuid uuid;
begin
  select caa.client_id into v_client_id_text
  from public.client_app_accounts caa
  where caa.token = p_token limit 1;

  if v_client_id_text is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_vip_status(v_client_uuid);
end;
$function$;

revoke all on function public.get_client_vip_status_by_token(text) from public;
grant execute on function public.get_client_vip_status_by_token(text) to anon, authenticated;

create or replace function public.get_client_referral_tree_by_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_client_id_text text;
  v_client_uuid uuid;
begin
  select caa.client_id into v_client_id_text
  from public.client_app_accounts caa
  where caa.token = p_token limit 1;

  if v_client_id_text is null then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  begin
    v_client_uuid := v_client_id_text::uuid;
  exception when invalid_text_representation then
    return jsonb_build_object('error', 'invalid_client_id_format');
  end;

  return public.get_client_referral_tree(v_client_uuid);
end;
$function$;

revoke all on function public.get_client_referral_tree_by_token(text) from public;
grant execute on function public.get_client_referral_tree_by_token(text) to anon, authenticated;

-- ─── 8. Comments ─────────────────────────────────────────────────────────────
comment on column public.clients.vip_herbalife_id is
  'ID Client Privilegie Herbalife format 21XY1234567 (11 chars : 2 digits + 2 letters + 7 digits). Saisi manuellement par le coach apres inscription du client sur myherbalife.com.';

comment on column public.clients.vip_sponsor_client_id is
  'Le client (autre client de la base) qui a parraine ce client. Permet de construire l arbre recursif via WITH RECURSIVE. Profondeur illimitee.';

comment on table public.client_referral_intentions is
  'Form "Mes prospects a recommander" rempli par le client dans la sandbox VIP. Le coach voit la liste, peut transformer (status converted) en vrais clients via le flow normal.';

commit;
