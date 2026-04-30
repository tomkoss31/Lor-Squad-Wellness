// InstallPwaTutorialModal (2026-04-30) — tuto pas-a-pas installation PWA
//
// 4 etapes guidees avec illustrations SVG inline (pas de dependance externe).
// Adaptatif selon device (iOS Safari / Android Chrome / Desktop).
// Theme-aware var(--ls-*).
//
// Trigger :
// - Auto sur BienvenuePage (post-onboarding distri) si pas PWA installee
// - Manuel via bouton 'Comment installer' depuis sidebar coach

import { useEffect, useState } from "react";
import { detectDevice, type DeviceKind } from "../../lib/utils/detectDevice";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Override device (sinon auto-detect) */
  deviceOverride?: DeviceKind;
  /** Prenom du user pour personnaliser */
  firstName?: string;
}

export function InstallPwaTutorialModal({ open, onClose, deviceOverride, firstName }: Props) {
  const [device, setDevice] = useState<DeviceKind>("desktop");
  const [stage, setStage] = useState(0); // 0..N

  useEffect(() => {
    if (open) {
      setDevice(deviceOverride ?? detectDevice());
      setStage(0);
    }
  }, [open, deviceOverride]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setStage((s) => Math.min(s + 1, totalStages - 1));
      if (e.key === "ArrowLeft") setStage((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const stages = STAGES[device];
  const totalStages = stages.length;
  const current = stages[stage];
  const isLast = stage === totalStages - 1;

  return (
    <>
      <style>{`
        @keyframes ls-pwa-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes ls-pwa-slide-up {
          from { opacity: 0; transform: translateY(16px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ls-pwa-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%      { transform: scale(1.15); opacity: 0.7; }
        }
        @keyframes ls-pwa-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-6px); }
        }
        .ls-pwa-overlay { animation: ls-pwa-fade-in 0.18s ease-out; }
        .ls-pwa-panel   { animation: ls-pwa-slide-up 0.32s cubic-bezier(0.22,1,0.36,1); }
        .ls-pwa-pulse   { animation: ls-pwa-pulse 1.6s ease-in-out infinite; transform-origin: center; }
        .ls-pwa-bounce  { animation: ls-pwa-bounce 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ls-pwa-pulse, .ls-pwa-bounce { animation: none !important; }
        }
      `}</style>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop click, ESC at dialog level */}
      <div
        className="ls-pwa-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ls-pwa-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 11000,
          background: "color-mix(in srgb, var(--ls-bg) 80%, transparent)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        <div
          className="ls-pwa-panel"
          style={{
            background: "var(--ls-surface)",
            border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
            borderRadius: 22,
            width: "100%",
            maxWidth: 460,
            maxHeight: "calc(100vh - 32px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow:
              "0 24px 64px -16px rgba(0,0,0,0.40), 0 1px 0 0 rgba(239,159,39,0.20)",
          }}
        >
          {/* HEADER GOLD */}
          <div
            style={{
              padding: "16px 20px",
              background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "rgba(255,255,255,0.90)",
                  marginBottom: 2,
                }}
              >
                📱 Installation · Étape {stage + 1}/{totalStages}
              </div>
              <h2
                id="ls-pwa-title"
                style={{
                  fontFamily: "Syne, serif",
                  fontWeight: 800,
                  fontSize: 19,
                  letterSpacing: "-0.02em",
                  margin: 0,
                  textShadow: "0 1px 2px rgba(0,0,0,0.18)",
                }}
              >
                {stage === 0 && firstName
                  ? `Bienvenue ${firstName}`
                  : current.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le tutoriel"
              style={{
                width: 32,
                height: 32,
                flexShrink: 0,
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.30)",
                background: "rgba(255,255,255,0.18)",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "rotate(90deg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
              }}
            >
              ✕
            </button>
          </div>

          {/* BODY scrollable */}
          <div
            style={{
              padding: "20px 22px",
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            {/* Illustration SVG */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 200,
                padding: "16px 0",
                background:
                  "radial-gradient(circle at 50% 50%, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, var(--ls-surface) 70%)",
                borderRadius: 14,
                border: "0.5px dashed var(--ls-border)",
              }}
            >
              {current.illustration}
            </div>

            {/* Body text */}
            <p
              style={{
                fontSize: 14,
                color: "var(--ls-text)",
                lineHeight: 1.6,
                margin: 0,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {current.body}
            </p>

            {current.tip && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
                  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
                  borderLeft: "3px solid var(--ls-teal)",
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: "var(--ls-text)",
                  lineHeight: 1.55,
                }}
              >
                <strong style={{ color: "var(--ls-teal)" }}>💡 Astuce</strong> : {current.tip}
              </div>
            )}
          </div>

          {/* FOOTER : progress + actions */}
          <div
            style={{
              padding: "14px 22px",
              borderTop: "0.5px solid var(--ls-border)",
              background: "color-mix(in srgb, var(--ls-gold) 4%, var(--ls-surface))",
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            {/* Dots progress */}
            <div style={{ display: "flex", gap: 6, flex: 1 }}>
              {stages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStage(i)}
                  aria-label={`Aller à l'étape ${i + 1}`}
                  style={{
                    width: i === stage ? 24 : 8,
                    height: 8,
                    borderRadius: 999,
                    border: "none",
                    background:
                      i === stage
                        ? "linear-gradient(135deg, var(--ls-gold) 0%, #BA7517 100%)"
                        : i < stage
                          ? "color-mix(in srgb, var(--ls-gold) 50%, transparent)"
                          : "var(--ls-border)",
                    cursor: "pointer",
                    transition: "all 0.25s ease",
                    padding: 0,
                  }}
                />
              ))}
            </div>

            {/* Actions */}
            {stage > 0 && (
              <button
                type="button"
                onClick={() => setStage((s) => Math.max(s - 1, 0))}
                style={{
                  padding: "9px 14px",
                  borderRadius: 999,
                  border: "0.5px solid var(--ls-border)",
                  background: "var(--ls-surface)",
                  color: "var(--ls-text-muted)",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "transform 0.15s ease, border-color 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(-2px)";
                  e.currentTarget.style.borderColor = "var(--ls-text-hint)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "none";
                  e.currentTarget.style.borderColor = "var(--ls-border)";
                }}
              >
                <span aria-hidden style={{ fontSize: 14 }}>←</span> Retour
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onClose();
                else setStage((s) => s + 1);
              }}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "DM Sans, sans-serif",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow:
                  "0 6px 16px -4px rgba(186,117,23,0.45), inset 0 1px 0 rgba(255,255,255,0.20)",
                transition: "transform 0.15s ease, filter 0.15s ease",
                letterSpacing: "-0.005em",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.filter = "none";
              }}
            >
              {isLast ? "C'est fait ! 🎉" : "Suivant"}
              {!isLast && <span aria-hidden style={{ fontSize: 14 }}>→</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// =============================================================================
// SVG ILLUSTRATIONS — pas-a-pas inline
// =============================================================================

function PhoneFrame({ children, height = 240 }: { children: React.ReactNode; height?: number }) {
  return (
    <div
      style={{
        position: "relative",
        width: 130,
        height,
        background: "linear-gradient(180deg, #2C2C2A 0%, #1A1A18 100%)",
        borderRadius: 18,
        padding: 4,
        boxShadow: "0 12px 32px -8px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "var(--ls-surface)",
          borderRadius: 14,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// IOS — Stage 1 : Welcome
const IosStage1Svg = (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
    <PhoneFrame>
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #EF9F27 0%, #BA7517 60%, #5C3A05 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 6,
        }}
      >
        <div style={{ fontSize: 36 }}>⭐</div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 11,
            color: "#FFFFFF",
            textShadow: "0 1px 2px rgba(0,0,0,0.20)",
          }}
        >
          Lor'Squad
        </div>
      </div>
    </PhoneFrame>
  </div>
);

// IOS — Stage 2 : Bouton Partager
const IosStage2Svg = (
  <PhoneFrame>
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Status bar */}
      <div
        style={{
          fontSize: 8,
          padding: "4px 10px",
          color: "var(--ls-text)",
          background: "var(--ls-surface)",
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 700,
        }}
      >
        9:41
      </div>
      {/* Page Safari */}
      <div
        style={{
          flex: 1,
          background:
            "linear-gradient(180deg, var(--ls-surface) 0%, var(--ls-surface2) 100%)",
          padding: "10px 8px",
          fontSize: 7,
          color: "var(--ls-text-hint)",
        }}
      >
        Lor'Squad Wellness — Ta transformation commence ici
      </div>
      {/* Bottom bar Safari avec bouton Partager highlight */}
      <div
        style={{
          height: 32,
          background: "color-mix(in srgb, var(--ls-text) 12%, var(--ls-surface))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          padding: "0 6px",
          borderTop: "0.5px solid var(--ls-border)",
        }}
      >
        <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>‹</span>
        <span style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>›</span>
        {/* Bouton Partager surligne */}
        <div
          className="ls-pwa-bounce"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 22,
            height: 22,
            background: "var(--ls-gold)",
            borderRadius: 6,
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--ls-gold) 30%, transparent), 0 4px 10px rgba(186,117,23,0.45)",
          }}
        >
          {/* Icone Partager (square + arrow up) */}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          {/* Pointer arrow */}
          <div
            style={{
              position: "absolute",
              top: -32,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 22,
              color: "var(--ls-gold)",
            }}
            className="ls-pwa-pulse"
          >
            👇
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--ls-text-hint)" }}>📑</span>
      </div>
    </div>
  </PhoneFrame>
);

// IOS — Stage 3 : Menu "Sur l'écran d'accueil"
const IosStage3Svg = (
  <PhoneFrame height={280}>
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sheet menu Safari */}
      <div style={{ flex: 0.4, background: "color-mix(in srgb, var(--ls-text) 5%, var(--ls-surface))" }} />
      <div
        style={{
          flex: 0.6,
          background: "var(--ls-surface2)",
          borderRadius: "12px 12px 0 0",
          padding: "8px 0",
          fontSize: 8,
          color: "var(--ls-text)",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: 28,
            height: 3,
            background: "var(--ls-text-hint)",
            borderRadius: 999,
            margin: "0 auto 8px",
          }}
        />
        {[
          { icon: "📋", label: "Copier", highlight: false },
          { icon: "🔖", label: "Marque-page", highlight: false },
          {
            icon: "➕",
            label: "Sur l'écran d'accueil",
            highlight: true,
          },
          { icon: "🖨️", label: "Imprimer", highlight: false },
          { icon: "💾", label: "Sauvegarder PDF", highlight: false },
        ].map((item, i) => (
          <div
            key={i}
            className={item.highlight ? "ls-pwa-pulse" : ""}
            style={{
              padding: "6px 10px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: item.highlight
                ? "color-mix(in srgb, var(--ls-gold) 18%, transparent)"
                : "transparent",
              border: item.highlight ? "1px solid var(--ls-gold)" : "none",
              borderRadius: item.highlight ? 6 : 0,
              margin: item.highlight ? "2px 6px" : 0,
              fontWeight: item.highlight ? 700 : 400,
              color: item.highlight ? "var(--ls-gold)" : "var(--ls-text)",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.highlight && (
              <span style={{ marginLeft: "auto", fontSize: 10 }}>👈</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);

// IOS — Stage 4 : Confirmer Ajouter
const IosStage4Svg = (
  <PhoneFrame>
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header avec Annuler / Ajouter */}
      <div
        style={{
          padding: "8px 8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 9,
          background: "var(--ls-surface2)",
          borderBottom: "0.5px solid var(--ls-border)",
        }}
      >
        <span style={{ color: "var(--ls-text-muted)" }}>Annuler</span>
        <span style={{ color: "var(--ls-text)", fontWeight: 600 }}>Sur l'écran d'accueil</span>
        <span
          className="ls-pwa-pulse"
          style={{
            color: "var(--ls-gold)",
            fontWeight: 700,
            padding: "2px 6px",
            borderRadius: 4,
            background: "color-mix(in srgb, var(--ls-gold) 18%, transparent)",
            border: "1px solid var(--ls-gold)",
          }}
        >
          Ajouter
        </span>
      </div>
      {/* Preview */}
      <div
        style={{
          flex: 1,
          padding: 10,
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background:
              "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 16,
            color: "#FFFFFF",
            boxShadow: "0 2px 6px rgba(186,117,23,0.45)",
          }}
        >
          ⭐
        </div>
        <div style={{ flex: 1, fontSize: 8, lineHeight: 1.3 }}>
          <div style={{ fontWeight: 700, color: "var(--ls-text)" }}>Lor'Squad</div>
          <div style={{ color: "var(--ls-text-hint)", marginTop: 2 }}>
            lor-squad-wellness.app
          </div>
        </div>
      </div>
      {/* Pointer en haut */}
      <div
        style={{
          position: "absolute",
          top: -2,
          right: 6,
          fontSize: 18,
        }}
        className="ls-pwa-bounce"
      >
        👆
      </div>
    </div>
  </PhoneFrame>
);

// ANDROID — Stage 1 (welcome — meme illu que iOS)
const AndroidStage1Svg = IosStage1Svg;

// ANDROID — Stage 2 : Menu 3 dots
const AndroidStage2Svg = (
  <PhoneFrame>
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* URL bar avec menu 3 dots */}
      <div
        style={{
          padding: "6px 8px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "var(--ls-surface2)",
          fontSize: 7,
          color: "var(--ls-text-muted)",
          borderBottom: "0.5px solid var(--ls-border)",
        }}
      >
        <span style={{ flex: 1, padding: "2px 6px", background: "var(--ls-surface)", borderRadius: 4 }}>
          🔒 lor-squad...
        </span>
        {/* 3 dots */}
        <div
          className="ls-pwa-bounce"
          style={{
            position: "relative",
            display: "inline-flex",
            flexDirection: "column",
            gap: 2,
            padding: 4,
            background: "var(--ls-gold)",
            borderRadius: 6,
            boxShadow:
              "0 0 0 3px color-mix(in srgb, var(--ls-gold) 30%, transparent), 0 4px 10px rgba(186,117,23,0.45)",
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 3,
                height: 3,
                borderRadius: "50%",
                background: "#FFFFFF",
              }}
            />
          ))}
          <div
            className="ls-pwa-pulse"
            style={{
              position: "absolute",
              bottom: -28,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 22,
              color: "var(--ls-gold)",
            }}
          >
            👆
          </div>
        </div>
      </div>
      <div style={{ flex: 1, background: "var(--ls-surface)" }} />
    </div>
  </PhoneFrame>
);

// ANDROID — Stage 3 : "Installer l'app"
const AndroidStage3Svg = (
  <PhoneFrame>
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: 4 }}>
      <div style={{ flex: 0.3, background: "var(--ls-surface)" }} />
      <div
        style={{
          flex: 0.7,
          background: "var(--ls-surface2)",
          borderRadius: 8,
          padding: 6,
          fontSize: 7,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {[
          { icon: "🔄", label: "Recharger" },
          { icon: "🔖", label: "Favoris" },
          { icon: "⬇️", label: "Téléchargements" },
          {
            icon: "➕",
            label: "Installer l'app",
            highlight: true,
          },
          { icon: "⚙️", label: "Paramètres" },
        ].map((item, i) => (
          <div
            key={i}
            className={item.highlight ? "ls-pwa-pulse" : ""}
            style={{
              padding: "4px 6px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: item.highlight
                ? "color-mix(in srgb, var(--ls-gold) 18%, transparent)"
                : "transparent",
              border: item.highlight ? "1px solid var(--ls-gold)" : "none",
              borderRadius: item.highlight ? 4 : 0,
              fontWeight: item.highlight ? 700 : 400,
              color: item.highlight ? "var(--ls-gold)" : "var(--ls-text)",
            }}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
            {item.highlight && (
              <span style={{ marginLeft: "auto", fontSize: 8 }}>👈</span>
            )}
          </div>
        ))}
      </div>
    </div>
  </PhoneFrame>
);

// ANDROID — Stage 4 : Confirm
const AndroidStage4Svg = (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 60,
        height: 60,
        borderRadius: 16,
        background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 28,
        color: "#FFFFFF",
        boxShadow: "0 8px 20px -4px rgba(186,117,23,0.50)",
      }}
      className="ls-pwa-bounce"
    >
      ⭐
    </div>
    <div style={{ fontSize: 11, color: "var(--ls-text-hint)" }}>
      Lor'Squad sur ton écran d'accueil
    </div>
  </div>
);

// DESKTOP — Stage 1 (welcome) — meme illu
const DesktopStage1Svg = IosStage1Svg;

// DESKTOP — Stage 2 : icone + dans la barre adresse
const DesktopStage2Svg = (
  <div
    style={{
      width: 280,
      background: "var(--ls-surface2)",
      borderRadius: 8,
      padding: "8px 10px",
      display: "flex",
      alignItems: "center",
      gap: 6,
      border: "0.5px solid var(--ls-border)",
      boxShadow: "0 4px 12px -4px rgba(0,0,0,0.15)",
    }}
  >
    <div style={{ display: "flex", gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10B981" }} />
    </div>
    <span style={{ fontSize: 9, color: "var(--ls-text-hint)", flex: 1 }}>← →</span>
    <div
      style={{
        flex: 3,
        padding: "4px 8px",
        background: "var(--ls-surface)",
        borderRadius: 12,
        fontSize: 9,
        color: "var(--ls-text-muted)",
      }}
    >
      🔒 lor-squad-wellness.app
    </div>
    <div
      className="ls-pwa-bounce"
      style={{
        position: "relative",
        padding: "4px 8px",
        background: "var(--ls-gold)",
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 700,
        color: "#FFFFFF",
        boxShadow:
          "0 0 0 3px color-mix(in srgb, var(--ls-gold) 30%, transparent), 0 4px 10px rgba(186,117,23,0.45)",
      }}
    >
      ⊕
      <div
        className="ls-pwa-pulse"
        style={{
          position: "absolute",
          bottom: -28,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 18,
          color: "var(--ls-gold)",
        }}
      >
        👆
      </div>
    </div>
  </div>
);

// DESKTOP — Stage 3 : confirm dialog
const DesktopStage3Svg = (
  <div
    style={{
      width: 240,
      background: "var(--ls-surface)",
      borderRadius: 12,
      padding: 14,
      border: "0.5px solid var(--ls-border)",
      boxShadow: "0 12px 24px -8px rgba(0,0,0,0.20)",
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          color: "#FFFFFF",
        }}
      >
        ⭐
      </div>
      <div style={{ flex: 1, fontSize: 10 }}>
        <div style={{ fontWeight: 700, color: "var(--ls-text)" }}>Installer Lor'Squad ?</div>
        <div style={{ color: "var(--ls-text-hint)", fontSize: 9 }}>lor-squad-wellness.app</div>
      </div>
    </div>
    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
      <span
        style={{
          padding: "3px 8px",
          fontSize: 9,
          color: "var(--ls-text-muted)",
        }}
      >
        Annuler
      </span>
      <span
        className="ls-pwa-pulse"
        style={{
          padding: "4px 10px",
          fontSize: 9,
          color: "#FFFFFF",
          background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
          borderRadius: 4,
          fontWeight: 700,
        }}
      >
        Installer
      </span>
    </div>
  </div>
);

// =============================================================================
// STAGES par device
// =============================================================================

interface Stage {
  title: string;
  body: React.ReactNode;
  illustration: React.ReactNode;
  tip?: string;
}

const STAGES: Record<DeviceKind, Stage[]> = {
  ios: [
    {
      title: "On installe l'app sur ton iPhone",
      body: (
        <>
          En 3 étapes simples (~30 secondes), Lor'Squad sera installée sur ton écran d'accueil comme une vraie app — avec son icône gold, les notifications push, et le mode plein écran.
        </>
      ),
      illustration: IosStage1Svg,
      tip: "Tu dois être dans Safari (pas Chrome ni un autre navigateur) pour que ça marche sur iPhone.",
    },
    {
      title: "Touche le bouton Partager",
      body: (
        <>
          En bas de Safari, tu vas voir le bouton <strong>Partager</strong> : c'est un petit carré avec une flèche qui pointe vers le haut ⬆.
          <br />
          <br />
          <em>Touche-le.</em>
        </>
      ),
      illustration: IosStage2Svg,
      tip: "Si tu ne vois pas la barre du bas, fais défiler la page un peu vers le haut pour la faire apparaître.",
    },
    {
      title: "Choisis « Sur l'écran d'accueil »",
      body: (
        <>
          Un menu va s'ouvrir. Fais défiler vers le bas si nécessaire et touche <strong>« Sur l'écran d'accueil »</strong> (icône avec un +).
        </>
      ),
      illustration: IosStage3Svg,
      tip: "Si tu ne trouves pas l'option, fais défiler le menu vers le bas — elle est souvent dans la 2e rangée.",
    },
    {
      title: "Touche « Ajouter »",
      body: (
        <>
          Un dernier écran apparaît avec l'icône Lor'Squad. Touche <strong>Ajouter</strong> en haut à droite, et c'est fini !
          <br />
          <br />
          🎉 Ferme Safari et ouvre Lor'Squad depuis ton écran d'accueil.
        </>
      ),
      illustration: IosStage4Svg,
      tip: "Tu pourras maintenant lancer Lor'Squad d'un seul tap, et recevoir les notifications push (RDV, messages clients).",
    },
  ],
  android: [
    {
      title: "On installe l'app sur ton Android",
      body: (
        <>
          En 3 étapes simples (~30 secondes), Lor'Squad sera installée comme une vraie app sur ton téléphone.
        </>
      ),
      illustration: AndroidStage1Svg,
      tip: "Tu dois être dans Chrome pour que l'option d'installation apparaisse.",
    },
    {
      title: "Touche le menu (3 points)",
      body: (
        <>
          En haut à droite de Chrome, touche le bouton <strong>menu</strong> (les 3 petits points verticaux ⋮).
        </>
      ),
      illustration: AndroidStage2Svg,
    },
    {
      title: "Touche « Installer l'app »",
      body: (
        <>
          Dans le menu, touche <strong>« Installer l'app »</strong> ou <strong>« Ajouter à l'écran d'accueil »</strong>.
        </>
      ),
      illustration: AndroidStage3Svg,
      tip: "Si tu ne vois pas l'option, c'est que tu as déjà l'app installée 😉",
    },
    {
      title: "Confirme l'installation",
      body: (
        <>
          Touche <strong>Installer</strong> dans la pop-up qui apparaît. C'est fini !
          <br />
          <br />
          🎉 Lor'Squad est maintenant sur ton écran d'accueil.
        </>
      ),
      illustration: AndroidStage4Svg,
    },
  ],
  desktop: [
    {
      title: "On installe Lor'Squad sur ton ordi",
      body: (
        <>
          Lor'Squad fonctionne comme une vraie app aussi sur ordi — fenêtre dédiée, notifications, lancement rapide depuis le bureau.
        </>
      ),
      illustration: DesktopStage1Svg,
    },
    {
      title: "Touche l'icône ⊕ dans la barre d'adresse",
      body: (
        <>
          À droite de l'URL Lor'Squad, tu vas voir une petite icône avec un <strong>+</strong> ou une icône d'écran. Clique dessus.
        </>
      ),
      illustration: DesktopStage2Svg,
      tip: "Si tu ne vois pas l'icône, c'est que tu utilises un navigateur qui ne supporte pas l'install (Firefox / Safari Mac). Utilise Chrome ou Edge.",
    },
    {
      title: "Clique « Installer »",
      body: (
        <>
          Une popup va apparaître avec l'icône Lor'Squad. Clique <strong>Installer</strong>.
          <br />
          <br />
          🎉 Lor'Squad sera ajouté au menu démarrer / Launchpad et tu pourras le lancer comme n'importe quelle app.
        </>
      ),
      illustration: DesktopStage3Svg,
    },
  ],
};
