-- =============================================================================
-- Chantier Notifications push (2026-04-21)
-- 3. Trigger AFTER INSERT sur client_messages → notif temps réel au coach
--
-- Tous les inserts dans client_messages viennent de clients (pages publiques
-- RecapPage / NewFollowUpPage / EvolutionReportPage qui récupèrent la saisie
-- du client puis l'enregistrent pour le coach). Donc pas besoin de filtrer
-- par sender — tout insert = message d'un client à notifier.
--
-- À EXÉCUTER DANS SUPABASE STUDIO → SQL EDITOR.
-- =============================================================================

create or replace function public.notify_new_client_message()
returns trigger
language plpgsql
security definer
as $$
declare
  target_url text;
begin
  -- Best-effort : on ne bloque jamais l'insert du message si l'appel HTTP
  -- échoue. pg_net fire-and-forget.
  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/new-message-notifier';

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'message_id', NEW.id,
      'client_id', NEW.client_id,
      'distributor_id', NEW.distributor_id
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  -- Log silencieux : on ne casse pas l'insert si pg_net plante.
  raise notice 'notify_new_client_message: %', SQLERRM;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_new_client_message on public.client_messages;
create trigger trg_notify_new_client_message
  after insert on public.client_messages
  for each row
  execute function public.notify_new_client_message();

comment on function public.notify_new_client_message() is
  'Chantier Notifs push (2026-04-21) : appelle l''Edge Function '
  'new-message-notifier via pg_net à chaque nouveau message client. '
  'Fire-and-forget, l''échec HTTP ne bloque pas l''insert.';
