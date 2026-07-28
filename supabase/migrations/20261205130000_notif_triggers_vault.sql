-- =============================================================================
-- Fix notifs push : 5 fonctions lisaient encore l'URL + service_role_key via
-- current_setting('app.settings.*') — VIDES en prod (Supabase refuse ALTER
-- DATABASE/ROLE SET, cf. mémo « Diag notifs push » 2026-06-03 : les CRONS ont
-- été migrés sur Vault, mais ces triggers ont été oubliés). Conséquence :
-- net.http_post partait vers une URL malformée → échec silencieux (exception
-- avalée) → l'edge n'était JAMAIS appelée → AUCUN push.
--
-- Symptôme signalé (2026-07-28) : un client ne reçoit rien quand le coach lui
-- répond dans la messagerie (notify_new_coach_message). Idem coach→client
-- (notify_new_client_message) et les 3 autres.
--
-- Fix : lire les secrets depuis Vault (vault.decrypted_secrets), comme les crons.
-- Logique métier INCHANGÉE — seuls les 2 current_setting(...) sont remplacés.
-- =============================================================================

-- 1. Client reçoit le message du coach (LE bug signalé)
create or replace function public.notify_new_coach_message()
returns trigger language plpgsql security definer as $fn$
declare
  target_url text;
begin
  if NEW.sender <> 'coach' then
    return NEW;
  end if;
  target_url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
              || '/functions/v1/new-coach-message-notifier';
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
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
  raise notice 'notify_new_coach_message: %', SQLERRM;
  return NEW;
end;
$fn$;

-- 2. Coach reçoit le message du client
create or replace function public.notify_new_client_message()
returns trigger language plpgsql security definer as $fn$
declare
  target_url text;
begin
  if NEW.sender <> 'client' then
    return NEW;
  end if;
  target_url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
              || '/functions/v1/new-message-notifier';
  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
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
  raise notice 'notify_new_client_message: %', SQLERRM;
  return NEW;
end;
$fn$;

-- 3. Coach notifié quand un client se déclare ouvert au business
create or replace function public.notify_business_interest()
returns trigger language plpgsql security definer as $fn$
declare
  target_url text;
  v_distributor_id uuid;
  v_first_name text;
  v_amount numeric;
begin
  if NEW.business_interest_amount is null or NEW.business_interest_amount <= 0 then
    return NEW;
  end if;
  if OLD.business_interest_amount is not null and OLD.business_interest_amount > 0 then
    return NEW;
  end if;

  v_distributor_id := NEW.distributor_id;
  v_first_name := NEW.first_name;
  v_amount := NEW.business_interest_amount;

  if v_distributor_id is null or v_first_name is null then
    return NEW;
  end if;

  target_url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
              || '/functions/v1/send-push';

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', v_distributor_id::text,
      'title', '🌟 ' || v_first_name || ' est ouvert·e au business',
      'body', '+' || v_amount || ' €/mois souhaités. Va lui envoyer ton plan d''opportunité.',
      'url', '/clients/' || NEW.id::text || '?tab=actions',
      'type', 'business_interest'
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice 'notify_business_interest error: %', SQLERRM;
  return NEW;
end;
$fn$;

-- 4. Notif admin quand un module de formation est validé
create or replace function public.notify_formation_validation()
returns trigger language plpgsql security definer as $fn$
declare
  target_url text;
begin
  if NEW.status <> 'validated' then
    return NEW;
  end if;
  if OLD.status = 'validated' then
    return NEW;
  end if;

  target_url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
              || '/functions/v1/formation-validation-notifier';

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
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
  raise notice 'notify_formation_validation: %', SQLERRM;
  return NEW;
end;
$fn$;

-- 5. Cron : relance plan business à J+5
create or replace function public.cron_business_plan_reminder()
returns void language plpgsql security definer set search_path to 'public' as $fn$
declare
  rec record;
  target_url text;
begin
  target_url := (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_url')
              || '/functions/v1/send-push';

  for rec in
    select c.id, c.first_name, c.distributor_id, c.business_interest_amount, c.business_plan_sent_at
    from public.clients c
    where c.business_plan_sent_at is not null
      and c.business_plan_sent_at < now() - interval '5 days'
      and c.business_plan_reminder_sent_at is null
      and c.business_interest_amount > 0
      and c.distributor_id is not null
  loop
    begin
      perform net.http_post(
        url := target_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_id', rec.distributor_id::text,
          'title', '⏰ Relance ' || rec.first_name || ' — plan envoye il y a 5 jours',
          'body', 'C''est le moment de la rappeler. Pas de RDV planifie en suivi business.',
          'url', '/clients/' || rec.id::text || '?tab=actions',
          'type', 'business_plan_reminder'
        ),
        timeout_milliseconds := 5000
      );
      update public.clients set business_plan_reminder_sent_at = now() where id = rec.id;
    exception when others then
      raise notice 'cron_business_plan_reminder error for client %: %', rec.id, SQLERRM;
    end;
  end loop;
end;
$fn$;
