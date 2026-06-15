-- =============================================================================
-- Fix sécurité RLS : leak prospect_leads (2026-06-15)
--
-- Bug : la policy SELECT `prospect_leads_coach_admin_select` autorisait TOUT
-- distributeur/référent authentifié à lire TOUS les prospect_leads. Résultat :
-- un membre d'équipe (ex. Mandy, distributor sponsorisé par Thomas) voyait dans
-- le CRM TOUS les prospects de son upline. Fuite réelle de données (noms +
-- téléphones), pas seulement un filtre d'affichage.
--
-- Correctif : on calque EXACTEMENT le modèle déjà validé sur `online_bilans`
-- (migration 20261120200000) :
--   - admin       → voit tout
--   - referent    → ses leads (referrer/assigned) + ceux de sa downline directe
--   - distributor → uniquement ses leads (referrer_user_id / assigned_to_user_id)
--
-- Propriétaire d'un prospect_lead = referrer_user_id (distri qui a partagé le
-- lien) OU assigned_to_user_id (lead attribué manuellement). Un lead public
-- sans propriétaire (referrer NULL) reste visible UNIQUEMENT par l'admin, qui
-- peut alors l'attribuer — il n'est plus exposé à toute l'équipe.
--
-- Inserts publics (formulaires / edges service_role) : inchangés.
-- =============================================================================

begin;

-- ─── SELECT ─────────────────────────────────────────────────────────────────
drop policy if exists "prospect_leads_coach_admin_select" on public.prospect_leads;

create policy "prospect_leads_coach_admin_select"
  on public.prospect_leads
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
             -- Référent : ses leads + sa downline directe
             u.role = 'referent'
             and (
               prospect_leads.referrer_user_id = u.id
               or prospect_leads.assigned_to_user_id = u.id
               or prospect_leads.referrer_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
               or prospect_leads.assigned_to_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
             )
           )
           or (
             -- Distributeur : uniquement ses leads
             u.role = 'distributor'
             and (
               prospect_leads.referrer_user_id = u.id
               or prospect_leads.assigned_to_user_id = u.id
             )
           )
         )
    )
  );

-- ─── UPDATE (changement de statut depuis le CRM) ────────────────────────────
drop policy if exists "prospect_leads_coach_admin_update" on public.prospect_leads;

create policy "prospect_leads_coach_admin_update"
  on public.prospect_leads
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
               prospect_leads.referrer_user_id = u.id
               or prospect_leads.assigned_to_user_id = u.id
               or prospect_leads.referrer_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
               or prospect_leads.assigned_to_user_id in (
                 select sub.id from public.users sub
                  where sub.sponsor_id = u.id and sub.active = true
               )
             )
           )
           or (
             u.role = 'distributor'
             and (
               prospect_leads.referrer_user_id = u.id
               or prospect_leads.assigned_to_user_id = u.id
             )
           )
         )
    )
  );

commit;
