-- =============================================================================
-- CRM — « Endormi » (archive) + suppression de leads (2026-06-14).
--
-- Décisions Thomas : les leads « endormis » sortent du kanban actif (vue archive
-- séparée, zéro relance) + suppression définitive admin.
--
-- Modèle : table d'archive ORTHOGONALE (flag table+id) → ne touche AUCUNE
-- contrainte CHECK des statuts sources, et un lead réveillé garde son statut.
--
-- ⚠️ INERTE jusqu'à `supabase db push`. Nouvelle table + 1 policy delete —
-- aucun impact sur les statuts/logique existants.
-- =============================================================================

begin;

create table if not exists public.crm_archived_leads (
  lead_table text not null,
  lead_id uuid not null,
  archived_at timestamptz not null default now(),
  archived_by uuid references public.users (id) on delete set null,
  primary key (lead_table, lead_id)
);

alter table public.crm_archived_leads enable row level security;

-- Le CRM est déjà réservé aux coachs (guard de route). Un coach connecté gère
-- l'archive (endormir / réveiller).
drop policy if exists "crm_archived_leads_auth_manage" on public.crm_archived_leads;
create policy "crm_archived_leads_auth_manage"
  on public.crm_archived_leads for all
  to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- Suppression définitive : online_bilans + prospect_leads ont déjà leur policy
-- delete admin ; client_referral_intentions est couvert par "intentions_coach_manage"
-- (for all). On ajoute la dernière manquante : client_referrals (admin only).
drop policy if exists "client_referrals_admin_delete" on public.client_referrals;
create policy "client_referrals_admin_delete"
  on public.client_referrals for delete
  to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role = 'admin'));

commit;
