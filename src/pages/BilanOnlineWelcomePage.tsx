// =============================================================================
// BilanOnlineWelcomePage V2 dark (chantier A, 2026-05-18) — refonte design.
// Source de verite : docs/mockups/bilan-online-v2.html view-welcome.
// Route : /bilan-online/:coachSlug?
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  PublicShell,
  PublicCtaPrimary,
  PublicBrand,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";
import { CoachCredibilityBadges, type CoachCredibility } from "../components/bilan-online/CoachCredibilityBadges";
import { TestimonialsCarousel } from "../components/testimonials/TestimonialsCarousel";
import { LaBase360Logo } from "../components/public/LaBase360Logo";

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
  const fallbackCoachName = slug ? capitalize(slug) : "";

  const [inputName, setInputName] = useState("");
  const [showFreeBilan, setShowFreeBilan] = useState(false);
  const [coachData, setCoachData] = useState<CoachCredibility | null>(null);

  // Nom officiel via RPC si dispo (first_name + initiale nom), fallback slug
  const coachDisplayName = useMemo(() => {
    if (coachData?.first_name) {
      const lastInit = coachData.name?.[0] ? ` ${coachData.name[0]}.` : "";
      return `${coachData.first_name}${lastInit}`;
    }
    return fallbackCoachName;
  }, [coachData, fallbackCoachName]);


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
    <PublicShell defaultTheme="dark">
      <div style={{ padding: "48px 22px 80px", textAlign: "center" }}>
        <PublicBrand label="Bilan" />

        {/* Emoji hero bounce */}
        <div
          className="ps-bounce"
          style={{
            fontSize: 56,
            lineHeight: 1,
            margin: "24px 0 16px",
            display: "inline-block",
            filter: "drop-shadow(0 4px 20px rgba(45,212,191,0.40))",
          }}
        >
          🥰
        </div>

        {/* H1 avec mot heureux en gradient italic */}
        <h1
          style={{
            fontFamily: PUBLIC_FONTS.display,
            fontSize: "clamp(32px, 7vw, 44px)",
            fontWeight: 600,
            color: "var(--cream)",
            lineHeight: 1.08,
            letterSpacing: "-0.02em",
            textAlign: "center",
            margin: "0 auto 18px",
            maxWidth: 480,
          }}
        >
          Nous sommes <span style={publicGradText}>heureux</span>
          <br />
          de te voir ici.
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 16,
            color: "var(--cream-muted)",
            textAlign: "center",
            maxWidth: 400,
            margin: "0 auto 32px",
            lineHeight: 1.55,
          }}
        >
          2 minutes pour comprendre ton corps, tes objectifs, et te proposer un accompagnement vraiment personnalisé.
        </p>

        {/* Coach card glassmorphism pill — logo La Base 360 + nom coach + pin Herbalife */}
        {slug && (
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                background: "var(--glass)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid var(--hair)",
                borderRadius: 999,
                padding: "12px 22px 12px 12px",
                display: "inline-flex",
                alignItems: "center",
                gap: 14,
                boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
              }}
            >
              <LaBase360Logo
                variant="mark"
                size={48}
                alt="La Base 360"
                style={{ borderRadius: 12 }}
              />
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 10,
                    color: "var(--cream-hint)",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    fontWeight: 600,
                    fontFamily: PUBLIC_FONTS.display,
                  }}
                >
                  Ton coach
                </div>
                <div
                  style={{
                    fontFamily: PUBLIC_FONTS.display,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--cream)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>{coachDisplayName || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {slug && (
          <CoachCredibilityBadges
            coachSlug={slug}
            variant="welcome"
            hideRank
            onResolved={setCoachData}
          />
        )}

        {/* Pitch card glassmorphism */}
        <div
          style={{
            background: "var(--glass)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            border: "1px solid var(--hair)",
            borderRadius: 20,
            padding: "24px 22px",
            marginBottom: 28,
            textAlign: "left",
          }}
        >
          <h2
            style={{
              fontFamily: PUBLIC_FONTS.display,
              fontSize: 14,
              fontWeight: 600,
              color: "var(--cream-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginBottom: 18,
              textAlign: "center",
            }}
          >
            La Base 360, c'est
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              "Un bilan personnalisé pour comprendre ton corps",
              "Un coach humain qui t'accompagne au quotidien",
              "Des résultats durables, pas une mode passagère",
            ].map((text) => (
              <li
                key={text}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 14,
                  fontSize: 15,
                  color: "var(--cream-soft)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 22,
                    height: 22,
                    minWidth: 22,
                    borderRadius: "50%",
                    background: PUBLIC_TOKENS.gradCta,
                    color: PUBLIC_TOKENS.ink,
                    fontSize: 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: PUBLIC_FONTS.display,
                    marginTop: 1,
                  }}
                >
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Témoignages clients vérifiés (chantier #11) — carousel auto-rotation */}
        <TestimonialsCarousel variant="welcome" />

        {slug ? (
          <>
            <PublicCtaPrimary onClick={startWithSlug}>Commencer mon bilan →</PublicCtaPrimary>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "var(--cream-hint)",
                fontFamily: PUBLIC_FONTS.mono,
                letterSpacing: "0.08em",
              }}
            >
              Promis · 2 min · sans pression
            </div>
          </>
        ) : showFreeBilan ? (
          <>
            <PublicCtaPrimary onClick={startFreeBilan}>Commencer mon bilan →</PublicCtaPrimary>
            <div
              style={{
                marginTop: 16,
                fontSize: 12,
                color: "var(--cream-hint)",
                fontFamily: PUBLIC_FONTS.mono,
                letterSpacing: "0.08em",
              }}
            >
              Promis · 2 min · sans pression
            </div>
            <button
              type="button"
              onClick={() => setShowFreeBilan(false)}
              style={{
                marginTop: 24,
                fontSize: 13,
                color: "var(--cream-hint)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textDecoration: "underline",
              }}
            >
              ← J'ai un coach en tête
            </button>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: PUBLIC_FONTS.display,
                fontSize: 14,
                fontWeight: 600,
                color: "var(--cream)",
                marginBottom: 10,
                textAlign: "left",
              }}
            >
              Qui t'a invité ici ?
            </div>
            <input
              type="text"
              aria-label="Prénom du coach qui t'a invité"
              placeholder="Prénom du coach (ex : Thomas)"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startFromInput();
              }}
              maxLength={50}
              className="ps-input"
              style={{
                width: "100%",
                padding: "14px 16px",
                background: "var(--glass-input)",
                border: "1px solid var(--hair-strong)",
                borderRadius: 14,
                fontFamily: PUBLIC_FONTS.body,
                fontSize: 16,
                color: "var(--cream)",
                outline: "none",
                marginBottom: 12,
                boxSizing: "border-box",
                transition: "all 0.22s",
              }}
            />
            <PublicCtaPrimary onClick={startFromInput} disabled={normalizeSlug(inputName).length < 2}>
              C'est parti →
            </PublicCtaPrimary>
            <div
              style={{
                marginTop: 24,
                fontSize: 13,
                color: "var(--cream-hint)",
              }}
            >
              Tu n'as pas été invité par un coach ?{" "}
              <button
                type="button"
                onClick={() => setShowFreeBilan(true)}
                style={{
                  color: PUBLIC_TOKENS.teal,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: 500,
                  background: "none",
                  border: "none",
                  padding: 0,
                  font: "inherit",
                }}
              >
                Continuer en bilan libre
              </button>
            </div>
          </>
        )}
      </div>
    </PublicShell>
  );
}
