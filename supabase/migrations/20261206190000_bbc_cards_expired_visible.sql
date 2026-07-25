-- =============================================================================
-- BBC — rendre les cartes EXPIRÉES visibles (2026-07-24).
--
-- Défaut trouvé en revue : `bbc_active_cards` filtrait `expires_at > now()`.
-- Une carte périmée disparaissait donc de l'écran du coach (plus de solde, plus
-- de bouton renouveler), pendant que la PWA du membre affichait toujours un
-- solde figé et que ses nouvelles visites tombaient hors carte, en silence.
--
-- On renvoie désormais les cartes non closes AVEC un drapeau `expired`, pour
-- que les deux côtés affichent « carte expirée » et invitent au renouvellement.
-- (bbc_add_visit garde son filtre : une visite ne consomme pas une carte périmée.)
-- =============================================================================

drop function if exists public.bbc_active_cards();
create or replace function public.bbc_active_cards()
returns table (client_id uuid, card_id uuid, card_type smallint, used bigint, expires_at timestamptz, expired boolean)
language sql
security definer
set search_path = public
as $$
  select c.client_id, c.id, c.card_type,
         (select count(*) from public.club_visits v where v.card_id = c.id) as used,
         c.expires_at,
         (c.expires_at is not null and c.expires_at <= now()) as expired
  from public.member_cards c
  where c.coach_user_id = auth.uid() and c.closed_at is null;
$$;
revoke all on function public.bbc_active_cards() from public;
grant execute on function public.bbc_active_cards() to authenticated;
