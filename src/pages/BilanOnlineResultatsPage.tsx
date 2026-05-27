// =============================================================================
// BilanOnlineResultatsPage V2 — page d'auto-évaluation post-soumission
// (chantier B, 2026-05-27).
//
// Route : /bilan-online/:coachSlug?/resultats
//
// S'affiche entre l'étape 7 (submit OK) et la page merci. Récupère les
// réponses du form depuis sessionStorage (clé `ls-bilan-results-${slug}`),
// calcule les 6 dimensions via computeBilanResults(), affiche :
//   - hero score global + verdict directionnel
//   - radar SVG custom 6 axes (zéro dep, anim douce)
//   - top 3 priorités identifiées par l'algo
//   - CTA "Voir mon plan d'action" → /merci
//
// Si pas de data en sessionStorage (refresh / accès direct) : redirect
// vers /bilan-online/:slug/merci pour éviter une page vide cassée.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  PublicShell,
  PublicCtaPrimary,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import {
  computeBilanResults,
  type BilanResults,
  type DimensionScore,
  type ScoringInput,
} from "../lib/bilanOnlineScoring";

const SESSION_KEY = (slug: string) => `ls-bilan-results-${slug || "none"}`;

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function prettifyFirstName(raw: string): string {
  if (!raw) return "";
  return raw.trim().toLowerCase()
    .split(/(\s|-)/)
    .map((p) => (p.length > 1 ? capitalize(p) : p))
    .join("");
}

export function BilanOnlineResultatsPage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = coachSlug?.trim() || "";
  const [params] = useSearchParams();
  const firstName = prettifyFirstName(params.get("firstName") ?? "");

  const [input, setInput] = useState<ScoringInput | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY(slug));
      if (!raw) {
        setMissing(true);
        return;
      }
      const parsed = JSON.parse(raw) as ScoringInput;
      setInput(parsed);
    } catch {
      setMissing(true);
    }
  }, [slug]);

  useEffect(() => {
    if (missing) {
      // Pas de data → on saute direct à la page merci.
      const q = firstName ? `?firstName=${encodeURIComponent(firstName)}` : "";
      navigate(`/bilan-online${slug ? `/${slug}` : ""}/merci${q}`, { replace: true });
    }
  }, [missing, navigate, slug, firstName]);

  const results: BilanResults | null = useMemo(
    () => (input ? computeBilanResults(input) : null),
    [input],
  );

  function onContinue() {
    // Chantier C : on garde le sessionStorage pour que la merci puisse
    // relire scoring + meta et générer les CTAs (mailto pré-rempli).
    // La merci page nettoiera au démontage.
    const q = firstName ? `?firstName=${encodeURIComponent(firstName)}` : "";
    navigate(`/bilan-online${slug ? `/${slug}` : ""}/merci${q}`);
  }

  if (!results) {
    return (
      <PublicShell defaultTheme="dark">
        <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--cream-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
          <div style={{ fontFamily: PUBLIC_FONTS.body, fontSize: 14 }}>
            Calcul de ton bilan…
          </div>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell defaultTheme="dark">
      <div style={{ padding: "32px 22px 140px" }}>
        {/* === Hero score global + verdict === */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div
            className="ps-fade-in"
            style={{
              fontFamily: PUBLIC_FONTS.mono,
              fontSize: 11,
              color: "var(--cream-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 10,
            }}
          >
            Ton bilan en un coup d'œil
          </div>
          <h1
            style={{
              fontFamily: PUBLIC_FONTS.display,
              fontSize: "clamp(26px, 5.5vw, 34px)",
              fontWeight: 600,
              color: "var(--cream)",
              lineHeight: 1.18,
              letterSpacing: "-0.02em",
              margin: "0 auto 4px",
              maxWidth: 480,
            }}
          >
            {firstName ? <>{firstName}, </> : null}
            <span style={publicGradText}>{results.verdict.headline}</span> {results.verdict.emoji}
          </h1>
          <p style={{
            fontSize: 14.5, color: "var(--cream-soft)",
            maxWidth: 460, margin: "12px auto 0", lineHeight: 1.55,
          }}>
            {results.verdict.body}
          </p>
        </div>

        {/* === Score global + radar === */}
        <div style={{
          background: "var(--glass)",
          border: "1px solid var(--hair)",
          borderRadius: 22,
          padding: "26px 18px 18px",
          marginBottom: 28,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: PUBLIC_FONTS.mono, fontSize: 10,
            color: "var(--cream-muted)", letterSpacing: "0.12em",
            textTransform: "uppercase", marginBottom: 4,
          }}>
            Score global
          </div>
          <div style={{
            fontFamily: PUBLIC_FONTS.display,
            fontSize: 64, fontWeight: 700, lineHeight: 1,
            ...publicGradText,
            display: "inline-block",
          }}>
            {results.globalScore}
          </div>
          <span style={{
            fontFamily: PUBLIC_FONTS.display, fontSize: 20,
            color: "var(--cream-muted)", marginLeft: 4,
          }}>/ 100</span>

          <ResultsRadar dimensions={results.dimensions} />
          <DimensionLegend dimensions={results.dimensions} />
        </div>

        {/* === Top 3 priorités === */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{
            fontFamily: PUBLIC_FONTS.display,
            fontSize: 13, fontWeight: 600,
            color: "var(--cream-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            margin: "0 0 14px 4px",
          }}>
            ⭐ Tes 3 priorités
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {results.priorities.map((p, idx) => (
              <PriorityCard key={p.key} priority={p} rank={idx + 1} />
            ))}
          </div>
        </div>

        {/* === Récap pédagogique : tu sauras quoi faire ensemble === */}
        <div style={{
          background: "var(--glass-input-focus)",
          borderLeft: `3px solid ${PUBLIC_TOKENS.teal}`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
        }}>
          <p style={{
            margin: 0, fontSize: 13.5, lineHeight: 1.6,
            color: "var(--cream-soft)",
          }}>
            🤝 Ces scores ne sont qu'un point de départ — un cliché à un instant T.
            Ton coach va décortiquer chaque point avec toi et te proposer un plan
            <strong style={{ color: "var(--cream)" }}> personnalisé, progressif et tenable</strong>.
            Pas de régime extrême, pas de tout-en-même-temps.
          </p>
        </div>
      </div>

      {/* CTA fixe en bas */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 560,
        padding: "12px 22px 16px",
        background: "var(--surface-overlay-strong)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--hair)",
        zIndex: 60,
        paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <PublicCtaPrimary onClick={onContinue}>
          Voir ce qu'on peut faire ensemble →
        </PublicCtaPrimary>
      </div>
    </PublicShell>
  );
}

// ── Radar SVG custom (zero dep) ─────────────────────────────────────────────

const RADAR_SIZE = 280;
const RADAR_CENTER = RADAR_SIZE / 2;
const RADAR_RADIUS = 100;

function ResultsRadar({ dimensions }: { dimensions: DimensionScore[] }) {
  // 6 axes équidistants, angle 0 en haut (-π/2)
  const n = dimensions.length;
  const points = dimensions.map((dim, i) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = (dim.score / 100) * RADAR_RADIUS;
    return {
      x: RADAR_CENTER + r * Math.cos(angle),
      y: RADAR_CENTER + r * Math.sin(angle),
      labelX: RADAR_CENTER + (RADAR_RADIUS + 22) * Math.cos(angle),
      labelY: RADAR_CENTER + (RADAR_RADIUS + 22) * Math.sin(angle),
      dim,
      angle,
    };
  });
  const polygonPath = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  // Anneaux concentriques (20/40/60/80/100%)
  const rings = [0.25, 0.5, 0.75, 1].map((ratio) => ratio * RADAR_RADIUS);

  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "18px 0 6px" }}>
      <svg
        width={RADAR_SIZE}
        height={RADAR_SIZE}
        viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}
        role="img"
        aria-label="Radar de ton bilan : 6 dimensions sur 100"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id="ls-radar-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PUBLIC_TOKENS.teal} stopOpacity="0.35" />
            <stop offset="60%" stopColor={PUBLIC_TOKENS.violet} stopOpacity="0.30" />
            <stop offset="100%" stopColor={PUBLIC_TOKENS.coral} stopOpacity="0.25" />
          </linearGradient>
          <linearGradient id="ls-radar-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={PUBLIC_TOKENS.teal} />
            <stop offset="60%" stopColor={PUBLIC_TOKENS.violet} />
            <stop offset="100%" stopColor={PUBLIC_TOKENS.coral} />
          </linearGradient>
        </defs>

        {/* Anneaux concentriques */}
        {rings.map((r) => (
          <circle
            key={r}
            cx={RADAR_CENTER} cy={RADAR_CENTER} r={r}
            fill="none"
            stroke="rgba(251,247,240,0.10)"
            strokeWidth="1"
          />
        ))}

        {/* Rayons aux 6 axes */}
        {points.map((p, i) => (
          <line
            key={`axis-${i}`}
            x1={RADAR_CENTER} y1={RADAR_CENTER}
            x2={RADAR_CENTER + RADAR_RADIUS * Math.cos(p.angle)}
            y2={RADAR_CENTER + RADAR_RADIUS * Math.sin(p.angle)}
            stroke="rgba(251,247,240,0.08)"
            strokeWidth="1"
          />
        ))}

        {/* Polygone des scores */}
        <polygon
          points={polygonPath}
          fill="url(#ls-radar-fill)"
          stroke="url(#ls-radar-stroke)"
          strokeWidth="2"
          strokeLinejoin="round"
          style={{
            animation: "ls-radar-pop 700ms cubic-bezier(.2,.7,.2,1) both",
          }}
        />

        {/* Dots aux sommets */}
        {points.map((p) => (
          <circle
            key={`dot-${p.dim.key}`}
            cx={p.x} cy={p.y} r="4"
            fill={PUBLIC_TOKENS.cream}
            stroke={PUBLIC_TOKENS.teal}
            strokeWidth="2"
          />
        ))}

        {/* Labels (emoji + label) autour */}
        {points.map((p) => (
          <g key={`label-${p.dim.key}`}>
            <text
              x={p.labelX}
              y={p.labelY - 2}
              textAnchor="middle"
              fontSize="16"
              style={{ userSelect: "none" }}
            >
              {p.dim.emoji}
            </text>
            <text
              x={p.labelX}
              y={p.labelY + 14}
              textAnchor="middle"
              fontFamily={PUBLIC_FONTS.body}
              fontSize="10.5"
              fontWeight="500"
              fill={PUBLIC_TOKENS.cream}
              opacity="0.78"
              style={{ userSelect: "none" }}
            >
              {p.dim.label}
            </text>
          </g>
        ))}

        <style>{`
          @keyframes ls-radar-pop {
            from { opacity: 0; transform: scale(0.6); transform-origin: ${RADAR_CENTER}px ${RADAR_CENTER}px; }
            to { opacity: 1; transform: scale(1); transform-origin: ${RADAR_CENTER}px ${RADAR_CENTER}px; }
          }
          @media (prefers-reduced-motion: reduce) {
            polygon { animation: none !important; }
          }
        `}</style>
      </svg>
    </div>
  );
}

function DimensionLegend({ dimensions }: { dimensions: DimensionScore[] }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 8,
      marginTop: 12,
      textAlign: "left",
    }}>
      {dimensions.map((d) => {
        const tone = scoreTone(d.score);
        return (
          <div key={d.key} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px",
            background: "var(--glass-input)",
            borderRadius: 10,
            border: "1px solid var(--hair)",
          }}>
            <span style={{ fontSize: 18 }}>{d.emoji}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: PUBLIC_FONTS.body,
                fontSize: 11.5, color: "var(--cream-soft)",
                fontWeight: 500,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}>
                {d.label}
              </div>
              <div style={{
                fontFamily: PUBLIC_FONTS.display,
                fontSize: 16, fontWeight: 600,
                color: tone.color,
                lineHeight: 1.1,
              }}>
                {d.score}<span style={{ fontSize: 11, opacity: 0.6 }}>/100</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function scoreTone(score: number): { color: string; label: string } {
  if (score >= 75) return { color: PUBLIC_TOKENS.emerald, label: "Top" };
  if (score >= 55) return { color: PUBLIC_TOKENS.teal, label: "Bien" };
  if (score >= 35) return { color: PUBLIC_TOKENS.gold, label: "À renforcer" };
  return { color: PUBLIC_TOKENS.coral, label: "Priorité" };
}

// ── Priorités cards ─────────────────────────────────────────────────────────

function PriorityCard({
  priority, rank,
}: {
  priority: BilanResults["priorities"][number];
  rank: number;
}) {
  return (
    <div style={{
      background: "var(--glass)",
      border: "1px solid var(--hair)",
      borderLeft: `3px solid ${PUBLIC_TOKENS.teal}`,
      borderRadius: 14,
      padding: "14px 16px",
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
    }}>
      <div style={{
        flexShrink: 0,
        width: 30, height: 30,
        borderRadius: "50%",
        background: PUBLIC_TOKENS.gradCta,
        color: PUBLIC_TOKENS.cream,
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 13, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {rank}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 15, fontWeight: 600,
          color: "var(--cream)",
          marginBottom: 6,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{ fontSize: 18 }}>{priority.emoji}</span>
          {priority.title}
        </div>
        <p style={{
          margin: "0 0 6px",
          fontSize: 13.5, lineHeight: 1.5,
          color: "var(--cream-muted)",
        }}>
          {priority.insight}
        </p>
        <p style={{
          margin: 0,
          fontSize: 13.5, lineHeight: 1.5,
          color: "var(--cream-soft)",
        }}>
          <strong style={{ color: PUBLIC_TOKENS.teal, fontWeight: 600 }}>→ </strong>
          {priority.advice}
        </p>
      </div>
    </div>
  );
}
