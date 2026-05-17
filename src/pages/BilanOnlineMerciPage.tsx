// =============================================================================
// BilanOnlineMerciPage — Page remerciement post-soumission (étape 1.5).
//
// Route : /bilan-online/:coachSlug?/merci?firstName=...
//
// Reachée par BilanOnlinePage après POST submit-online-bilan réussi.
// Pas de QR code ici (vs BilanTermineePage du coach) : on est sur le
// flow Lead public, l'objectif est rassurance + soft retention via les
// liens sociaux. Checkmark gold animé + variante texte selon coach
// identifié ou bilan libre admin.
// =============================================================================

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

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
    <div className="bom-root">
      <style>{STYLES}</style>

      <div className="bom-card">
        <div className="bom-checkmark" aria-hidden="true">
          <svg viewBox="0 0 60 60" width="60" height="60">
            <circle cx="30" cy="30" r="27" fill="none" stroke="#C9A84C" strokeWidth="3"
              className="bom-check-circle" />
            <path d="M18 31 L26 39 L43 22" fill="none" stroke="#C9A84C" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round" className="bom-check-path" />
          </svg>
        </div>

        <h1 className="bom-h1">
          Merci{firstName ? ` ${firstName}` : ""} ! 🙏
        </h1>

        <p className="bom-body">
          {hasCoach ? (
            <>
              Ton bilan est arrivé chez <strong>{coachName}</strong>.<br />
              Il va l'analyser et te recontacter sous <strong>48h max</strong>.
            </>
          ) : (
            <>
              Ton bilan est arrivé chez l'équipe <strong>La Base 360</strong>.<br />
              Un coach adapté à ton profil va te répondre rapidement.
            </>
          )}
        </p>

        <div className="bom-divider" />

        <p className="bom-attente">En attendant :</p>

        <div className="bom-links">
          <a
            href="https://instagram.com/labase360"
            target="_blank"
            rel="noopener noreferrer"
            className="bom-link"
          >
            <span className="bom-link-emoji">📱</span>
            <span>Suis-nous sur Instagram</span>
          </a>
        </div>

        <p className="bom-microcopy">
          Tu peux fermer cette page ou la garder ouverte.
        </p>
      </div>
    </div>
  );
}

const STYLES = `
  .bom-root {
    min-height: 100vh;
    min-height: 100dvh;
    background:
      radial-gradient(circle at 20% 10%, rgba(16, 185, 129, 0.18) 0%, transparent 55%),
      radial-gradient(circle at 80% 30%, rgba(6, 182, 212, 0.16) 0%, transparent 55%),
      radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.14) 0%, transparent 60%),
      #FAFAF7;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    color: #0F172A;
  }

  .bom-card {
    max-width: 480px;
    width: 100%;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 24px;
    padding: 36px 24px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.6);
    text-align: center;
  }

  .bom-checkmark {
    width: 80px;
    height: 80px;
    margin: 0 auto 20px auto;
    background: rgba(201, 168, 76, 0.10);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: bom-pop 480ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  .bom-check-circle {
    stroke-dasharray: 170;
    stroke-dashoffset: 170;
    animation: bom-draw 600ms ease-out 200ms forwards;
  }
  .bom-check-path {
    stroke-dasharray: 50;
    stroke-dashoffset: 50;
    animation: bom-draw 400ms ease-out 600ms forwards;
  }

  @keyframes bom-pop {
    0% { transform: scale(0); }
    100% { transform: scale(1); }
  }
  @keyframes bom-draw {
    to { stroke-dashoffset: 0; }
  }

  .bom-h1 {
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #0F172A;
    margin: 0 0 16px 0;
    letter-spacing: -0.02em;
  }

  .bom-body {
    font-size: 16px;
    line-height: 1.55;
    color: #374151;
    margin: 0 0 8px 0;
  }
  .bom-body strong { color: #0F172A; font-weight: 700; }

  .bom-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, #E5E7EB 50%, transparent 100%);
    margin: 28px 0 20px 0;
  }

  .bom-attente {
    font-size: 14px;
    color: #6B7280;
    margin: 0 0 12px 0;
    letter-spacing: 0.02em;
  }

  .bom-links { display: flex; flex-direction: column; gap: 10px; }
  .bom-link {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 14px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    border-radius: 14px;
    text-decoration: none;
    color: #1F2937;
    font-size: 15px;
    font-weight: 500;
    min-height: 50px;
    transition: border-color 160ms, transform 160ms;
  }
  .bom-link:hover {
    border-color: #C9A84C;
    transform: translateY(-1px);
  }
  .bom-link-emoji { font-size: 20px; }

  .bom-microcopy {
    font-size: 12.5px;
    color: #9CA3AF;
    margin: 24px 0 0 0;
  }

  @media (min-width: 640px) {
    .bom-card { padding: 44px 36px; }
    .bom-h1 { font-size: 32px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bom-checkmark, .bom-check-circle, .bom-check-path { animation: none; }
    .bom-check-circle, .bom-check-path { stroke-dashoffset: 0; }
    .bom-link:hover { transform: none; }
  }
`;
