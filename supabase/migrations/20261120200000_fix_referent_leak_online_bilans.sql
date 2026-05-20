-- =============================================================================
-- Fix sécurité : leak online_bilans pour le rôle referent (2026-05-20)
--
-- Bug : la policy SELECT actuelle laisse les referent voir TOUS les leads
-- (au même titre que les admin). C'est trop permissif. Un referent doit
-- voir uniquement :
--   1. Ses propres leads (coach_user_id = auth.uid() OR assigned_to_user_id)
--   2. Les leads de sa downline directe (sponsor_id = referent.id)
--
-- Cas Mandy : referent avec sponsor_id Thomas. Avant ce fix, Mandy voyait
-- les leads de Thomas. Après : Mandy voit ses leads + ceux de ses propres
-- distri sponsorés.
--
-- Pareil pour UPDATE.
-- =============================================================================

begin;

-- ─── SELECT ─────────────────────────────────────────────────────────────────
drop policy if exists "online_bilans_coach_admin_select" on public.online_bilans;

create policy "online_bilans_coach_admin_select"
  on public.online_bilans
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
       where u.id = auth.uid()
         and u.active = true
         and (
           -- Admin voit tout
           u.role = 'admin'
           or (
             -- Referent : ses leads + sa downline
             u.role = 'referent'
             and (
               online_bilans.coach_user_id = u.id
               or online_bilans.assigned_to_user_id = u.id
               or online_bilans.coach_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
               or online_bilans.assigned_to_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
             )
           )
           or (
             -- Distributor : uniquement ses leads
             u.role = 'distributor'
             and (
               online_bilans.coach_user_id = u.id
               or online_bilans.assigned_to_user_id = u.id
             )
           )
         )
    )
  );

-- ─── UPDATE ─────────────────────────────────────────────────────────────────
drop policy if exists "online_bilans_coach_admin_update" on public.online_bilans;

create policy "online_bilans_coach_admin_update"
  on public.online_bilans
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
       where u.id = auth.uid()
         and u.active = true
         and (
           u.role = 'admin'
           or (
             u.role = 'referent'
             and (
               online_bilans.coach_user_id = u.id
               or online_bilans.assigned_to_user_id = u.id
               or online_bilans.coach_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
               or online_bilans.assigned_to_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
             )
           )
           or (
             u.role = 'distributor'
             and (
               online_bilans.coach_user_id = u.id
               or online_bilans.assigned_to_user_id = u.id
             )
           )
         )
    )
  );

commit;
