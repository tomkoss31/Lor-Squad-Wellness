-- =============================================================================
-- Confirmation client à la prise de RDV (2026-06-30).
-- Trigger AFTER INSERT sur follow_ups → edge rdv-confirm-client (pg_net),
-- 1 appel par nouveau RDV planifié. Fire-and-forget : l'échec HTTP ne bloque
-- jamais l'insert du follow_up. L'edge fait les garde-fous (email présent,
-- statut, date future). Pas de re-confirm sur reschedule (AFTER INSERT only).
--
-- Convention secrets = Vault (vault.decrypted_secrets), comme les crons RDV.
-- =============================================================================

create extension if not exists pg_net;

create or replace function public.notify_rdv_confirm_client()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/rdv-confirm-client',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := jsonb_build_object('follow_up_id', NEW.id),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice 'notify_rdv_confirm_client: %', SQLERRM;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_rdv_confirm_client on public.follow_ups;
create trigger trg_notify_rdv_confirm_client
  after insert on public.follow_ups
  for each row
  when (NEW.status = 'scheduled' and NEW.due_date is not null and NEW.client_id is not null)
  execute function public.notify_rdv_confirm_client();

comment on function public.notify_rdv_confirm_client() is
  'Confirmation client à la prise de RDV (2026-06-30) : appelle l''edge '
  'rdv-confirm-client via pg_net à chaque nouveau follow_up planifié. '
  'Fire-and-forget, l''échec HTTP ne bloque pas l''insert.';
