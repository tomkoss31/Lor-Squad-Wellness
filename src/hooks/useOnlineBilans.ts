// =============================================================================
// useOnlineBilans — hook de lecture/écriture des Leads bilan online.
// Chantier #1 étape 1.6 (2026-05-17).
//
// La RLS filtre déjà : admin/referent voient tout, distributor voit ses
// propres Leads (coach_user_id = auth.uid() OU assigned_to_user_id).
// Refetch sur window focus pour rester frais. Pas de realtime V1.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export type LeadStatus =
  | "new"
  | "contact"
  | "qualified"
  | "to_recontact"
  | "relance"
  | "lost";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Nouveaux",
  contact: "Contactés",
  qualified: "Qualifiés",
  to_recontact: "À recontacter",
  relance: "En relance",
  lost: "Perdus",
};

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contact",
  "qualified",
  "to_recontact",
  "relance",
  "lost",
];

export interface OnlineBilanRow {
  id: string;
  coach_user_id: string | null;
  coach_slug: string | null;
  first_name: string;
  age: number | null;
  height_cm: number | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  objectives: string[];
  weight_loss_target_kg: number | null;
  current_weight_kg: number | null;
  motivation_score: number | null;
  payload: Record<string, unknown>;
  lead_status: LeadStatus;
  converted_to_client_id: string | null;
  converted_at: string | null;
  assigned_to_user_id: string | null;
  notes: string | null;
  contacted_at: string | null;
  relance_due_at: string | null;
  relance_done_at: string | null;
  created_at: string;
  updated_at: string;
}

interface UseOnlineBilansResult {
  bilans: OnlineBilanRow[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateStatus: (id: string, status: LeadStatus) => Promise<void>;
  updateNotes: (id: string, notes: string) => Promise<void>;
  deleteBilan: (id: string) => Promise<void>;
  /** Chantier #3 (2026-06-03) : marque un lead converti en fiche client.
   *  Renseigne converted_to_client_id + converted_at + lead_status='qualified'
   *  + clôt la relance. La création de la fiche elle-même se fait via
   *  AppContext.createClientWithInitialAssessment (côté LeadConvertModal). */
  convertLead: (id: string, clientId: string) => Promise<void>;
}

export function useOnlineBilans(): UseOnlineBilansResult {
  const [bilans, setBilans] = useState<OnlineBilanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Supabase indisponible");
      const { data, error: err } = await sb
        .from("online_bilans")
        .select("*")
        .order("created_at", { ascending: false });
      if (err) throw err;
      setBilans((data ?? []) as OnlineBilanRow[]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Refetch on window focus pour rester frais après nouveau Lead
  useEffect(() => {
    const handler = () => void fetchAll();
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, [fetchAll]);

  const updateStatus = useCallback(async (id: string, status: LeadStatus) => {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const now = new Date();
    const patch: Record<string, unknown> = { lead_status: status };
    if (status === "contact") {
      patch.contacted_at = now.toISOString();
      // Étape 1.9 : auto-relance J+3 sur passage en contact
      patch.relance_due_at = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
      patch.relance_done_at = null;
    }
    if (status === "relance" || status === "qualified" || status === "lost") {
      // Étape 1.9 : marque la relance comme traitée
      patch.relance_done_at = now.toISOString();
    }
    const { error: err } = await sb
      .from("online_bilans")
      .update(patch)
      .eq("id", id);
    if (err) throw err;
    // Optimistic update local
    setBilans((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, lead_status: status, ...(patch as Partial<OnlineBilanRow>) }
          : b,
      ),
    );
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const { error: err } = await sb
      .from("online_bilans")
      .update({ notes })
      .eq("id", id);
    if (err) throw err;
    setBilans((prev) =>
      prev.map((b) => (b.id === id ? { ...b, notes } : b)),
    );
  }, []);

  const deleteBilan = useCallback(async (id: string) => {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    // RLS : DELETE est admin only côté DB (cf. migration 20261109000000_online_bilans.sql).
    // Si l'utilisateur n'est pas admin, l'appel échoue silencieusement (0 rows) côté Postgres.
    const { error: err } = await sb
      .from("online_bilans")
      .delete()
      .eq("id", id);
    if (err) throw err;
    setBilans((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const convertLead = useCallback(async (id: string, clientId: string) => {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = {
      converted_to_client_id: clientId,
      converted_at: now,
      lead_status: "qualified" as LeadStatus,
      // La conversion clôt aussi toute relance en attente.
      relance_done_at: now,
    };
    const { error: err } = await sb
      .from("online_bilans")
      .update(patch)
      .eq("id", id);
    if (err) throw err;
    setBilans((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, ...(patch as Partial<OnlineBilanRow>) } : b,
      ),
    );
  }, []);

  return { bilans, loading, error, refetch: fetchAll, updateStatus, updateNotes, deleteBilan, convertLead };
}
