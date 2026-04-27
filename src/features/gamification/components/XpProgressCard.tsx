// Gamification 5 - Systeme XP (2026-04-29).
// Card affichee sur la fiche profil (ParametresPage > onglet Profil)
// avec le niveau global du user, sa barre XP et le breakdown des
// sources (Academy / Bilans / RDV / Messages).

import { useEffect, useState } from "react";
import { useAppContext } from "../../../context/AppContext";
import { getSupabaseClient } from "../../../services/supabaseClient";

interface XpData {
  loading: boolean;
  error: string | null;
  totalXp: number;
  level: number;
  xpForNextLevel: number;
  academyXp: number;
  bilansXp: number;
  rdvXp: number;
  messagesXp: number;
}

const LEVEL_TITLES: Record<number, string> = {
  1: "Apprenti",
  2: "Distributeur actif",
  3: "Coach confirmé",
  4: "Mentor",
  5: "Expert",
  6: "Pilier",
  7: "Légende",
};

function levelTitle(level: number): string {
  return LEVEL_TITLES[level] ?? `Niveau ${level}`;
}

export function XpProgressCard() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [data, setData] = useState<XpData>({
    loading: true,
    error: null,
    totalXp: 0,
    level: 1,
    xpForNextLevel: 100,
    academyXp: 0,
    bilansXp: 0,
    rdvXp: 0,
    messagesXp: 0,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) return;
        const { data: rows, error } = await sb.rpc("get_user_xp", { p_user_id: userId });
        if (cancelled) return;
        if (error) {
          setData((d) => ({ ...d, loading: false, error: error.message }));
          return;
        }
        const row = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
        if (!row) {
          setData((d) => ({ ...d, loading: false }));
          return;
        }
        setData({
          loading: false,
          error: null,
          totalXp: (row as { total_xp?: number }).total_xp ?? 0,
          level: (row as { level?: number }).level ?? 1,
          xpForNextLevel: (row as { xp_for_next_level?: number }).xp_for_next_level ?? 100,
          academyXp: (row as { academy_xp?: number }).academy_xp ?? 0,
          bilansXp: (row as { bilans_xp?: number }).bilans_xp ?? 0,
          rdvXp: (row as { rdv_xp?: number }).rdv_xp ?? 0,
          messagesXp: (row as { messages_xp?: number }).messages_xp ?? 0,
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

  if (!userId || data.loading || data.error) return null;

  const prevLevelThreshold = (data.level - 1) * (data.level - 1) * 100;
  const xpInLevel = data.totalXp - prevLevelThreshold;
  const xpRange = data.xpForNextLevel - prevLevelThreshold;
  const percentInLevel = Math.min(100, Math.max(0, Math.round((xpInLevel / xpRange) * 100)));

  const sources = [
    { label: "Academy", emoji: "🎓", value: data.academyXp, color: "#B8922A" },
    { label: "Bilans créés", emoji: "📋", value: data.bilansXp, color: "#1D9E75" },
    { label: "RDV", emoji: "📅", value: data.rdvXp, color: "#7F77DD" },
    { label: "Messages", emoji: "💬", value: data.messagesXp, color: "#D85A30" },
  ];

  return (
    <div
      style={{
        background: "linear-gradient(135deg, rgba(184,146,42,0.08), rgba(127,119,221,0.06))",
        border: "1px solid rgba(184,146,42,0.30)",
        borderRadius: 14,
        padding: 20,
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
            ⚔️ Ta progression
          </p>
          <h3
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 500,
              color: "var(--ls-text)",
              margin: "4px 0 0",
            }}
          >
            Niveau {data.level} · {levelTitle(data.level)}
          </h3>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #EF9F27, #BA7517)",
            color: "white",
            padding: "8px 16px",
            borderRadius: 10,
            fontFamily: "Syne, serif",
            fontSize: 22,
            fontWeight: 700,
            boxShadow: "0 4px 12px rgba(186,117,23,0.30)",
          }}
        >
          {data.totalXp.toLocaleString("fr-FR")} XP
        </div>
      </div>

      {/* Barre progression dans le niveau */}
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "var(--ls-text-muted)",
            marginBottom: 6,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          <span>{xpInLevel} / {xpRange} XP</span>
          <span>
            Niveau {data.level + 1} dans {data.xpForNextLevel - data.totalXp} XP
          </span>
        </div>
        <div
          style={{
            height: 10,
            background: "var(--ls-border)",
            borderRadius: 5,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percentInLevel}%`,
              height: "100%",
              background: "linear-gradient(90deg, #B8922A, #EF9F27)",
              transition: "width 800ms cubic-bezier(0.4, 0, 0.2, 1)",
              boxShadow: "0 0 8px rgba(239,159,39,0.45)",
            }}
          />
        </div>
      </div>

      {/* Breakdown sources */}
      <p
        style={{
          fontSize: 11,
          color: "var(--ls-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          margin: "0 0 8px",
          fontWeight: 600,
        }}
      >
        D&apos;où viennent tes XP
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 8,
        }}
      >
        {sources.map((s) => (
          <div
            key={s.label}
            style={{
              background: "white",
              border: "0.5px solid var(--ls-border)",
              borderRadius: 10,
              padding: "10px 12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>{s.emoji}</span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--ls-text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  fontWeight: 600,
                }}
              >
                {s.label}
              </span>
            </div>
            <p
              style={{
                fontFamily: "Syne, serif",
                fontSize: 16,
                fontWeight: 600,
                color: s.color,
                margin: 0,
              }}
            >
              {s.value.toLocaleString("fr-FR")} XP
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
