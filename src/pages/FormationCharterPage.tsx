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

        {/* Charter document */}
        <div
          ref={charterRef}
          className="ls-charter-page"
          style={{
            width: "100%",
            background: "#0d0d0d",
            color: "#F5EFDC",
            border: "1px solid #B8922A55",
            borderRadius: 14,
            padding: "44px 38px",
            position: "relative",
            boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                fontSize: 10,
                letterSpacing: "0.32em",
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              ✦ Lor&apos;Squad Wellness · Engagement Distributeur
            </div>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 800,
                fontSize: 28,
                color: "#F5EFDC",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              Charte du Distributeur
            </h1>
            <div
              style={{
                width: 60,
                height: 2,
                background: "linear-gradient(90deg, #B8922A 0%, #1D9E75 100%)",
                margin: "12px auto",
              }}
            />
            <p
              style={{
                fontSize: 12.5,
                color: "#C9C2AB",
                margin: 0,
                fontStyle: "italic",
                lineHeight: 1.6,
                maxWidth: 540,
                marginInline: "auto",
              }}
            >
              Une signature transforme une intention en engagement. Cette charte n&apos;est
              pas un contrat — c&apos;est une boussole. Tu la signes pour toi.
            </p>
          </div>

          {/* Engagements */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 26 }}>
            {ENGAGEMENTS.map((e) => (
              <div
                key={e.title}
                style={{
                  padding: "16px 18px",
                  background: "#161616",
                  border: "0.5px solid #B8922A33",
                  borderLeft: "3px solid #B8922A",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 6,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{e.icon}</span>
                  <div
                    style={{
                      fontFamily: "Syne, serif",
                      fontWeight: 700,
                      fontSize: 15,
                      color: "#F5EFDC",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {e.title}
                  </div>
                </div>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "#C9C2AB",
                    margin: 0,
                    lineHeight: 1.6,
                  }}
                >
                  {e.text}
                </p>
              </div>
            ))}

            {/* Pourquoi (editable) */}
            <div
              style={{
                padding: "16px 18px",
                background: "#161616",
                border: "0.5px solid #1D9E7544",
                borderLeft: "3px solid #1D9E75",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>💛</span>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#F5EFDC",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Mon « pourquoi »
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>
                Pourquoi je fais ça. Ce que je veux changer pour moi, mes proches, ou ma vie.
              </p>
              <textarea
                value={pourquoi}
                onChange={(e) => persistField("pourquoi", e.target.value)}
                placeholder="Ex : retrouver une vraie vie de famille, aider d'autres femmes à se ré-aimer, sortir de la dépendance financière…"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#0d0d0d",
                  border: "0.5px solid #B8922A33",
                  color: "#F5EFDC",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.55,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>

            {/* Objectif 12 mois (editable) */}
            <div
              style={{
                padding: "16px 18px",
                background: "#161616",
                border: "0.5px solid #B8922A55",
                borderLeft: "3px solid #B8922A",
                borderRadius: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>🎯</span>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontWeight: 700,
                    fontSize: 15,
                    color: "#F5EFDC",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Mon objectif 12 mois
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "#888", margin: "0 0 10px", fontStyle: "italic" }}>
                Une cible chiffrée + une cible humaine. Sois précis·e.
              </p>
              <textarea
                value={objectif12m}
                onChange={(e) => persistField("objectif12m", e.target.value)}
                placeholder="Ex : 30 clients actifs · 3 distributeurs en lignée · 1 500€/mois · rang Supervisor confirmé"
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  background: "#0d0d0d",
                  border: "0.5px solid #B8922A33",
                  color: "#F5EFDC",
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: 13,
                  lineHeight: 1.55,
                  resize: "vertical",
                  outline: "none",
                }}
              />
            </div>
          </div>

          {/* Signatures */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
              padding: "22px 4px 8px",
              borderTop: "0.5px dashed #B8922A55",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Signature distributeur
              </div>
              <div
                style={{
                  fontFamily: "'Brush Script MT', cursive",
                  fontSize: 22,
                  color: "#B8922A",
                  marginBottom: 4,
                  minHeight: 28,
                }}
              >
                {userName}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "#C9C2AB",
                  fontStyle: signedAtIso ? "normal" : "italic",
                }}
              >
                {signedAtIso
                  ? `Signé le ${new Date(signedAtIso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`
                  : "Non signée"}
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#888",
                  marginBottom: 6,
                  fontWeight: 600,
                }}
              >
                Signature coach
              </div>
              <div
                style={{
                  fontFamily: "'Brush Script MT', cursive",
                  fontSize: 22,
                  color: "#1D9E75",
                  marginBottom: 4,
                  minHeight: 28,
                }}
              >
                Thomas Houbert
              </div>
              <div style={{ fontSize: 10, color: "#C9C2AB", fontStyle: "italic" }}>
                Fondateur · Lor&apos;Squad Wellness
              </div>
            </div>
          </div>

          {/* Footer date */}
          <div
            style={{
              marginTop: 18,
              textAlign: "center",
              fontSize: 9,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#666",
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
