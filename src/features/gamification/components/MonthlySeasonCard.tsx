// Gamification 4 - Saisons mensuelles (2026-04-29).
// Card affichee sur /team admin avec le classement de la saison du mois
// en cours (top 5). Reset auto chaque 1er du mois.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Row {
  userId: string;
  userName: string;
  bilansCount: number;
  clientsCount: number;
  score: number;
  rank: number;
}

interface State {
  loading: boolean;
  error: string | null;
  rows: Row[];
}

function getDaysUntilNextMonth(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function currentMonthLabel(): string {
  const now = new Date();
  return now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function MonthlySeasonCard() {
  const [state, setState] = useState<State>({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data, error } = await sb.rpc("get_monthly_seasons_leaderboard");
        if (cancelled) return;
        if (error) {
          setState({ loading: false, error: error.message, rows: [] });
          return;
        }
        const list = Array.isArray(data) ? (data as Array<{ user_id: string; user_name: string; bilans_count: number; clients_count: number; score: number; rank: number }>) : [];
        const rows: Row[] = list.slice(0, 5).map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          bilansCount: r.bilans_count,
          clientsCount: r.clients_count,
          score: r.score,
          rank: r.rank,
        }));
        setState({ loading: false, error: null, rows });
      } catch (err) {
        if (!cancelled) {
          setState({
            loading: false,
            error: err instanceof Error ? err.message : "unknown",
            rows: [],
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.loading || state.error) return null;

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(127,119,221,0.08), rgba(184,146,42,0.06))",
        border: "0.5px solid rgba(127,119,221,0.30)",
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
              color: "#6B6B62",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              margin: 0,
            }}
          >
            🏆 Saison · {currentMonthLabel()}
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
            Classement du mois
          </h3>
          <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: "4px 0 0" }}>
            Score = bilans × 10 + clients actifs
          </p>
        </div>
        <span
          style={{
            background: "rgba(127,119,221,0.15)",
            color: "#5e549f",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ⏱️ {getDaysUntilNextMonth()} j avant fin saison
        </span>
      </div>

      {state.rows.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "#6B6B62",
            textAlign: "center",
            padding: 16,
            fontStyle: "italic",
          }}
        >
          Aucune activité cette saison. À toi de la lancer.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {state.rows.map((r) => {
            const medal = r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : r.rank === 3 ? "🥉" : `#${r.rank}`;
            return (
              <div
                key={r.userId}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  background: "white",
                  borderRadius: 10,
                  border: "0.5px solid var(--ls-border)",
                }}
              >
                <div
                  style={{
                    width: 28,
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "DM Sans, sans-serif",
                    textAlign: "center",
                    color: r.rank <= 3 ? "#7F77DD" : "var(--ls-text-hint)",
                  }}
                >
                  {medal}
                </div>
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
                    {r.userName}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ls-text-muted)" }}>
                    {r.bilansCount} bilan{r.bilansCount > 1 ? "s" : ""} · {r.clientsCount} actif{r.clientsCount > 1 ? "s" : ""}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#7F77DD",
                    fontFamily: "Syne, serif",
                    flexShrink: 0,
                  }}
                >
                  {r.score} pts
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
