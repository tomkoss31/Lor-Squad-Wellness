// Chantier Tuto interactif client (2026-04-24).
// Hook qui lit/écrit l'état du tuto onboarding :
//   - localStorage d'abord (instantané, offline-safe)
//   - RPC Supabase en arrière-plan pour sync DB
//
// Le client_app_account garde la source de vérité côté serveur, mais le
// localStorage évite toute latence UI pour l'auto-launch.

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

const LS_PREFIX = "lorsquad-onboarding-";

export interface OnboardingState {
  completedAt: string | null;
  skippedAt: string | null;
  lastStep: number;
  loaded: boolean;
}

function readLocal(clientId: string): Partial<OnboardingState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(`${LS_PREFIX}${clientId}`);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<OnboardingState>;
  } catch {
    return {};
  }
}

function writeLocal(clientId: string, patch: Partial<OnboardingState>) {
  if (typeof window === "undefined") return;
  try {
    const current = readLocal(clientId);
    const next = { ...current, ...patch };
    window.localStorage.setItem(`${LS_PREFIX}${clientId}`, JSON.stringify(next));
  } catch {
    // quota / mode privé
  }
}

export function useOnboardingState({
  token,
  clientId,
}: {
  token: string | null;
  clientId: string;
}) {
  const [state, setState] = useState<OnboardingState>(() => {
    const local = readLocal(clientId);
    return {
      completedAt: local.completedAt ?? null,
      skippedAt: local.skippedAt ?? null,
      lastStep: local.lastStep ?? 0,
      loaded: false,
    };
  });

  // Sync depuis la DB au montage (la DB a priorité si elle a des timestamps).
  useEffect(() => {
    if (!token) {
      setState((s) => ({ ...s, loaded: true }));
      return;
    }
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          setState((s) => ({ ...s, loaded: true }));
          return;
        }
        const { data } = await sb.rpc("get_client_onboarding_state_by_token", {
          p_token: token,
        });
        const row = Array.isArray(data) ? data[0] : data;
        if (row) {
          const next: OnboardingState = {
            completedAt: row.completed_at ?? null,
            skippedAt: row.skipped_at ?? null,
            lastStep: row.last_step ?? 0,
            loaded: true,
          };
          setState(next);
          writeLocal(clientId, {
            completedAt: next.completedAt,
            skippedAt: next.skippedAt,
            lastStep: next.lastStep,
          });
        } else {
          setState((s) => ({ ...s, loaded: true }));
        }
      } catch {
        setState((s) => ({ ...s, loaded: true }));
      }
    })();
  }, [token, clientId]);

  const persist = useCallback(
    async (
      patch: { completedAt?: string | null; skippedAt?: string | null; lastStep?: number },
    ) => {
      // Update local state immédiatement
      setState((s) => ({
        ...s,
        completedAt: patch.completedAt !== undefined ? patch.completedAt : s.completedAt,
        skippedAt: patch.skippedAt !== undefined ? patch.skippedAt : s.skippedAt,
        lastStep: patch.lastStep ?? s.lastStep,
      }));
      writeLocal(clientId, patch);

      // Sync DB en arrière-plan (non bloquant)
      if (!token) return;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        await sb.rpc("set_client_onboarding_state_by_token", {
          p_token: token,
          p_mark_completed: patch.completedAt != null,
          p_mark_skipped: patch.skippedAt != null,
          p_last_step: patch.lastStep ?? null,
        });
      } catch {
        // non bloquant
      }
    },
    [token, clientId],
  );

  const markStep = useCallback(
    (step: number) => {
      void persist({ lastStep: step });
    },
    [persist],
  );

  const markCompleted = useCallback(() => {
    void persist({ completedAt: new Date().toISOString() });
  }, [persist]);

  const markSkipped = useCallback(() => {
    void persist({ skippedAt: new Date().toISOString() });
  }, [persist]);

  const resetForReplay = useCallback(() => {
    // Pour le bouton "?" : on ne nettoie PAS completedAt côté DB (trace
    // d'usage utile au coach) — on juste reset le lastStep et on ignore les
    // timestamps pendant la session courante côté front. Le tuto se relance.
    setState((s) => ({ ...s, lastStep: 0 }));
  }, []);

  return { state, markStep, markCompleted, markSkipped, resetForReplay };
}
