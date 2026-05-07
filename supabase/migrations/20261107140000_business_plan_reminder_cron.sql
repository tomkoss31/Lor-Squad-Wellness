-- =============================================================================
-- V3.5 funnel business : cron J+5 relance auto (chantier 2026-11-07)
-- =============================================================================
--
-- Quand un coach a envoye le plan d'opportunite (business_plan_sent_at != null)
-- depuis 5+ jours mais qu'il n'y a pas eu de RDV business planifie en suivi,
-- on push une notif relance au coach.
--
-- Cron quotidien a 09:00 Europe/Paris (08:00 UTC en hiver, 07:00 UTC en ete).
-- On choisit 09:00 UTC pour eviter les complications DST (toujours 10/11h Paris).
--
-- Anti-spam : le cron marque business_plan_reminder_sent_at apres avoir push.
-- Il ne push qu'une fois (pas de relance de relance).
-- =============================================================================

-- ─── Track quand on a deja push une relance ─────────────────────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_plan_reminder_sent_at timestamptz NULL;

COMMENT ON COLUMN public.clients.business_plan_reminder_sent_at IS
  'V3.5 funnel business 2026-11-07 : timestamp quand le cron J+5 a deja
  push une relance au coach. Anti-spam (1 relance maximum par client).';

-- ─── Fonction qui scan + push (executee par pg_cron) ────────────────────────
CREATE OR REPLACE FUNCTION public.cron_business_plan_reminder()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  target_url text;
BEGIN
  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';

  FOR rec IN
    SELECT
      c.id, c.first_name, c.distributor_id, c.business_interest_amount,
      c.business_plan_sent_at
    FROM public.clients c
    WHERE c.business_plan_sent_at IS NOT NULL
      AND c.business_plan_sent_at < now() - INTERVAL '5 days'
      AND c.business_plan_reminder_sent_at IS NULL  -- pas encore relance
      AND c.business_interest_amount > 0
      AND c.distributor_id IS NOT NULL
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := target_url,
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
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

      -- Marque comme relance pour ne pas re-push
      UPDATE public.clients
         SET business_plan_reminder_sent_at = now()
       WHERE id = rec.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'cron_business_plan_reminder error for client %: %', rec.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.cron_business_plan_reminder() IS
  'V3.5 funnel business 2026-11-07 : scan clients avec business_plan_sent_at
  > 5j et pas encore relance, push notif coach pour rappeler. 1 fois par client.';

-- ─── Schedule cron (09:00 UTC = 10/11h Paris) ───────────────────────────────
-- Necessite extension pg_cron activee dans le projet Supabase.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Unschedule si existe (idempotent)
    PERFORM cron.unschedule('business-plan-reminder')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'business-plan-reminder');
    -- Schedule daily at 09:00 UTC
    PERFORM cron.schedule(
      'business-plan-reminder',
      '0 9 * * *',
      $job$ SELECT public.cron_business_plan_reminder(); $job$
    );
    RAISE NOTICE 'Cron business-plan-reminder schedule a 09:00 UTC quotidien';
  ELSE
    RAISE NOTICE 'pg_cron pas active — exec manuelle requise via SELECT public.cron_business_plan_reminder()';
  END IF;
END $$;
