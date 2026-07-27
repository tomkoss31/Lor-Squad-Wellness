-- =============================================================================
-- BBC — cartes de membre 10/30 visites (2026-07-24).
--
-- Modèle : une LIGNE PAR CARTE achetée (historique complet, pas d'écrasement).
-- Une seule carte active à la fois par membre ; les visites sont rattachées à
-- la carte qu'elles consomment (`club_visits.card_id`) ; la carte se ferme
-- toute seule quand son quota est atteint.
--
-- Chemin d'écriture UNIQUE d'une visite : `bbc_add_visit` (le tap du coach ET
-- le scan QR passent par elle) — pas de logique dupliquée.
--
-- Durées par défaut : 10 visites → 30 j · 30 visites → 90 j (paramétrables via
-- p_days). Les PRIX ne sont jamais en dur : passés à l'attribution.
-- =============================================================================

create table if not exists public.member_cards (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients (id) on delete cascade,
  coach_user_id uuid not null references public.users (id) on delete cascade,
  card_type smallint not null check (card_type in (10, 30)),
  price_eur numeric(8,2),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists member_cards_client_idx on public.member_cards (client_id);
create index if not exists member_cards_coach_idx on public.member_cards (coach_user_id);

alter table public.member_cards enable row level security;
drop policy if exists "member_cards_own" on public.member_cards;
create policy "member_cards_own"
  on public.member_cards for all
  using (coach_user_id = auth.uid())
  with check (coach_user_id = auth.uid());

alter table public.club_visits
  add column if not exists card_id uuid references public.member_cards (id) on delete set null;

-- Attribuer / renouveler : ferme l'active, ouvre la nouvelle.
create or replace function public.bbc_assign_card(p_client_id uuid, p_type smallint, p_price numeric default null, p_days integer default null)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_days integer;
  v_id uuid;
begin
  if p_type not in (10, 30) then
    raise exception 'type de carte invalide';
  end if;
  select distributor_id into v_owner from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;
  update public.member_cards set closed_at = now()
  where client_id = p_client_id and coach_user_id = v_coach and closed_at is null;
  v_days := coalesce(p_days, case when p_type = 10 then 30 else 90 end);
  insert into public.member_cards (client_id, coach_user_id, card_type, price_eur, expires_at)
  values (p_client_id, v_coach, p_type, p_price, now() + (v_days || ' days')::interval)
  returning id into v_id;
  return json_build_object('card_id', v_id, 'card_type', p_type, 'days', v_days);
end;
$$;
revoke all on function public.bbc_assign_card(uuid, smallint, numeric, integer) from public;
grant execute on function public.bbc_assign_card(uuid, smallint, numeric, integer) to authenticated;

-- Chemin UNIQUE d'écriture d'une visite.
create or replace function public.bbc_add_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_name text;
  v_card record;
  v_used integer := 0;
  v_total integer;
begin
  select distributor_id, first_name into v_owner, v_name from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;

  select * into v_card from public.member_cards
  where client_id = p_client_id and coach_user_id = v_coach and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  insert into public.club_visits (client_id, coach_user_id, card_id)
  values (p_client_id, v_coach, v_card.id);

  if v_card.id is not null then
    select count(*) into v_used from public.club_visits where card_id = v_card.id;
    if v_used >= v_card.card_type then
      update public.member_cards set closed_at = now() where id = v_card.id;
    end if;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_coach;

  return json_build_object(
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end
  );
end;
$$;
revoke all on function public.bbc_add_visit(uuid) from public;
grant execute on function public.bbc_add_visit(uuid) to authenticated;

-- Le scan QR passe par le même chemin.
create or replace function public.bbc_scan_visit(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
begin
  select (client_id)::uuid into v_client_id
  from public.client_app_accounts where token = p_token::uuid limit 1;
  if v_client_id is null then
    raise exception 'token inconnu';
  end if;
  return public.bbc_add_visit(v_client_id);
end;
$$;

-- Cartes actives du coach (liste membres).
create or replace function public.bbc_active_cards()
returns table (client_id uuid, card_id uuid, card_type smallint, used bigint, expires_at timestamptz)
language sql
security definer
set search_path = public
as $$
  select c.client_id, c.id, c.card_type,
         (select count(*) from public.club_visits v where v.card_id = c.id) as used,
         c.expires_at
  from public.member_cards c
  where c.coach_user_id = auth.uid() and c.closed_at is null
    and (c.expires_at is null or c.expires_at > now());
$$;
revoke all on function public.bbc_active_cards() from public;
grant execute on function public.bbc_active_cards() to authenticated;
