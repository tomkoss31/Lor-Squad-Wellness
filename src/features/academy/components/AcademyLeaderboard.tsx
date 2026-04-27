// Chantier Academy direction 7 (2026-04-28).
// Composant leaderboard Academy reserve aux admins. Liste des distri
// avec leur progression Academy, classes par % complete desc.

import { useAcademyLeaderboard } from "../hooks/useAcademyLeaderboard";

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
} {
  if (row.completedAt) {
    return { label: "Terminé", color: "#0F6E56", bg: "rgba(29,158,117,0.12)" };
  }
  if (row.skippedAt) {
    return { label: "Skippé", color: "#888780", bg: "rgba(0,0,0,0.06)" };
  }
  if (row.startedAt) {
    return { label: `${row.percentComplete} %`, color: "#5C4A0F", bg: "rgba(184,146,42,0.12)" };
  }
  return { label: "Pas commencé", color: "#888780", bg: "rgba(0,0,0,0.04)" };
}

export function AcademyLeaderboard() {
  const { loading, error, rows } = useAcademyLeaderboard();

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#6B6B62", fontSize: 13 }}>
        Chargement du leaderboard Academy…
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 16,
          background: "rgba(220,38,38,0.08)",
          border: "1px solid rgba(220,38,38,0.3)",
          borderRadius: 10,
          color: "#993556",
          fontSize: 13,
        }}
      >
        Impossible de charger le leaderboard Academy : {error}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <p style={{ fontSize: 13, color: "#6B6B62", textAlign: "center", padding: 16 }}>
        Pas encore de progression Academy dans l&apos;équipe.
      </p>
    );
  }

  const totalCompleted = rows.filter((r) => r.completedAt).length;
  const totalStarted = rows.filter((r) => r.startedAt).length;
  const totalActive = rows.length;

  return (
    <div
      style={{
        background: "var(--ls-surface)",
        border: "1px solid var(--ls-border)",
        borderRadius: 14,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 14,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <p
            style={{
              fontSize: 11,
              color: "var(--ls-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            Vue admin
          </p>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 18,
              fontWeight: 500,
              color: "var(--ls-text)",
              margin: "4px 0 0",
            }}
          >
            Progression Academy équipe
          </h3>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span
            style={{
              background: "rgba(29,158,117,0.12)",
              color: "#0F6E56",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {totalCompleted} terminés
          </span>
          <span
            style={{
              background: "rgba(184,146,42,0.12)",
              color: "#5C4A0F",
              padding: "4px 10px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            {totalStarted}/{totalActive} démarrés
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {rows.map((row, idx) => {
          const status = statusLabel(row);
          return (
            <div
              key={row.userId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                background: "var(--ls-surface2)",
                borderRadius: 10,
                border: "0.5px solid var(--ls-border)",
              }}
            >
              {/* Rank */}
              <div
                style={{
                  width: 22,
                  fontSize: 11,
                  color: idx < 3 ? "#B8922A" : "var(--ls-text-hint)",
                  fontWeight: 700,
                  fontFamily: "DM Sans, sans-serif",
                  textAlign: "center",
                }}
              >
                {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `#${idx + 1}`}
              </div>

              {/* Nom + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ls-text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.userName}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ls-text-muted)" }}>
                  {row.userRole === "admin"
                    ? "Admin"
                    : row.userRole === "referent"
                      ? "Coach référent"
                      : "Distributeur"}
                  {" · Dernière activité "}
                  {relativeTime(row.lastActiveAt)}
                </p>
              </div>

              {/* Barre progression mini */}
              <div
                style={{
                  width: 80,
                  height: 6,
                  background: "var(--ls-border)",
                  borderRadius: 3,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: `${row.percentComplete}%`,
                    height: "100%",
                    background: row.completedAt
                      ? "linear-gradient(90deg, #1D9E75, #0F6E56)"
                      : "linear-gradient(90deg, #B8922A, #EF9F27)",
                    transition: "width 800ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>

              {/* Status */}
              <span
                style={{
                  fontSize: 11,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: status.bg,
                  color: status.color,
                  fontWeight: 600,
                  fontFamily: "DM Sans, sans-serif",
                  flexShrink: 0,
                  minWidth: 70,
                  textAlign: "center",
                }}
              >
                {status.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
