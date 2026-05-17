// =============================================================================
// BilanOnlineWelcomePage — implémente strictement le mockup Égypte validé.
// docs/mockups/bilan-online.html (commit 25c0165), view "welcome".
// Route : /bilan-online/:coachSlug?
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BO, BilanOnlineShell, BoBrand, BoCtaPrimary } from "../components/bilan-online/BilanOnlineShell";

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
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function BilanOnlineWelcomePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = useMemo(() => normalizeSlug(coachSlug ?? ""), [coachSlug]);
  const coachName = slug ? capitalize(slug) : "";
  const initials = getInitials(coachName);

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
    <BilanOnlineShell bgAccent>
      <div style={{ padding: "32px 24px 40px", textAlign: "center" }}>
        <BoBrand />

        <div className="bo-bounce" style={{
          fontSize: 56, lineHeight: 1, margin: "28px 0 20px",
          display: "inline-block",
          animation: "bo-bounce 2.5s ease-in-out infinite",
        }}>
          🥰
        </div>

        <h1 style={{
          fontFamily: BO.fontDisplay, fontSize: 28, fontWeight: 700,
          color: BO.text, lineHeight: 1.25,
          margin: "0 auto 24px", maxWidth: 340,
        }}>
          Nous sommes heureux<br />de te voir ici.
        </h1>

        {slug && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 12,
            padding: "12px 18px 12px 12px",
            background: "white", borderRadius: 999,
            boxShadow: "0 4px 16px rgba(11, 13, 17, 0.08)",
            marginBottom: 28,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: `linear-gradient(135deg, ${BO.gold} 0%, ${BO.teal} 100%)`,
              color: BO.charcoal,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: BO.fontDisplay, fontWeight: 700, fontSize: 14,
              flexShrink: 0,
            }}>
              {initials}
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{
                fontSize: 10, color: BO.textHint,
                textTransform: "uppercase", letterSpacing: "0.08em",
                fontWeight: 600,
              }}>
                Ton coach
              </div>
              <div style={{
                fontFamily: BO.fontDisplay, fontSize: 14, fontWeight: 700,
                color: BO.text,
              }}>
                {coachName}
              </div>
            </div>
          </div>
        )}

        <div style={{
          background: "white", borderRadius: 16,
          padding: "20px 22px", margin: "0 0 24px",
          textAlign: "left",
          boxShadow: "0 2px 12px rgba(11, 13, 17, 0.05)",
        }}>
          <h2 style={{
            fontFamily: BO.fontDisplay, fontSize: 16, fontWeight: 700,
            color: BO.text, marginBottom: 14, textAlign: "center",
            margin: "0 0 14px 0",
          }}>
            La Base 360, c'est :
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {[
              "Un bilan personnalisé pour comprendre ton corps",
              "Un coach humain qui t'accompagne au quotidien",
              "Des résultats durables, pas une mode passagère",
            ].map((text) => (
              <li key={text} style={{
                position: "relative", paddingLeft: 24,
                fontSize: 14, color: BO.textMuted,
                marginBottom: 10, lineHeight: 1.5,
              }}>
                <span style={{
                  position: "absolute", left: 0, top: 1,
                  width: 18, height: 18, borderRadius: "50%",
                  background: BO.teal, color: "white",
                  fontSize: 11, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  ✓
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {slug ? (
          <>
            <BoCtaPrimary onClick={startWithSlug}>
              Commencer mon bilan
            </BoCtaPrimary>
            <div style={{
              marginTop: 14, fontSize: 12, color: BO.textMuted,
            }}>
              Promis, ça prend 2 min 🙏
            </div>
          </>
        ) : showFreeBilan ? (
          <>
            <BoCtaPrimary onClick={startFreeBilan}>
              Commencer mon bilan
            </BoCtaPrimary>
            <div style={{ marginTop: 14, fontSize: 12, color: BO.textMuted }}>
              Promis, ça prend 2 min 🙏
            </div>
            <button
              type="button"
              onClick={() => setShowFreeBilan(false)}
              style={{
                marginTop: 24, fontSize: 12, color: BO.textHint,
                background: "none", border: "none", cursor: "pointer",
                fontFamily: "inherit", textDecoration: "underline",
              }}
            >
              ← J'ai un coach en tête
            </button>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: BO.fontDisplay, fontSize: 14, fontWeight: 700,
              color: BO.text, marginBottom: 10, textAlign: "left",
            }}>
              Qui t'a invité ici ?
            </div>
            <input
              type="text"
              placeholder="Prénom du coach (ex : Thomas)"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") startFromInput(); }}
              maxLength={50}
              style={{
                width: "100%", padding: "14px 16px",
                border: `1px solid ${BO.border}`, borderRadius: 12,
                fontSize: 16, fontFamily: "inherit",
                background: BO.surface2, color: BO.text,
                outline: "none", marginBottom: 12, boxSizing: "border-box",
                colorScheme: "light",
              }}
            />
            <BoCtaPrimary
              onClick={startFromInput}
              disabled={normalizeSlug(inputName).length < 2}
            >
              C'est parti →
            </BoCtaPrimary>
            <div style={{
              marginTop: 24, fontSize: 12, color: BO.textHint,
            }}>
              Tu n'as pas été invité par un coach ?{" "}
              <a
                onClick={() => setShowFreeBilan(true)}
                style={{
                  color: BO.tealDark, textDecoration: "underline",
                  cursor: "pointer",
                }}
              >
                Continuer en bilan libre
              </a>
            </div>
          </>
        )}
      </div>
    </BilanOnlineShell>
  );
}
