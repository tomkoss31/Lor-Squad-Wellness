-- =============================================================================
-- Fix confirmation client (2026-06-30) : la prise de RDV depuis la fiche client
-- (updateSupabaseClientSchedule) fait un UPDATE de follow_ups, pas un INSERT —
-- l'ancien trigger AFTER INSERT ne se déclenchait jamais dans ce cas.
--
-- Nouveau : AFTER INSERT OR UPDATE. La logique est dans la fonction (TG_OP)
-- pour pouvoir comparer OLD.due_date sans casser le cas INSERT :
--   • INSERT  : nouveau RDV planifié          → envoie
--   • UPDATE  : date posée OU changée (reschedule) → envoie (re-confirme)
--   • UPDATE sans changement de date          → rien (pas de spam)
-- =============================================================================

create or replace function public.notify_rdv_confirm_client()
returns trigger
language plpgsql
security definer
as $$
begin
  if NEW.status = 'scheduled' and NEW.due_date is not null and NEW.client_id is not null then
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

drop trigger if exists trg_notify_rdv_confirm_client on public.follow_ups;
create trigger trg_notify_rdv_confirm_client
  after insert or update on public.follow_ups
  for each row
  execute function public.notify_rdv_confirm_client();
