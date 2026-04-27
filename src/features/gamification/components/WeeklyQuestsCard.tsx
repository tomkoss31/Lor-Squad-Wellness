// Gamification 3 - Quetes hebdo (2026-04-29).
// Card affichee sur le Co-pilote avec 3 quetes auto-validees a partir
// des compteurs hebdo du user (RPC get_weekly_progress).
// Reset chaque lundi (pas de cron, recalcul depuis week_start).

import { useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface QuestProgress {
  loading: boolean;
  error: string | null;
  bilans: number;
  messages: number;
  academy: number;
}

interface QuestDef {
  id: string;
  emoji: string;
  label: string;
  target: number;
  current: number;
}

export function WeeklyQuestsCard() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [data, setData] = useState<QuestProgress>({
    loading: true,
    error: null,
    bilans: 0,
    messages: 0,
    academy: 0,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data: rows, error } = await sb.rpc("get_weekly_progress", {
          p_user_id: userId,
        });
        if (cancelled) return;
        if (error) {
          setData((d) => ({ ...d, loading: false, error: error.message }));
          return;
        }
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        setData({
          loading: false,
          error: null,
          bilans: (row as { bilans_count?: number } | null)?.bilans_count ?? 0,
          messages: (row as { messages_count?: number } | null)?.messages_count ?? 0,
          academy: (row as { academy_sections_done_this_week?: number } | null)?.academy_sections_done_this_week ?? 0,
        });
      } catch (err) {
        if (!cancelled) {
          setData((d) => ({
            ...d,
            loading: false,
            error: err instanceof Error ? err.message : "unknown",
          }));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId || data.loading) return null;
  if (data.error) {
    // Silent fail si RPC pas dispo (migration non poussee)
    return null;
  }

  const quests: QuestDef[] = [
    { id: "bilans-3", emoji: "📋", label: "3 bilans cette semaine", target: 3, current: data.bilans },
    { id: "messages-5", emoji: "💬", label: "5 messages envoyés à tes clients", target: 5, current: data.messages },
    { id: "academy-1", emoji: "🎓", label: "1 section Academy travaillée", target: 1, current: data.academy },
  ];

  const completedCount = quests.filter((q) => q.current >= q.target).length;

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
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
          gap: 6,
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
            🎯 Tes quêtes de la semaine
          </p>
        </div>
        <span
          style={{
            background: completedCount === 3 ? "rgba(29,158,117,0.15)" : "rgba(184,146,42,0.15)",
            color: completedCount === 3 ? "#0F6E56" : "#5C4A0F",
            padding: "4px 10px",
            borderRadius: 8,
            fontSize: 11,
            fontWeight: 600,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {completedCount} / 3 réussies
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {quests.map((q) => {
          const completed = q.current >= q.target;
          const percent = Math.min(100, Math.round((q.current / q.target) * 100));
          return (
            <div
              key={q.id}
              style={{
                background: completed ? "rgba(29,158,117,0.07)" : "var(--ls-surface2)",
                border: completed ? "1px solid rgba(29,158,117,0.30)" : "0.5px solid var(--ls-border)",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{q.emoji}</span>
                <p
                  style={{
                    flex: 1,
                    margin: 0,
                    fontSize: 13,
                    fontWeight: 500,
                    color: completed ? "#0F6E56" : "var(--ls-text)",
                    textDecoration: completed ? "line-through" : "none",
                  }}
                >
                  {q.label}
                </p>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: completed ? "#1D9E75" : "#B8922A",
                    fontFamily: "DM Sans, sans-serif",
                    flexShrink: 0,
                  }}
                >
                  {completed ? "✓" : `${q.current} / ${q.target}`}
                </span>
              </div>
              {/* Progress bar */}
              <div
                style={{
                  height: 4,
                  background: "var(--ls-border)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percent}%`,
                    height: "100%",
                    background: completed
                      ? "linear-gradient(90deg, #1D9E75, #0F6E56)"
                      : "linear-gradient(90deg, #B8922A, #EF9F27)",
                    transition: "width 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
