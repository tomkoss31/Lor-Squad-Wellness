-- =============================================================================
-- Une couleur par coach, la meme dans les deux apps (agenda partage, etape 3).
--
-- LE CONSTAT (17/09/2026) : dans l'agenda, Thomas, Maria, Manon et Sohyer sont
-- tous turquoise. `users.calendar_color` existe depuis le 27/07 (lot 6.3) mais
-- les 14 comptes sont a NULL : tout le monde retombe sur une teinte derivee de
-- l'identifiant, tiree d'une palette de six ou « Turquoise » et « Cyan » ont le
-- MEME code. Quatre personnes sur la meme couleur, c'est un agenda illisible.
--
-- Thomas a valide les couleurs de TimeTree, que l'equipe connait deja :
-- Melanie rose · Thomas vert · Romane violet · Maria bleu. On les pose ici,
-- pour les coachs du club uniquement — les autres restent libres de choisir
-- dans leur profil. La palette du profil est corrigee cote front dans le meme
-- lot (plus de doublon, un vrai code pour « Dore »).
-- =============================================================================

update public.users set calendar_color = '#EC4899'
 where name = 'Mélanie' and active and calendar_color is null;
update public.users set calendar_color = '#22C55E'
 where name = 'Thomas' and active and calendar_color is null;
update public.users set calendar_color = '#A78BFA'
 where name ilike 'Romane%' and active and calendar_color is null;
update public.users set calendar_color = '#3B82F6'
 where name ilike 'Maria catalano%' and active and calendar_color is null;

-- ── La couleur voyage avec les coachs du club ───────────────────────────────
-- Le type de retour change (une colonne de plus) : il faut recreer la
-- fonction. Ses appelantes la resolvent par son nom a l'execution, rien a
-- toucher chez elles.
drop function if exists public.coachs_du_club();

create function public.coachs_du_club()
returns table (id uuid, prenom text, nom text, proprietaire boolean, couleur text)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select u.id,
         coalesce(nullif(split_part(coalesce(u.name, ''), ' ', 1), ''), 'Coach') as prenom,
         coalesce(nullif(trim(u.name), ''), 'Coach')                            as nom,
         (u.id = cl.owner_user_id)                                             as proprietaire,
         u.calendar_color                                                      as couleur
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
  'Les coachs qui travaillent dans MON club (rattaches par users.club_id, plus le proprietaire) : identifiant, prenom, nom, couleur d''agenda. Lisible par quiconque est dans le club.';

-- ── Rien pour `anon` ────────────────────────────────────────────────────────
-- Supabase accorde EXECUTE a `anon` par privilege par defaut : un `revoke from
-- public` ne le retire pas (l'audit du 17/09 le signalait). Sans session, ces
-- fonctions rendent 0 ligne — mais un visiteur n'a pas a pouvoir les appeler.
revoke all on function public.coachs_du_club() from public, anon;
revoke all on function public.est_coach_de_mon_club(uuid) from public, anon;
revoke all on function public.agenda_du_club(timestamptz, timestamptz) from public, anon;
grant execute on function public.coachs_du_club() to authenticated;
grant execute on function public.est_coach_de_mon_club(uuid) to authenticated;
grant execute on function public.agenda_du_club(timestamptz, timestamptz) to authenticated;
