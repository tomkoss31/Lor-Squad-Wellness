// =============================================================================
// BilanOnlineWelcomePage — Hero d'entrée du bilan online (chantier #1 étape 1.4).
//
// Route : /bilan-online/:coachSlug?
//
// Comportement :
//   - Si :coachSlug fourni → affiche "<Prénom> va t'accompagner" + CTA direct
//   - Si pas de slug → input "Qui t'a invité ?" (free text) + bouton
//     "Personne, je découvre seul" (fallback bilan libre = admin)
//
// L'autocomplete avec liste réelle des coachs nécessiterait un endpoint
// public — reporté V2 (cf. brainstorm). En V1 : free text + résolution
// côté edge function (submit-online-bilan).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function BilanOnlineWelcomePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = useMemo(() => normalizeSlug(coachSlug ?? ""), [coachSlug]);
  const coachName = slug ? capitalize(slug) : "";

  const [inputName, setInputName] = useState("");
  const [showFreeBilan, setShowFreeBilan] = useState(false);

  function startWithSlug() {
    navigate(`/bilan-online/${slug}/formulaire`);
  }

  function startFromInput() {
    const next = normalizeSlug(inputName);
    if (next.length < 2) return;
    navigate(`/bilan-online/${next}/formulaire`);
  }

  function startFreeBilan() {
    navigate("/bilan-online/formulaire");
  }

  return (
    <div className="bow-root">
      <style>{STYLES}</style>

      <div className="bow-card">
        <div className="bow-badge">★ Since 2022 ★</div>

        <h1 className="bow-h1">
          Nous sommes heureux<br />de te voir ici 🥰
        </h1>

        {slug && (
          <p className="bow-coach-line">
            <strong>{coachName}</strong> va t'accompagner.
          </p>
        )}

        <div className="bow-divider" />

        <h2 className="bow-h2">La Base 360, c'est :</h2>
        <ul className="bow-bullets">
          <li>
            <span className="bow-bullet-dot" />
            Un bilan personnalisé pour comprendre ton corps
          </li>
          <li>
            <span className="bow-bullet-dot" />
            Un coach humain qui t'accompagne au quotidien
          </li>
          <li>
            <span className="bow-bullet-dot" />
            Des résultats durables, pas une mode passagère
          </li>
        </ul>

        <div className="bow-divider" />

        {slug ? (
          <>
            <button
              type="button"
              className="bow-cta"
              onClick={startWithSlug}
            >
              Commencer mon bilan
            </button>
            <p className="bow-microcopy">Promis, ça prend 2 min 🙏</p>
          </>
        ) : showFreeBilan ? (
          <>
            <button
              type="button"
              className="bow-cta"
              onClick={startFreeBilan}
            >
              Commencer mon bilan
            </button>
            <p className="bow-microcopy">
              Un membre de l'équipe te recontactera.
            </p>
            <button
              type="button"
              className="bow-link"
              onClick={() => setShowFreeBilan(false)}
            >
              ← J'ai un coach en tête
            </button>
          </>
        ) : (
          <>
            <label className="bow-label">Qui t'a invité ici ?</label>
            <div className="bow-input-row">
              <input
                type="text"
                className="bow-input"
                placeholder="Prénom du coach"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                maxLength={50}
                autoComplete="off"
                onKeyDown={(e) => {
                  if (e.key === "Enter") startFromInput();
                }}
              />
              <button
                type="button"
                className="bow-cta bow-cta-compact"
                onClick={startFromInput}
                disabled={normalizeSlug(inputName).length < 2}
              >
                C'est parti →
              </button>
            </div>
            <div className="bow-or">ou</div>
            <button
              type="button"
              className="bow-ghost"
              onClick={() => setShowFreeBilan(true)}
            >
              Personne, je découvre seul·e
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const STYLES = `
  .bow-root {
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

  .bow-card {
    max-width: 480px;
    width: 100%;
    background: rgba(255, 255, 255, 0.92);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-radius: 24px;
    padding: 32px 24px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.6);
    text-align: center;
  }

  .bow-badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.20em;
    color: #C9A84C;
    background: rgba(201, 168, 76, 0.10);
    padding: 6px 14px;
    border-radius: 999px;
    margin-bottom: 20px;
  }

  .bow-h1 {
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
    margin: 0 0 16px 0;
    color: #0F172A;
    letter-spacing: -0.02em;
  }

  .bow-coach-line {
    font-size: 17px;
    color: #1F2937;
    margin: 0;
  }
  .bow-coach-line strong {
    color: #C9A84C;
    font-weight: 700;
  }

  .bow-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, #E5E7EB 50%, transparent 100%);
    margin: 24px 0;
  }

  .bow-h2 {
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0;
    color: #1F2937;
    text-align: left;
  }
  .bow-bullets {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
  }
  .bow-bullets li {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    font-size: 14.5px;
    line-height: 1.45;
    color: #374151;
  }
  .bow-bullet-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #C9A84C;
    margin-top: 7px;
    flex-shrink: 0;
  }

  .bow-label {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #1F2937;
    margin-bottom: 10px;
    text-align: left;
  }
  .bow-input-row {
    display: flex;
    gap: 8px;
    flex-direction: column;
  }
  .bow-input {
    flex: 1;
    font-size: 16px;
    padding: 14px 16px;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    background: #fff;
    color: #0F172A;
    font-family: inherit;
    min-height: 50px;
    box-sizing: border-box;
    width: 100%;
  }
  .bow-input:focus {
    outline: none;
    border-color: #C9A84C;
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }

  .bow-or {
    text-align: center;
    font-size: 13px;
    color: #6B7280;
    margin: 14px 0;
  }

  .bow-cta {
    width: 100%;
    padding: 16px;
    font-size: 16px;
    font-weight: 700;
    color: #fff;
    background: linear-gradient(90deg, #C9A84C 0%, #E0BF6B 100%);
    border: none;
    border-radius: 14px;
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 6px 20px rgba(201, 168, 76, 0.30);
    transition: transform 160ms, box-shadow 160ms;
    min-height: 54px;
  }
  .bow-cta:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(201, 168, 76, 0.40);
  }
  .bow-cta:disabled { opacity: 0.55; cursor: not-allowed; }
  .bow-cta-compact { min-height: 50px; padding: 14px; }

  .bow-ghost {
    width: 100%;
    padding: 14px;
    background: transparent;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    color: #374151;
    font-size: 15px;
    font-family: inherit;
    cursor: pointer;
    min-height: 50px;
  }
  .bow-ghost:hover { background: #F9FAFB; }

  .bow-link {
    background: transparent;
    border: none;
    color: #6B7280;
    font-size: 14px;
    font-family: inherit;
    cursor: pointer;
    padding: 12px 8px;
    margin-top: 4px;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .bow-microcopy {
    font-size: 12.5px;
    color: #6B7280;
    margin: 10px 0 0 0;
  }

  @media (min-width: 640px) {
    .bow-card { padding: 40px 36px; }
    .bow-h1 { font-size: 32px; }
    .bow-input-row { flex-direction: row; }
    .bow-cta-compact { width: auto; flex-shrink: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bow-cta:hover { transform: none; }
  }
`;
