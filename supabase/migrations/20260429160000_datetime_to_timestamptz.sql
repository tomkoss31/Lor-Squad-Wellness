-- =============================================================================
-- Conversion timestamp -> timestamptz pour les colonnes RDV / suivis (2026-04-29)
--
-- Objectif : eliminer les decalages d heure observes entre coachs / clients
-- selon le navigateur. Aujourd hui les colonnes sont en `timestamp` (sans
-- timezone), Postgres les interprete comme heure locale serveur, le front
-- les lit comme UTC -> drift d 1-2h selon DST.
--
-- Strategie de conversion :
--   - Les valeurs existantes sont supposees representer une heure de Paris
--     (l app est utilisee uniquement en France pour l instant).
--   - On utilise `at time zone 'Europe/Paris'` pour gerer le DST proprement
--     (2h ete / 1h hiver) au lieu de hardcoder un offset.
--   - Pour les rows dont la valeur est juste une date (`YYYY-MM-DD` sans
--     heure), on prend 10:00 Paris comme heure par defaut (creneau RDV
--     typique matin).
--
-- Apres cette migration, le front continue a envoyer du ISO UTC (`Z`) via
-- `serializeDateTimeForStorage` -> Postgres convertit en timestamptz sans
-- perte. Plus de drift possible.
-- =============================================================================

begin;

-- ─── 1. clients.next_follow_up (snapshot du prochain RDV) ────────────────────
alter table public.clients
  alter column next_follow_up type timestamptz
  using
    case
      when next_follow_up is null then null
      when next_follow_up::text ~ '^\d{4}-\d{2}-\d{2}$'
        then ((next_follow_up::text || ' 10:00:00')::timestamp at time zone 'Europe/Paris')
      else (next_follow_up::timestamp at time zone 'Europe/Paris')
    end;

-- ─── 2. assessments.next_follow_up (date programmee a la creation du bilan) ──
alter table public.assessments
  alter column next_follow_up type timestamptz
  using
    case
      when next_follow_up is null then null
      when next_follow_up::text ~ '^\d{4}-\d{2}-\d{2}$'
        then ((next_follow_up::text || ' 10:00:00')::timestamp at time zone 'Europe/Paris')
      else (next_follow_up::timestamp at time zone 'Europe/Paris')
    end;

-- ─── 3. follow_ups.due_date (table source de verite des RDV) ─────────────────
alter table public.follow_ups
  alter column due_date type timestamptz
  using
    case
      when due_date is null then null
      when due_date::text ~ '^\d{4}-\d{2}-\d{2}$'
        then ((due_date::text || ' 10:00:00')::timestamp at time zone 'Europe/Paris')
      else (due_date::timestamp at time zone 'Europe/Paris')
    end;

comment on column public.clients.next_follow_up is
  'Snapshot timestamptz du prochain RDV. Source de verite : follow_ups.due_date. Migre depuis timestamp le 2026-04-29.';
comment on column public.assessments.next_follow_up is
  'Date programmee du suivi a la creation du bilan (timestamptz). Migre depuis timestamp le 2026-04-29.';
comment on column public.follow_ups.due_date is
  'Date du RDV en timestamptz. Migre depuis timestamp le 2026-04-29 (heure locale Paris preservee).';

commit;
