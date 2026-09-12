-- =============================================================================
-- « Je clique et le compteur ne descend pas » — la carte appartient au MEMBRE,
-- pas au coach qui l'a vendue.
--
-- ── LE CONSTAT (Thomas au comptoir, 12/09/2026) ────────────────────────────
-- Audrey Marque est venue 3 fois. Sa carte 10 affiche 1 visite utilisée.
-- Anaïs Boulangé est venue 2 fois : sa carte en affiche 1. Le pointage écrit
-- bien une ligne dans `club_visits` — mais avec `card_id = NULL`, donc le
-- compteur de la carte ne bouge jamais.
--
-- ── LA CAUSE ───────────────────────────────────────────────────────────────
-- `bbc_add_visit` cherchait la carte ainsi :
--
--     where client_id = p_client_id
--       and coach_user_id = v_agit        <-- ICI
--
-- où `v_agit = bbc_agir_pour(...)` rend le coach QUI SUIT LA FICHE.
-- Or `member_cards.coach_user_id` porte le coach QUI A VENDU la carte.
-- Les deux se séparent dès que :
--   · la fiche est rattachée à un autre coach — `bbc_rattacher_membre` déplace
--     la fiche et les cœurs, JAMAIS la carte (c'est documenté, et c'est
--     volontaire : la carte enregistre qui l'a encaissée) ;
--   · ou, tout simplement, un coach vend la carte d'un membre suivi par un
--     autre — au comptoir, à deux, c'est la normale.
--
-- Cas réel : Thomas crée Audrey et Anaïs le 07/09 et leur vend une carte 10
-- (carte au nom de Thomas). Le soir même les fiches passent à Romane. Depuis,
-- chaque pointage de Romane ne trouve plus la carte : 3 visites orphelines.
--
-- ⚠️ C'EST UN PROBLÈME D'ARGENT, pas d'affichage. Le membre a payé 10 visites,
-- en a consommé 3, et sa carte en annonce 1 : le club offrirait 9 visites de
-- plus, et l'alerte « bilan des 10 » ne se déclencherait jamais au bon moment.
--
-- ── LA RÈGLE, désormais ────────────────────────────────────────────────────
-- Une carte est la propriété du MEMBRE. Qui la consomme n'a aucune importance.
-- `coach_user_id` reste sur la carte — c'est la trace de qui l'a vendue, utile
-- au chiffre d'affaires — mais il ne conditionne plus RIEN.
--
-- L'autorisation ne s'affaiblit pas d'un pouce : `bbc_agir_pour()` est appelée
-- en tête de chaque fonction et lève si l'appelant n'a pas le droit d'agir
-- pour ce membre. On ne relâche que le choix de LA CARTE, à membre déjà
-- autorisé.
-- =============================================================================

-- ── 1. Le pointage trouve la carte du membre ────────────────────────────────
create or replace function public.bbc_add_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_agit uuid;
  v_name text;
  v_card record;
  v_used integer := 0;
  v_total integer;
  v_recent boolean;
begin
  select first_name into v_name from public.clients where id = p_client_id;
  v_agit := public.bbc_agir_pour(p_client_id);

  -- La carte du MEMBRE, quel que soit le coach qui l'a vendue.
  select * into v_card from public.member_cards
  where client_id = p_client_id and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  select exists (
    select 1 from public.club_visits
    where client_id = p_client_id and coach_user_id = v_agit
      and visited_at > now() - interval '10 minutes'
  ) into v_recent;

  if not v_recent then
    insert into public.club_visits (client_id, coach_user_id, card_id)
    values (p_client_id, v_agit, v_card.id);

    if v_card.id is not null then
      select count(*) into v_used from public.club_visits where card_id = v_card.id;
      if v_used >= v_card.card_type then
        update public.member_cards set closed_at = now() where id = v_card.id;
      end if;
    end if;
  end if;

  if v_card.id is not null then
    select count(*) into v_used from public.club_visits where card_id = v_card.id;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_agit;

  return json_build_object(
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end,
    'already_counted', v_recent
  );
end;
$function$;

-- ── 2. Une nouvelle carte ferme TOUTES les anciennes du membre ───────────────
-- Même racine : `and coach_user_id = v_agit` laissait ouverte la carte vendue
-- par l'autre coach. Le membre se retrouvait avec deux cartes actives, et
-- laquelle se consomme devenait une question de tri.
create or replace function public.bbc_assign_card(
  p_client_id uuid,
  p_type smallint,
  p_price numeric default null,
  p_days integer default null,
  p_started_at timestamptz default null
)
returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_agit uuid;
  v_days integer;
  v_debut timestamptz;
  v_id uuid;
begin
  if p_type not in (10, 30) then
    raise exception 'type de carte invalide';
  end if;

  v_agit := public.bbc_agir_pour(p_client_id);

  v_days := coalesce(p_days, case when p_type = 10 then 30 else 90 end);
  v_debut := coalesce(p_started_at, now());

  if v_debut < now() - interval '31 days' then
    raise exception 'date de debut trop ancienne';
  end if;

  -- Toutes les cartes ouvertes de CE MEMBRE, peu importe qui les a vendues.
  update public.member_cards set closed_at = now()
  where client_id = p_client_id and closed_at is null;

  insert into public.member_cards (client_id, coach_user_id, card_type, price_eur, started_at, expires_at)
  values (p_client_id, v_agit, p_type, p_price, v_debut, v_debut + (v_days || ' days')::interval)
  returning id into v_id;

  return json_build_object('card_id', v_id, 'card_type', p_type, 'days', v_days, 'started_at', v_debut);
end;
$function$;

comment on function public.bbc_add_visit is
  'Pointe une visite. La carte consommee est celle du MEMBRE (peu importe le coach qui l''a vendue) : filtrer sur member_cards.coach_user_id gelait le compteur des 12/09/2026 des que la fiche changeait de coach. Anti-doublon 10 min, rend already_counted.';
