// =============================================================================
// useFormationStreak — quick win #1 (2026-11-04)
//
// Streak quotidien specifique Formation : 1+ module valide par jour.
// Distinct du streak de connexion (useStreak.ts) qui compte les sessions.
//
// Stockage : localStorage par user (cle ls-formation-streak-{userId}).
// Pas de DB en V1 — sera migre en V2 si besoin de cross-device.
//
// API :
//   - useFormationStreak() : retourne { count, badge, lastActiveYMD }
//   - pingFormationStreak(userId) : a appeler quand un module est valide.
//     Si lastActive == today : no-op
//     Si today - 1   : ++
//     Sinon          : reset a 1
//
// Badges : 3j 🌱 Grain · 7j 🔥 Flamme · 30j ⭐ Legende
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";

const STORAGE_PREFIX = "ls-formation-streak-";

interface StoredStreak {
  count: number;
  lastActiveYMD: string;
}

export interface FormationStreakBadge {
  level: "none" | "grain" | "flamme" | "legende";
  emoji: string;
  label: string;
  color: string;
  /** Texte court pour afficher le badge actuel ou le palier suivant. */
  hint: string;
  /** Jours restants avant le prochain palier (0 si max atteint). */
  daysToNext: number;
}

export interface FormationStreakData {
  loaded: boolean;
  /** Nombre de jours consecutifs actuels. */
  count: number;
  /** Date de la derniere activite (YMD UTC). */
  lastActiveYMD: string | null;
  /** Vrai si le user a deja interagi aujourd hui. */
  alreadyPingedToday: boolean;
  /** Badge actuel + palier suivant. */
  badge: FormationStreakBadge;
}

function ymdUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiffUtc(aYmd: string, bYmd: string): number {
  const a = new Date(aYmd + "T00:00:00Z");
  const b = new Date(bYmd + "T00:00:00Z");
  return Math.round((a.getTime() - b.getTime()) / 86400000);
}

function readStored(userId: string): StoredStreak | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredStreak>;
    if (typeof parsed.count !== "number" || typeof parsed.lastActiveYMD !== "string") {
      return null;
    }
    return { count: parsed.count, lastActiveYMD: parsed.lastActiveYMD };
  } catch {
    return null;
  }
}

function writeStored(userId: string, value: StoredStreak): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
  } catch {
    // quota / private mode → silent
  }
}

function computeBadge(count: number): FormationStreakBadge {
  if (count >= 30) {
    return {
      level: "legende",
      emoji: "⭐",
      label: "Légende",
      color: "var(--ls-gold)",
      hint: "Tu es une légende. 30+ jours d'affilée.",
      daysToNext: 0,
    };
  }
  if (count >= 7) {
    return {
      level: "flamme",
      emoji: "🔥",
      label: "Flamme",
      color: "var(--ls-coral)",
      hint: `Plus que ${30 - count} pour Légende.`,
      daysToNext: 30 - count,
    };
  }
  if (count >= 3) {
    return {
      level: "grain",
      emoji: "🌱",
      label: "Grain",
      color: "var(--ls-teal)",
      hint: `Plus que ${7 - count} pour Flamme.`,
      daysToNext: 7 - count,
    };
  }
  return {
    level: "none",
    emoji: "✨",
    label: "Démarrer",
    color: "var(--ls-text-muted)",
    hint: `Plus que ${3 - count} pour Grain.`,
    daysToNext: 3 - count,
  };
}

/**
 * Marque une activite Formation pour aujourd hui. A appeler quand un module
 * est valide. Idempotent (no-op si deja appele aujourd hui).
 *
 * @returns Le nouveau count apres mise a jour.
 */
export function pingFormationStreak(userId: string): number {
  if (!userId) return 0;
  const today = ymdUtc(new Date());
  const stored = readStored(userId);

  if (!stored) {
    writeStored(userId, { count: 1, lastActiveYMD: today });
    // Notify components via storage event (same tab + cross-tab)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("ls-formation-streak-update"));
    }
    return 1;
  }

  if (stored.lastActiveYMD === today) {
    // Deja compte aujourd hui — no-op
    return stored.count;
  }

  const diff = dayDiffUtc(today, stored.lastActiveYMD);
  let newCount: number;
  if (diff === 1) {
    newCount = stored.count + 1;
  } else {
    // Saut > 1 jour → reset
    newCount = 1;
  }
  writeStored(userId, { count: newCount, lastActiveYMD: today });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ls-formation-streak-update"));
  }
  return newCount;
}

export function useFormationStreak(): FormationStreakData {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;

  const [data, setData] = useState<FormationStreakData>({
    loaded: false,
    count: 0,
    lastActiveYMD: null,
    alreadyPingedToday: false,
    badge: computeBadge(0),
  });

  useEffect(() => {
    if (!userId) {
      setData({
        loaded: true,
        count: 0,
        lastActiveYMD: null,
        alreadyPingedToday: false,
        badge: computeBadge(0),
      });
      return;
    }

    function refresh() {
      if (!userId) return;
      const today = ymdUtc(new Date());
      const stored = readStored(userId);
      if (!stored) {
        setData({
          loaded: true,
          count: 0,
          lastActiveYMD: null,
          alreadyPingedToday: false,
          badge: computeBadge(0),
        });
        return;
      }
      // Si lastActive est < hier, le streak est casse (mais on garde la
      // valeur historique en lecture jusqu au prochain ping).
      const diff = dayDiffUtc(today, stored.lastActiveYMD);
      const effectiveCount = diff <= 1 ? stored.count : 0;
      setData({
        loaded: true,
        count: effectiveCount,
        lastActiveYMD: stored.lastActiveYMD,
        alreadyPingedToday: stored.lastActiveYMD === today,
        badge: computeBadge(effectiveCount),
      });
    }

    refresh();

    // Cross-tab + same-tab sync
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_PREFIX + userId) refresh();
    }
    function onCustom() {
      refresh();
    }
    window.addEventListener("storage", onStorage);
    window.addEventListener("ls-formation-streak-update", onCustom as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("ls-formation-streak-update", onCustom as EventListener);
    };
  }, [userId]);

  return data;
}
