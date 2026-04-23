// Chantier Module Mensurations (2026-04-24).
// Hook fetch + mutation session de mesures. Agrège les saisies d'une
// "session en cours" (drafts locaux) avant de les committer en 1 row.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import type { MeasurementKey } from "../../../data/measurementGuides";
import type { ClientMeasurement } from "../../../lib/measurementCalculations";

export interface UseMeasurementsResult {
  sessions: ClientMeasurement[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Save en mode "append 1 session" — 1 row pour toutes les valeurs fournies */
  saveSession: (
    clientId: string,
    values: Partial<Record<MeasurementKey, number | null>>,
    authorType: "coach" | "client",
    authorUserId: string | null,
    notes?: string,
  ) => Promise<void>;
}

export function useMeasurements(clientId: string | null): UseMeasurementsResult {
  const [sessions, setSessions] = useState<ClientMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!clientId) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setSessions([]);
        setLoading(false);
        return;
      }
      const { data, error: err } = await sb
        .from("client_measurements")
        .select("*")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: false });
      if (err) throw err;
      setSessions((data ?? []) as ClientMeasurement[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSession = useCallback<UseMeasurementsResult["saveSession"]>(
    async (cId, values, authorType, authorUserId, notes) => {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible.");
      // Nettoyage : on n'envoie QUE les clés fournies non-null
      const payload: Record<string, unknown> = {
        client_id: cId,
        measured_by_type: authorType,
        measured_by_user_id: authorUserId,
        notes: notes ?? null,
      };
      for (const [k, v] of Object.entries(values)) {
        if (v != null) payload[k] = v;
      }
      const { error: err } = await sb.from("client_measurements").insert(payload);
      if (err) throw err;
      await refresh();
    },
    [refresh],
  );

  return { sessions, loading, error, refresh, saveSession };
}
