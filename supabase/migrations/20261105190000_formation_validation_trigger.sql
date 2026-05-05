-- =============================================================================
-- Trigger AFTER UPDATE sur formation_user_progress -> notif sponsor (2026-05-05)
--
-- Quand le status d'une row passe a 'validated' (peu importe la
-- validation_path : auto / sponsor / admin_relay), on appelle l'Edge
-- Function formation-validation-notifier qui pousse une notif au sponsor
-- du filleul.
--
-- Conditions :
--   - OLD.status != 'validated' AND NEW.status = 'validated'
--   - C'est un AFTER UPDATE (pas INSERT), parce que la row est
--     d'abord cree avec status 'in_progress' puis mise a jour.
--
-- Etend aussi le check constraint de push_notifications_sent.entity_type
-- pour inclure les types manquants identifies dans l'audit precedent
-- (formation_validation, flex_*, coach_tip, formation_admin_relay).
-- =============================================================================

begin;

-- ─── 1. Étendre le check entity_type ──────────────────────────────────────
alter table public.push_notifications_sent
  drop constraint if exists push_notifications_sent_entity_type_check;

alter table public.push_notifications_sent
  add constraint push_notifications_sent_entity_type_check
  check (entity_type in (
    -- Types initiaux (2026-04-21)
    'followup',
    'prospect_meeting',
    'client_message',
    'morning_digest',
    -- Types ajoutes silencieusement par d'autres migrations (audit 2026-05-05)
    'coach_tip',
    'flex_evening_reminder',
    'flex_evening_late',
    'flex_weekly_recap',
    'formation_admin_relay',
    'formation_validation_pending',
    'formation_validation'  -- NOUVEAU : push sponsor quand filleul valide
  ));

-- ─── 2. Trigger function ──────────────────────────────────────────────────
create or replace function public.notify_formation_validation()
returns trigger
language plpgsql
security definer
as $$
declare
  target_url text;
begin
  -- On ne notifie que sur la transition vers 'validated'
  if NEW.status <> 'validated' then
    return NEW;
  end if;
  if OLD.status = 'validated' then
    -- Deja validee, c'est un update sur un autre champ (timestamp, etc.)
    return NEW;
  end if;

  target_url := current_setting('app.settings.supabase_url', true)
              || '/functions/v1/formation-validation-notifier';

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', NEW.user_id,
      'module_id', NEW.module_id,
      'validation_path', NEW.validation_path
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  -- Best-effort : on ne casse pas l'update si pg_net plante.
  raise notice 'notify_formation_validation: %', SQLERRM;
  return NEW;
end;
$$;

comment on function public.notify_formation_validation() is
  'Notifs push 2026-05-05 : appelle formation-validation-notifier via pg_net '
  'quand un filleul passe en status=validated. Fire-and-forget.';

drop trigger if exists trg_notify_formation_validation
  on public.formation_user_progress;

create trigger trg_notify_formation_validation
  after update on public.formation_user_progress
  for each row
  when (NEW.status = 'validated' and OLD.status is distinct from 'validated')
  execute function public.notify_formation_validation();

commit;
