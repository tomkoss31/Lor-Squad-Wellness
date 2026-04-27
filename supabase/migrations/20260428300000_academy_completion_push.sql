-- =============================================================================
-- Chantier Academy direction 9 (2026-04-28)
--
-- Trigger AFTER UPDATE sur user_tour_progress qui detecte la transition
-- "completed" sur l Academy (tour_key='academy', old.completed_at NULL
-- -> new.completed_at NOT NULL) et envoie une push notification au
-- coach referent du user qui vient de finir.
--
-- Pattern aligne sur trg_notify_new_client_message (chantier 2026-04-21) :
--   - SECURITY DEFINER, pg_net fire-and-forget, exception catch silent.
--   - Appelle l Edge Function send-push existante avec :
--       user_id : id du coach referent (target de la notif)
--       title : '🎓 Academy complétée !'
--       body : '<Prenom> a terminé l Academy Lor''Squad.'
--       url : /academy (pour que le coach voie son leaderboard)
--       type : 'academy_completed'
--
-- Si le user n a pas de coach_referent_user_id renseigne, le trigger
-- ne fait rien (skip silencieux).
-- =============================================================================

begin;

create or replace function public.notify_academy_completion()
returns trigger
language plpgsql
security definer
as $$
declare
  target_url text;
  service_key text;
  coach_id uuid;
  finisher_name text;
  finisher_first_name text;
begin
  -- Filtre : seulement transitions completion sur tour academy.
  if NEW.tour_key <> 'academy' then return NEW; end if;
  if NEW.completed_at is null then return NEW; end if;
  if OLD.completed_at is not null then return NEW; end if;

  -- Lookup coach referent + nom du user qui finit
  select u.coach_referent_user_id, u.name
    into coach_id, finisher_name
  from public.users u
  where u.id = NEW.user_id;

  if coach_id is null then
    raise notice 'notify_academy_completion: pas de coach referent pour user %', NEW.user_id;
    return NEW;
  end if;

  finisher_first_name := split_part(coalesce(finisher_name, 'Un distri'), ' ', 1);

  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';
  service_key := current_setting('app.settings.service_role_key', true);

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object(
      'user_id', coach_id,
      'title', '🎓 Academy complétée !',
      'body', finisher_first_name || ' a terminé l''Academy Lor''Squad.',
      'url', '/team',
      'type', 'academy_completed'
    ),
    timeout_milliseconds := 5000
  );
  return NEW;
exception when others then
  raise notice 'notify_academy_completion exception : %', SQLERRM;
  return NEW;
end;
$$;

drop trigger if exists trg_notify_academy_completion on public.user_tour_progress;
create trigger trg_notify_academy_completion
  after update on public.user_tour_progress
  for each row
  execute function public.notify_academy_completion();

comment on function public.notify_academy_completion() is
  'Direction 9 (2026-04-28) : push notif au coach referent quand un distri finit l Academy. Fire-and-forget via pg_net + Edge Function send-push.';

commit;
