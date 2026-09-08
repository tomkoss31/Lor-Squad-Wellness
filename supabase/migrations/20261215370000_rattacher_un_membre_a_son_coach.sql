-- =============================================================================
-- Rattacher un membre a un autre coach du club — et voir les rituels du club.
--
-- POURQUOI. Le 07/09, jour de l'ouverture, Thomas cree les fiches d'Audrey et
-- d'Anais. Ce sont les personnes de ROMANE, mais c'est lui qui tape : les deux
-- fiches naissent donc avec `distributor_id = Thomas`. Romane, qui n'est pas
-- admin, ne voit que ses propres fiches — elle ne les verra jamais.
--
-- Et RIEN dans l'application ne permettait de reparer ca : aucun ecran n'ecrit
-- `clients.distributor_id` apres la creation. L'onglet « Transferts » des
-- Parametres deplace un DISTRIBUTEUR vers un nouveau PARRAIN (la lignee
-- Herbalife) — ce n'est pas la meme chose et ca ne touche pas les fiches.
--
-- CE QUI SUIT LA FICHE, ET CE QUI RESTE — la seule vraie decision ici :
--   · la fiche elle-meme et son nom de coach  -> SUIVENT
--   · les coeurs lies a cette fiche           -> SUIVENT (c'est de la
--     visibilite : sans ca le nouveau coach ne verrait pas les recos de sa
--     personne)
--   · `club_visits`                           -> RESTE. Qui a pointe qui un
--     matin donne est un FAIT. Le reecrire falsifierait l'historique, et les
--     visites sont deja lisibles par tout le club depuis le 07/09.
--   · `client_messages`                       -> RESTE, meme raison.
--   · `client_app_accounts`                   -> rien a faire : la fonction
--     `client_app_account_is_valid` accepte deja « le coach qui suit la fiche
--     AUJOURD'HUI » (migration 20261215340000, ecrite en prevision de ceci).
-- =============================================================================

create or replace function public.bbc_rattacher_membre(
  p_client_id     uuid,
  p_nouveau_coach uuid
)
returns table (coach_id uuid, coach_nom text, coeurs_deplaces integer)
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_club_fiche uuid;
  v_club_coach uuid;
  v_nom        text;
  v_coeurs     integer := 0;
begin
  -- Garde-fou : leve « non autorise » si l'appelant n'est ni le coach actuel
  -- de la fiche, ni un admin, ni le proprietaire du club. On reutilise le
  -- controle existant plutot que d'en ecrire un deuxieme qui divergerait.
  perform public.bbc_agir_pour(p_client_id);

  select club_id into v_club_fiche from public.clients where id = p_client_id;
  select club_id, name into v_club_coach, v_nom from public.users where id = p_nouveau_coach;

  if v_nom is null then
    raise exception 'Ce coach est introuvable.';
  end if;

  -- On ne rattache QUE dans le meme club. Sans ce controle, un admin pourrait
  -- envoyer une fiche chez un coach d'un autre club, qui la verrait sans avoir
  -- rien demande — et elle disparaitrait du club ou la personne vient le matin.
  if v_club_fiche is null or v_club_coach is distinct from v_club_fiche then
    raise exception 'Ce coach ne travaille pas dans le club de cette fiche.';
  end if;

  update public.clients
     set distributor_id   = p_nouveau_coach,
         distributor_name = v_nom
   where id = p_client_id;

  -- Les coeurs : ceux que cette personne a DONNES (from_client_id) et celui
  -- d'ou SA fiche est nee (referred_client_id).
  update public.client_referrals
     set coach_id = p_nouveau_coach::text
   where from_client_id = p_client_id::text
      or referred_client_id = p_client_id;
  get diagnostics v_coeurs = row_count;

  return query select p_nouveau_coach, v_nom, v_coeurs;
end;
$function$;

comment on function public.bbc_rattacher_membre is
  'Change le coach qui suit une fiche du club, et fait suivre ses coeurs. L''historique (visites, messages) ne bouge pas. Garde-fou : bbc_agir_pour + meme club. Cree le 07/09 pour Audrey et Anais, creees par Thomas alors qu''elles sont les personnes de Romane.';

revoke all on function public.bbc_rattacher_membre(uuid, uuid) from public, anon;
grant execute on function public.bbc_rattacher_membre(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Les inscriptions aux rituels : un admin du club doit voir CELLES DU CLUB.
--
-- L'ancienne policy etait `coach_user_id = auth.uid()`, sans aucune
-- echappatoire. Thomas, proprietaire du club et admin, ne voyait donc que les
-- inscriptions qu'il avait faites lui-meme : impossible d'inviter a un atelier
-- une personne suivie par Melanie ou Romane, ni meme de savoir qu'elle est
-- inscrite. Corriger le filtre du front n'aurait rien change — l'ecran serait
-- reste vide, la base refusant les lignes.
--
-- Meme forme que `referral_coach_read` (07/09) : le club se lit par la FICHE,
-- pas par une colonne club sur la table, qui n'existe pas ici.
-- -----------------------------------------------------------------------------
drop policy if exists club_call_reg_own on public.club_call_registrations;

create policy club_call_reg_club on public.club_call_registrations
  for all
  using (
    coach_user_id = (select auth.uid())
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id = club_call_registrations.client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  )
  with check (
    coach_user_id = (select auth.uid())
    or exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id = club_call_registrations.client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );
