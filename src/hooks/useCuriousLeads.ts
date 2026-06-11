// =============================================================================
// useCuriousLeads — section « Curieux » du CRM (ONLINE-B, 2026-06-10).
//
// Un « Curieux » = prospect qui a validé l'étape 1 du bilan online (prénom +
// contact) mais n'a jamais terminé (online_bilans.completed_at IS NULL).
// Objectif Thomas : mesurer le TAUX DE COMPLÉTION (commencé vs fini) et pouvoir
// relancer ces tièdes — sans surcharger le pipeline qualifié.
//
// RLS filtre par coach (admin voit tout). Léger : 1 fetch des drafts + 1 count
// des bilans complétés pour le taux.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface CuriousLead {
  id: string;
  firstName: string;
  contact: string | null;
  contactIsPhone: boolean;
  city: string | null;
  lastStep: number | null;
  createdAt: string;
}

function looksLikePhone(v: string | null | undefined): boolean {
  if (!v) return false;
  return v.replace(/\D/g, "").length >= 6 && !v.includes("@");
}

export function useCuriousLeads() {
  const [curious, setCurious] = useState<CuriousLead[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const [draftsRes, completedRes] = await Promise.all([
        sb
          .from("online_bilans")
          .select("id, first_name, phone, email, city, last_step, created_at")
          .is("completed_at", null)
          .order("created_at", { ascending: false })
          .limit(300),
        sb
          .from("online_bilans")
          .select("id", { count: "exact", head: true })
          .not("completed_at", "is", null),
      ]);

      setCompletedCount(completedRes.count ?? 0);
      setCurious(
        (draftsRes.data ?? []).map((r) => {
          const contact = (r.phone as string | null) || (r.email as string | null) || null;
          return {
            id: r.id as string,
            firstName: (r.first_name as string) || "—",
            contact,
            contactIsPhone: looksLikePhone(r.phone as string | null),
            city: (r.city as string | null) ?? null,
            lastStep: (r.last_step as number | null) ?? null,
            createdAt: r.created_at as string,
          };
        }),
      );
    } catch {
      /* best-effort */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const completionRate = useMemo(() => {
    const started = completedCount + curious.length;
    return started > 0 ? completedCount / started : 0;
  }, [completedCount, curious.length]);

  return { curious, completedCount, completionRate, loading, refetch: fetchAll };
}
