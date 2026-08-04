// =============================================================================
// useStarterPlan — état du « Démarrage 30 jours » du distributeur courant.
// Chantier Moteur d'équipe PR1 (2026-06-27).
//
// Lit distributor_starter_progress (RLS : self + downline + admin) + le flag
// users.activated_at, et expose un `mark()` qui passe par le RPC SECURITY
// DEFINER `mark_starter_task` (écriture self-only + recalcul activation).
//
// Silent-fail si la migration n'est pas encore appliquée (table absente), pour
// ne pas casser l'app — comme useDailyActionChecklist.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import {
  STARTER_TASKS,
  STARTER_ACTIVATION_KEYS,
  type StarterTask,
} from "../data/starterPlan";

export type StarterStatus = "pending" | "done" | "skipped";

export interface StarterTaskState extends StarterTask {
  status: StarterStatus;
}

interface UseStarterPlanResult {
  tasks: StarterTaskState[];
  /** État brut par clé (inclut les clés HORS STARTER_TASKS, ex. setup
      `commande_250pv` du cockpit). Source de vérité pour useSalleOps. */
  statuses: Record<string, StarterStatus>;
  doneCount: number;
  total: number;
  /** Tâches-portes cochées / total des portes. */
  gateDone: number;
  gateTotal: number;
  /** Date d'activation (recrue activée) ou null. */
  activatedAt: string | null;
  /** Ancre Jour 0 (date de sponsoring) ou null. */
  starterStartedAt: string | null;
  loading: boolean;
  /** Nombre de gestes accomplis par tâche à preuve chiffrée (meta.count). */
  counts: Record<string, number>;
  /** Incrémente la preuve chiffrée d'une étape (« +1 relance »). */
  bump: (taskKey: string, target: number) => Promise<void>;
  /** Coche / décoche une tâche (toggle done ↔ pending). */
  toggle: (taskKey: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useStarterPlan(): UseStarterPlanResult {
  const { currentUser } = useAppContext();
  const [statuses, setStatuses] = useState<Record<string, StarterStatus>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [starterStartedAt, setStarterStartedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const [progressRes, userRes] = await Promise.all([
        sb
          .from("distributor_starter_progress")
          .select("task_key, status, meta")
          .eq("user_id", currentUser.id),
        sb.from("users").select("activated_at, starter_started_at").eq("id", currentUser.id).single(),
      ]);

      if (!progressRes.error) {
        const next: Record<string, StarterStatus> = {};
        for (const row of progressRes.data ?? []) {
          next[row.task_key as string] = row.status as StarterStatus;
        }
        setStatuses(next);
      }
      if (!userRes.error && userRes.data) {
        const u = userRes.data as { activated_at: string | null; starter_started_at: string | null };
        setActivatedAt(u.activated_at ?? null);
        setStarterStartedAt(u.starter_started_at ?? null);
      }
    } catch {
      // Silent fail (migration peut ne pas être appliquée)
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const toggle = useCallback(
    async (taskKey: string) => {
      if (!currentUser?.id) return;
      const current = statuses[taskKey] ?? "pending";
      const nextStatus: StarterStatus = current === "done" ? "pending" : "done";
      // Optimiste
      setStatuses((s) => ({ ...s, [taskKey]: nextStatus }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        // Portes d'activation décidées CÔTÉ SERVEUR (le front n'envoie plus la liste).
        const { data, error } = await sb.rpc("mark_starter_task", {
          p_task_key: taskKey,
          p_status: nextStatus,
        });
        if (!error) {
          // Le RPC renvoie users.activated_at (timestamptz ou null).
          setActivatedAt((data as string | null) ?? null);
        }
      } catch {
        // Silent fail — rollback léger : on refetch pour resynchroniser
        void refetch();
      }
    },
    [currentUser?.id, statuses, refetch],
  );

  /**
   * Incrémente la preuve chiffrée d'une étape (« +1 relance envoyée »).
   * Le serveur borne à la cible et bascule la tâche en 'done' à l'arrivée —
   * c'est ce qui permet à « Relancer » de se terminer, alors qu'elle n'avait
   * aucune condition de sortie avant le 2026-08-04.
   */
  const bump = useCallback(
    async (taskKey: string, target: number) => {
      if (!currentUser?.id) return;
      // Optimiste : on avance tout de suite, le serveur borne de toute façon.
      setCounts((c) => ({ ...c, [taskKey]: Math.min(target, (c[taskKey] ?? 0) + 1) }));
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("bump_starter_counter", {
          p_task_key: taskKey,
          p_target: target,
        });
        if (error) throw error;
        const res = data as { count?: number; status?: string } | null;
        if (res) {
          setCounts((c) => ({ ...c, [taskKey]: Number(res.count ?? 0) }));
          if (res.status === "done") {
            setStatuses((s) => ({ ...s, [taskKey]: "done" }));
          }
        }
      } catch {
        void refetch();
      }
    },
    [currentUser?.id, refetch],
  );

  const tasks = useMemo<StarterTaskState[]>(
    () =>
      STARTER_TASKS.map((t) => ({
        ...t,
        status: statuses[t.key] ?? "pending",
      })),
    [statuses],
  );

  const doneCount = useMemo(() => tasks.filter((t) => t.status === "done").length, [tasks]);
  const gateDone = useMemo(
    () => tasks.filter((t) => t.isActivationGate && t.status === "done").length,
    [tasks],
  );

  return {
    tasks,
    statuses,
    doneCount,
    total: STARTER_TASKS.length,
    gateDone,
    gateTotal: STARTER_ACTIVATION_KEYS.length,
    activatedAt,
    starterStartedAt,
    loading,
    counts,
    bump,
    toggle,
    refetch,
  };
}
