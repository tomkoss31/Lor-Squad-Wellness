// =============================================================================
// useCoachRdvBookings — RDV réservés via le funnel public, côté coach.
// Chantier RDV V2 brique 4 (2026-06-14). Table rdv_bookings (RLS own-row).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface RdvBooking {
  id: string;
  first_name: string | null;
  contact: string | null;
  mode: "presentiel" | "visio";
  slot_start: string;
  slot_end: string;
  status: "requested" | "confirmed" | "canceled";
}

interface Result {
  bookings: RdvBooking[];
  loading: boolean;
  reload: () => Promise<void>;
  setStatus: (id: string, status: RdvBooking["status"]) => Promise<void>;
}

export function useCoachRdvBookings(coachUserId: string | null): Result {
  const [bookings, setBookings] = useState<RdvBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!coachUserId) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const sb = await getSupabaseClient();
    if (!sb) {
      setBookings([]);
      setLoading(false);
      return;
    }
    const { data, error } = await sb
      .from("rdv_bookings")
      .select("id, first_name, contact, mode, slot_start, slot_end, status")
      .eq("coach_user_id", coachUserId)
      .neq("status", "canceled")
      .gte("slot_start", new Date().toISOString())
      .order("slot_start", { ascending: true })
      .limit(50);
    if (error) {
      setBookings([]);
    } else {
      setBookings((data ?? []) as RdvBooking[]);
    }
    setLoading(false);
  }, [coachUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setStatus = useCallback(
    async (id: string, status: RdvBooking["status"]) => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { error } = await sb.from("rdv_bookings").update({ status }).eq("id", id);
      if (!error) {
        // Annulé → retiré de la liste ; confirmé → maj statut local.
        setBookings((prev) =>
          status === "canceled"
            ? prev.filter((b) => b.id !== id)
            : prev.map((b) => (b.id === id ? { ...b, status } : b)),
        );
      }
    },
    [],
  );

  return { bookings, loading, reload, setStatus };
}
