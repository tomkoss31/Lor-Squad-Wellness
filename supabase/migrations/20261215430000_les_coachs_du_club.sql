-- =============================================================================
-- Les coachs du club = les coachs RATTACHES au club (agenda partage, etape 1).
--
-- LE CONSTAT (Thomas, 17/09/2026) : « sur l'ecran la semaine dans BBC, je vois
-- les rdv de moi, Melanie, mais pas ceux de Romane ». Romane a pourtant 7 RDV a
-- venir en base.
--
-- LA CAUSE. Le front definissait « le club » par
-- `clubs.settings.discovery.coach_user_ids` — la liste des coachs qui PRENNENT
-- LES RESERVATIONS DU SITE (Thomas, Melanie). Ce n'est pas l'equipe : Romane et
-- Maria sont rattachees au club (`users.club_id`) sans y figurer. Leurs RDV
-- etaient lus, puis ecartes par la portee « Le club ».
--
-- Et une distributrice ne peut pas lire `users` : chez Romane, les autres
-- coachs se seraient appeles « Coach ». D'ou cette fonction, qui rend
-- l'identifiant et le NOM — rien d'autre, ni adresse ni telephone — a
-- quiconque travaille dans le club. Meme parti que `coachs_joignables()`.
--
-- `bbc_mon_club()` rend deja le club possede OU celui ou l'on travaille.
-- =============================================================================

create or replace function public.coachs_du_club()
returns table (id uuid, prenom text, nom text, proprietaire boolean)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id,
         coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Coach') as prenom,
         coalesce(nullif(trim(u.name), ''), 'Coach')                            as nom,
         (u.id = cl.owner_user_id)                                             as proprietaire
    from public.clubs cl
    join public.users u
      on (u.club_id = cl.id or u.id = cl.owner_user_id)
   where cl.id = public.bbc_mon_club()
     and coalesce(u.active, true)
     and u.role in ('admin', 'referent', 'distributor')
     and public.is_active_user()
   order by (u.id = cl.owner_user_id) desc, 2;
$$;

comment on function public.coachs_du_club() is
  'Les coachs qui travaillent dans MON club (rattaches par users.club_id, plus le proprietaire) : identifiant, prenom, nom. Lisible par quiconque est dans le club — c''est ce qui permet a une distributrice de voir de qui est un rendez-vous sans ouvrir la table users.';

revoke all on function public.coachs_du_club() from public;
grant execute on function public.coachs_du_club() to authenticated;
