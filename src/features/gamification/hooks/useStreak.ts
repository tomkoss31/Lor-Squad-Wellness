// Gamification 1 - Streak (2026-04-29).
// Hook qui lit + met a jour le streak du user courant au mount.
// Logic :
//   - last_active = today (UTC) -> no-op (deja compte aujourd hui)
//   - last_active = yesterday   -> streak_count++ (continuite)
//   - last_active < yesterday   -> streak_count = 1 (reset)
//   - last_active null          -> streak_count = 1 (1ere connexion)
//
// Cache memoire 1h pour eviter les calls inutiles a chaque navigation.

import { useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

export interface StreakData {
  loaded: boolean;
  count: number;
  lastActive: Date | null;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1h
let cached: { data: StreakData; userId: string; at: number } | null = null;

function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiffUtc(a: Date, b: Date): number {
  const aUtc = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bUtc = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.round((aUtc - bUtc) / (1000 * 60 * 60 * 24));
}

export function useStreak(): StreakData {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;

  const [data, setData] = useState<StreakData>(() => {
    if (cached && cached.userId === userId && Date.now() - cached.at < CACHE_TTL_MS) {
      return cached.data;
    }
    return { loaded: false, count: 0, lastActive: null };
  });

  useEffect(() => {
    if (!userId) return;
    if (cached && cached.userId === userId && Date.now() - cached.at < CACHE_TTL_MS) {
      setData(cached.data);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;

        // 1. Lire l etat actuel
        const { data: row, error } = await sb
          .from("users")
          .select("streak_count, streak_last_active")
          .eq("id", userId)
          .maybeSingle();
        if (error) {
          console.warn("[useStreak] read failed:", error.message);
          return;
        }
        const today = new Date();
        const lastActiveStr = (row as { streak_last_active?: string | null } | null)?.streak_last_active ?? null;
        const currentCount = (row as { streak_count?: number } | null)?.streak_count ?? 0;

        let newCount = currentCount;
        let shouldUpdate = false;

        if (!lastActiveStr) {
          newCount = 1;
          shouldUpdate = true;
        } else {
          const lastActive = new Date(lastActiveStr);
          const diff = dayDiffUtc(today, lastActive);
          if (diff === 0) {
            // Deja compte aujourd hui
            newCount = currentCount;
          } else if (diff === 1) {
            newCount = currentCount + 1;
            shouldUpdate = true;
          } else {
            // Saut > 1 jour : reset
            newCount = 1;
            shouldUpdate = true;
          }
        }

        // 2. Update si changement
        if (shouldUpdate) {
          const { error: upErr } = await sb
            .from("users")
            .update({
              streak_count: newCount,
              streak_last_active: ymd(today),
            })
            .eq("id", userId);
          if (upErr) {
            console.warn("[useStreak] update failed:", upErr.message);
          }
        }

        if (cancelled) return;
        const result: StreakData = {
          loaded: true,
          count: newCount,
          lastActive: today,
        };
        cached = { data: result, userId, at: Date.now() };
        setData(result);
      } catch (err) {
        console.warn("[useStreak] exception:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return data;
}
