-- =============================================================================
-- Qualifier un rendez-vous du club (agenda partage, etape 7).
--
-- « Elle est venue, et alors ? » Le meme ecran que l'agenda standard, depuis
-- le mode BBC — et pour n'importe quelle coach du club, pas seulement la
-- sienne (decision de Thomas, 17/09 : au comptoir, celle qui tient la tablette
-- agit pour l'equipe). Les policies de `prospects` et `rdv_bookings` ne
-- laissent ecrire que la proprietaire ou un admin : UNE fonction porte donc
-- l'ecriture et le controle « meme club », comme `caler_rdv_club()`.
--
-- Elle ecrit EXACTEMENT ce que l'agenda standard ecrit (AgendaPage, 16/09),
-- pour qu'un meme fait n'ait qu'une verite, quel que soit l'ecran :
--   prospects       membre → converted (+ la fiche creee)
--                   fait   → done
--                   relance / pas venue → cold + date de retour + raison
--                   perdue → lost
--   rdv_bookings    membre / fait → honored     (elle EST venue : jamais canceled)
--                   pas venue / relance / perdue → no_show
-- Les mails d'apres-rendez-vous restent cote client (club-mail-apres-rdv),
-- au meme endroit et aux memes conditions que l'agenda standard.
-- =============================================================================

create or replace function public.qualifier_rdv_club(
  p_source    text,
  p_rdv_id    uuid,
  p_issue     text,
  p_jours     int  default null,
  p_raison    text default null,
  p_client_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
  v_n     int;
begin
  if not public.is_active_user() then
    raise exception 'access denied';
  end if;
  if p_issue not in ('membre', 'fait', 'relance', 'pas_venue', 'perdue') then
    raise exception 'issue_inconnue';
  end if;

  if p_source = 'prospect' then
    select p.distributor_id into v_owner from public.prospects p where p.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;

    if p_issue = 'membre' then
      update public.prospects
         set status = 'converted',
             converted_client_id = coalesce(p_client_id::text, converted_client_id),
             updated_at = now()
       where id = p_rdv_id;
    elsif p_issue = 'fait' then
      update public.prospects set status = 'done', updated_at = now() where id = p_rdv_id;
    elsif p_issue in ('relance', 'pas_venue') then
      update public.prospects
         set status = 'cold',
             cold_until = now() + make_interval(days => coalesce(p_jours, case when p_issue = 'pas_venue' then 2 else 7 end)),
             cold_reason = coalesce(nullif(trim(p_raison), ''),
                                    case when p_issue = 'pas_venue' then 'Pas venue au RDV' else 'Venue au RDV, réfléchit' end),
             updated_at = now()
       where id = p_rdv_id;
    else
      update public.prospects set status = 'lost', updated_at = now() where id = p_rdv_id;
    end if;
    get diagnostics v_n = row_count;

  elsif p_source = 'reservation' then
    select b.coach_user_id into v_owner from public.rdv_bookings b where b.id = p_rdv_id;
    if v_owner is null or not public.est_coach_de_mon_club(v_owner) then
      raise exception 'rendez_vous_introuvable';
    end if;
    update public.rdv_bookings
       set status = case when p_issue in ('membre', 'fait') then 'honored' else 'no_show' end
     where id = p_rdv_id;
    get diagnostics v_n = row_count;

  else
    raise exception 'source_inconnue';
  end if;

  if v_n = 0 then
    raise exception 'rendez_vous_introuvable';
  end if;
end;
$$;

comment on function public.qualifier_rdv_club(text, uuid, text, int, text, uuid) is
  'Qualifie un rendez-vous (prospect ou reservation) d''une coach de MON club : membre / fait / relance / pas_venue / perdue. Ecrit exactement ce que l''agenda standard ecrit, pour qu''un meme fait n''ait qu''une verite.';

revoke all on function public.qualifier_rdv_club(text, uuid, text, int, text, uuid) from public, anon;
grant execute on function public.qualifier_rdv_club(text, uuid, text, int, text, uuid) to authenticated;
