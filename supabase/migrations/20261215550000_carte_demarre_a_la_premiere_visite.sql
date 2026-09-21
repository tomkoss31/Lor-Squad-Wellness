-- =============================================================================
-- La carte démarre à la 1re VISITE, pas à l'attribution (Thomas, 21/09/2026).
--
-- Le défaut, mesuré en base : une carte 10 (valide 30 jours) attribuée le 20/08
-- alors que la 1re venue du membre était le 14/09 avait déjà « brûlé » 25 de ses
-- 30 jours avant même que le membre commence — elle périmait 5 jours plus tard,
-- à 3 visites. Trois cartes du club étaient dans ce cas (Lydie, Fabienne, Gwen),
-- recalées à la main.
--
-- LE CORRECTIF, sans changement de schéma : quand `bbc_add_visit` (le chemin
-- UNIQUE, partagé avec le scan QR via `bbc_scan_visit`) enregistre la PREMIÈRE
-- visite d'une carte, il recale la fenêtre de validité sur aujourd'hui EN
-- GARDANT la même durée (`expires_at - started_at`, ce qui préserve un éventuel
-- `p_days` custom). Les cartes déjà entamées ne sont jamais touchées.
--
-- Reste identique au reste : anti-doublon 10 min, clôture à la carte pleine,
-- payload de retour. Seul le bloc « 1re visite → recale » est nouveau.
-- =============================================================================

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
  v_premiere boolean := false;
begin
  select first_name into v_name from public.clients where id = p_client_id;
  v_agit := public.bbc_agir_pour(p_client_id);

  select * into v_card from public.member_cards
  where client_id = p_client_id and closed_at is null
    and (expires_at is null or expires_at > now())
  order by started_at desc limit 1;

  select exists (
    select 1 from public.club_visits
    where client_id = p_client_id and coach_user_id = v_agit
      and visited_at > now() - interval '10 minutes'
  ) into v_recent;

  -- La carte a-t-elle déjà servi ? (avant l'insert de cette visite)
  if v_card.id is not null then
    select count(*) = 0 into v_premiere from public.club_visits where card_id = v_card.id;
  end if;

  if not v_recent then
    insert into public.club_visits (client_id, coach_user_id, card_id)
    values (p_client_id, v_agit, v_card.id);

    if v_card.id is not null then
      -- 1re visite → la validité démarre AUJOURD'HUI, même durée qu'à l'attribution.
      if v_premiere then
        update public.member_cards
          set started_at = now(),
              expires_at = case
                when expires_at is null then null
                else now() + (expires_at - started_at)
              end
        where id = v_card.id;
      end if;

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
