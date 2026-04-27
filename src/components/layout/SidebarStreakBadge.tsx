// =============================================================================
// SidebarStreakBadge — affichage compact du streak dans la sidebar (Polish 2026-04-29)
// =============================================================================
//
// Petit badge gold en haut du footer sidebar qui affiche :
//   🔥 12 jours · Niveau 4
//
// Utilise les hooks gamification existants (useStreak + RPC get_user_xp).
// Si le user n a pas encore de streak (loaded=false ou count=0) -> on ne
// rend rien pour eviter le visual clutter.
// =============================================================================

import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useStreak } from "../../features/gamification/hooks/useStreak";
import { getSupabaseClient } from "../../services/supabaseClient";

interface XpData {
  total_xp: number;
  level: number;
}

export function SidebarStreakBadge() {
  const { currentUser } = useAppContext();
  const streak = useStreak();
  const [xp, setXp] = useState<XpData | null>(null);

  useEffect(() => {
    if (!currentUser?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data } = await sb.rpc("get_user_xp", { p_user_id: currentUser.id });
        if (!cancelled && Array.isArray(data) && data[0]) {
          setXp({ total_xp: data[0].total_xp, level: data[0].level });
        }
      } catch (err) {
        console.warn("[SidebarStreakBadge] xp fetch failed:", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  if (!streak.loaded || streak.count === 0) {
    // Discreet — pas de placeholder pour eviter le clutter au mount
    return null;
  }

  const tierBg =
    streak.count < 7
      ? "color-mix(in srgb, var(--ls-gold) 8%, transparent)"
      : streak.count < 30
        ? "color-mix(in srgb, var(--ls-gold) 14%, transparent)"
        : "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 18%, transparent), color-mix(in srgb, var(--ls-gold) 18%, transparent))";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        background: tierBg,
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
        borderRadius: 10,
        fontSize: 11,
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
      }}
      title={`Streak ${streak.count} jour${streak.count > 1 ? "s" : ""} consécutif${streak.count > 1 ? "s" : ""}${xp ? ` · Niveau ${xp.level} (${xp.total_xp} XP)` : ""}`}
    >
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontWeight: 600, color: "var(--ls-gold)" }}>{streak.count}j</span>
      {xp && (
        <>
          <span style={{ color: "var(--ls-text-hint)", fontSize: 10 }}>·</span>
          <span style={{ fontSize: 10, color: "var(--ls-text-muted)" }}>
            Niv. <span style={{ fontWeight: 600, color: "var(--ls-purple)" }}>{xp.level}</span>
          </span>
        </>
      )}
    </div>
  );
}
