// =============================================================================
// usePvCheckedTracker — tracking "vérifié PV" via localStorage (2026-04-29)
// =============================================================================
//
// Permet de savoir visuellement quels clients on a déjà ouverts cette semaine
// (= consultation PV faite). Stocké en localStorage pour rester ultra-rapide
// et survivre aux refreshs sans aller en DB.
//
// Format clé localStorage :
//   pv-checked-v1 = JSON.stringify({ "<clientId>": "<ISO timestamp>" })
//
// "Checked" si timestamp < CHECK_TTL_DAYS jours (= 7 jours par défaut).
// =============================================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pv-checked-v1";
const CHECK_TTL_DAYS = 7;

type CheckedMap = Record<string, string>;

function readMap(): CheckedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as CheckedMap;
    return {};
  } catch {
    return {};
  }
}

function writeMap(map: CheckedMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota errors
  }
}

function isFresh(iso: string | undefined): boolean {
  if (!iso) return false;
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return false;
  const ageMs = Date.now() - ts;
  return ageMs < CHECK_TTL_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * Hook global — retourne le set des clientId déjà checkés cette semaine
 * + une fonction `markChecked(clientId)` pour marquer un client.
 *
 * Refresh auto via storage event si une autre tab modifie le localStorage.
 */
export function usePvCheckedTracker() {
  const [checkedMap, setCheckedMap] = useState<CheckedMap>(() => readMap());

  // Sync entre tabs (storage event)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setCheckedMap(readMap());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const markChecked = useCallback((clientId: string) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [clientId]: new Date().toISOString() };
      writeMap(next);
      return next;
    });
  }, []);

  const isChecked = useCallback(
    (clientId: string) => isFresh(checkedMap[clientId]),
    [checkedMap],
  );

  const getCheckedAt = useCallback(
    (clientId: string): Date | null => {
      const iso = checkedMap[clientId];
      if (!iso || !isFresh(iso)) return null;
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    },
    [checkedMap],
  );

  return { isChecked, getCheckedAt, markChecked };
}
