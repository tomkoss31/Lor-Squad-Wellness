// Gamification 2 - Challenge hebdo bilans (2026-04-29).
// Card affichee sur /team admin avec le top 5 distri par nb bilans cette
// semaine. Resetté automatiquement chaque lundi 00:00 (RPC date_trunc).

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface Row {
  userId: string;
  userName: string;
  bilanCount: number;
  rank: number;
}

interface State {
  loading: boolean;
  error: string | null;
  rows: Row[];
}

function getDaysUntilNextMonday(): number {
  const now = new Date();
  const day = now.getDay() || 7; // 0=dim => 7
  const daysToNext = day === 1 ? 7 : 8 - day;
  return daysToNext;
}

export function WeeklyBilansChallenge() {
  const [state, setState] = useState<State>({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) setState({ loading: false, error: "supabase_unavailable", rows: [] });
          return;
        }
        const { data, error } = await sb.rpc("get_weekly_bilans_leaderboard");
        if (cancelled) return;
        if (error) {
          setState({ loading: false, error: error.message, rows: [] });
          return;
        }
        const list = Array.isArray(data) ? (data as Array<{ user_id: string; user_name: string; bilan_count: number; rank: number }>) : [];
        const rows: Row[] = list.slice(0, 5).map((r) => ({
          userId: r.user_id,
          userName: r.user_name,
          bilanCount: r.bilan_count,
          rank: r.rank,
        }));
        setState({ loading: false, error: null, rows });
      } catch (err) {
        if (cancelled) return;
        setState({
          loading: false,
          error: err instanceof Error ? err.message : "unknown",
          rows: [],
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const daysLeft = getDaysUntilNextMonday();

  if (state.loading) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: "#6B6B62", fontSize: 13 }}>
        Chargement du challenge…
      </div>
    );
  }

  if (state.error) {
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
        Challenge bilans indisponible : {state.error}
      </div>
    );
  }

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(184,146,42,0.08), rgba(216,90,48,0.06))",
        border: "0.5px solid rgba(184,146,42,0.30)",
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
            🏆 Challenge de la semaine
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
            Plus de bilans
          </h3>
        </div>
        <span
          style={{
            background: "rgba(184,146,42,0.15)",
            color: "#5C4A0F",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ⏱️ J-{daysLeft} avant reset
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
          Aucun bilan créé cette semaine. Sois le premier !
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
                    color: r.rank <= 3 ? "#B8922A" : "var(--ls-text-hint)",
                  }}
                >
                  {medal}
                </div>
                <p
                  style={{
                    flex: 1,
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
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#B8922A",
                    fontFamily: "DM Sans, sans-serif",
                  }}
                >
                  {r.bilanCount} bilan{r.bilanCount > 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
