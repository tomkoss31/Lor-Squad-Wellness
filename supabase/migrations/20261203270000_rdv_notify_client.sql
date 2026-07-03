-- =============================================================================
-- RDV : opt-out notification client (2026-07-03) — « façon Square ».
--
-- Demande Thomas : pouvoir modifier/déplacer un RDV EN SILENCE (RDV en attente
-- qui ne démarre pas, RDV réajusté) sans que le client reçoive de mail de
-- confirmation NI de rappel. Cas Jessie.
--
-- `notify_client` (défaut true = comportement actuel). false = aucune notif
-- client pour ce RDV (ni confirmation, ni rappel veille/2h).
-- =============================================================================

alter table public.follow_ups
  add column if not exists notify_client boolean not null default true;

-- Le trigger de confirmation respecte le flag.
create or replace function public.notify_rdv_confirm_client()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status not in ('completed', 'dismissed', 'inactive')
     and coalesce(NEW.notify_client, true)
     and NEW.due_date is not null and NEW.client_id is not null then
    if TG_OP = 'INSERT'
       or (TG_OP = 'UPDATE' and NEW.due_date is distinct from OLD.due_date) then
      perform net.http_post(
        url := 'https://gqxnndwrdbghxflwmfxy.supabase.co/functions/v1/rdv-confirm-client',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
        ),
        body := jsonb_build_object('follow_up_id', NEW.id),
        timeout_milliseconds := 5000
      );
    end if;
  end if;
  return NEW;
exception when others then
  raise notice 'notify_rdv_confirm_client: %', SQLERRM;
  return NEW;
end;
$$;
