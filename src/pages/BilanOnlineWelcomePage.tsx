// =============================================================================
// BilanOnlineWelcomePage — Hero éditorial d'entrée du bilan online.
// Chantier #1 étape 1.4 (2026-05-17) — refonte design Claude Design.
// Route : /bilan-online/:coachSlug?
//
// Si slug → "<Prénom> va t'accompagner" + CTA direct vers /formulaire.
// Si pas de slug → input free text "Qui t'a invité ?" + fallback bilan libre.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BO_TOKENS,
  BilanOnlineShell,
  BoEyebrow,
  BoHero,
  BoLead,
  BoCta,
  BoArrow,
  BoFooterRgpd,
} from "../components/bilan-online/BilanOnlineShell";

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
    <BilanOnlineShell>
      <div style={{ padding: "64px 24px 40px", maxWidth: 560, margin: "0 auto" }}>
        <BoEyebrow>Bienvenue</BoEyebrow>
        <div style={{ height: 24 }} />

        <BoHero>
          Nous sommes heureux de te voir ici.
        </BoHero>
        <div style={{ height: 16 }} />

        {slug ? (
          <BoLead>
            <strong style={{ color: BO_TOKENS.gold, fontWeight: 600 }}>{coachName}</strong>{" "}
            va t'accompagner. Un bilan personnalisé, en 2 minutes.
          </BoLead>
        ) : (
          <BoLead>
            Un bilan personnalisé pour comprendre ton corps et te guider vers
            tes vrais objectifs. 2 minutes, gratuit.
          </BoLead>
        )}

        <div style={{ height: 48 }} />

        {/* Bullets éditoriales La Base 360 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {[
            "Un bilan personnalisé pour comprendre ton corps",
            "Un coach humain qui t'accompagne au quotidien",
            "Des résultats durables, pas une mode passagère",
          ].map((text, i) => (
            <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{
                fontFamily: BO_TOKENS.fontDisplay, fontWeight: 600, fontSize: 13,
                color: BO_TOKENS.gold, letterSpacing: "0.06em",
                paddingTop: 4, minWidth: 24,
              }}>
                0{i + 1}
              </div>
              <div style={{
                fontFamily: BO_TOKENS.fontBody, fontSize: 15, lineHeight: 1.55,
                color: BO_TOKENS.navy, opacity: 0.82, flex: 1,
              }}>
                {text}
              </div>
            </div>
          ))}
        </div>

        <div style={{ height: 48 }} />

        {slug ? (
          <>
            <BoCta onClick={startWithSlug}>
              Commencer mon bilan
              <BoArrow />
            </BoCta>
            <div style={{ height: 12 }} />
            <BoFooterRgpd>Promis, ça prend 2 min · Confidentiel · RGPD</BoFooterRgpd>
          </>
        ) : showFreeBilan ? (
          <>
            <BoCta onClick={startFreeBilan}>
              Commencer mon bilan
              <BoArrow />
            </BoCta>
            <div style={{ height: 14 }} />
            <button
              type="button"
              onClick={() => setShowFreeBilan(false)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                fontFamily: BO_TOKENS.fontBody, fontSize: 13,
                color: BO_TOKENS.navy, opacity: 0.55, padding: "8px 0",
                textDecoration: "underline", textUnderlineOffset: 3,
              }}
            >
              ← J'ai un coach en tête
            </button>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 16,
              color: BO_TOKENS.navy, letterSpacing: "-0.01em", marginBottom: 10,
            }}>
              Qui t'a invité ici ?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                placeholder="Prénom du coach"
                value={inputName}
                onChange={(e) => setInputName(e.target.value)}
                maxLength={50}
                onKeyDown={(e) => { if (e.key === "Enter") startFromInput(); }}
                style={{
                  width: "100%", boxSizing: "border-box",
                  padding: "16px 18px", borderRadius: 14,
                  border: `1.5px solid ${BO_TOKENS.hair}`,
                  background: "rgba(255, 255, 255, 0.92)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  fontFamily: BO_TOKENS.fontBody, fontSize: 16,
                  color: BO_TOKENS.navy,
                  outline: "none",
                  minHeight: 54,
                  colorScheme: "light",
                }}
              />
              <BoCta
                onClick={startFromInput}
                disabled={normalizeSlug(inputName).length < 2}
              >
                C'est parti
                <BoArrow />
              </BoCta>
            </div>

            <div style={{
              margin: "20px 0", textAlign: "center",
              fontFamily: BO_TOKENS.fontBody, fontSize: 12,
              color: BO_TOKENS.navy, opacity: 0.4, letterSpacing: 0.2,
              textTransform: "uppercase",
            }}>
              ou
            </div>

            <button
              type="button"
              onClick={() => setShowFreeBilan(true)}
              style={{
                all: "unset",
                width: "100%", boxSizing: "border-box",
                padding: "16px 0", borderRadius: 14,
                border: `1.5px solid ${BO_TOKENS.hair}`,
                background: "transparent",
                textAlign: "center",
                fontFamily: BO_TOKENS.fontBody, fontSize: 15, fontWeight: 500,
                color: BO_TOKENS.navy, opacity: 0.75,
                cursor: "pointer",
                transition: "border-color 160ms, opacity 160ms",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.borderColor = BO_TOKENS.gold; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.75"; e.currentTarget.style.borderColor = BO_TOKENS.hair; }}
            >
              Personne, je découvre seul·e
            </button>

            <div style={{ height: 18 }} />
            <BoFooterRgpd>Bilan offert · Confidentiel · RGPD</BoFooterRgpd>
          </>
        )}

        <div style={{ height: 24 }} />
      </div>
    </BilanOnlineShell>
  );
}
