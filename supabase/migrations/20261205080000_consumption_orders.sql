-- =============================================================================
-- consumption_orders — répertoire des ventes/consommations au comptoir
-- (chantier « panier conso » 2026-07-10).
-- =============================================================================
--
-- PROBLÈME : le mode « Client direct » du Panier (recordQuickSale) créait une
-- VRAIE fiche `clients` pour chaque passage comptoir → 100 distri × 3 clients/
-- mois = 300 fiches fantômes (sans bilan, sans poids) qui polluent /clients.
--
-- SOLUTION : une table dédiée, un simple RÉPERTOIRE de commandes daté, possédé
-- par le distributeur, filtrable par mois. AUCUNE ligne `clients`, AUCUN
-- `pv_client_products`. Nom du client = texte libre optionnel (« Marie D. »).
-- Les totaux € + PV remontent en rentabilité côté hook (aucune formule PV/
-- paliers touchée : on ne fait qu'additionner des € et des PV catalogue).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.consumption_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distributor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  distributor_name text NULL,
  customer_label text NULL,                        -- nom libre optionnel
  sale_date date NOT NULL DEFAULT current_date,    -- date de la commande (rétroactif)
  sale_type text NOT NULL DEFAULT 'comptoir' CHECK (sale_type IN ('comptoir', 'commande')),
  lines jsonb NOT NULL DEFAULT '[]'::jsonb,         -- [{product_id,name,quantity,pv_per_unit,price_per_unit}]
  total_price numeric NOT NULL DEFAULT 0 CHECK (total_price >= 0),
  total_pv numeric NOT NULL DEFAULT 0 CHECK (total_pv >= 0),
  note text NULL,
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.consumption_orders IS
  'Répertoire des ventes comptoir (panier conso). Owned par distributor_id. Zéro fiche clients.';

CREATE INDEX IF NOT EXISTS consumption_orders_distri_date_idx
  ON public.consumption_orders (distributor_id, sale_date DESC);

ALTER TABLE public.consumption_orders ENABLE ROW LEVEL SECURITY;

-- Lecture : le distributeur voit les siennes, l'admin voit tout.
DROP POLICY IF EXISTS consumption_orders_select ON public.consumption_orders;
CREATE POLICY consumption_orders_select ON public.consumption_orders
  FOR SELECT TO authenticated
  USING (
    distributor_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Écriture directe bloquée : tout passe par les RPC SECURITY DEFINER.
DROP POLICY IF EXISTS consumption_orders_no_direct_write ON public.consumption_orders;
CREATE POLICY consumption_orders_no_direct_write ON public.consumption_orders
  FOR ALL TO authenticated
  USING (false)
  WITH CHECK (false);

-- ─── RPC: record_consumption_order ───────────────────────────────────────────
-- Enregistre une commande comptoir. Les totaux sont recalculés CÔTÉ SERVEUR à
-- partir de p_lines (jamais confiance au front). distributor = p_distributor_id
-- (ou l'appelant), et l'appelant doit être ce distributeur OU un admin.
CREATE OR REPLACE FUNCTION public.record_consumption_order(
  p_distributor_id uuid,
  p_customer_label text,
  p_sale_date date,
  p_sale_type text,
  p_lines jsonb,
  p_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_distri uuid := COALESCE(p_distributor_id, auth.uid());
  v_distri_name text;
  v_total_price numeric := 0;
  v_total_pv numeric := 0;
  v_id uuid;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  IF v_distri <> v_caller AND v_caller_role <> 'admin' THEN
    RAISE EXCEPTION 'Cannot record for another distributor';
  END IF;
  IF p_sale_type IS NOT NULL AND p_sale_type NOT IN ('comptoir', 'commande') THEN
    RAISE EXCEPTION 'p_sale_type must be comptoir or commande';
  END IF;
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'p_lines must be a non-empty array';
  END IF;

  -- Totaux serveur : Σ quantity × price / pv.
  SELECT
    COALESCE(SUM((l->>'quantity')::numeric * (l->>'price_per_unit')::numeric), 0),
    COALESCE(SUM((l->>'quantity')::numeric * (l->>'pv_per_unit')::numeric), 0)
  INTO v_total_price, v_total_pv
  FROM jsonb_array_elements(p_lines) AS l;

  SELECT name INTO v_distri_name FROM public.users WHERE id = v_distri;

  INSERT INTO public.consumption_orders (
    distributor_id, distributor_name, customer_label, sale_date, sale_type,
    lines, total_price, total_pv, note, created_by
  ) VALUES (
    v_distri, v_distri_name, NULLIF(TRIM(COALESCE(p_customer_label, '')), ''),
    COALESCE(p_sale_date, current_date),
    COALESCE(NULLIF(p_sale_type, ''), 'comptoir'),
    p_lines, v_total_price, v_total_pv, NULLIF(TRIM(COALESCE(p_note, '')), ''), v_caller
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_consumption_order(uuid, text, date, text, jsonb, text) TO authenticated;

-- ─── RPC: delete_consumption_order ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.delete_consumption_order(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_caller_role text;
  v_deleted int;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT role INTO v_caller_role FROM public.users WHERE id = v_caller;
  DELETE FROM public.consumption_orders
   WHERE id = p_id
     AND (distributor_id = v_caller OR v_caller_role = 'admin');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  IF v_deleted = 0 THEN
    RAISE EXCEPTION 'Order not found or not owned by caller';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_consumption_order(uuid) TO authenticated;
