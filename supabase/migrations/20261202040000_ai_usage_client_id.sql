-- Noaly client_chat (2026-06-10) — colonne client_id sur ai_usage_log.
-- Les appels Noaly de la PWA client sont rattachés au client (clients.id,
-- text) et non à un user coach → permet le cap quotidien par client
-- (NOALY_CLIENT_DAILY_MSGS) et le suivi des coûts par origine.
-- Idempotent.

alter table public.ai_usage_log
  add column if not exists client_id text null;

create index if not exists ai_usage_log_client_idx
  on public.ai_usage_log (client_id, feature, created_at desc);

comment on column public.ai_usage_log.client_id is
  'Client PWA à l''origine de l''appel (feature client_chat) — clients.id (text).';
