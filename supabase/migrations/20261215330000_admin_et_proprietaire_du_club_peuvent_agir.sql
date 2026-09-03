-- =============================================================================
-- Au comptoir, celui qui encaisse n'est pas celui qui suit la fiche.
--
-- ── LE MUR (mesuré le 03/09) ────────────────────────────────────────────────
-- Quatre fonctions portent le même contrôle, mot pour mot :
--
--     select distributor_id into v_owner from public.clients where id = …;
--     if v_owner is distinct from v_coach then raise exception 'non autorise';
--
--   bbc_assign_card · bbc_add_visit · bbc_remove_visit · bbc_register_call
--
-- Conséquence concrète, le jour où le club ouvre : Gaëlle Grandet a pris sa
-- carte 10 visites, sa fiche est chez Mélanie — Thomas, PROPRIÉTAIRE du club et
-- admin de l'app, ne peut pas la lui poser. Romane possède sa propre fiche :
-- personne d'autre qu'elle ne peut lui vendre sa carte. Et l'écran répond
-- « Impossible d'enregistrer la carte — réessaie », alors que réessayer ne
-- changera jamais rien.
--
-- Thomas, mot pour mot : « admin doit pouvoir tout faire !!!! créer une carte
-- etc ! ».
--
-- ── CE QU'ON CHANGE, ET CE QU'ON NE CHANGE PAS ──────────────────────────────
-- On élargit QUI a le droit d'agir — pas SUR QUI la ligne est écrite.
--
-- C'est le piège de ce correctif : laisser `coach_user_id = auth.uid()` ferait
-- qu'une carte vendue par Thomas à une membre de Mélanie appartiendrait à
-- Thomas. Les policies de `member_cards`, `club_visits` et
-- `club_call_registrations` sont toutes en `coach_user_id = auth.uid()` :
-- Mélanie ne verrait plus la carte qu'elle doit pointer, et les visites du
-- club se scinderaient en deux comptages muets.
--
-- Donc : la ligne est TOUJOURS écrite au nom du coach qui suit la fiche
-- (`v_agit`), quel que soit celui qui appuie sur le bouton. Le club reste
-- rangé ; seul le droit d'agir s'ouvre.
--
-- Aucun changement de signature ni de valeur de retour : le front n'a rien à
-- savoir de tout ça.
-- =============================================================================

-- ── Le droit d'agir, en un seul endroit ─────────────────────────────────────
-- Trois portes, et pas une de plus :
--   · c'est ma fiche ;
--   · je suis admin de l'app ;
--   · je suis propriétaire du club actif auquel cette personne est rattachée.
--
-- Rend l'identité sous laquelle écrire — le coach qui suit la fiche. Lève
-- « non autorise » sinon, avec le même message qu'avant : les écrans qui le
-- rattrapent n'ont pas à changer.
create or replace function public.bbc_agir_pour(p_client_id uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_moi   uuid := (select auth.uid());
  v_owner uuid;
  v_club  uuid;
begin
  if v_moi is null then
    raise exception 'non autorise';
  end if;

  select distributor_id, club_id into v_owner, v_club
    from public.clients where id = p_client_id;
  if v_owner is null then
    raise exception 'non autorise';
  end if;

  if v_owner = v_moi then
    return v_owner;
  end if;

  if public.is_admin() then
    return v_owner;
  end if;

  if v_club is not null and exists (
    select 1 from public.clubs c
     where c.id = v_club and c.owner_user_id = v_moi and c.active
  ) then
    return v_owner;
  end if;

  raise exception 'non autorise';
end;
$$;

revoke all on function public.bbc_agir_pour(uuid) from public;
grant execute on function public.bbc_agir_pour(uuid) to authenticated;

comment on function public.bbc_agir_pour(uuid) is
  'Qui a le droit d''agir sur ce membre du club : lui-même, un admin, ou le propriétaire du club où il est rattaché. Rend l''id du coach QUI SUIT LA FICHE — c''est sous cette identité que la carte, la visite ou l''inscription doivent être écrites, sinon elles deviennent invisibles pour le coach concerné.';

-- ── 1. La carte ─────────────────────────────────────────────────────────────
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
set search_path = public
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

  update public.member_cards set closed_at = now()
  where client_id = p_client_id and coach_user_id = v_agit and closed_at is null;

  insert into public.member_cards (client_id, coach_user_id, card_type, price_eur, started_at, expires_at)
  values (p_client_id, v_agit, p_type, p_price, v_debut, v_debut + (v_days || ' days')::interval)
  returning id into v_id;

  return json_build_object('card_id', v_id, 'card_type', p_type, 'days', v_days, 'started_at', v_debut);
end;
$function$;

-- ── 2. Pointer une visite ───────────────────────────────────────────────────
create or replace function public.bbc_add_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public
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

  select * into v_card from public.member_cards
  where client_id = p_client_id and coach_user_id = v_agit and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  -- Un meme membre pointe deux fois en dix minutes = erreur de saisie, pas deux
  -- petits-dejeuners. On ne reecrit rien mais on renvoie l'etat reel.
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

-- ── 3. Annuler un pointage ──────────────────────────────────────────────────
create or replace function public.bbc_remove_visit(p_client_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_agit uuid;
  v_name text;
  v_visit record;
  v_card record;
  v_used integer := 0;
  v_total integer;
begin
  select first_name into v_name from public.clients where id = p_client_id;
  v_agit := public.bbc_agir_pour(p_client_id);

  select * into v_visit from public.club_visits
  where client_id = p_client_id and coach_user_id = v_agit
  order by visited_at desc limit 1;

  if v_visit.id is null then
    return json_build_object('removed', false, 'client_name', coalesce(v_name, 'membre'));
  end if;

  delete from public.club_visits where id = v_visit.id;

  -- Si c'est ce pointage qui avait rempli la carte, elle se rouvre.
  if v_visit.card_id is not null then
    update public.member_cards
    set closed_at = null
    where id = v_visit.card_id
      and closed_at is not null
      and (expires_at is null or expires_at > now());

    select * into v_card from public.member_cards where id = v_visit.card_id;
    select count(*) into v_used from public.club_visits where card_id = v_visit.card_id;
  end if;

  select count(*) into v_total from public.club_visits
  where client_id = p_client_id and coach_user_id = v_agit;

  return json_build_object(
    'removed', true,
    'client_name', coalesce(v_name, 'membre'),
    'total_visits', v_total,
    'card_type', v_card.card_type,
    'card_used', v_used,
    'card_remaining', case when v_card.id is null then null else greatest(v_card.card_type - v_used, 0) end
  );
end;
$function$;

-- ── 4. Inscrire à un rituel ─────────────────────────────────────────────────
create or replace function public.bbc_register_call(
  p_client_id uuid,
  p_call_key text,
  p_scheduled_at timestamptz
)
returns json
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_agit uuid;
  v_id uuid;
begin
  v_agit := public.bbc_agir_pour(p_client_id);
  insert into public.club_call_registrations (client_id, coach_user_id, call_key, scheduled_at)
  values (p_client_id, v_agit, p_call_key, p_scheduled_at)
  on conflict on constraint club_call_registrations_unique do update set client_id = excluded.client_id
  returning id into v_id;
  return json_build_object('id', v_id);
end;
$function$;
