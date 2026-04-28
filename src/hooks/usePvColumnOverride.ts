// =============================================================================
// usePvColumnOverride — override manuel des colonnes Kanban PV (2026-04-29)
// =============================================================================
//
// Permet au coach de forcer manuellement la colonne d'un client dans le
// Kanban PV (override le statut calcule). Cas usage : Christine commande
// aujourd'hui mais livraison J+4, donc cure techniquement "A relancer"
// alors que le coach a deja gere -> il la passe en "OK" manuellement.
//
// Format localStorage :
//   pv-col-override-v1 = JSON.stringify({
//     "<clientId>": { col: "ok"|"watch"|"silent"|"overdue", at: "<ISO>" }
//   })
//
// TTL 7 jours — apres ca le calcul auto reprend la main.
// =============================================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pv-col-override-v1";
const TTL_DAYS = 7;

export type PvColumnKey = "overdue" | "watch" | "silent" | "ok";

interface OverrideEntry {
  col: PvColumnKey;
  at: string;
}
type OverrideMap = Record<string, OverrideEntry>;

function readMap(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as OverrideMap;
    return {};
  } catch {
    return {};
  }
}

function writeMap(map: OverrideMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota
  }
}

function isFresh(iso: string | undefined): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts < TTL_DAYS * 24 * 60 * 60 * 1000;
}

export function usePvColumnOverride() {
  const [map, setMap] = useState<OverrideMap>(() => readMap());

  // Sync entre tabs
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMap(readMap());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const setOverride = useCallback((clientId: string, col: PvColumnKey) => {
    setMap((prev) => {
      const next = { ...prev, [clientId]: { col, at: new Date().toISOString() } };
      writeMap(next);
      return next;
    });
  }, []);

  const clearOverride = useCallback((clientId: string) => {
    setMap((prev) => {
      const next = { ...prev };
      delete next[clientId];
      writeMap(next);
      return next;
    });
  }, []);

  const getOverride = useCallback(
    (clientId: string): PvColumnKey | null => {
      const entry = map[clientId];
      if (!entry || !isFresh(entry.at)) return null;
      return entry.col;
    },
    [map],
  );

  return { getOverride, setOverride, clearOverride };
}
