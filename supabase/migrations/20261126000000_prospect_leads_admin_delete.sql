-- Chantier gestion leads (2026-06-03).
-- Ajoute une policy DELETE admin-only sur prospect_leads pour permettre de
-- supprimer les leads tombés / spam depuis l'onglet admin Leads.
--
-- Destructif → réservé au rôle admin (pas distributor/referent qui ont
-- seulement select/update).
--
-- Idempotent : ok à rejouer.

drop policy if exists "prospect_leads_admin_delete" on public.prospect_leads;
create policy "prospect_leads_admin_delete"
  on public.prospect_leads
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid()
        and u.active = true
        and u.role = 'admin'
    )
  );
