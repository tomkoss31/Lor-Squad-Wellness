// =============================================================================
// useCoachReminders — liste privée « à relancer » du coach (2026-06-30).
//
// In-app uniquement : lit/écrit la table coach_reminders (RLS self+admin).
// AUCUN email/push possible (table hors du circuit follow_ups). Silent-fail si
// la migration n'est pas appliquée.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";

export interface CoachReminder {
  id: string;
  coach_id: string;
  client_id: string | null;
  label: string | null;
  note: string | null;
  remind_on: string | null; // YYYY-MM-DD
  status: "pending" | "done";
  created_at: string;
  done_at: string | null;
}

export interface AddReminderInput {
  clientId?: string | null;
  label?: string | null;
  note?: string | null;
  remindOn?: string | null;
}

interface UseCoachRemindersResult {
  reminders: CoachReminder[];
  loading: boolean;
  add: (input: AddReminderInput) => Promise<boolean>;
  markDone: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

/** @param autoFetch passe false pour un usage « add seulement » (ex: bouton fiche). */
export function useCoachReminders(autoFetch = true): UseCoachRemindersResult {
  const { currentUser } = useAppContext();
  const [reminders, setReminders] = useState<CoachReminder[]>([]);
  const [loading, setLoading] = useState(autoFetch);

  const refetch = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const { data, error } = await sb
        .from("coach_reminders")
        .select("id, coach_id, client_id, label, note, remind_on, status, created_at, done_at")
        .eq("coach_id", currentUser.id)
        .eq("status", "pending")
        .order("remind_on", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!error && Array.isArray(data)) setReminders(data as CoachReminder[]);
    } catch {
      // Silent fail (migration peut ne pas être appliquée)
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (autoFetch) void refetch();
  }, [autoFetch, refetch]);

  const add = useCallback(
    async (input: AddReminderInput): Promise<boolean> => {
      if (!currentUser?.id) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb.from("coach_reminders").insert({
          coach_id: currentUser.id,
          client_id: input.clientId ?? null,
          label: input.label?.trim() ? input.label.trim() : null,
          note: input.note?.trim() ? input.note.trim() : null,
          remind_on: input.remindOn || null,
          status: "pending",
        });
        if (error) return false;
        if (autoFetch) await refetch();
        return true;
      } catch {
        return false;
      }
    },
    [currentUser?.id, autoFetch, refetch],
  );

  const markDone = useCallback(
    async (id: string) => {
      setReminders((r) => r.filter((x) => x.id !== id)); // optimiste
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb
          .from("coach_reminders")
          .update({ status: "done", done_at: new Date().toISOString() })
          .eq("id", id);
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  const remove = useCallback(
    async (id: string) => {
      setReminders((r) => r.filter((x) => x.id !== id)); // optimiste
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb.from("coach_reminders").delete().eq("id", id);
      } catch {
        void refetch();
      }
    },
    [refetch],
  );

  return { reminders, loading, add, markDone, remove, refetch };
}
