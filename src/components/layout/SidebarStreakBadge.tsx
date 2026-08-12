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
import { FRAICHEUR, cleDuJour, lireAvecFraicheur } from "../../lib/cacheFraicheur";

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
        // Une lecture par jour (décision Thomas, 2026-08-12). Ce badge est
        // affiché en permanence dans la barre latérale : il partait donc à
        // chaque ouverture de l'app, pour un chiffre décoratif.
        //
        // Nuance assumée : le XP est calculé côté serveur, le navigateur ne
        // sait pas quand il bouge. Un gain gagné aujourd'hui n'apparaît ICI que
        // demain. La carte XP dédiée, elle, reste en lecture directe — c'est
        // celle qu'on ouvre justement pour voir son score bouger.
        const ligne = await lireAvecFraicheur<XpData | null>(
          cleDuJour(`xp:${currentUser.id}`),
          FRAICHEUR.JOUR,
          async () => {
            const sb = await getSupabaseClient();
            if (!sb) return null;
            const { data } = await sb.rpc("get_user_xp", { p_user_id: currentUser.id });
            if (!Array.isArray(data) || !data[0]) return null;
            return { total_xp: data[0].total_xp, level: data[0].level };
          },
        );
        if (!cancelled && ligne) setXp(ligne);
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
      ? "color-mix(in srgb, var(--ls-lime) 9%, transparent)"
      : streak.count < 30
        ? "color-mix(in srgb, var(--ls-lime) 15%, transparent)"
        : "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 18%, transparent), color-mix(in srgb, var(--ls-lime) 20%, transparent))";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 10px",
        background: tierBg,
        border: "0.5px solid color-mix(in srgb, var(--ls-lime) 32%, transparent)",
        borderRadius: 10,
        fontSize: 11,
        fontFamily: "DM Sans, sans-serif",
        color: "var(--ls-text)",
      }}
      title={`Streak ${streak.count} jour${streak.count > 1 ? "s" : ""} consécutif${streak.count > 1 ? "s" : ""}${xp ? ` · Niveau ${xp.level} (${xp.total_xp} XP)` : ""}`}
    >
      <span style={{ fontSize: 14 }}>🔥</span>
      <span style={{ fontWeight: 700, color: "var(--ls-lime)" }}>{streak.count}j</span>
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
