// MonthlySeasonCard V2 PODIUM (2026-04-29).
// Refonte gamification : podium top 3 saison + Ta place card +
// liste reste de l'equipe rangs 4+.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import { useAppContext } from "../../../context/AppContext";
import { PodiumTop3, type PodiumEntry } from "../../../components/gamification/PodiumTop3";
import { YourPlaceCard } from "../../../components/gamification/YourPlaceCard";

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function MonthlySeasonCard() {
  const [state, setState] = useState<State>({ loading: true, error: null, rows: [] });
  const { currentUser } = useAppContext();

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
        const list = Array.isArray(data)
          ? (data as Array<{ user_id: string; user_name: string; bilans_count: number; clients_count: number; score: number; rank: number }>)
          : [];
        const rows: Row[] = list.map((r) => ({
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

  const top3: (PodiumEntry | null)[] = state.rows.slice(0, 3).map((r) => ({
    userId: r.userId,
    userName: r.userName,
    score: r.score,
    subtitle: `${r.bilansCount} bilan${r.bilansCount > 1 ? "s" : ""} · ${r.clientsCount} actif${r.clientsCount > 1 ? "s" : ""}`,
  }));
  while (top3.length < 3) top3.push(null);

  const rest = state.rows.slice(3);
  const total = state.rows.length;

  const currentUserIdx = currentUser
    ? state.rows.findIndex((r) => r.userId === currentUser.id)
    : -1;
  const currentUserRow = currentUserIdx >= 0 ? state.rows[currentUserIdx] : null;
  const previousRow = currentUserIdx > 0 ? state.rows[currentUserIdx - 1] : null;

  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        background: "var(--ls-surface)",
        border: "0.5px solid color-mix(in srgb, var(--ls-purple) 25%, var(--ls-border))",
        borderRadius: 20,
        padding: 18,
        boxShadow: "0 1px 0 0 rgba(167,139,250,0.10), 0 8px 24px -12px rgba(0,0,0,0.10)",
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
              color: "var(--ls-purple)",
              textTransform: "uppercase",
              letterSpacing: 1.6,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 999, background: "var(--ls-purple)", boxShadow: "0 0 8px rgba(167,139,250,0.50)" }} />
            🏆 Saison · {currentMonthLabel()}
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
            Classement du mois
          </h3>
          <p style={{ fontSize: 11, color: "var(--ls-text-muted)", margin: "4px 0 0", fontFamily: "DM Sans, sans-serif" }}>
            Score = bilans × 10 + clients actifs
          </p>
        </div>
        <span
          style={{
            background: "color-mix(in srgb, var(--ls-purple) 12%, transparent)",
            color: "var(--ls-purple)",
            padding: "4px 10px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            fontFamily: "DM Sans, sans-serif",
            border: "0.5px solid color-mix(in srgb, var(--ls-purple) 35%, transparent)",
          }}
        >
          ⏱️ {getDaysUntilNextMonth()} j avant fin saison
        </span>
      </div>

      {state.rows.length === 0 ? (
        <p
          style={{
            fontSize: 13,
            color: "var(--ls-text-muted)",
            textAlign: "center",
            padding: 24,
            fontStyle: "italic",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Aucune activité cette saison. À toi de la lancer 🚀
        </p>
      ) : (
        <>
          {/* PODIUM */}
          <PodiumTop3 entries={top3} accent="purple" scoreSuffix="pts" currentUserId={currentUser?.id} />

          {/* À ta place */}
          {currentUserRow && (
            <YourPlaceCard
              rank={currentUserIdx + 1}
              total={total}
              score={currentUserRow.score}
              scoreOfPrevious={previousRow?.score}
              nameOfPrevious={previousRow?.userName}
              scoreSuffix="pts"
              accent="purple"
              topMessage="Tu domines la saison ! 👑"
            />
          )}

          {/* Reste de l'equipe */}
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
                Reste du classement ({rest.length})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {rest.map((r) => {
                  const isCurrentUser = currentUser?.id === r.userId;
                  return (
                    <div
                      key={r.userId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        background: isCurrentUser
                          ? "color-mix(in srgb, var(--ls-purple) 8%, var(--ls-surface2))"
                          : "var(--ls-surface2)",
                        borderRadius: 12,
                        border: isCurrentUser
                          ? "0.5px solid color-mix(in srgb, var(--ls-purple) 40%, transparent)"
                          : "0.5px solid var(--ls-border)",
                        borderLeft: isCurrentUser ? "3px solid var(--ls-purple)" : undefined,
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
                        #{r.rank}
                      </div>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          flexShrink: 0,
                          borderRadius: 999,
                          background: "linear-gradient(135deg, color-mix(in srgb, var(--ls-purple) 18%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          fontFamily: "Syne, serif",
                          fontWeight: 800,
                          color: "var(--ls-purple)",
                          border: "0.5px solid color-mix(in srgb, var(--ls-purple) 30%, transparent)",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {getInitials(r.userName)}
                      </div>
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
                          {r.userName}
                          {isCurrentUser && (
                            <span
                              style={{
                                marginLeft: 6,
                                fontSize: 9.5,
                                fontWeight: 800,
                                padding: "1px 6px",
                                borderRadius: 999,
                                background: "var(--ls-purple)",
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
                          {r.bilansCount} bilan{r.bilansCount > 1 ? "s" : ""} · {r.clientsCount} actif{r.clientsCount > 1 ? "s" : ""}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "var(--ls-purple)",
                          fontFamily: "Syne, serif",
                          flexShrink: 0,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {r.score}
                        <span style={{ fontSize: 10, marginLeft: 2, opacity: 0.75 }}>pts</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
