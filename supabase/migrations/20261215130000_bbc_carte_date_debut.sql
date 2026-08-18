-- =============================================================================
-- La carte de membre peut démarrer plus tard que le jour où on la vend.
--
-- LE CAS (Thomas, 18/08) : le club ouvre le 7 septembre et les membres
-- s'inscrivent dès maintenant. Judith et Virginie prennent leur carte 10 visites
-- le 18 août ; `bbc_assign_card` écrivait `now()` et `now() + 30 jours`, donc
-- une carte à 80 € expirée le 17 septembre — vingt de ses trente jours consommés
-- avant le premier petit-déjeuner.
--
-- Thomas : « les cartes de membres, leur date de départ c'est le 7, pour le
-- décompte des 30 jours ».
--
-- ⚠️ On NE PEUT PAS faire un simple CREATE OR REPLACE : ajouter un paramètre
-- change la signature, et Postgres créerait une SECONDE fonction. Les appels
-- nommés existants (p_client_id, p_type, p_price, p_days) deviendraient
-- ambigus et échoueraient. On remplace donc l'ancienne signature.
-- =============================================================================

drop function if exists public.bbc_assign_card(uuid, smallint, numeric, integer);

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
  v_coach uuid := auth.uid();
  v_owner uuid;
  v_days integer;
  v_debut timestamptz;
  v_id uuid;
begin
  if p_type not in (10, 30) then
    raise exception 'type de carte invalide';
  end if;

  -- Le contrôle d'accès ne bouge pas : seul le coach propriétaire de la fiche
  -- pose une carte. Un admin du club la VOIT, il ne l'écrit pas.
  select distributor_id into v_owner from public.clients where id = p_client_id;
  if v_owner is distinct from v_coach then
    raise exception 'non autorise';
  end if;

  v_days := coalesce(p_days, case when p_type = 10 then 30 else 90 end);
  v_debut := coalesce(p_started_at, now());

  -- Une carte ne peut pas démarrer dans un passé lointain : au-delà, c'est une
  -- faute de frappe, et elle serait déjà à moitié périmée sans qu'on le voie.
  if v_debut < now() - interval '31 days' then
    raise exception 'date de debut trop ancienne';
  end if;

  -- une seule carte active à la fois
  update public.member_cards set closed_at = now()
  where client_id = p_client_id and coach_user_id = v_coach and closed_at is null;

  insert into public.member_cards (client_id, coach_user_id, card_type, price_eur, started_at, expires_at)
  values (p_client_id, v_coach, p_type, p_price, v_debut, v_debut + (v_days || ' days')::interval)
  returning id into v_id;

  return json_build_object('card_id', v_id, 'card_type', p_type, 'days', v_days, 'started_at', v_debut);
end;
$function$;

comment on function public.bbc_assign_card(uuid, smallint, numeric, integer, timestamptz) is
  'Attribue une carte de membre. `p_started_at` permet de la faire démarrer au jour d''ouverture du club plutôt qu''au jour de la vente ; null = maintenant.';

-- =============================================================================
-- La date d'ouverture du club n'existait QUE dans un commentaire de code
-- (`BbcPeseeSheet.tsx` : « le club ouvre le 7 septembre »). Un écran ne peut pas
-- lire un commentaire : on la met là où vivent déjà les tarifs des cartes et les
-- horaires, pour que la valeur par défaut de la date de début vienne des données.
--
-- ⚠️ NE PAS confondre avec `settings.discovery.opening_date` (2026-08-01), qui
-- est l'ouverture des RENDEZ-VOUS DÉCOUVERTE, pas celle du club.
-- =============================================================================

update public.clubs
set settings = jsonb_set(settings, '{opening_date}', '"2026-09-07"'::jsonb, true)
where slug = 'verdun'
  and settings -> 'opening_date' is null;
