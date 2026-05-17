// =============================================================================
// BilanOnlineMerciPage — Page remerciement éditorial post-soumission.
// Chantier #1 étape 1.5 (2026-05-17) — refonte design Claude Design.
// Route : /bilan-online/:coachSlug?/merci?firstName=...
// =============================================================================

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  BO_TOKENS,
  BilanOnlineShell,
  BoEyebrow,
  BoHero,
  BoLead,
  BoFooterRgpd,
} from "../components/bilan-online/BilanOnlineShell";

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function BilanOnlineMerciPage() {
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [params] = useSearchParams();
  const firstName = (params.get("firstName") ?? "").trim();
  const coachName = useMemo(() => (coachSlug ? capitalize(coachSlug) : ""), [coachSlug]);
  const hasCoach = !!coachSlug;

  return (
    <BilanOnlineShell progress={1} tagline="Bilan reçu · Merci">
      <style>{`
        @keyframes bom-pop {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bom-draw { to { stroke-dashoffset: 0; } }
        @keyframes bom-pulse {
          0% { transform: scale(1); opacity: 0.55; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .bom-check-wrap, .bom-pulse, .bom-circle, .bom-path { animation: none !important; }
          .bom-circle, .bom-path { stroke-dashoffset: 0 !important; }
        }
      `}</style>

      <div style={{
        padding: "clamp(56px, 8vw, 112px) clamp(20px, 5vw, 56px) clamp(40px, 5vw, 80px)",
        maxWidth: "clamp(560px, 60vw, 720px)", margin: "0 auto",
      }}>
        <BoEyebrow>Bilan reçu</BoEyebrow>
        <div style={{ height: 24 }} />

        {/* Checkmark animé */}
        <div style={{
          width: 80, height: 80, marginBottom: 32,
          position: "relative",
        }}>
          <div className="bom-check-wrap" style={{
            width: 80, height: 80, borderRadius: "50%",
            background: "rgba(201, 168, 76, 0.10)",
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative", zIndex: 1,
            animation: "bom-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both",
          }}>
            <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden>
              <circle cx="30" cy="30" r="27" fill="none" stroke={BO_TOKENS.gold} strokeWidth="2"
                className="bom-circle"
                style={{
                  strokeDasharray: 170, strokeDashoffset: 170,
                  animation: "bom-draw 640ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards",
                }}
              />
              <path d="M18 31 L26 39 L43 22" fill="none" stroke={BO_TOKENS.gold} strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round"
                className="bom-path"
                style={{
                  strokeDasharray: 50, strokeDashoffset: 50,
                  animation: "bom-draw 400ms ease-out 640ms forwards",
                }}
              />
            </svg>
          </div>
          {/* Pulse rings */}
          <span className="bom-pulse" style={{
            position: "absolute", inset: 0,
            borderRadius: "50%", border: `1px solid ${BO_TOKENS.gold}`,
            animation: "bom-pulse 1400ms cubic-bezier(0.22, 1, 0.36, 1) 800ms 2",
          }} />
        </div>

        <BoHero>
          Merci{firstName ? `, ${firstName}` : ""}.
        </BoHero>
        <div style={{ height: 16 }} />

        <BoLead style={{ maxWidth: 400 }}>
          {hasCoach ? (
            <>
              Ton bilan est arrivé chez{" "}
              <strong style={{ color: BO_TOKENS.gold, fontWeight: 600 }}>{coachName}</strong>.
              Il va l'analyser et te recontacter sous <strong style={{ color: BO_TOKENS.navy, fontWeight: 600 }}>48h max</strong>.
            </>
          ) : (
            <>
              Ton bilan est arrivé chez l'équipe{" "}
              <strong style={{ color: BO_TOKENS.gold, fontWeight: 600 }}>La Base 360</strong>.
              Un coach adapté à ton profil va te répondre rapidement.
            </>
          )}
        </BoLead>

        <div style={{ height: 48 }} />

        <div style={{
          fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 13,
          letterSpacing: "0.18em", color: BO_TOKENS.gold,
          textTransform: "uppercase", marginBottom: 12,
        }}>
          En attendant
        </div>

        <a
          href="https://instagram.com/labase360"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 18px", borderRadius: 14,
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(12px) saturate(160%)",
            WebkitBackdropFilter: "blur(12px) saturate(160%)",
            border: `1.5px solid ${BO_TOKENS.hair}`,
            textDecoration: "none", color: BO_TOKENS.navy,
            fontFamily: BO_TOKENS.fontBody, fontSize: 15, fontWeight: 500,
            transition: "border-color 200ms, transform 200ms",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = BO_TOKENS.gold;
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = BO_TOKENS.hair;
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <span style={{ fontSize: 22 }}>📱</span>
          <span style={{ flex: 1 }}>Suis-nous sur Instagram</span>
          <span style={{ color: BO_TOKENS.gold, fontSize: 16 }}>→</span>
        </a>

        <div style={{ height: 32 }} />
        <BoFooterRgpd>Tu peux fermer cette page ou la garder ouverte.</BoFooterRgpd>
        <div style={{ height: 24 }} />
      </div>
    </BilanOnlineShell>
  );
}
