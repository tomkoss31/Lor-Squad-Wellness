// UserActivityPanel (2026-04-29) — bloc activite distri pour vue admin.
// Affiche : statut connexion, dernière connexion, streak, temps passe (today
// + 7j + 30j) et mini-graph 7 jours.

import { useUserActivityStats } from "../hooks/useUserActivityStats";

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

export function UserActivityPanel({ userId, variant = "full" }: Props) {
  const stats = useUserActivityStats(userId);

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
              return (
                <div
                  key={day.date}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}
                  title={`${dateLabel} : ${formatDuration(day.seconds)}`}
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
                </div>
              );
            })}
          </div>
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
    </div>
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
