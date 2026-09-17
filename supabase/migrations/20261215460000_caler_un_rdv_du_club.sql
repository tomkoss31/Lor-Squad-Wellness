-- =============================================================================
-- Caler ou deplacer un rendez-vous du club (agenda partage, etape 6).
--
-- DECISION DE THOMAS (17/09) : dans le club, tout le monde peut caler, deplacer
-- et qualifier le rendez-vous d'une autre — c'est le comptoir, celle qui tient
-- la tablette agit pour l'equipe. Or `prospects` n'accepte l'ecriture que par
-- `can_access_owner` (admin, soi, son aval) : Romane ne peut pas caler chez
-- Melanie. Plutot que d'elargir les policies, UNE fonction fait l'ecriture et
-- porte les trois garanties qu'aucune policy ne sait porter :
--
--   1. la coach visee est du MEME club (`est_coach_de_mon_club`) ;
--   2. LE CRENEAU EST LIBRE, verifie au moment d'ecrire, contre la meme source
--      que le tunnel du site — `creneaux_occupes()` : suivis, rendez-vous,
--      reservations ET rituels. Une liste affichee est une photo ; ici on
--      revérifie. Si quelqu'un a pris le creneau entre-temps : `creneau_pris`,
--      et rien n'est ecrit ;
--   3. un deplacement libere l'ancien creneau AVANT de verifier le nouveau —
--      sinon on ne pourrait jamais decaler un rendez-vous d'une demi-heure.
--
-- Le rendez-vous deplace perd sa marque de rappel (`reminder_email_sent_at`)
-- pour que la veille du nouveau jour envoie le sien.
-- =============================================================================

create or replace function public.caler_rdv_club(
  p_coach          uuid,
  p_debut          timestamptz,
  p_duree_min      int,
  p_prenom         text,
  p_nom            text default null,
  p_telephone      text default null,
  p_email          text default null,
  p_source         text default 'Autre',
  p_source_detail  text default null,
  p_note           text default null,
  p_rdv_id         uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_fin        timestamptz;
  v_id         uuid;
  v_pris       int := 0;
  v_old_debut  timestamptz;
  v_old_fin    timestamptz;
  v_old_coach  uuid;
  v_old_statut text;
begin
  if not public.is_active_user() then
    raise exception 'access denied';
  end if;
  if p_coach is null or not public.est_coach_de_mon_club(p_coach) then
    raise exception 'coach_hors_club';
  end if;
  if p_debut is null or coalesce(p_duree_min, 0) <= 0 or p_duree_min > 480 then
    raise exception 'creneau_invalide';
  end if;
  if p_rdv_id is null and coalesce(trim(p_prenom), '') = '' then
    raise exception 'prenom_requis';
  end if;
  v_fin := p_debut + make_interval(mins => p_duree_min);

  if p_rdv_id is not null then
    select p.rdv_date,
           p.rdv_date + make_interval(mins => coalesce(p.duration_min, 60)),
           p.distributor_id,
           coalesce(p.status, '')
      into v_old_debut, v_old_fin, v_old_coach, v_old_statut
      from public.prospects p
     where p.id = p_rdv_id
       and public.est_coach_de_mon_club(p.distributor_id);
    if v_old_debut is null then
      raise exception 'rendez_vous_introuvable';
    end if;
  end if;

  -- Le creneau est-il pris ? Meme regle que le site : `creneaux_occupes()`.
  select count(*)
    into v_pris
    from public.creneaux_occupes(p_coach, p_debut - interval '1 day', p_debut + interval '2 days') o
   where o.debut < v_fin and o.fin > p_debut;

  -- Un deplacement : l'ancien creneau du MEME rendez-vous ne compte pas
  -- contre lui (il figure dans creneaux_occupes tant qu'il n'est pas tranche).
  if p_rdv_id is not null
     and v_old_coach = p_coach
     and v_old_statut not in ('lost', 'no_show', 'cancelled', 'cold')
     and v_old_debut < v_fin and v_old_fin > p_debut then
    v_pris := v_pris - 1;
  end if;

  if v_pris > 0 then
    raise exception 'creneau_pris';
  end if;

  if p_rdv_id is null then
    insert into public.prospects
      (first_name, last_name, phone, email, rdv_date, duration_min,
       source, source_detail, note, distributor_id, status)
    values
      (trim(p_prenom),
       coalesce(nullif(trim(p_nom), ''), ''),
       nullif(trim(p_telephone), ''),
       nullif(trim(p_email), ''),
       p_debut, p_duree_min,
       coalesce(nullif(trim(p_source), ''), 'Autre'),
       p_source_detail, p_note, p_coach, 'scheduled')
    returning id into v_id;
  else
    update public.prospects
       set rdv_date = p_debut,
           duration_min = p_duree_min,
           distributor_id = p_coach,
           -- Recaler quelqu'un qui n'etait pas venue, c'est lui redonner un
           -- rendez-vous : il redevient « a venir ».
           status = case when status in ('cancelled', 'no_show', 'cold') then 'scheduled' else status end,
           reminder_email_sent_at = null,
           updated_at = now()
     where id = p_rdv_id
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

comment on function public.caler_rdv_club(uuid, timestamptz, int, text, text, text, text, text, text, text, uuid) is
  'Cale (ou deplace, si p_rdv_id est donne) un rendez-vous chez une coach de MON club. Verifie que le creneau est libre contre creneaux_occupes() — suivis, rendez-vous, reservations, rituels — et refuse par creneau_pris sinon. Un deplacement libere l''ancien creneau avant la verification.';

revoke all on function public.caler_rdv_club(uuid, timestamptz, int, text, text, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.caler_rdv_club(uuid, timestamptz, int, text, text, text, text, text, text, text, uuid) to authenticated;
