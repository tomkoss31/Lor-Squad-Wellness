-- =============================================================================
-- Fix confirmation client #2 (2026-06-30) : un follow-up de RDV peut être en
-- statut 'pending' (bilan qui ne démarre pas tout de suite) et pas 'scheduled'.
-- EditScheduleModal conserve le statut existant à la modif → le trigger
-- exigeant 'scheduled' ne se déclenchait pas.
--
-- Nouveau : on déclenche pour tout RDV à venir SAUF terminé/annulé/inactif.
-- =============================================================================

create or replace function public.notify_rdv_confirm_client()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status not in ('completed', 'dismissed', 'inactive')
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
