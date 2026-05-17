-- Chantier #1 Bilan Online — étape 1.9 (2026-05-17).
--
-- Ajoute les champs de relance auto-J+3 sur online_bilans. Au passage en
-- lead_status = 'contact', le front renseigne relance_due_at = now()+3j.
-- Une fois la relance traitée (status devient 'relance' ou 'qualified'),
-- relance_done_at est rempli côté front.
--
-- Pas d'insertion dans follow_ups : le schema follow_ups requiert
-- client_id (FK clients) qui n'existe pas pour un Lead avant conversion.
-- Garder la relance sur online_bilans est plus propre et évite une jointure.
--
-- Idempotent.

alter table public.online_bilans
  add column if not exists relance_due_at timestamptz,
  add column if not exists relance_done_at timestamptz;

-- Index pour la liste des relances dues (cron + UI badge)
create index if not exists idx_online_bilans_relance_due
  on public.online_bilans(relance_due_at)
  where relance_done_at is null and relance_due_at is not null;

comment on column public.online_bilans.relance_due_at is
  'Étape 1.9 chantier #1 : moment où le coach doit relancer le Lead. Renseigné automatiquement à +3j quand le statut passe en contact.';
comment on column public.online_bilans.relance_done_at is
  'Étape 1.9 chantier #1 : moment où la relance a été traitée (statut passe en relance/qualified/lost).';
