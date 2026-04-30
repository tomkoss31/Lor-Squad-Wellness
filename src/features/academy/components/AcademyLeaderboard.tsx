// AcademyLeaderboard V2 PODIUM (2026-04-29).
// Refonte gamification : podium top 3 + sparkline progression + Ta place card +
// liste reste de l'equipe dans des rows premium uniformes.

import { useAcademyLeaderboard } from "../hooks/useAcademyLeaderboard";
import { ACADEMY_SECTIONS } from "../sections";
import { useAppContext } from "../../../context/AppContext";
import { PodiumTop3, type PodiumEntry } from "../../../components/gamification/PodiumTop3";
import { YourPlaceCard } from "../../../components/gamification/YourPlaceCard";

function relativeTime(date: Date | null): string {
  if (!date) return "—";
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "aujourd'hui";
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays} j`;
  if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} sem.`;
  return `il y a ${Math.floor(diffDays / 30)} mois`;
}

function statusLabel(row: ReturnType<typeof useAcademyLeaderboard>["rows"][number]): {
  label: string;
  color: string;
  bg: string;
  border: string;
} {
  if (row.completedAt) {
    return {
      label: "Terminé",
      color: "var(--ls-teal)",
      bg: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
      border: "color-mix(in srgb, var(--ls-teal) 35%, transparent)",
    };
  }
  if (row.skippedAt) {
    return {
      label: "Skippé",
      color: "var(--ls-text-hint)",
      bg: "var(--ls-surface2)",
      border: "var(--ls-border)",
    };
  }
  if (row.startedAt) {
    return {
      label: `${row.percentComplete}%`,
      color: "var(--ls-gold)",
      bg: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
      border: "color-mix(in srgb, var(--ls-gold) 35%, transparent)",
    };
  }
  return {
    label: "Pas démarré",
    color: "var(--ls-text-hint)",
    bg: "var(--ls-surface2)",
    border: "var(--ls-border)",
  };
}

function currentSectionLabel(
  row: ReturnType<typeof useAcademyLeaderboard>["rows"][number],
): string | null {
  if (row.completedAt) return null;
  if (row.skippedAt) return null;
  if (!row.startedAt) return null;
  const idx = Math.min(Math.max(0, row.lastStep), ACADEMY_SECTIONS.length - 1);
  const section = ACADEMY_SECTIONS[idx];
  return section?.shortLabel ?? null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Mini sparkline SVG : segments verticaux representant la progression
 *  des sections completees (8 sections au total). */
function SectionsSparkline({ lastStep, total, color }: { lastStep: number; total: number; color: string }) {
  const segments = Array.from({ length: total }, (_, i) => i < lastStep);
  const segWidth = 6;
  const segGap = 3;
  const totalWidth = total * segWidth + (total - 1) * segGap;
  const height = 14;
  return (
    <svg width={totalWidth} height={height} aria-hidden style={{ flexShrink: 0 }}>
      {segments.map((done, i) => (
        <rect
          key={i}
          x={i * (segWidth + segGap)}
          y={done ? 1 : 5}
          width={segWidth}
          height={done ? height - 2 : height - 10}
          rx={1.5}
          fill={done ? color : "var(--ls-border)"}
          opacity={done ? 1 : 0.5}
        />
      ))}
    </svg>
  );
}

export function AcademyLeaderboard() {
  const { loading, error, rows } = useAcademyLeaderboard();
  const { currentUser } = useAppContext();

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "var(--ls-text-muted)", fontSize: 13, fontFamily: "DM Sans, sans-serif" }}>
        Chargement du leaderboard Academy…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-coral) 40%, transparent)",
          borderRadius: 12,
          color: "var(--ls-coral)",
          fontSize: 13,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Impossible de charger le leaderboard Academy : {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", textAlign: "center", padding: 16, fontFamily: "DM Sans, sans-serif" }}>
        Pas encore de progression Academy dans l&apos;équipe.
      </p>
    );
  }

  const totalCompleted = rows.filter((r) => r.completedAt).length;
  const totalStarted = rows.filter((r) => r.startedAt).length;
  const totalActive = rows.length;

  // Top 3 pour le podium
  const top3: (PodiumEntry | null)[] = rows.slice(0, 3).map((r) => ({
    userId: r.userId,
    userName: r.userName,
    score: r.percentComplete,
    subtitle:
      r.userRole === "admin"
        ? "Admin"
        : r.userRole === "referent"
          ? "Coach référent"
          : "Distributeur",
  }));
  while (top3.length < 3) top3.push(null);

  // Reste de l'equipe (rangs 4+)
  const rest = rows.slice(3);

  // Calcul de la position du user courant pour "Ta place"
  const currentUserIdx = currentUser
    ? rows.findIndex((r) => r.userId === currentUser.id)
    : -1;
  const currentUserRow = currentUserIdx >= 0 ? rows[currentUserIdx] : null;
  const previousRow =
    currentUserIdx > 0 ? rows[currentUserIdx - 1] : null;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-gold) 25%, var(--ls-border))",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 1px 0 0 rgba(239,159,39,0.10), 0 8px 24px -12px rgba(0,0,0,0.10)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ls-gold)",
              textTransform: "uppercase",
              letterSpacing: 1.6,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--ls-gold)", boxShadow: "0 0 8px rgba(239,159,39,0.50)" }} />
            🏆 Leaderboard Academy
          </div>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 800,
              color: "var(--ls-text)",
              margin: "4px 0 0",
              letterSpacing: "-0.02em",
            }}
          >
            Progression de l&apos;équipe
          </h3>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span
            style={{
              background: "color-mix(in srgb, var(--ls-teal) 12%, transparent)",
              color: "var(--ls-teal)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
            }}
          >
            {totalCompleted} terminés
          </span>
          <span
            style={{
              background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
              color: "var(--ls-gold)",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, transparent)",
            }}
          >
            {totalStarted}/{totalActive} démarrés
          </span>
        </div>
      </div>

      {/* PODIUM */}
      <PodiumTop3 entries={top3} accent="gold" scoreSuffix="%" currentUserId={currentUser?.id} />

      {/* À ta place card (si user dans la liste) */}
      {currentUserRow && (
        <YourPlaceCard
          rank={currentUserIdx + 1}
          total={totalActive}
          score={currentUserRow.percentComplete}
          scoreOfPrevious={previousRow?.percentComplete}
          nameOfPrevious={previousRow?.userName}
          scoreSuffix="%"
          accent="gold"
          topMessage="Tu es leader Academy ! Continue d'inspirer l'équipe 🔥"
        />
      )}

      {/* Liste reste de l'equipe (rangs 4+) */}
      {rest.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              fontWeight: 700,
              color: "var(--ls-text-muted)",
              fontFamily: "DM Sans, sans-serif",
              marginBottom: 8,
              paddingBottom: 6,
              borderBottom: "0.5px dashed var(--ls-border)",
            }}
          >
            Reste de l&apos;équipe ({rest.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {rest.map((row, idx) => {
              const status = statusLabel(row);
              const sectionLabel = currentSectionLabel(row);
              const isCurrentUser = currentUser?.id === row.userId;
              return (
                // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only
                <div
                  key={row.userId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    background: isCurrentUser
                      ? "color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface2))"
                      : "var(--ls-surface2)",
                    borderRadius: 12,
                    border: isCurrentUser
                      ? "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)"
                      : "0.5px solid var(--ls-border)",
                    borderLeft: isCurrentUser ? "3px solid var(--ls-gold)" : undefined,
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px -6px rgba(0,0,0,0.12)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  {/* Rank */}
                  <div
                    style={{
                      width: 32,
                      flexShrink: 0,
                      fontFamily: "Syne, serif",
                      fontSize: 13,
                      fontWeight: 800,
                      color: "var(--ls-text-hint)",
                      textAlign: "center",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    #{idx + 4}
                  </div>

                  {/* Avatar mini */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                      borderRadius: 999,
                      background: row.completedAt
                        ? "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #000) 100%)"
                        : "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 18%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontFamily: "Syne, serif",
                      fontWeight: 800,
                      color: row.completedAt ? "#FFFFFF" : "var(--ls-gold)",
                      border: row.completedAt ? "none" : "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {getInitials(row.userName)}
                  </div>

                  {/* Nom + meta */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--ls-text)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontFamily: "DM Sans, sans-serif",
                      }}
                    >
                      {row.userName}
                      {isCurrentUser && (
                        <span
                          style={{
                            marginLeft: 6,
                            fontSize: 9.5,
                            fontWeight: 800,
                            padding: "1px 6px",
                            borderRadius: 999,
                            background: "var(--ls-gold)",
                            color: "#FFFFFF",
                            letterSpacing: 0.5,
                            verticalAlign: "middle",
                          }}
                        >
                          TOI
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--ls-text-muted)", marginTop: 2, fontFamily: "DM Sans, sans-serif" }}>
                      {row.userRole === "admin" ? "Admin" : row.userRole === "referent" ? "Coach référent" : "Distributeur"}
                      {" · "}
                      {relativeTime(row.lastActiveAt)}
                      {sectionLabel && <> · 📍 {sectionLabel}</>}
                    </div>
                  </div>

                  {/* Sparkline sections */}
                  <SectionsSparkline
                    lastStep={row.lastStep}
                    total={row.totalSections || ACADEMY_SECTIONS.length}
                    color={row.completedAt ? "#2DD4BF" : "#EF9F27"}
                  />

                  {/* Status pill */}
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: status.bg,
                      color: status.color,
                      fontWeight: 700,
                      fontFamily: "DM Sans, sans-serif",
                      flexShrink: 0,
                      minWidth: 64,
                      textAlign: "center",
                      border: `0.5px solid ${status.border}`,
                    }}
                  >
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
