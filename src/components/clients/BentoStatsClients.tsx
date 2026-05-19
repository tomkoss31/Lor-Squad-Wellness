// =============================================================================
// BentoStatsClients — 3 cards stats du tab Clients
// (extrait de ClientsPage.tsx, refacto 2026-05-19)
//
// Phase 3.5 brainstorm Égypte — étape 1/3 refacto ClientsPage.
// Card principale "Clients visibles" (gradient teal/gold) + Responsables
// (gradient gold) + Relances (gradient coral si > 0, teal sinon). Pas de
// logique métier ici : tout est en props (3 nombres). Animations CSS
// internes (keyframes + reduced-motion).
// =============================================================================

interface Props {
  visibleCount: number;
  ownersCount: number;
  relanceCount: number;
}

export function BentoStatsClients({ visibleCount, ownersCount, relanceCount }: Props) {
  return (
    <>
      <style>{`
        @keyframes ls-stat-zoom-in {
          from { opacity: 0; transform: scale(0.92) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ls-stat-shine {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
        }
        @keyframes ls-stat-conic {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .clients-stat-card-v3 {
          animation: ls-stat-zoom-in 560ms cubic-bezier(0.16, 1, 0.3, 1) both;
          transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
          position: relative;
          overflow: hidden;
        }
        .clients-stat-card-v3:hover {
          transform: translateY(-3px);
        }
        .clients-stat-card-v3:nth-child(1) { animation-delay: 0ms; }
        .clients-stat-card-v3:nth-child(2) { animation-delay: 100ms; }
        .clients-stat-card-v3:nth-child(3) { animation-delay: 200ms; }
        .clients-stat-shine {
          position: absolute;
          top: 0;
          left: 0;
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent);
          animation: ls-stat-shine 6s ease-in-out infinite;
          pointer-events: none;
        }
        .clients-stat-conic {
          position: absolute;
          width: 220px;
          height: 220px;
          background: conic-gradient(
            from 0deg,
            transparent,
            rgba(239,159,39,0.10),
            transparent
          );
          animation: ls-stat-conic 12s linear infinite;
          pointer-events: none;
          top: -50%;
          right: -30%;
          filter: blur(20px);
        }
        @media (prefers-reduced-motion: reduce) {
          .clients-stat-card-v3, .clients-stat-shine, .clients-stat-conic {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div
        className="clients-stats-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "1.6fr 1fr 1fr",
          gridTemplateRows: "auto",
          gap: 14,
        }}
      >
        {/* Card principale BENTO — Visibles (plus grosse) */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, no onClick */}
        <div
          className="clients-stat-card-v3"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 14%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-gold) 6%, var(--ls-surface)) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, var(--ls-border))",
            borderRadius: 20,
            padding: "22px 24px",
            boxShadow:
              "0 1px 0 0 rgba(13,148,136,0.10), 0 12px 32px -12px rgba(13,148,136,0.18), inset 0 1px 0 0 rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 130,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              "0 1px 0 0 rgba(13,148,136,0.12), 0 16px 40px -12px rgba(13,148,136,0.28), inset 0 1px 0 0 rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 60%, var(--ls-border))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow =
              "0 1px 0 0 rgba(13,148,136,0.10), 0 12px 32px -12px rgba(13,148,136,0.18), inset 0 1px 0 0 rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor = "color-mix(in srgb, var(--ls-teal) 35%, var(--ls-border))";
          }}
        >
          <div className="clients-stat-conic" aria-hidden="true" />
          <div className="clients-stat-shine" aria-hidden="true" />
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700, fontFamily: "DM Sans, sans-serif" }}>
              👥 Clients visibles
            </div>
            <div
              style={{
                padding: "4px 10px",
                background: "color-mix(in srgb, var(--ls-teal) 14%, transparent)",
                border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
                borderRadius: 999,
                fontSize: 10,
                fontWeight: 700,
                color: "var(--ls-teal)",
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              ✓ Filtré
            </div>
          </div>
          <div style={{ position: "relative", display: "flex", alignItems: "baseline", gap: 12 }}>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 56,
                lineHeight: 1,
                background: "linear-gradient(135deg, var(--ls-teal) 0%, color-mix(in srgb, var(--ls-teal) 70%, #5C3A05) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.04em",
              }}
            >
              {visibleCount}
            </div>
            <div style={{ fontSize: 13, color: "var(--ls-text-muted)", fontWeight: 500 }}>
              dossier{visibleCount > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Card 2 — Responsables */}
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Hover effect only, no onClick */}
        <div
          className="clients-stat-card-v3"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 35%, var(--ls-border))",
            borderRadius: 20,
            padding: "18px 20px",
            boxShadow:
              "0 1px 0 0 rgba(184,146,42,0.10), 0 8px 24px -10px rgba(184,146,42,0.20), inset 0 1px 0 0 rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 130,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow =
              "0 1px 0 0 rgba(184,146,42,0.14), 0 12px 32px -10px rgba(184,146,42,0.30), inset 0 1px 0 0 rgba(255,255,255,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow =
              "0 1px 0 0 rgba(184,146,42,0.10), 0 8px 24px -10px rgba(184,146,42,0.20), inset 0 1px 0 0 rgba(255,255,255,0.06)";
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700 }}>
              🎯 Responsables
            </div>
            <span style={{ fontSize: 22, opacity: 0.4 }}>👑</span>
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 38,
              lineHeight: 1,
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
            }}
          >
            {ownersCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>portefeuilles actifs</div>
        </div>

        {/* Card 3 — Relances */}
        <div
          className="clients-stat-card-v3"
          style={{
            background:
              relanceCount > 0
                ? "linear-gradient(135deg, color-mix(in srgb, var(--ls-coral) 12%, var(--ls-surface)) 0%, var(--ls-surface) 100%)"
                : "linear-gradient(135deg, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 0%, var(--ls-surface) 100%)",
            border: `0.5px solid color-mix(in srgb, ${relanceCount > 0 ? "var(--ls-coral)" : "var(--ls-teal)"} 35%, var(--ls-border))`,
            borderRadius: 20,
            padding: "18px 20px",
            boxShadow:
              relanceCount > 0
                ? "0 1px 0 0 rgba(220,38,38,0.10), 0 8px 24px -10px rgba(220,38,38,0.20), inset 0 1px 0 0 rgba(255,255,255,0.06)"
                : "0 1px 0 0 rgba(13,148,136,0.10), 0 8px 24px -10px rgba(13,148,136,0.18), inset 0 1px 0 0 rgba(255,255,255,0.06)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 130,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase", color: "var(--ls-text-hint)", fontWeight: 700 }}>
              {relanceCount > 0 ? "🔥 Relances" : "✓ À jour"}
            </div>
            <span style={{ fontSize: 22, opacity: 0.4 }}>
              {relanceCount > 0 ? "⚠️" : "🎉"}
            </span>
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: 38,
              lineHeight: 1,
              color: relanceCount > 0 ? "var(--ls-coral)" : "var(--ls-teal)",
              letterSpacing: "-0.03em",
            }}
          >
            {relanceCount}
          </div>
          <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
            {relanceCount > 0 ? "à reprendre" : "tout est calé"}
          </div>
        </div>
      </div>
    </>
  );
}
