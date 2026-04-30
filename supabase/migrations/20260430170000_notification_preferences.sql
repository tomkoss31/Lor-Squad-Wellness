-- =============================================================================
-- Notification preferences (2026-04-30)
--
-- Stocke les preferences notif de chaque user pour eviter le spam :
--   - notif_messages : recevoir notifs nouveau message client (bool)
--   - notif_rdv_imminent : recevoir notifs RDV imminent (bool)
--   - notif_morning_digest : recevoir digest matin a 7h (bool)
--   - notif_quiet_hours : mode silencieux 22h-7h (bool)
--   - notif_message_batching_min : si > 0, batcher les notifs message
--     dans une fenetre de N min (1 push pour 'X nouveaux messages')
--
-- Defaults raisonnables : tout actif, batching 5 min.
-- =============================================================================

begin;

alter table public.users
  add column if not exists notif_messages boolean not null default true,
  add column if not exists notif_rdv_imminent boolean not null default true,
  add column if not exists notif_morning_digest boolean not null default true,
  add column if not exists notif_quiet_hours boolean not null default false,
  add column if not exists notif_message_batching_min integer not null default 5;

-- Constraint : batching entre 0 et 30 min
alter table public.users
  drop constraint if exists users_notif_batching_range;
alter table public.users
  add constraint users_notif_batching_range
  check (notif_message_batching_min >= 0 and notif_message_batching_min <= 30);

comment on column public.users.notif_messages is
  'Recevoir notifs push pour nouveaux messages clients (default true).';
comment on column public.users.notif_rdv_imminent is
  'Recevoir notifs push pour RDV imminent (default true).';
comment on column public.users.notif_morning_digest is
  'Recevoir digest matin 7h (default true).';
comment on column public.users.notif_quiet_hours is
  'Mode silencieux 22h-7h (default false).';
comment on column public.users.notif_message_batching_min is
  'Fenetre de batching messages en min (0 = pas de batch, default 5).';

commit;
