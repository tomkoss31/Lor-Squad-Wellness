// PodiumTop3 — composant podium reutilisable pour les leaderboards (2026-04-29).
//
// 3 marches alignees au bas avec hauteurs differentes (1er au centre + grand,
// 2e gauche moyen, 3e droite plus petit). Avatars circulaires au-dessus,
// crown 👑 sur le leader, particles animees autour, scores en grand.
//
// Usage :
//   <PodiumTop3 entries={top3} accent="gold" scoreSuffix="%" />
//
// `entries` doit etre dans l'ordre [1er, 2e, 3e]. Si moins de 3 entries,
// les marches manquantes sont rendues vides ("—").

import { useEffect, useRef, useState } from "react";

export type PodiumAccent = "gold" | "purple" | "teal" | "coral";

const ACCENT_MAP: Record<PodiumAccent, { primary: string; secondary: string; cssVar: string }> = {
  gold:   { primary: "#EF9F27", secondary: "#BA7517", cssVar: "var(--ls-gold)" },
  purple: { primary: "#A78BFA", secondary: "#7F77DD", cssVar: "var(--ls-purple)" },
  teal:   { primary: "#2DD4BF", secondary: "#0F6E56", cssVar: "var(--ls-teal)" },
  coral:  { primary: "#FB7185", secondary: "#DC2626", cssVar: "var(--ls-coral)" },
};

const MEDAL_COLORS = {
  1: { bg: "linear-gradient(135deg, #FFD89B 0%, #C9A84C 50%, #5C3A05 100%)", glow: "rgba(239,159,39,0.55)" },
  2: { bg: "linear-gradient(135deg, #E5E7EB 0%, #9CA3AF 50%, #4B5563 100%)", glow: "rgba(156,163,175,0.45)" },
  3: { bg: "linear-gradient(135deg, #FCD9A1 0%, #B87333 50%, #5C2D02 100%)", glow: "rgba(184,115,51,0.45)" },
};

export interface PodiumEntry {
  userId: string;
  userName: string;
  /** Score affiche en grand (ex: 87, 1240, 12) */
  score: number;
  /** Sous-label optionnel (ex: "Coach referent", "8 bilans") */
  subtitle?: string;
}

export interface PodiumTop3Props {
  entries: (PodiumEntry | null)[]; // [1er, 2e, 3e]
  /** Couleur accent du podium (gold pour Academy, purple pour Saison, etc) */
  accent: PodiumAccent;
  /** Suffixe de score affiche apres le nombre (% / pts / bilans / etc) */
  scoreSuffix?: string;
  /** ID utilisateur courant pour highlight */
  currentUserId?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function PodiumTop3({ entries, accent, scoreSuffix = "", currentUserId }: PodiumTop3Props) {
  const accentColor = ACCENT_MAP[accent];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Reveal anim au scroll into view (IntersectionObserver)
  useEffect(() => {
    if (!containerRef.current) return;
    const node = containerRef.current;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setRevealed(true);
          obs.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  // Heights : 1er = 130, 2e = 100, 3e = 80
  const stepHeights = { 1: 130, 2: 100, 3: 80 };
  // Order de rendu : [2e, 1er, 3e] pour que le 1er soit visuellement au centre
  const orderForRender: Array<{ rank: 1 | 2 | 3; entry: PodiumEntry | null }> = [
    { rank: 2, entry: entries[1] ?? null },
    { rank: 1, entry: entries[0] ?? null },
    { rank: 3, entry: entries[2] ?? null },
  ];

  return (
    <>
      <style>{`
        @keyframes ls-podium-rise {
          from { opacity: 0; transform: translateY(20px) scaleY(0.4); transform-origin: bottom; }
          to   { opacity: 1; transform: translateY(0) scaleY(1); }
        }
        @keyframes ls-podium-pop {
          0%   { opacity: 0; transform: scale(0.6); }
          60%  { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ls-podium-crown-float {
          0%, 100% { transform: translateY(0) rotate(-4deg); }
          50%      { transform: translateY(-6px) rotate(4deg); }
        }
        @keyframes ls-podium-particle {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
          50%  { opacity: 1; }
          100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
        }
        @keyframes ls-podium-shine {
          0%, 100% { transform: translateX(-50%); opacity: 0; }
          50%      { transform: translateX(150%); opacity: 0.55; }
        }
        .ls-podium-step--revealed {
          animation: ls-podium-rise 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        .ls-podium-avatar--revealed {
          animation: ls-podium-pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
          opacity: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .ls-podium-step--revealed,
          .ls-podium-avatar--revealed,
          .ls-podium-crown,
          .ls-podium-particle,
          .ls-podium-shine { animation: none !important; opacity: 1 !important; }
        }
      `}</style>

      <div
        ref={containerRef}
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 8,
          padding: "20px 12px 0",
          minHeight: 240,
        }}
      >
        {orderForRender.map(({ rank, entry }, idx) => {
          const stepHeight = stepHeights[rank];
          const medal = MEDAL_COLORS[rank];
          const isCurrentUser = entry && currentUserId && entry.userId === currentUserId;
          const initials = entry ? getInitials(entry.userName) : "—";
          // Delays : 2e (idx 0) => 0.0s, 1er (idx 1) => 0.18s, 3e (idx 2) => 0.10s
          const stepDelay = rank === 1 ? 0.18 : rank === 2 ? 0 : 0.10;
          const avatarDelay = stepDelay + 0.40;

          return (
            <div
              key={`podium-${rank}-${idx}`}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                flex: 1,
                maxWidth: 140,
                minWidth: 0,
              }}
            >
              {/* Crown sur le 1er */}
              {rank === 1 && entry && (
                <div
                  className="ls-podium-crown"
                  aria-hidden
                  style={{
                    position: "absolute",
                    top: -22,
                    fontSize: 28,
                    animation: "ls-podium-crown-float 3s ease-in-out infinite",
                    filter: "drop-shadow(0 2px 6px rgba(239,159,39,0.55))",
                    zIndex: 5,
                  }}
                >
                  👑
                </div>
              )}

              {/* Particles autour du leader */}
              {rank === 1 && entry && revealed && (
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 100, pointerEvents: "none" }} aria-hidden>
                  {Array.from({ length: 8 }).map((_, i) => {
                    const angle = (i / 8) * Math.PI * 2;
                    const dx = Math.cos(angle) * 60;
                    const dy = Math.sin(angle) * 40 - 15;
                    const dur = 2.2 + (i % 3) * 0.6;
                    const delay = (i % 4) * 0.4;
                    return (
                      <span
                        key={i}
                        className="ls-podium-particle"
                        style={
                          {
                            position: "absolute",
                            top: 30,
                            left: "50%",
                            width: 5,
                            height: 5,
                            borderRadius: 999,
                            background: i % 2 === 0 ? accentColor.primary : "#FFD89B",
                            boxShadow: `0 0 6px ${accentColor.primary}`,
                            "--dx": `${dx}px`,
                            "--dy": `${dy}px`,
                            animation: `ls-podium-particle ${dur}s ease-out ${delay}s infinite`,
                          } as React.CSSProperties
                        }
                      />
                    );
                  })}
                </div>
              )}

              {/* Avatar */}
              <div
                className={revealed ? "ls-podium-avatar--revealed" : ""}
                style={{
                  width: rank === 1 ? 72 : 56,
                  height: rank === 1 ? 72 : 56,
                  borderRadius: "50%",
                  background: entry
                    ? medal.bg
                    : "var(--ls-surface2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: rank === 1 ? 22 : 18,
                  color: entry ? "#FFFFFF" : "var(--ls-text-hint)",
                  boxShadow: entry
                    ? `0 8px 20px -4px ${medal.glow}, inset 0 2px 0 rgba(255,255,255,0.30), inset 0 -2px 0 rgba(0,0,0,0.20)`
                    : "inset 0 0 0 1px var(--ls-border)",
                  border: isCurrentUser ? `3px solid ${accentColor.primary}` : "none",
                  letterSpacing: "-0.02em",
                  textShadow: entry ? "0 1px 2px rgba(0,0,0,0.30)" : "none",
                  animationDelay: `${avatarDelay}s`,
                  flexShrink: 0,
                }}
              >
                {initials}
              </div>

              {/* Nom + subtitle */}
              <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: rank === 1 ? 13.5 : 12.5,
                    color: "var(--ls-text)",
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.2,
                  }}
                >
                  {entry?.userName ?? "—"}
                </div>
                {entry?.subtitle && (
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--ls-text-muted)",
                      marginTop: 1,
                      fontFamily: "DM Sans, sans-serif",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.subtitle}
                  </div>
                )}
              </div>

              {/* Marche du podium */}
              <div
                className={revealed ? "ls-podium-step--revealed" : ""}
                style={{
                  width: "100%",
                  height: stepHeight,
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: "12px 12px 4px 4px",
                  background: entry
                    ? medal.bg
                    : "var(--ls-surface2)",
                  border: entry
                    ? "none"
                    : "0.5px dashed var(--ls-border)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "8px 6px",
                  boxShadow: entry
                    ? `0 -4px 12px -4px ${medal.glow}, inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.20)`
                    : "none",
                  animationDelay: `${stepDelay}s`,
                }}
              >
                {/* Shine sweep sur le step */}
                {entry && (
                  <div
                    className="ls-podium-shine"
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 0,
                      height: "100%",
                      width: "40%",
                      background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)",
                      animation: `ls-podium-shine ${rank === 1 ? 4 : 6}s ease-in-out infinite`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Rank tag */}
                <div
                  style={{
                    position: "relative",
                    fontFamily: "Syne, serif",
                    fontWeight: 800,
                    fontSize: rank === 1 ? 30 : 24,
                    color: "#FFFFFF",
                    textShadow: "0 1px 3px rgba(0,0,0,0.30)",
                    letterSpacing: "-0.04em",
                    lineHeight: 1,
                    marginBottom: 2,
                  }}
                >
                  {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                </div>

                {/* Score */}
                {entry && (
                  <div
                    style={{
                      position: "relative",
                      fontFamily: "Syne, serif",
                      fontWeight: 800,
                      fontSize: rank === 1 ? 22 : 17,
                      color: "#FFFFFF",
                      textShadow: "0 1px 2px rgba(0,0,0,0.30)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.1,
                      textAlign: "center",
                    }}
                  >
                    {entry.score}
                    {scoreSuffix && (
                      <span style={{ fontSize: rank === 1 ? 14 : 11, marginLeft: 2, opacity: 0.85 }}>
                        {scoreSuffix}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
