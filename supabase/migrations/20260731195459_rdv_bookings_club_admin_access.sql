-- 1d — les ADMINS peuvent voir + gérer les réservations "club" (séances découverte
-- du tunnel /reserver). Les résas club ont coach_user_id = null → la policy coach
-- existante (rdv_bookings_coach_read, coach_user_id = auth.uid()) ne les couvre pas.
--
-- Additif (permissif = OR), n'expose PAS les RDV perso des autres coachs
-- (club_id null chez eux). is_admin() = security definer (current_role()='admin'),
-- pas de récursion. Réservé à `authenticated` (anon exclu).
--
-- Vérifié en base : admin voit une résa club (1), distributeur ne voit rien (0),
-- ligne de test rollback.

drop policy if exists rdv_bookings_club_admin_read on public.rdv_bookings;
create policy rdv_bookings_club_admin_read
  on public.rdv_bookings for select to authenticated
  using (club_id is not null and public.is_admin());

drop policy if exists rdv_bookings_club_admin_update on public.rdv_bookings;
create policy rdv_bookings_club_admin_update
  on public.rdv_bookings for update to authenticated
  using (club_id is not null and public.is_admin())
  with check (club_id is not null and public.is_admin());
