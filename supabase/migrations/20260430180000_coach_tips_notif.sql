-- =============================================================================
-- Coach tips notif push (2026-04-30)
--
-- 1. users.notif_coach_tips : opt-in pour la push "Tip du jour" matin 8h.
--    Default true (cohérent avec notif_morning_digest etc.).
-- 2. push_notifications_sent.entity_type : ajoute 'coach_tip' a la check
--    constraint pour permettre la dedup quotidienne.
-- =============================================================================

begin;

-- ─── 1. Colonne preference user ─────────────────────────────────────────────
alter table public.users
  add column if not exists notif_coach_tips boolean not null default true;

comment on column public.users.notif_coach_tips is
  'Recevoir push "Tip du jour" matin 8h selon signaux faibles (PV retard, '
  'anniv client, 0 RDV, client en pause). Default true.';

-- ─── 2. Extension entity_type constraint ────────────────────────────────────
-- L'ancien check liste : followup, prospect_meeting, client_message, morning_digest
-- On ajoute 'coach_tip' pour la dedup 1/jour/user.
alter table public.push_notifications_sent
  drop constraint if exists push_notifications_sent_entity_type_check;

alter table public.push_notifications_sent
  add constraint push_notifications_sent_entity_type_check
  check (entity_type in (
    'followup',
    'prospect_meeting',
    'client_message',
    'morning_digest',
    'coach_tip'
  ));

commit;
