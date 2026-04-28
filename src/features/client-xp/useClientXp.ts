// =============================================================================
// useClientXp — Hook + helper pour gerer le XP client (Tier B, 2026-04-28)
// =============================================================================
//
// Expose :
//   - useClientXp(token) : fetch + cache l etat XP courant. Auto-refresh
//     quand un event xp:gained est emis.
//   - recordClientXp(token, actionKey) : appelle la RPC, dispatch un
//     event "xp:gained" si gained_xp > 0 → declenche XpToast.
//
// L event bus utilise window.dispatchEvent pour ne pas avoir a faire un
// React Context global. Tres leger.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import {
  getXpAction,
  type ClientXpActionKey,
} from "./actions";

export interface ClientXpState {
  loaded: boolean;
  error: string | null;
  totalXp: number;
  level: number;
  levelTitle: string;
  prevThreshold: number;
  nextThreshold: number;
  xpInLevel: number;
  xpToNext: number;
}

const EMPTY_STATE: ClientXpState = {
  loaded: false,
  error: null,
  totalXp: 0,
  level: 1,
  levelTitle: "Débutant.e",
  prevThreshold: 0,
  nextThreshold: 100,
  xpInLevel: 0,
  xpToNext: 100,
};

// ─── Event bus (window-level) ────────────────────────────────────────────────

export interface ClientXpGainedDetail {
  actionKey: ClientXpActionKey;
  gainedXp: number;
  totalXp: number;
  emoji: string;
  label: string;
}

const XP_GAINED_EVENT = "ls:client-xp:gained";
const XP_REFRESH_EVENT = "ls:client-xp:refresh";

function emitGained(detail: ClientXpGainedDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(XP_GAINED_EVENT, { detail }));
}

function emitRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(XP_REFRESH_EVENT));
}

// ─── recordClientXp helper ───────────────────────────────────────────────────

interface RecordResult {
  gainedXp: number;
  totalXp: number;
  alreadyGained: boolean;
}

/** Throttle : evite de spammer la RPC quand le user clique le meme onglet 5x. */
const recentCalls = new Map<string, number>();
const THROTTLE_MS = 2000;

export async function recordClientXp(
  token: string,
  actionKey: ClientXpActionKey,
): Promise<RecordResult | null> {
  if (!token) return null;
  // Throttle in-memory
  const cacheKey = `${token}:${actionKey}`;
  const lastCall = recentCalls.get(cacheKey);
  const now = Date.now();
  if (lastCall && now - lastCall < THROTTLE_MS) {
    return null;
  }
  recentCalls.set(cacheKey, now);

  try {
    const sb = await getSupabaseClient();
    if (!sb) return null;
    const { data, error } = await sb.rpc("record_client_xp", {
      p_token: token,
      p_action_key: actionKey,
    });
    if (error) {
      console.warn("[client-xp] record failed:", error.message);
      return null;
    }
    const payload = (data ?? {}) as {
      error?: string;
      gained_xp?: number;
      total_xp?: number;
      already_gained?: boolean;
    };
    if (payload.error) {
      console.warn("[client-xp] rpc error:", payload.error);
      return null;
    }
    const result: RecordResult = {
      gainedXp: payload.gained_xp ?? 0,
      totalXp: payload.total_xp ?? 0,
      alreadyGained: payload.already_gained ?? false,
    };

    // Emit toast event si XP gagne
    if (result.gainedXp > 0) {
      const def = getXpAction(actionKey);
      emitGained({
        actionKey,
        gainedXp: result.gainedXp,
        totalXp: result.totalXp,
        emoji: def?.emoji ?? "✨",
        label: def?.label ?? actionKey,
      });
    }
    // Force refresh meme si already gained (au cas ou)
    emitRefresh();

    return result;
  } catch (err) {
    console.warn("[client-xp] record exception:", err);
    return null;
  }
}

// ─── useClientXp hook ────────────────────────────────────────────────────────

export function useClientXp(token: string | undefined): ClientXpState {
  const [state, setState] = useState<ClientXpState>(EMPTY_STATE);

  const fetchXp = useCallback(async () => {
    if (!token) {
      setState({ ...EMPTY_STATE, loaded: true });
      return;
    }
    try {
      const sb = await getSupabaseClient();
      if (!sb) {
        setState((s) => ({ ...s, loaded: true, error: "no_supabase" }));
        return;
      }
      const { data, error } = await sb.rpc("get_client_xp", { p_token: token });
      if (error) {
        setState((s) => ({ ...s, loaded: true, error: error.message }));
        return;
      }
      const payload = (data ?? {}) as {
        error?: string;
        total_xp?: number;
        level?: number;
        level_title?: string;
        prev_threshold?: number;
        next_threshold?: number;
        xp_in_level?: number;
        xp_to_next?: number;
      };
      if (payload.error) {
        setState((s) => ({ ...s, loaded: true, error: payload.error ?? "unknown" }));
        return;
      }
      setState({
        loaded: true,
        error: null,
        totalXp: payload.total_xp ?? 0,
        level: payload.level ?? 1,
        levelTitle: payload.level_title ?? "Débutant.e",
        prevThreshold: payload.prev_threshold ?? 0,
        nextThreshold: payload.next_threshold ?? 100,
        xpInLevel: payload.xp_in_level ?? 0,
        xpToNext: payload.xp_to_next ?? 100,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loaded: true,
        error: err instanceof Error ? err.message : "unknown",
      }));
    }
  }, [token]);

  // Initial fetch
  useEffect(() => {
    void fetchXp();
  }, [fetchXp]);

  // Listen to refresh events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      void fetchXp();
    };
    window.addEventListener(XP_REFRESH_EVENT, handler);
    return () => window.removeEventListener(XP_REFRESH_EVENT, handler);
  }, [fetchXp]);

  return state;
}

// ─── Hook pour ecouter les XP gained (pour XpToast) ──────────────────────────

export function useClientXpToast(
  onGained: (detail: ClientXpGainedDetail) => void,
) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ClientXpGainedDetail>).detail;
      if (detail) onGained(detail);
    };
    window.addEventListener(XP_GAINED_EVENT, handler);
    return () => window.removeEventListener(XP_GAINED_EVENT, handler);
  }, [onGained]);
}
