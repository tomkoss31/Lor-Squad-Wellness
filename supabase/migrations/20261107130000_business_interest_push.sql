-- =============================================================================
-- V3 funnel business : push notif coach quand bilan business_amount > 0
-- 2026-11-07
-- =============================================================================
--
-- Quand un client coche un montant complement de revenus > 0 dans son bilan
-- (etape BusinessAmbitionStep), le coach recoit une push notification immediate
-- pour pouvoir envoyer son plan d'opportunite (lien /opportunite).
--
-- Aussi : ajout colonne business_plan_sent_at pour tracker quand le coach a
-- envoye le plan (via le bouton "Envoyer le plan" dans la fiche client).
-- =============================================================================

-- ─── Track quand le coach a envoye le plan d'opportunite ───────────────────
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS business_plan_sent_at timestamptz NULL;

COMMENT ON COLUMN public.clients.business_plan_sent_at IS
  'V3 funnel business 2026-11-07 : timestamp quand le coach a envoye le plan
  /opportunite au client via WhatsApp/SMS/email. Utilise pour le cron J+5
  de relance auto (V3.5).';

-- ─── Trigger : push notif coach quand business_interest_amount passe de 0 a > 0 ─
CREATE OR REPLACE FUNCTION public.notify_business_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_url text;
  v_distributor_id uuid;
  v_first_name text;
  v_amount numeric;
BEGIN
  -- Trigger seulement si on PASSE de NULL/0 a une valeur > 0 (1ere coche)
  IF NEW.business_interest_amount IS NULL OR NEW.business_interest_amount <= 0 THEN
    RETURN NEW;
  END IF;
  IF OLD.business_interest_amount IS NOT NULL AND OLD.business_interest_amount > 0 THEN
    RETURN NEW;  -- deja notifie precedemment
  END IF;

  v_distributor_id := NEW.distributor_id;
  v_first_name := NEW.first_name;
  v_amount := NEW.business_interest_amount;

  IF v_distributor_id IS NULL OR v_first_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Best-effort : on ne bloque jamais l'update du client si l'appel HTTP echoue.
  target_url := current_setting('app.settings.supabase_url', true) || '/functions/v1/send-push';

  PERFORM net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true),
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
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'notify_business_interest error: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_business_interest ON public.clients;
CREATE TRIGGER trg_notify_business_interest
  AFTER UPDATE OF business_interest_amount ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_business_interest();

COMMENT ON FUNCTION public.notify_business_interest() IS
  'V3 funnel business 2026-11-07 : appelle send-push edge function quand
  business_interest_amount passe de NULL/0 a > 0. Fire-and-forget,
  l''echec HTTP ne bloque pas l''update.';

-- ─── RPC : marquer business_plan_sent_at = now() (appele par UI bouton) ────
CREATE OR REPLACE FUNCTION public.mark_business_plan_sent(p_client_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_distributor_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;

  -- Verif : caller doit etre admin ou le distributeur du client
  SELECT distributor_id INTO v_distributor_id FROM public.clients WHERE id = p_client_id;
  IF v_caller_role <> 'admin' AND v_distributor_id <> v_caller THEN
    RAISE EXCEPTION 'Not authorized for this client';
  END IF;

  UPDATE public.clients
     SET business_plan_sent_at = now()
   WHERE id = p_client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_business_plan_sent(text) TO authenticated;
