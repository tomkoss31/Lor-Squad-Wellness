// =============================================================================
// ClientXpStatsCard — vue coach des XP d un client (chantier 2026-05-08)
// =============================================================================
//
// Affiche sur la fiche client coach (/clients/:id) :
//   - Niveau actuel + badge tone (bronze/silver/gold/diamond)
//   - Total XP + barre progression vers prochain palier
//   - 5 derniers events XP gagnes
//
// Source : RPC get_client_xp_stats(p_client_id) — auth admin OR referent.
// =============================================================================

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import { CLIENT_XP_LEVELS, getXpAction, type ClientXpActionKey } from "./actions";

interface RecentEvent {
  action_key: ClientXpActionKey;
  xp_amount: number;
  created_at: string;
}

interface XpStats {
  total_xp: number;
  level: number;
  level_title: string;
  prev_threshold: number;
  next_threshold: number;
  xp_in_level: number;
  xp_to_next: number;
  recent_events: RecentEvent[];
}

interface Props {
  clientId: string;
}

const TONE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: "color-mix(in srgb, #94A3B8 12%, transparent)",
    text: "#64748B",
    border: "color-mix(in srgb, #94A3B8 30%, transparent)",
  },
  bronze: {
    bg: "color-mix(in srgb, #B8922A 14%, transparent)",
    text: "#A87132",
    border: "color-mix(in srgb, #B8922A 32%, transparent)",
  },
  silver: {
    bg: "color-mix(in srgb, #94A3B8 14%, transparent)",
    text: "#475569",
    border: "color-mix(in srgb, #94A3B8 32%, transparent)",
  },
  gold: {
    bg: "color-mix(in srgb, #B8922A 16%, transparent)",
    text: "#B8922A",
    border: "color-mix(in srgb, #B8922A 36%, transparent)",
  },
  diamond: {
    bg: "color-mix(in srgb, #8B5CF6 14%, transparent)",
    text: "#8B5CF6",
    border: "color-mix(in srgb, #8B5CF6 32%, transparent)",
  },
};

function timeAgoFr(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `il y a ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} j`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `il y a ${weeks} sem.`;
  const months = Math.floor(days / 30);
  return `il y a ${months} mois`;
}

export function ClientXpStatsCard({ clientId }: Props) {
  const [stats, setStats] = useState<XpStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          setError("supabase_unavailable");
          setLoading(false);
          return;
        }
        const { data, error: rpcErr } = await sb.rpc("get_client_xp_stats", {
          p_client_id: clientId,
        });
        if (cancelled) return;
        if (rpcErr) {
          setError(rpcErr.message);
          setLoading(false);
          return;
        }
        const payload = (data ?? {}) as Partial<XpStats> & { error?: string };
        if (payload.error) {
          setError(payload.error);
          setLoading(false);
          return;
        }
        setStats({
          total_xp: payload.total_xp ?? 0,
          level: payload.level ?? 1,
          level_title: payload.level_title ?? "Débutant.e",
          prev_threshold: payload.prev_threshold ?? 0,
          next_threshold: payload.next_threshold ?? 100,
          xp_in_level: payload.xp_in_level ?? 0,
          xp_to_next: payload.xp_to_next ?? 100,
          recent_events: payload.recent_events ?? [],
        });
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "unknown");
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div style={cardStyle}>
        <div style={{ color: "var(--ls-text-muted)", fontSize: 13 }}>
          Chargement XP…
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div style={cardStyle}>
        <div style={{ color: "var(--ls-text-muted)", fontSize: 13 }}>
          XP indisponibles {error ? `(${error})` : ""}
        </div>
      </div>
    );
  }

  const levelDef = CLIENT_XP_LEVELS.find((l) => l.level === stats.level);
  const tone = levelDef?.tone ?? "neutral";
  const tc = TONE_COLORS[tone] ?? TONE_COLORS.neutral;

  // Barre progression : si max level → toujours plein
  const progressPct = stats.next_threshold === stats.prev_threshold
    ? 100
    : Math.round(((stats.total_xp - stats.prev_threshold) / (stats.next_threshold - stats.prev_threshold)) * 100);

  return (
    <div style={cardStyle}>
      {/* Halo decoratif G3 emerald top-right */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          background:
            "radial-gradient(circle, color-mix(in srgb, #10B981 20%, transparent), transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
          filter: "blur(6px)",
        }}
      />

      {/* Header : eyebrow + level badge */}
      <div style={headerStyle}>
        <div style={eyebrowStyle}>✨ Activité du client · XP</div>
        <div
          style={{
            ...badgeStyle,
            background: tc.bg,
            color: tc.text,
            borderColor: tc.border,
          }}
        >
          <span aria-hidden="true">{levelDef?.badge ?? "🌱"}</span>
          <span>Niveau {stats.level}</span>
          <span style={{ opacity: 0.7 }}>· {stats.level_title}</span>
        </div>
      </div>

      {/* Total XP + progression */}
      <div style={mainStatStyle}>
        <div style={totalXpValueStyle}>
          {stats.total_xp.toLocaleString("fr-FR")}
          <span style={{ fontSize: 16, fontWeight: 500, color: "var(--ls-text-muted)", marginLeft: 6 }}>
            XP
          </span>
        </div>
        <div style={progressLabelStyle}>
          {stats.next_threshold === stats.prev_threshold
            ? "Niveau max atteint 💎"
            : `Encore ${stats.xp_to_next} XP avant le palier ${stats.level + 1}`}
        </div>
      </div>

      {/* Barre progression gradient G3 */}
      <div style={progressBarWrap}>
        <div
          style={{
            ...progressBarFill,
            width: `${Math.max(2, progressPct)}%`,
          }}
        />
      </div>

      {/* Recent events list */}
      {stats.recent_events.length > 0 ? (
        <div style={eventsListStyle}>
          <div style={{ ...eyebrowStyle, marginBottom: 8 }}>
            ⏱ Derniers gains
          </div>
          {stats.recent_events.slice(0, 5).map((ev, idx) => {
            const def = getXpAction(ev.action_key);
            return (
              <div key={`${ev.created_at}-${idx}`} style={eventRowStyle}>
                <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">
                  {def?.emoji ?? "✨"}
                </span>
                <span style={{ flex: 1, color: "var(--ls-text)", fontWeight: 500 }}>
                  {def?.label ?? ev.action_key}
                </span>
                <span style={{ color: "var(--ls-text-muted)", fontSize: 11, fontFamily: "var(--lb360-mono, monospace)" }}>
                  {timeAgoFr(ev.created_at)}
                </span>
                <span style={eventXpBadgeStyle}>+{ev.xp_amount}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ marginTop: 16, fontSize: 12, color: "var(--ls-text-muted)", fontStyle: "italic" }}>
          Aucune activité XP encore enregistrée. Encourage le client à explorer son espace.
        </div>
      )}
    </div>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  position: "relative",
  isolation: "isolate",
  overflow: "hidden",
  background: "var(--lb360-card-emerald, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, #10B981 18%, var(--ls-border))",
  borderRadius: 16,
  padding: "18px 20px",
  boxShadow:
    "0 1px 2px rgba(15,23,42,0.04), 0 12px 28px -14px rgba(15,23,42,0.10)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 14,
  position: "relative",
  zIndex: 1,
};

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 500,
  color: "var(--ls-text-muted)",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "5px 12px",
  borderRadius: 999,
  border: "1px solid",
  fontSize: 12,
  fontWeight: 700,
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
};

const mainStatStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  marginBottom: 12,
};

const totalXpValueStyle: React.CSSProperties = {
  fontFamily: "var(--lb360-display, 'Sora', sans-serif)",
  fontSize: 36,
  fontWeight: 800,
  letterSpacing: "-0.025em",
  lineHeight: 1,
  background:
    "var(--lb360-gradient, linear-gradient(135deg, #10B981 0%, #06B6D4 50%, #8B5CF6 100%))",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  display: "inline-block",
  paddingRight: 4,
};

const progressLabelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  marginTop: 4,
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
};

const progressBarWrap: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  height: 8,
  borderRadius: 999,
  background: "color-mix(in srgb, var(--ls-text) 5%, transparent)",
  overflow: "hidden",
  marginBottom: 14,
};

const progressBarFill: React.CSSProperties = {
  height: "100%",
  background:
    "var(--lb360-gradient, linear-gradient(90deg, #10B981, #06B6D4, #8B5CF6))",
  borderRadius: 999,
  boxShadow: "0 1px 6px color-mix(in srgb, #06B6D4 50%, transparent)",
  transition: "width 0.6s ease",
};

const eventsListStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  display: "flex",
  flexDirection: "column",
  gap: 6,
  marginTop: 8,
  paddingTop: 14,
  borderTop: "1px solid color-mix(in srgb, var(--ls-text) 8%, transparent)",
};

const eventRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "6px 4px",
  fontSize: 13,
  fontFamily: "var(--lb360-body, 'Inter', sans-serif)",
};

const eventXpBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 8px",
  borderRadius: 999,
  background: "color-mix(in srgb, #10B981 14%, transparent)",
  color: "color-mix(in srgb, #10B981 75%, var(--ls-text))",
  border: "1px solid color-mix(in srgb, #10B981 28%, transparent)",
  fontSize: 11,
  fontWeight: 700,
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  flexShrink: 0,
};
