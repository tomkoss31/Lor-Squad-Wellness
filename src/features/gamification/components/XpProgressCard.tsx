// Gamification 5 - Systeme XP (2026-04-29).
// Card affichee sur la fiche profil (ParametresPage > onglet Profil)
// avec le niveau global du user, sa barre XP et le breakdown des
// sources (Academy / Bilans / RDV / Messages).
//
// Polish 2026-04-28 : ajout panel "Comment ca marche ?" pliable qui
// explicite les XP gagnees par action + les seuils de niveaux.
// Migration des couleurs hardcodees vers var(--ls-*) pour dark mode.

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
  // Daily login XP (V2 — 2026-04-29) : lifetime_login_count * 5
  dailyXp: number;
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

// Synchro avec migration 20260429140000_user_xp_system.sql.
// Source de verite : la RPC get_user_xp(). Ces constantes servent
// uniquement a expliciter les regles dans l UI "Comment ca marche".
const XP_RULES = [
  {
    emoji: "🎓",
    label: "Section Academy complétée",
    xp: 50,
    cap: "max 12 sections = 600 XP",
  },
  {
    emoji: "📋",
    label: "Bilan initial créé",
    xp: 10,
    cap: "par client créé",
  },
  {
    emoji: "📅",
    label: "RDV planifié",
    xp: 5,
    cap: "par follow-up scheduled",
  },
  {
    emoji: "💬",
    label: "Message coach envoyé",
    xp: 2,
    cap: "par message dans la messagerie interne",
  },
  {
    emoji: "🔥",
    label: "Connexion quotidienne",
    xp: 5,
    cap: "1 fois par jour, jamais reset",
  },
  {
    emoji: "📚",
    label: "Module Formation validé",
    xp: 10,
    cap: "+50 bonus si quiz QCM 100% (validation auto)",
  },
];

// Niveaux : level = floor(sqrt(xp / 100)) + 1.
// Seuil pour atteindre niveau N = (N - 1)² × 100.
const LEVEL_THRESHOLDS = [
  { level: 1, title: "Apprenti", from: 0, hint: "Tu démarres ton parcours" },
  { level: 2, title: "Distributeur actif", from: 100, hint: "Tu connais l'app" },
  { level: 3, title: "Coach confirmé", from: 400, hint: "Tu suis tes premiers clients" },
  { level: 4, title: "Mentor", from: 900, hint: "Tu inspires ton équipe" },
  { level: 5, title: "Expert", from: 1600, hint: "Tu maîtrises tous les flows" },
  { level: 6, title: "Pilier", from: 2500, hint: "Tu portes le club" },
  { level: 7, title: "Légende", from: 3600, hint: "Référence du réseau" },
];

function levelTitle(level: number): string {
  return LEVEL_TITLES[level] ?? `Niveau ${level}`;
}

export function XpProgressCard() {
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [showHelp, setShowHelp] = useState(false);
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
    dailyXp: 0,
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
          // V3 (2026-04-29) : log l'erreur pour debug (avant elle etait silencieuse)
          console.warn("[XpProgressCard] RPC get_user_xp failed:", error.message);
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
          dailyXp: (row as { daily_xp?: number }).daily_xp ?? 0,
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

  if (!userId) return null;
  if (data.loading) {
    return (
      <div
        style={{
          padding: 20,
          background: "linear-gradient(135deg, rgba(184,146,42,0.06), rgba(127,119,221,0.04))",
          border: "1px solid rgba(184,146,42,0.20)",
          borderRadius: 14,
          fontSize: 13,
          color: "var(--ls-text-muted)",
          textAlign: "center",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        Chargement de tes XP…
      </div>
    );
  }
  // V3 (2026-04-29) : afficher l'erreur au lieu de cacher silencieusement.
  if (data.error) {
    return (
      <div
        style={{
          padding: 16,
          background: "color-mix(in srgb, var(--ls-coral) 8%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-coral) 35%, transparent)",
          borderRadius: 12,
          color: "var(--ls-coral)",
          fontSize: 12.5,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ⚠️ Impossible de charger tes XP : {data.error}
      </div>
    );
  }

  const prevLevelThreshold = (data.level - 1) * (data.level - 1) * 100;
  const xpInLevel = data.totalXp - prevLevelThreshold;
  const xpRange = data.xpForNextLevel - prevLevelThreshold;
  const percentInLevel = Math.min(100, Math.max(0, Math.round((xpInLevel / xpRange) * 100)));

  const sources = [
    { label: "Academy", emoji: "🎓", value: data.academyXp, color: "var(--ls-gold)" },
    { label: "Bilans créés", emoji: "📋", value: data.bilansXp, color: "var(--ls-teal)" },
    { label: "RDV", emoji: "📅", value: data.rdvXp, color: "var(--ls-purple)" },
    { label: "Messages", emoji: "💬", value: data.messagesXp, color: "var(--ls-coral)" },
    { label: "Connexions", emoji: "🔥", value: data.dailyXp, color: "var(--ls-gold)" },
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
              background: "var(--ls-surface)",
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

      {/* Panel "Comment ca marche" — pliable, default ferme. */}
      <div
        style={{
          marginTop: 14,
          paddingTop: 12,
          borderTop: "0.5px dashed var(--ls-border)",
        }}
      >
        <button
          type="button"
          onClick={() => setShowHelp((v) => !v)}
          aria-expanded={showHelp}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted)",
            fontSize: 12,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
            cursor: "pointer",
            padding: 0,
          }}
        >
          <span>ℹ️ Comment ça marche ?</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>{showHelp ? "▲" : "▼"}</span>
        </button>

        {showHelp ? (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {/* Block 1 : Comment gagner des XP */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "var(--ls-text-hint)",
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                Comment gagner des XP
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                {XP_RULES.map((rule) => (
                  <div
                    key={rule.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      background: "var(--ls-surface2)",
                      border: "0.5px solid var(--ls-border)",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{rule.emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "var(--ls-text)",
                          fontFamily: "DM Sans, sans-serif",
                        }}
                      >
                        {rule.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--ls-text-muted)",
                          marginTop: 1,
                        }}
                      >
                        {rule.cap}
                      </div>
                    </div>
                    <span
                      style={{
                        fontFamily: "Syne, serif",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--ls-gold)",
                        flexShrink: 0,
                      }}
                    >
                      +{rule.xp} XP
                    </span>
                  </div>
                ))}
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--ls-text-hint)",
                  margin: "8px 0 0",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                Les XP sont recalculés en live à chaque action — pas de stockage,
                pas de drift. Refresh la page pour voir l'update après un bilan,
                un RDV ou un message.
              </p>
            </div>

            {/* Block 2 : Les niveaux */}
            <div>
              <p
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "var(--ls-text-hint)",
                  fontWeight: 700,
                  margin: "0 0 8px",
                }}
              >
                Les 7 niveaux
              </p>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {LEVEL_THRESHOLDS.map((lv) => {
                  const isCurrent = lv.level === data.level;
                  const isReached = data.totalXp >= lv.from;
                  return (
                    <div
                      key={lv.level}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 10px",
                        background: isCurrent
                          ? "color-mix(in srgb, var(--ls-gold) 14%, transparent)"
                          : "var(--ls-surface2)",
                        border: isCurrent
                          ? "0.5px solid var(--ls-gold)"
                          : "0.5px solid var(--ls-border)",
                        borderRadius: 8,
                        opacity: isReached ? 1 : 0.55,
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "Syne, serif",
                          fontSize: 12,
                          fontWeight: 700,
                          color: isCurrent ? "var(--ls-gold)" : "var(--ls-text-muted)",
                          width: 24,
                          flexShrink: 0,
                        }}
                      >
                        L{lv.level}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--ls-text)",
                          }}
                        >
                          {lv.title}
                          {isCurrent ? (
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 9,
                                fontWeight: 700,
                                letterSpacing: 0.4,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: "var(--ls-gold)",
                                color: "var(--ls-bg)",
                              }}
                            >
                              TON NIVEAU
                            </span>
                          ) : null}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: "var(--ls-text-muted)",
                            marginTop: 1,
                          }}
                        >
                          {lv.hint}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 10,
                          color: "var(--ls-text-hint)",
                          fontFamily: "DM Sans, sans-serif",
                          fontWeight: 600,
                          flexShrink: 0,
                        }}
                      >
                        {lv.from.toLocaleString("fr-FR")} XP
                      </span>
                    </div>
                  );
                })}
              </div>
              <p
                style={{
                  fontSize: 10,
                  color: "var(--ls-text-hint)",
                  margin: "8px 0 0",
                  lineHeight: 1.5,
                  fontStyle: "italic",
                }}
              >
                Formule : seuil pour atteindre le niveau N = (N − 1)² × 100. Plus
                tu montes, plus l'écart se creuse — la régularité paie.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
