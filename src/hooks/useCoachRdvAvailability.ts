// =============================================================================
// useCoachRdvAvailability — lecture/écriture des disponibilités RDV du coach.
// Chantier RDV V2 (2026-06-14). Table coach_rdv_availability (RLS own-row).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

export interface RdvAvailabilitySlot {
  weekday: number; // 0=dimanche … 6=samedi (JS getDay)
  startMin: number;
  endMin: number;
}

interface Result {
  slots: RdvAvailabilitySlot[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  save: (next: RdvAvailabilitySlot[]) => Promise<boolean>;
  reload: () => Promise<void>;
}

export function useCoachRdvAvailability(coachUserId: string | null): Result {
  const [slots, setSlots] = useState<RdvAvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!coachUserId) {
      setSlots([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const sb = await getSupabaseClient();
    if (!sb) {
      setError("Connexion indisponible");
      setLoading(false);
      return;
    }
    const { data, error: e } = await sb
      .from("coach_rdv_availability")
      .select("weekday, start_min, end_min")
      .eq("coach_user_id", coachUserId)
      .order("weekday", { ascending: true });
    if (e) {
      setError(e.message);
      setSlots([]);
    } else {
      setSlots(
        ((data ?? []) as Array<{ weekday: number; start_min: number; end_min: number }>).map((r) => ({
          weekday: r.weekday,
          startMin: r.start_min,
          endMin: r.end_min,
        })),
      );
    }
    setLoading(false);
  }, [coachUserId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(
    async (next: RdvAvailabilitySlot[]): Promise<boolean> => {
      if (!coachUserId) return false;
      setSaving(true);
      setError(null);
      const sb = await getSupabaseClient();
      if (!sb) {
        setError("Connexion indisponible");
        setSaving(false);
        return false;
      }
      // Remplacement simple : on efface puis on réinsère (RLS = own-row).
      const del = await sb.from("coach_rdv_availability").delete().eq("coach_user_id", coachUserId);
      if (del.error) {
        setError(del.error.message);
        setSaving(false);
        return false;
      }
      if (next.length > 0) {
        const rows = next.map((s) => ({
          coach_user_id: coachUserId,
          weekday: s.weekday,
          start_min: s.startMin,
          end_min: s.endMin,
        }));
        const ins = await sb.from("coach_rdv_availability").insert(rows);
        if (ins.error) {
          setError(ins.error.message);
          setSaving(false);
          return false;
        }
      }
      setSlots(next);
      setSaving(false);
      return true;
    },
    [coachUserId],
  );

  return { slots, loading, saving, error, save, reload };
}
