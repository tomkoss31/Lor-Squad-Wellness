-- =============================================================================
-- BBC — durcissement RLS : vérifier l'appartenance du CLIENT (2026-07-24).
--
-- Défaut trouvé en revue : les policies des tables BBC ne testaient que
-- `coach_user_id = auth.uid()`. Un coach authentifié pouvait donc écrire, via
-- l'API REST directe, une ligne rattachée au `client_id` d'un AUTRE coach
-- (visite, carte, bilan, inscription). Comme l'edge `client-app-data` relit
-- `club_visits` et `member_cards` filtrées sur `client_id` SEUL (service_role),
-- la ligne forgée s'affichait dans la PWA du membre de la victime.
--
-- Le contrôle existait déjà dans les RPC (bbc_add_visit, bbc_assign_card,
-- bbc_register_call) mais restait contournable : le front écrit aussi en direct
-- (BbcBilan10, useBbcCalls). On le rend obligatoire au niveau de la BASE.
-- =============================================================================

drop policy if exists "club_visits_own" on public.club_visits;
create policy "club_visits_own"
  on public.club_visits for all
  using (coach_user_id = auth.uid())
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.distributor_id = auth.uid())
  );

drop policy if exists "member_cards_own" on public.member_cards;
create policy "member_cards_own"
  on public.member_cards for all
  using (coach_user_id = auth.uid())
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.distributor_id = auth.uid())
  );

drop policy if exists "club_bilans_own" on public.club_bilans;
create policy "club_bilans_own"
  on public.club_bilans for all
  using (coach_user_id = auth.uid())
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.distributor_id = auth.uid())
  );

drop policy if exists "club_call_reg_own" on public.club_call_registrations;
create policy "club_call_reg_own"
  on public.club_call_registrations for all
  using (coach_user_id = auth.uid())
  with check (
    coach_user_id = auth.uid()
    and exists (select 1 from public.clients c where c.id = client_id and c.distributor_id = auth.uid())
  );
