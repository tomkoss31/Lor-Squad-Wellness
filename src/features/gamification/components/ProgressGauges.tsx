// ProgressGauges (refonte Paramètres 2026-07-02) — 2 jauges rondes compactes
// (XP · Activité) en tête du Profil. Un clic ouvre une modale avec le détail
// complet (XpProgressCard / UserActivityPanel), pour ne plus surcharger la page.
//
// Demande Thomas : « une jauge XP + une jauge activité côte à côte, cliquables,
// qui ouvrent un beau sandbox avec toute la visibilité. Rapide : je vois, je
// ferme. » Identité v2 : anneau teal, accent lime sur les wins (streak ≥ 7).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { useAppContext } from "../../../context/AppContext";
import { useUserActivityStats } from "../hooks/useUserActivityStats";
import { XpProgressCard, deriveLevelFromXp } from "./XpProgressCard";
import { UserActivityPanel } from "./UserActivityPanel";

function formatShortDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? String(m).padStart(2, "0") : ""}`;
  return `${m}min`;
}

// ── Anneau SVG générique ────────────────────────────────────────────────────
function Ring({
  pct,
  color,
  center,
  sub,
}: {
  pct: number;
  color: string;
  center: string;
  sub: string;
}) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = c * (1 - clamped / 100);
  return (
    <div style={{ position: "relative", width: 116, height: 116 }}>
      <svg width="116" height="116" viewBox="0 0 116 116" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="58" cy="58" r={r} fill="none" stroke="var(--ls-border)" strokeWidth="9" opacity={0.5} />
        <circle
          cx="58"
          cy="58"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
        }}
      >
        <span style={{ fontFamily: "Anton, sans-serif", fontSize: 26, lineHeight: 1, color: "var(--ls-text)", letterSpacing: "0.01em" }}>
          {center}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ls-text-hint)" }}>
          {sub}
        </span>
      </div>
    </div>
  );
}

// ── Bouton-jauge (carte cliquable) ──────────────────────────────────────────
function GaugeButton({
  ring,
  caption,
  onClick,
}: {
  ring: React.ReactNode;
  caption: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        padding: "18px 14px",
        borderRadius: 18,
        border: "1px solid var(--ls-border)",
        background: "var(--ls-surface)",
        cursor: "pointer",
        fontFamily: "DM Sans, sans-serif",
        transition: "transform 0.15s, border-color 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 40%, var(--ls-border))";
        e.currentTarget.style.boxShadow = "0 10px 26px -14px color-mix(in srgb, var(--ls-teal) 40%, transparent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.borderColor = "var(--ls-border)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {ring}
      <span style={{ fontSize: 12.5, color: "var(--ls-text-muted)", textAlign: "center", lineHeight: 1.4 }}>
        {caption}
      </span>
    </button>
  );
}

// ── Modale légère ───────────────────────────────────────────────────────────
function GaugeModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "color-mix(in srgb, var(--ls-bg) 72%, rgba(0,0,0,0.6))",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 16px",
        overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--ls-surface2)",
          border: "1px solid var(--ls-border)",
          borderRadius: 20,
          padding: 18,
          position: "relative",
          animation: "gauge-modal-in 0.35s cubic-bezier(0.16,1,0.3,1) both",
        }}
      >
        <style>{`@keyframes gauge-modal-in{from{opacity:0;transform:translateY(14px) scale(0.98)}to{opacity:1;transform:none}}`}</style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "Anton, sans-serif", fontSize: 20, letterSpacing: "0.02em", color: "var(--ls-text)", textTransform: "uppercase" }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: "1px solid var(--ls-border)",
              background: "var(--ls-surface)",
              color: "var(--ls-text-muted)",
              cursor: "pointer",
              fontSize: 16,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Composant principal ─────────────────────────────────────────────────────
export function ProgressGauges() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [totalXp, setTotalXp] = useState<number | null>(null);
  const [open, setOpen] = useState<null | "xp" | "activity">(null);
  const stats = useUserActivityStats(userId);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return;
      const { data: rows } = await sb.rpc("get_user_xp", { p_user_id: userId });
      if (cancelled) return;
      const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      setTotalXp((row as { total_xp?: number } | null)?.total_xp ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  const xp = totalXp ?? 0;
  const { level, xpForNextLevel } = deriveLevelFromXp(xp);
  const prevThreshold = (level - 1) * (level - 1) * 100;
  const pctInLevel = Math.round(((xp - prevThreshold) / Math.max(1, xpForNextLevel - prevThreshold)) * 100);
  const xpToNext = Math.max(0, xpForNextLevel - xp);

  const streak = stats.streakCount ?? 0;
  const streakPct = Math.min(100, (streak / 7) * 100);
  const streakOnFire = streak >= 7;

  return (
    <>
      <div style={{ display: "flex", gap: 12 }}>
        <GaugeButton
          onClick={() => setOpen("xp")}
          ring={
            <Ring
              pct={pctInLevel}
              color="var(--ls-teal)"
              center={`Niv.${level}`}
              sub={`${xp} XP`}
            />
          }
          caption={xpToNext > 0 ? `${xpToNext} XP avant le niveau ${level + 1}` : "Niveau max atteint 🏆"}
        />
        <GaugeButton
          onClick={() => setOpen("activity")}
          ring={
            <Ring
              pct={streakPct}
              color={streakOnFire ? "var(--ls-lime)" : "var(--ls-teal)"}
              center={streak > 0 ? `${streak}j` : "—"}
              sub="Streak"
            />
          }
          caption={`Aujourd'hui ${formatShortDuration(stats.todaySeconds ?? 0)} · ${stats.totalSessions ?? 0} sessions`}
        />
      </div>

      {open === "xp" ? (
        <GaugeModal title="Ta progression XP" onClose={() => setOpen(null)}>
          <XpProgressCard />
        </GaugeModal>
      ) : null}
      {open === "activity" ? (
        <GaugeModal title="Ton activité" onClose={() => setOpen(null)}>
          <UserActivityPanel userId={userId} />
        </GaugeModal>
      ) : null}
    </>
  );
}
