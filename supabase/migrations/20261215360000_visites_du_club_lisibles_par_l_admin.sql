-- =============================================================================
-- « Le club ce matin » montrait 2 pointages sur 9 (07/09)
--
-- Thomas, jour d'ouverture : « j'ai pointé des membres aujourd'hui dans les
-- visites mais je ne vois que 2 personnes dans Ce matin ». Mesure du jour :
--   Thomas  2 pointages   (Ghislaine, Thomas Houbert)
--   Mélanie 6 pointages
--   Romane  1 pointage
--   -> 9 au total, et il en voyait exactement 2 : les siens.
--
-- LA CAUSE. `club_visits` ne portait qu'UNE policy, `club_visits_own`, en ALL :
-- `coach_user_id = auth.uid()`. L'écran, lui, était déjà juste — il filtre sur
-- les membres affichés et sur le jour, jamais sur le coach, et son commentaire
-- le disait : « la RLS reste la vraie barrière ». C'était exact.
--
-- Le comptage cumulé passait déjà par `bbc_visit_counts()`, une fonction
-- SECURITY DEFINER élargie au club le 17/08. La lecture DIRECTE des visites du
-- jour, elle, était restée personnelle : d'où un écran de comptoir qui affiche
-- une matinée à moitié vide un jour d'ouverture.
--
-- CE QU'ON AJOUTE : la LECTURE seule, pour l'admin du club, bornée par
-- `bbc_mon_club()`. Les policies sont évaluées en OU, donc `club_visits_own`
-- continue de régir seule l'écriture.
--
-- ⚠️ ON NE TOUCHE PAS À L'ÉCRITURE, volontairement. Annuler un pointage reste
-- réservé à celui qui l'a posé : un « annuler » qui porterait sur le geste d'un
-- autre coach, en plein service et à deux mains sur la même tablette, ferait
-- plus de dégâts qu'il n'en répare. À rouvrir si le besoin se présente
-- vraiment.
--
-- ⚠️ Ce n'est pas un élargissement de droits : un coach ordinaire garde
-- strictement ses lignes, et la portée s'arrête au club — jamais toute la base.
--
-- Vérifié après coup, sous chaque identité :
--   Thomas (admin)              9 sur 9
--   Mélanie (admin)             9 sur 9
--   Alexis Bourgoin (distri)    0 — il n'a rien pointé, il ne voit rien
-- =============================================================================

create policy club_visits_club_admin_read on public.club_visits
  for select
  using (
    exists (
      select 1
        from public.clients cl
        join public.users u on u.id = (select auth.uid())
       where cl.id = club_visits.client_id
         and u.role = 'admin'
         and cl.club_id is not null
         and cl.club_id = public.bbc_mon_club()
    )
  );
