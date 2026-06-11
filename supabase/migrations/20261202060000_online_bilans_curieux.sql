-- Curieux (ONLINE-B, 2026-06-10) — capture des bilans COMMENCÉS mais pas finis.
-- Un « Curieux » = prospect qui a validé l'étape 1 (prénom + contact) mais n'a
-- pas soumis le bilan complet. Marqueur = completed_at IS NULL.
--   - draft (étape 1)  : insert avec completed_at = NULL + last_step.
--   - soumission finale : completed_at = now() (insert ou update du draft).
-- Le CRM exclut les drafts du pipeline qualifié (completed_at NOT NULL) et les
-- montre dans une section « Curieux » séparée + taux de complétion.
-- Idempotent.

alter table public.online_bilans
  add column if not exists completed_at timestamptz null,
  add column if not exists last_step smallint null;

-- Backfill : tous les bilans EXISTANTS sont des bilans complets → on les marque
-- terminés (sinon ils disparaîtraient du CRM, filtré sur completed_at).
update public.online_bilans
  set completed_at = created_at
  where completed_at is null;

create index if not exists online_bilans_completed_idx
  on public.online_bilans (completed_at, created_at desc);

comment on column public.online_bilans.completed_at is
  'Soumission complète (NULL = Curieux : a commencé étape 1 mais pas fini).';
