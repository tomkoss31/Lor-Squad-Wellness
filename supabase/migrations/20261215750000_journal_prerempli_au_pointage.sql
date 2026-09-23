-- =============================================================================
-- Le shake du club est posé DÈS LE POINTAGE (23/09/2026).
--
-- Vécu ce matin : Thomas pointe Audrey à 8 h 03 et regarde son journal — vide.
-- Le pré-remplissage (« Shake F1 + ½ sachet PDM » au petit-déjeuner + la boisson
-- du club) n'était écrit que lorsque la MEMBRE ouvrait son journal
-- (`journal_jour` → `_journal_prerempli_club`). Tant qu'elle n'ouvrait pas son
-- espace, sa journée restait vide — et la coach, qui regarde depuis sa fiche ou
-- « Co-pilote › Journal », voyait un trou alors que la personne était venue.
-- Conséquence invisible : la case « passée au club » de l'aperçu coach
-- (`journal_apercu_coach`) ne s'allumait presque jamais.
--
-- On le pose donc au moment du pointage. `_journal_prerempli_club` ne fait rien
-- deux fois (garde `club_prerempli`) : si la membre l'a retiré, ça reste retiré,
-- et l'ouverture de son journal continue d'appeler la même fonction.
-- Seul ajout à `bbc_add_visit` : la ligne `perform`, dans le bloc qui compte
-- vraiment la visite (jamais sur un double scan de moins de 10 minutes).
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

  if v_card.id is not null then
    select count(*) = 0 into v_premiere from public.club_visits where card_id = v_card.id;
  end if;

  if not v_recent then
    insert into public.club_visits (client_id, coach_user_id, card_id)
    values (p_client_id, v_agit, v_card.id);

    -- Son petit-déjeuner du club dans son journal, tout de suite (23/09).
    perform public._journal_prerempli_club(p_client_id, (now() at time zone 'Europe/Paris')::date);

    if v_card.id is not null then
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
