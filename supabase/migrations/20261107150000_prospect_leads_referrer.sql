-- =============================================================================
-- V2 funnel business : tracking referrer sur prospect_leads (chantier 2026-11-07)
-- =============================================================================
--
-- Quand un coach partage le lien /opportunite?ref=[user_id], on veut savoir
-- combien de prospects ont vu sa page et combien ont rempli le form. C'est
-- la base des stats Co-pilote "X prospects vus, Y forms remplis ce mois".
--
-- - Ajout colonne referrer_user_id : qui a partage le lien (peut etre NULL)
-- - Ajout colonne metadata jsonb : pour stocker plan calcule depuis simulateur
-- - RPC get_referrer_stats(user_id, month) : compte les leads attribues
--   au coach pour le mois courant
-- =============================================================================

ALTER TABLE public.prospect_leads
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NULL;

COMMENT ON COLUMN public.prospect_leads.referrer_user_id IS
  'V2 funnel business 2026-11-07 : ID du distri qui a partage le lien
  /opportunite?ref=... ou /simulateur?ref=...';

COMMENT ON COLUMN public.prospect_leads.metadata IS
  'V2 funnel business 2026-11-07 : data libre (ex : plan simulateur calcule
  { target_euros, target_months, clients_needed, target_tier }).';

CREATE INDEX IF NOT EXISTS idx_prospect_leads_referrer_created
  ON public.prospect_leads(referrer_user_id, created_at DESC)
  WHERE referrer_user_id IS NOT NULL;

-- ─── RPC stats : combien de leads ce mois pour un referrer ─────────────────
CREATE OR REPLACE FUNCTION public.get_referrer_stats(
  p_user_id uuid,
  p_month_start timestamptz DEFAULT date_trunc('month', now())
)
RETURNS TABLE (
  leads_total int,
  leads_new int,
  leads_contacted int,
  leads_converted int,
  leads_lost int,
  source_opportunite int,
  source_simulateur int,
  source_other int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_month_end timestamptz := p_month_start + INTERVAL '1 month';
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Auto-stats : on lit ses propres stats ; admin lit n'importe qui
  IF v_caller <> p_user_id AND
     NOT EXISTS (SELECT 1 FROM public.users WHERE id = v_caller AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized to read other user stats';
  END IF;

  RETURN QUERY
  SELECT
    COUNT(*)::int,
    COUNT(*) FILTER (WHERE status = 'new')::int,
    COUNT(*) FILTER (WHERE status = 'contacted')::int,
    COUNT(*) FILTER (WHERE status = 'converted')::int,
    COUNT(*) FILTER (WHERE status = 'lost')::int,
    COUNT(*) FILTER (WHERE source = 'opportunite')::int,
    COUNT(*) FILTER (WHERE source = 'simulateur')::int,
    COUNT(*) FILTER (WHERE source NOT IN ('opportunite', 'simulateur') OR source IS NULL)::int
  FROM public.prospect_leads
  WHERE referrer_user_id = p_user_id
    AND created_at >= p_month_start
    AND created_at < v_month_end;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_referrer_stats(uuid, timestamptz) TO authenticated;
