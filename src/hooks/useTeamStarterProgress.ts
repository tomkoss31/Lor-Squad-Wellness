// =============================================================================
// useTeamStarterProgress — progression « La Base Académie » (cockpit onboarding)
// par membre d'équipe, pour la grille Apprentissage (admin/référent).
//
// Lit distributor_starter_progress + users.starter_started_at (RLS : self +
// downline + admin) et calcule, par user, une vue parcours alignée sur le
// cockpit : états des 7 étapes, étape en cours, Jour X/90, phase, activé·e.
// Cf. cockpit useSalleOps / academyLessons. Léger, best-effort.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";

// Les 7 étapes Go Pro (mêmes clés/portes que useSalleOps).
const STEPS: { label: string; gates: string[] }[] = [
  { label: "S'équiper", gates: ["commande_250pv"] },
  { label: "Trouver", gates: ["liste_50"] },
  { label: "Inviter", gates: ["premiere_story"] },
  { label: "Présenter", gates: ["premier_bilan", "premier_hom", "premier_pv_pack"] },
  { label: "Relancer", gates: [] },
  { label: "Démarrer ta recrue", gates: [] },
  { label: "Dupliquer", gates: [] },
];
const GATE_KEYS = ["liste_50", "premiere_story", "premier_bilan", "premier_hom", "premier_pv_pack"];
const DAY_MS = 86_400_000;

export type AcademyStepState = "done" | "active" | "todo";

export interface MemberAcademy {
  started: boolean;
  activated: boolean;
  steps: AcademyStepState[];
  /** Nb d'étapes à portes franchies (sur 6 traçables). */
  doneCount: number;
  activeStepNumber: number;
  activeStepLabel: string;
  dayNumber: number;
  phaseLabel: string;
}

function computeMember(doneSet: Set<string>, startedAt: string | null): MemberAcademy {
  const stepDone = (i: number) => STEPS[i].gates.length > 0 && STEPS[i].gates.every((k) => doneSet.has(k));
  const activated = GATE_KEYS.every((k) => doneSet.has(k));
  const started = doneSet.size > 0 || Boolean(startedAt);

  let activeIndex = STEPS.findIndex((_, i) => !stepDone(i));
  if (activeIndex === -1) activeIndex = STEPS.length - 1;

  const steps: AcademyStepState[] = STEPS.map((_, i) =>
    stepDone(i) ? "done" : i === activeIndex ? "active" : "todo",
  );

  const doneCount = ["commande_250pv", ...GATE_KEYS].filter((k) => doneSet.has(k)).length;
  const bilanDone = doneSet.has("premier_bilan");
  const phaseLabel = activated ? "Profondeur" : bilanDone ? "Accélération" : "Allumage";

  let dayNumber = 0;
  if (startedAt) {
    const t = new Date(startedAt).getTime();
    if (!Number.isNaN(t)) dayNumber = Math.min(90, Math.max(1, Math.floor((Date.now() - t) / DAY_MS) + 1));
  }

  return {
    started,
    activated,
    steps,
    doneCount,
    activeStepNumber: activeIndex + 1,
    activeStepLabel: STEPS[activeIndex].label,
    dayNumber,
    phaseLabel,
  };
}

export function useTeamStarterProgress(): {
  byUser: Record<string, MemberAcademy>;
  loading: boolean;
  refetch: () => Promise<void>;
} {
  const [byUser, setByUser] = useState<Record<string, MemberAcademy>>({});
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setLoading(false);
        return;
      }
      const [progressRes, usersRes] = await Promise.all([
        sb.from("distributor_starter_progress").select("user_id, task_key, status"),
        sb.from("users").select("id, starter_started_at"),
      ]);

      const doneByUser: Record<string, Set<string>> = {};
      for (const row of (progressRes.data ?? []) as { user_id: string; task_key: string; status: string }[]) {
        if (row.status !== "done") continue;
        (doneByUser[row.user_id] ??= new Set()).add(row.task_key);
      }
      const startedAtByUser: Record<string, string | null> = {};
      for (const u of (usersRes.data ?? []) as { id: string; starter_started_at: string | null }[]) {
        startedAtByUser[u.id] = u.starter_started_at ?? null;
      }

      const ids = new Set([...Object.keys(doneByUser), ...Object.keys(startedAtByUser)]);
      const out: Record<string, MemberAcademy> = {};
      for (const uid of ids) {
        out[uid] = computeMember(doneByUser[uid] ?? new Set(), startedAtByUser[uid] ?? null);
      }
      setByUser(out);
    } catch {
      setByUser({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { byUser, loading, refetch: fetch };
}
