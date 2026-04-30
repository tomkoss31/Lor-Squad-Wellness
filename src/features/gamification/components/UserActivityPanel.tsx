// UserActivityPanel V2 (2026-04-30) — bloc activite distri pour vue admin.
// Click sur une barre du graph -> popup detail du jour (sessions + durees).

import { useEffect, useState } from "react";
import { useUserActivityStats } from "../hooks/useUserActivityStats";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Props {
  userId: string;
  /** Variant compact (in-card) ou full (page-level). Defaut full. */
  variant?: "compact" | "full";
}

function relativeTime(date: Date | null): string {
  if (!date) return "Jamais";
  const diffMs = Date.now() - date.getTime();
  const diffM = Math.floor(diffMs / (60 * 1000));
  if (diffM < 1) return "À l'instant";
  if (diffM < 60) return `il y a ${diffM} min`;
  const diffH = Math.floor(diffM / 60);
  if (diffH < 24) return `il y a ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `il y a ${diffD} j`;
  if (diffD < 30) return `il y a ${Math.floor(diffD / 7)} sem.`;
  return `il y a ${Math.floor(diffD / 30)} mois`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remM = minutes % 60;
  if (hours < 24) return remM > 0 ? `${hours}h${String(remM).padStart(2, "0")}` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days}j ${remH}h` : `${days}j`;
}

function statusInfo(stats: ReturnType<typeof useUserActivityStats>): {
  label: string;
  color: string;
  emoji: string;
} {
  if (!stats.lastActiveAt) {
    return { label: "Jamais connecté", color: "var(--ls-text-hint)", emoji: "💤" };
  }
  const diffMs = Date.now() - stats.lastActiveAt.getTime();
  const diffH = diffMs / (60 * 60 * 1000);
  if (diffH < 24) {
    return { label: "Connecté aujourd'hui", color: "var(--ls-teal)", emoji: "🟢" };
  }
  if (diffH < 48) {
    return { label: "Connecté hier", color: "var(--ls-gold)", emoji: "🟡" };
  }
  if (diffH < 24 * 7) {
    return { label: "Inactif cette semaine", color: "var(--ls-coral)", emoji: "🟠" };
  }
  return { label: "Inactif depuis 1 sem+", color: "#DC2626", emoji: "🔴" };
}

interface DaySession {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
}

export function UserActivityPanel({ userId, variant = "full" }: Props) {
  const stats = useUserActivityStats(userId);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [daySessions, setDaySessions] = useState<DaySession[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  // Fetch sessions du jour selectionne
  useEffect(() => {
    if (!selectedDate || !userId) {
      setDaySessions([]);
      return;
    }
    let cancelled = false;
    setDayLoading(true);
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const startISO = `${selectedDate}T00:00:00Z`;
        const endISO = `${selectedDate}T23:59:59Z`;
        const { data, error } = await sb
          .from("user_sessions")
          .select("id, started_at, ended_at, duration_seconds")
          .eq("user_id", userId)
          .gte("started_at", startISO)
          .lte("started_at", endISO)
          .order("started_at", { ascending: true });
        if (cancelled) return;
        if (error) {
          console.warn("[UserActivityPanel] day sessions fetch failed:", error.message);
          setDaySessions([]);
        } else {
          setDaySessions((data ?? []) as DaySession[]);
        }
      } finally {
        if (!cancelled) setDayLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, userId]);

  // ESC ferme la modale + body scroll lock
  useEffect(() => {
    if (!selectedDate) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDate(null);
    };
    window.addEventListener("keydown", handler);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = prev;
    };
  }, [selectedDate]);

  if (!stats.loaded) {
    return (
      <div
        style={{
          padding: variant === "compact" ? "16px" : "24px",
          textAlign: "center",
          color: "var(--ls-text-muted)",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Chargement de l'activité…
      </div>
    );
  }

  if (stats.error) {
    return (
      <div
        style={{
          padding: 14,
          background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
          borderRadius: 12,
          color: "var(--ls-coral)",
          fontSize: 12.5,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Impossible de charger l'activité : {stats.error}
      </div>
    );
  }

  const status = statusInfo(stats);
  const maxSeconds = Math.max(...stats.dailyBreakdown.map((d) => d.seconds), 1);

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-teal) 22%, var(--ls-border))",
        borderRadius: 18,
        padding: variant === "compact" ? 16 : 20,
        boxShadow: "0 1px 0 0 rgba(45,212,191,0.10), 0 8px 24px -16px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header eyebrow + title */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-teal)",
              fontFamily: "DM Sans, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--ls-teal)", boxShadow: "0 0 8px rgba(45,212,191,0.50)" }} />
            Activité
          </div>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: variant === "compact" ? 16 : 19,
              fontWeight: 800,
              color: "var(--ls-text)",
              margin: "4px 0 0",
              letterSpacing: "-0.01em",
            }}
          >
            Connexion & temps passé
          </h3>
        </div>
        {/* Status pill */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11.5,
            padding: "4px 12px",
            borderRadius: 999,
            background: `color-mix(in srgb, ${status.color} 12%, transparent)`,
            color: status.color,
            fontWeight: 700,
            border: `0.5px solid color-mix(in srgb, ${status.color} 35%, transparent)`,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span>{status.emoji}</span>
          {status.label}
        </span>
      </div>

      {/* Stats principales — grid 4 cols */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <StatCard
          label="Dernière connexion"
          value={relativeTime(stats.lastActiveAt)}
          color="var(--ls-teal)"
          emoji="🕐"
        />
        <StatCard
          label="Streak actuel"
          value={stats.streakCount > 0 ? `${stats.streakCount}j` : "—"}
          color="var(--ls-gold)"
          emoji="🔥"
          extra={stats.streakCount > 0 ? "consécutifs" : "à démarrer"}
        />
        <StatCard
          label="Aujourd'hui"
          value={formatDuration(stats.todaySeconds)}
          color="var(--ls-purple)"
          emoji="📊"
        />
        <StatCard
          label="7 derniers jours"
          value={formatDuration(stats.last7dSeconds)}
          color="var(--ls-coral)"
          emoji="📅"
          extra={`${stats.totalSessions} sessions total`}
        />
      </div>

      {/* Mini graph 7 jours */}
      {stats.dailyBreakdown.length > 0 && (
        <div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 10,
            }}
          >
            Activité 7 jours
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 80 }}>
            {stats.dailyBreakdown.map((day) => {
              const heightPct = maxSeconds > 0 ? (day.seconds / maxSeconds) * 100 : 0;
              const isToday = day.date === new Date().toISOString().slice(0, 10);
              const dateLabel = new Date(day.date).toLocaleDateString("fr-FR", { weekday: "short" });
              const isClickable = day.seconds > 0;
              return (
                <button
                  key={day.date}
                  type="button"
                  onClick={() => isClickable && setSelectedDate(day.date)}
                  disabled={!isClickable}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column",
                    alignItems: "center", gap: 6, minWidth: 0,
                    background: "transparent", border: "none", padding: 0,
                    cursor: isClickable ? "pointer" : "default",
                    fontFamily: "inherit",
                    transition: "transform 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (isClickable) e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                  }}
                  title={isClickable ? `${dateLabel} : ${formatDuration(day.seconds)} — clique pour le détail` : `${dateLabel} : aucune activité`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: "60px",
                      display: "flex",
                      alignItems: "flex-end",
                      borderRadius: 6,
                      background: "var(--ls-surface2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: `${Math.max(heightPct, day.seconds > 0 ? 8 : 0)}%`,
                        background: isToday
                          ? "linear-gradient(180deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
                          : "linear-gradient(180deg, color-mix(in srgb, var(--ls-teal) 50%, transparent) 0%, color-mix(in srgb, var(--ls-teal) 30%, transparent) 100%)",
                        transition: "height 0.5s ease",
                        borderRadius: 6,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 9.5,
                      color: isToday ? "var(--ls-teal)" : "var(--ls-text-hint)",
                      fontWeight: isToday ? 700 : 500,
                      fontFamily: "DM Sans, sans-serif",
                      textTransform: "capitalize",
                    }}
                  >
                    {dateLabel.slice(0, 3)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Device breakdown — V3 (2026-04-30) : split PC/Mobile/Tablet */}
      {(stats.deviceBreakdown.desktop || stats.deviceBreakdown.mobile || stats.deviceBreakdown.tablet) && (
        <div
          style={{
            padding: "12px 14px",
            background: "var(--ls-surface2)",
            borderRadius: 12,
            border: "0.5px solid var(--ls-border)",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginTop: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              width: "100%",
              marginBottom: 2,
            }}
          >
            Répartition par appareil
          </div>
          {([
            { key: "desktop", emoji: "💻", label: "PC" },
            { key: "mobile", emoji: "📱", label: "Mobile" },
            { key: "tablet", emoji: "📱", label: "Tablette" },
          ] as const).map((d) => {
            const data = stats.deviceBreakdown[d.key];
            if (!data || data.last_7d_seconds === 0) return null;
            return (
              <div
                key={d.key}
                style={{
                  flex: "1 1 110px",
                  padding: "8px 12px",
                  background: "var(--ls-surface)",
                  borderRadius: 10,
                  border: "0.5px solid var(--ls-border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: 18, flexShrink: 0 }}>{d.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {d.label}
                  </div>
                  <div style={{ fontFamily: "Syne, serif", fontSize: 14, fontWeight: 800, color: "var(--ls-text)", letterSpacing: "-0.01em" }}>
                    {formatDuration(data.last_7d_seconds)}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--ls-text-hint)", fontFamily: "DM Sans, sans-serif" }}>
                    {data.sessions} session{data.sessions > 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bonus : Lifetime + XP daily */}
      <div
        style={{
          marginTop: 16,
          padding: "10px 14px",
          background: "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))",
          border: "0.5px dashed color-mix(in srgb, var(--ls-gold) 30%, transparent)",
          borderRadius: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontSize: 11.5, color: "var(--ls-text-muted)", fontFamily: "DM Sans, sans-serif", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden style={{ fontSize: 14 }}>🏆</span>
          {stats.lifetimeLoginCount} jour{stats.lifetimeLoginCount > 1 ? "s" : ""} cumulé{stats.lifetimeLoginCount > 1 ? "s" : ""}
        </div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontSize: 14,
            fontWeight: 800,
            color: "var(--ls-gold)",
            letterSpacing: "-0.02em",
          }}
        >
          +{stats.lifetimeLoginCount * 5} XP
        </div>
      </div>

      {/* Modale detail jour (V2 — 2026-04-30) */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          sessions={daySessions}
          loading={dayLoading}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}

function DayDetailModal({
  date, sessions, loading, onClose,
}: {
  date: string;
  sessions: DaySession[];
  loading: boolean;
  onClose: () => void;
}) {
  const totalSec = sessions.reduce((sum, s) => {
    const dur = s.duration_seconds ?? (s.ended_at ? Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000) : 0);
    return sum + (dur > 0 ? dur : 0);
  }, 0);

  const dateLabel = new Date(date).toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <>
      <style>{`
        @keyframes ls-day-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ls-day-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop click, ESC handled at dialog level */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 6000,
          background: "color-mix(in srgb, var(--ls-bg) 75%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "DM Sans, sans-serif",
          animation: "ls-day-fade-in 0.18s ease-out",
        }}
      >
        <div
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 30%, var(--ls-border))",
            borderRadius: 18,
            width: "100%",
            maxWidth: 440,
            maxHeight: "calc(100vh - 32px)",
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            boxShadow: "0 24px 64px -16px rgba(0,0,0,0.40)",
            animation: "ls-day-slide-up 0.32s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {/* HEADER */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)",
              color: "#FFFFFF",
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: 800, color: "rgba(255,255,255,0.90)" }}>
                Détail du jour
              </div>
              <div style={{ fontFamily: "Syne, serif", fontSize: 18, fontWeight: 800, marginTop: 2, letterSpacing: "-0.01em", textTransform: "capitalize" }}>
                {dateLabel}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              style={{
                width: 32, height: 32, flexShrink: 0,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.30)",
                background: "rgba(255,255,255,0.18)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(90deg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "none"; }}
            >
              ✕
            </button>
          </div>

          {/* BODY */}
          <div style={{ padding: 18 }}>
            {/* Total + sessions count */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--ls-surface2)", border: "0.5px solid var(--ls-border)", borderLeft: "3px solid var(--ls-teal)" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--ls-text-muted)", fontWeight: 600, marginBottom: 4 }}>
                  ⏱️ Total
                </div>
                <div style={{ fontFamily: "Syne, serif", fontSize: 22, fontWeight: 800, color: "var(--ls-text)", letterSpacing: "-0.02em" }}>
                  {formatDuration(totalSec)}
                </div>
              </div>
              <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--ls-surface2)", border: "0.5px solid var(--ls-border)", borderLeft: "3px solid var(--ls-purple)" }}>
                <div style={{ fontSize: 10, letterSpacing: 1, textTransform: "uppercase", color: "var(--ls-text-muted)", fontWeight: 600, marginBottom: 4 }}>
                  🔢 Sessions
                </div>
                <div style={{ fontFamily: "Syne, serif", fontSize: 22, fontWeight: 800, color: "var(--ls-text)", letterSpacing: "-0.02em" }}>
                  {sessions.length}
                </div>
              </div>
            </div>

            {/* Liste sessions */}
            <div style={{ fontSize: 10, letterSpacing: 1.4, textTransform: "uppercase", fontWeight: 700, color: "var(--ls-text-muted)", marginBottom: 8, fontFamily: "DM Sans, sans-serif" }}>
              Sessions de la journée
            </div>
            {loading ? (
              <div style={{ padding: 16, textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13 }}>
                Chargement…
              </div>
            ) : sessions.length === 0 ? (
              <div
                style={{
                  padding: "16px 14px",
                  textAlign: "center",
                  background: "var(--ls-surface2)",
                  borderRadius: 10,
                  border: "0.5px dashed var(--ls-border)",
                  fontSize: 12,
                  color: "var(--ls-text-muted)",
                }}
              >
                Aucune session enregistrée ce jour.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {sessions.map((s, idx) => {
                  const start = new Date(s.started_at);
                  const end = s.ended_at ? new Date(s.ended_at) : null;
                  const dur = s.duration_seconds ?? (end ? Math.floor((end.getTime() - start.getTime()) / 1000) : 0);
                  const startTime = start.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
                  const endTime = end ? end.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "en cours";
                  return (
                    <div
                      key={s.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "10px 12px",
                        background: "var(--ls-surface2)",
                        borderRadius: 10,
                        border: "0.5px solid var(--ls-border)",
                      }}
                    >
                      <div
                        style={{
                          width: 26, height: 26, flexShrink: 0,
                          borderRadius: 999,
                          background: "color-mix(in srgb, var(--ls-teal) 18%, var(--ls-surface))",
                          color: "var(--ls-teal)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                          fontFamily: "Syne, serif",
                        }}
                      >
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ls-text)", fontFamily: "DM Sans, sans-serif" }}>
                          {startTime} → {endTime}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "Syne, serif",
                          fontSize: 14,
                          fontWeight: 800,
                          color: "var(--ls-teal)",
                          letterSpacing: "-0.02em",
                          flexShrink: 0,
                        }}
                      >
                        {formatDuration(dur)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function StatCard({
  label,
  value,
  color,
  emoji,
  extra,
}: {
  label: string;
  value: string;
  color: string;
  emoji: string;
  extra?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "var(--ls-surface2)",
        borderRadius: 12,
        border: "0.5px solid var(--ls-border)",
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--ls-text-muted)",
          fontWeight: 600,
          fontFamily: "DM Sans, sans-serif",
          marginBottom: 4,
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>{emoji}</span>
        {label}
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontSize: 18,
          fontWeight: 800,
          color: "var(--ls-text)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {extra && (
        <div
          style={{
            fontSize: 10.5,
            color: "var(--ls-text-hint)",
            fontFamily: "DM Sans, sans-serif",
            marginTop: 2,
          }}
        >
          {extra}
        </div>
      )}
    </div>
  );
}
