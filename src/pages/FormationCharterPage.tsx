// =============================================================================
// FormationCharterPage — feature #9 (2026-11-04)
//
// Charte du Distributeur Lor'Squad — page nominative imprimable.
// Genre rituel d engagement fort : le distri lit, signe, transforme une
// intention en chaine positive avec ses pairs.
//
// Sections :
//   1. Header gold "Charte du Distributeur Lor'Squad" + nom user + date
//   2. 5 engagements (Ethique / Personnel / Equipe / Pourquoi / Objectif 12m)
//   3. 2 zones de signature : distri + coach (champ texte editable)
//   4. Footer "Lor'Squad Wellness · 2026"
//
// 2 champs editables persistes localStorage :
//   - "pourquoi" : texte personnel ("Pourquoi je fais ca")
//   - "objectif12m" : objectif 12 mois ecrit avec ses mots
//
// Export PDF via certificateExport.ts (reuse pattern certificat).
// Theme-aware via var(--ls-*) sauf print mode (force fond blanc).
// =============================================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { APP_FALLBACK_DISTRI } from "../lib/branding";
import {
  slugifyForFilename,
  downloadCertPdf,
  downloadCertPng,
} from "../lib/certificateExport";

const STORAGE_PREFIX = "ls-charter-";

interface StoredCharter {
  pourquoi: string;
  objectif12m: string;
  signedAtIso?: string;
}

function readStored(userId: string): StoredCharter {
  if (typeof window === "undefined") return { pourquoi: "", objectif12m: "" };
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return { pourquoi: "", objectif12m: "" };
    const parsed = JSON.parse(raw) as Partial<StoredCharter>;
    return {
      pourquoi: parsed.pourquoi ?? "",
      objectif12m: parsed.objectif12m ?? "",
      signedAtIso: parsed.signedAtIso,
    };
  } catch {
    return { pourquoi: "", objectif12m: "" };
  }
}

function writeStored(userId: string, value: StoredCharter): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_PREFIX + userId, JSON.stringify(value));
  } catch {
    /* quota */
  }
}

const ENGAGEMENTS = [
  {
    icon: "🤝",
    title: "Engagement éthique",
    text:
      "Je m'engage à représenter Lor'Squad et Herbalife avec intégrité — pas de promesses de revenus garantis, pas de pression commerciale, pas de jugement. Je présente l'opportunité, je laisse choisir.",
  },
  {
    icon: "💪",
    title: "Engagement personnel",
    text:
      "Je consomme avant de vendre. Je suis l'exemple — pas l'expert. Je m'autorise à apprendre, à me tromper, à ajuster. Je traite mon activité comme une vraie entreprise.",
  },
  {
    icon: "👥",
    title: "Engagement équipe",
    text:
      "Je soutiens ma lignée comme on soutient une équipe : sans paternalisme, sans abandon. Je transmets ce que j'apprends. Je célèbre les wins de mes recrues comme les miens.",
  },
];

export function FormationCharterPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const userId = currentUser?.id ?? null;
  const [pourquoi, setPourquoi] = useState("");
  const [objectif12m, setObjectif12m] = useState("");
  const [signedAtIso, setSignedAtIso] = useState<string | undefined>(undefined);
  const [downloading, setDownloading] = useState<null | "pdf" | "png">(null);
  const charterRef = useRef<HTMLDivElement>(null);

  const userName = currentUser?.name ?? APP_FALLBACK_DISTRI;
  const today = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Load au mount
  useEffect(() => {
    if (!userId) return;
    const stored = readStored(userId);
    setPourquoi(stored.pourquoi);
    setObjectif12m(stored.objectif12m);
    setSignedAtIso(stored.signedAtIso);
  }, [userId]);

  function handleSign() {
    if (!userId) return;
    const nowIso = new Date().toISOString();
    setSignedAtIso(nowIso);
    writeStored(userId, { pourquoi, objectif12m, signedAtIso: nowIso });
  }

  function persistField(field: "pourquoi" | "objectif12m", value: string) {
    if (!userId) return;
    if (field === "pourquoi") setPourquoi(value);
    else setObjectif12m(value);
    writeStored(userId, {
      pourquoi: field === "pourquoi" ? value : pourquoi,
      objectif12m: field === "objectif12m" ? value : objectif12m,
      signedAtIso,
    });
  }

  async function handleDownload(kind: "pdf" | "png") {
    const node = charterRef.current;
    if (!node) return;
    const slug = slugifyForFilename(userName, "charte");
    const base = `charte-distributeur-${slug}`;
    setDownloading(kind);
    try {
      if (kind === "pdf") await downloadCertPdf(node, `${base}.pdf`, "a4");
      else await downloadCertPng(node, `${base}.png`);
    } catch (err) {
      console.warn("[Charter] download failed", err);
      alert("Téléchargement impossible. Réessaie.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "24px 16px 60px",
        background: "var(--ls-bg)",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            marginBottom: 20,
          }}
        >
          <button
            type="button"
            onClick={() => navigate("/formation")}
            style={{
              background: "transparent",
              border: "0.5px solid var(--ls-border)",
              color: "var(--ls-text-muted)",
              padding: "8px 14px",
              borderRadius: 10,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            ← Retour à Formation
          </button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => handleDownload("pdf")}
              disabled={downloading !== null}
              style={{
                background: "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-bg)) 100%)",
                color: "var(--ls-bg)",
                border: "none",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: downloading ? "wait" : "pointer",
              }}
            >
              {downloading === "pdf" ? "⏳…" : "📥 Télécharger PDF"}
            </button>
            <button
              type="button"
              onClick={() => handleDownload("png")}
              disabled={downloading !== null}
              style={{
                background: "var(--ls-surface)",
                color: "var(--ls-gold)",
                border: "1px solid var(--ls-gold)",
                padding: "10px 18px",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: 700,
                cursor: downloading ? "wait" : "pointer",
              }}
            >
              {downloading === "png" ? "⏳…" : "🖼️ PNG"}
            </button>
          </div>
        </div>

        {/* Charter document — refonte parchemin (2026-05-03) */}
        <div
          ref={charterRef}
          className="ls-charter-page"
          style={{
            width: "100%",
            background:
              "radial-gradient(ellipse at top, #FAF3DD 0%, #F2E8C9 65%, #EAD9A8 100%)",
            color: "#3A2E20",
            border: "1px solid #C9A84C",
            borderRadius: 8,
            padding: "60px 56px 48px",
            position: "relative",
            boxShadow:
              "0 12px 48px rgba(140, 105, 30, 0.18), inset 0 0 0 6px rgba(184, 146, 42, 0.08)",
            overflow: "hidden",
            fontFamily: "'DM Sans', 'Helvetica', sans-serif",
          }}
        >
          {/* ── Swoosh gold ample (inspiration capture Herbalife) ──── */}
          <GoldSwooshTop />
          <GoldFlourishBottomRight />

          {/* ── Ornements coins gold (Art Deco subtle) ─────────────── */}
          <CornerOrnament position="top-left" />
          <CornerOrnament position="top-right" />
          <CornerOrnament position="bottom-left" />
          <CornerOrnament position="bottom-right" />

          {/* ── Feuilles sage green décoratives (en arrière-plan) ─── */}
          <DecorativeLeaf position="top" />
          <DecorativeLeaf position="bottom" />

          {/* ── Header ──────────────────────────────────────────── */}
          <div style={{ textAlign: "center", marginBottom: 36, position: "relative" }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.34em",
                textTransform: "uppercase",
                color: "#8B6F1A",
                fontWeight: 700,
                marginBottom: 14,
              }}
            >
              ✦ Lor&apos;Squad Wellness · Engagement Distributeur
            </div>
            <h1
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontWeight: 900,
                fontSize: 48,
                color: "#B8922A",
                margin: 0,
                letterSpacing: "0.01em",
                lineHeight: 1.05,
                textShadow: "0 1px 0 rgba(255, 245, 210, 0.8)",
              }}
            >
              Charte du Distributeur
            </h1>
            {/* Underline gold filigree */}
            <svg
              width="200"
              height="14"
              viewBox="0 0 200 14"
              style={{ display: "block", margin: "10px auto 16px" }}
              aria-hidden="true"
            >
              <line x1="20" y1="7" x2="180" y2="7" stroke="#B8922A" strokeWidth="0.6" />
              <circle cx="100" cy="7" r="3" fill="#B8922A" />
              <circle cx="100" cy="7" r="1.2" fill="#FAF3DD" />
              <line x1="0" y1="7" x2="14" y2="7" stroke="#B8922A" strokeWidth="0.6" />
              <line x1="186" y1="7" x2="200" y2="7" stroke="#B8922A" strokeWidth="0.6" />
            </svg>
            <p
              style={{
                fontSize: 13,
                color: "#5C4A2E",
                margin: 0,
                fontStyle: "italic",
                lineHeight: 1.7,
                maxWidth: 520,
                marginInline: "auto",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}
            >
              Une signature transforme une intention en engagement. Cette charte
              n&apos;est pas un contrat — c&apos;est une boussole. Tu la signes pour toi.
            </p>
          </div>

          {/* ── 3 Engagements (cards parchemin) ─────────────────── */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
              marginBottom: 28,
              position: "relative",
            }}
          >
            {ENGAGEMENTS.map((e) => (
              <div
                key={e.title}
                style={{
                  padding: "20px 22px 20px 26px",
                  background: "rgba(255, 250, 232, 0.55)",
                  border: "0.5px solid rgba(184, 146, 42, 0.35)",
                  borderLeft: "3px solid #B8922A",
                  borderRadius: 4,
                  boxShadow: "0 2px 8px rgba(140, 105, 30, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 22 }} aria-hidden="true">{e.icon}</span>
                  <div
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontWeight: 700,
                      fontSize: 19,
                      color: "#3A2E20",
                      letterSpacing: "0.005em",
                    }}
                  >
                    {e.title}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: "#5C4A2E",
                    margin: 0,
                    lineHeight: 1.65,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {e.text}
                </p>
              </div>
            ))}

            {/* ── Pourquoi (editable) ─────────────────────────── */}
            <div
              style={{
                padding: "22px 22px 22px 26px",
                background: "rgba(220, 232, 211, 0.45)",
                border: "0.5px solid rgba(140, 175, 110, 0.5)",
                borderLeft: "3px solid #6B8E5A",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(140, 175, 110, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }} aria-hidden="true">💛</span>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 19,
                    color: "#3A2E20",
                  }}
                >
                  Mon « pourquoi »
                </div>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#7A6A52",
                  margin: "0 0 12px",
                  fontStyle: "italic",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                Pourquoi je fais ça. Ce que je veux changer pour moi, mes proches, ou ma vie.
              </p>
              <textarea
                value={pourquoi}
                onChange={(e) => persistField("pourquoi", e.target.value)}
                placeholder="Ex : retrouver une vraie vie de famille, aider d'autres femmes à se ré-aimer, sortir de la dépendance financière…"
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 4,
                  background: "rgba(255, 252, 240, 0.85)",
                  border: "0.5px solid rgba(140, 175, 110, 0.4)",
                  color: "#3A2E20",
                  fontFamily: "'Caveat', 'Brush Script MT', cursive",
                  fontSize: 18,
                  lineHeight: 1.45,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* ── Objectif 12 mois (editable) ──────────────────── */}
            <div
              style={{
                padding: "22px 22px 22px 26px",
                background: "rgba(255, 245, 215, 0.55)",
                border: "0.5px solid rgba(184, 146, 42, 0.4)",
                borderLeft: "3px solid #B8922A",
                borderRadius: 4,
                boxShadow: "0 2px 8px rgba(184, 146, 42, 0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 22 }} aria-hidden="true">🎯</span>
                <div
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 700,
                    fontSize: 19,
                    color: "#3A2E20",
                  }}
                >
                  Mon objectif 12 mois
                </div>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#7A6A52",
                  margin: "0 0 12px",
                  fontStyle: "italic",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                Une cible chiffrée + une cible humaine. Sois précis·e.
              </p>
              <textarea
                value={objectif12m}
                onChange={(e) => persistField("objectif12m", e.target.value)}
                placeholder="Ex : 30 clients actifs · 3 distributeurs en lignée · 1 500€/mois · rang Supervisor confirmé"
                rows={3}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 4,
                  background: "rgba(255, 252, 240, 0.85)",
                  border: "0.5px solid rgba(184, 146, 42, 0.4)",
                  color: "#3A2E20",
                  fontFamily: "'Caveat', 'Brush Script MT', cursive",
                  fontSize: 18,
                  lineHeight: 1.45,
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* ── Signatures (style diplôme) ──────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 32,
              padding: "32px 12px 18px",
              borderTop: "0.5px solid rgba(184, 146, 42, 0.4)",
              position: "relative",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#8B6F1A",
                  marginBottom: 12,
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Signature distributeur
              </div>
              <div
                style={{
                  fontFamily: "'Caveat', 'Brush Script MT', cursive",
                  fontSize: 36,
                  color: "#B8922A",
                  marginBottom: 6,
                  minHeight: 44,
                  lineHeight: 1,
                }}
              >
                {userName.split(/\s+/)[0]}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: signedAtIso ? "#5C4A2E" : "#A89272",
                  fontStyle: "italic",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                {signedAtIso
                  ? `Signé le ${new Date(signedAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Non signée"}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                  color: "#8B6F1A",
                  marginBottom: 12,
                  fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Signature coach
              </div>
              <div
                style={{
                  fontFamily: "'Caveat', 'Brush Script MT', cursive",
                  fontSize: 36,
                  color: "#6B8E5A",
                  marginBottom: 6,
                  minHeight: 44,
                  lineHeight: 1,
                }}
              >
                Thomas Houbert
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: "#5C4A2E",
                  fontStyle: "italic",
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
              >
                Fondateur · Lor&apos;Squad Wellness
              </div>
            </div>
          </div>

          {/* ── Sceau Lor'Squad ────────────────────────────────── */}
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: 22,
              width: 56,
              height: 56,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, #D4B860 0%, #B8922A 60%, #8B6F1A 100%)",
              border: "2px solid #B8922A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 3px 10px rgba(184, 146, 42, 0.4)",
            }}
            aria-hidden="true"
          >
            <span
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22,
                color: "#FAF3DD",
                fontWeight: 900,
                letterSpacing: "-0.04em",
              }}
            >
              L✦S
            </span>
          </div>

          {/* ── Footer date ────────────────────────────────────── */}
          <div
            style={{
              marginTop: 22,
              textAlign: "center",
              fontSize: 9,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#8B6F1A",
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Établi le {today} · Lor&apos;Squad Wellness 2026
          </div>
        </div>

        {/* CTA Sign */}
        {!signedAtIso ? (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              type="button"
              onClick={handleSign}
              disabled={!pourquoi.trim() || !objectif12m.trim()}
              style={{
                padding: "14px 28px",
                background: "linear-gradient(135deg, var(--ls-gold) 0%, color-mix(in srgb, var(--ls-gold) 70%, var(--ls-teal)) 100%)",
                color: "var(--ls-bg)",
                border: "none",
                borderRadius: 14,
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: !pourquoi.trim() || !objectif12m.trim() ? "not-allowed" : "pointer",
                opacity: !pourquoi.trim() || !objectif12m.trim() ? 0.45 : 1,
                boxShadow: "0 6px 20px color-mix(in srgb, var(--ls-gold) 40%, transparent)",
                transition: "all 200ms ease",
              }}
              title={
                !pourquoi.trim() || !objectif12m.trim()
                  ? "Remplis ton pourquoi + objectif 12 mois pour pouvoir signer"
                  : "Signer ma charte"
              }
            >
              ✍️ Je signe ma charte
            </button>
          </div>
        ) : (
          <div
            style={{
              marginTop: 24,
              padding: "14px 18px",
              background: "color-mix(in srgb, var(--ls-teal) 10%, var(--ls-surface))",
              border: "0.5px solid color-mix(in srgb, var(--ls-teal) 35%, transparent)",
              borderRadius: 12,
              textAlign: "center",
              fontSize: 13,
              color: "var(--ls-text)",
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            <strong style={{ color: "var(--ls-teal)" }}>✓ Charte signée</strong>
            <span style={{ color: "var(--ls-text-muted)", marginLeft: 8 }}>
              Télécharge-la en PDF, imprime-la, accroche-la là où tu la verras chaque matin.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Helpers décoratifs SVG (parchemin, ornements gold) ─────────────────

/** Coin Art Deco : petites lignes croisées + cercle, en gold. */
function CornerOrnament({
  position,
}: {
  position: "top-left" | "top-right" | "bottom-left" | "bottom-right";
}) {
  const isTop = position.startsWith("top");
  const isLeft = position.endsWith("left");
  const transform = `${isLeft ? "" : "scaleX(-1)"} ${isTop ? "" : "scaleY(-1)"}`.trim();
  return (
    <svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      style={{
        position: "absolute",
        top: isTop ? 18 : "auto",
        bottom: isTop ? "auto" : 18,
        left: isLeft ? 18 : "auto",
        right: isLeft ? "auto" : 18,
        transform,
        opacity: 0.85,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <line x1="0" y1="0" x2="50" y2="0" stroke="#B8922A" strokeWidth="0.8" />
      <line x1="0" y1="0" x2="0" y2="50" stroke="#B8922A" strokeWidth="0.8" />
      <line x1="0" y1="6" x2="38" y2="6" stroke="#B8922A" strokeWidth="0.4" opacity="0.6" />
      <line x1="6" y1="0" x2="6" y2="38" stroke="#B8922A" strokeWidth="0.4" opacity="0.6" />
      <circle cx="50" cy="0" r="2.5" fill="#B8922A" />
      <circle cx="0" cy="50" r="2.5" fill="#B8922A" />
      <circle cx="14" cy="14" r="1.6" fill="#B8922A" />
    </svg>
  );
}

/** Feuille sage green décorative (très subtile, en background). */
function DecorativeLeaf({ position }: { position: "top" | "bottom" }) {
  const isTop = position === "top";
  return (
    <svg
      width="180"
      height="180"
      viewBox="0 0 180 180"
      style={{
        position: "absolute",
        top: isTop ? -20 : "auto",
        bottom: isTop ? "auto" : -30,
        left: isTop ? -30 : "auto",
        right: isTop ? "auto" : -40,
        opacity: 0.18,
        pointerEvents: "none",
        transform: isTop ? "rotate(-15deg)" : "rotate(155deg)",
      }}
      aria-hidden="true"
    >
      <path
        d="M 90 10 Q 130 40 130 90 Q 130 140 90 170 Q 50 140 50 90 Q 50 40 90 10 Z"
        fill="#9CAF88"
      />
      <path
        d="M 90 10 L 90 170"
        stroke="#6B8E5A"
        strokeWidth="1.5"
        opacity="0.6"
      />
    </svg>
  );
}

/** Swoosh gold ample en haut (inspiration certificat Herbalife). */
function GoldSwooshTop() {
  return (
    <svg
      width="100%"
      height="100"
      viewBox="0 0 800 100"
      preserveAspectRatio="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        opacity: 0.65,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="goldSwoosh" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#B8922A" stopOpacity="0" />
          <stop offset="20%" stopColor="#D4B860" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#B8922A" stopOpacity="0.9" />
          <stop offset="80%" stopColor="#D4B860" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#B8922A" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Curve principale */}
      <path
        d="M 0 80 Q 200 10 400 25 Q 600 40 800 5"
        stroke="url(#goldSwoosh)"
        strokeWidth="2.2"
        fill="none"
      />
      {/* Curve secondaire plus fine */}
      <path
        d="M 0 70 Q 200 20 400 35 Q 600 50 800 18"
        stroke="#B8922A"
        strokeWidth="0.6"
        opacity="0.4"
        fill="none"
      />
    </svg>
  );
}

/** Flourish + feuilles gold en bas-droite (capture Herbalife). */
function GoldFlourishBottomRight() {
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        opacity: 0.5,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="goldLeaf" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4B860" />
          <stop offset="100%" stopColor="#8B6F1A" />
        </linearGradient>
      </defs>
      {/* Tige courbe */}
      <path
        d="M 160 160 Q 100 100 60 60"
        stroke="url(#goldLeaf)"
        strokeWidth="1.5"
        fill="none"
      />
      {/* Feuille 1 */}
      <path
        d="M 90 90 Q 110 70 130 80 Q 120 100 90 90 Z"
        fill="url(#goldLeaf)"
        opacity="0.85"
      />
      {/* Feuille 2 */}
      <path
        d="M 110 110 Q 130 90 145 105 Q 135 125 110 110 Z"
        fill="url(#goldLeaf)"
        opacity="0.7"
      />
      {/* Feuille 3 plus petite */}
      <path
        d="M 70 70 Q 80 55 90 62 Q 85 75 70 70 Z"
        fill="url(#goldLeaf)"
        opacity="0.6"
      />
    </svg>
  );
}
