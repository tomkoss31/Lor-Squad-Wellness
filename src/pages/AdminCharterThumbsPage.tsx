// =============================================================================
// AdminCharterThumbsPage — outil de génération des 3 thumbnails (2026-05-03)
//
// Route /admin/charter-thumbs (admin only). Affiche les 3 templates de charte
// avec data fake (Thomas Houbert), permet de télécharger un PNG par template.
// Thomas drop ensuite les 3 PNG dans /public/charter-thumbs/ → le sélecteur
// affiche les vraies miniatures au lieu des emoji fallback.
//
// Filenames attendus :
//   - charter-thumbs/officielle.png
//   - charter-thumbs/manifeste.png
//   - charter-thumbs/story.png
// =============================================================================

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { CharteDistributeur } from "../components/charter/CharteDistributeur";
import { downloadCertPng } from "../lib/certificateExport";
import type { CharterTemplate } from "../types/charter";

const TEMPLATES: Array<{ id: CharterTemplate; label: string }> = [
  { id: "officielle", label: "Officielle" },
  { id: "manifeste", label: "Manifeste" },
  { id: "story", label: "Story" },
];

const FAKE_DATA = {
  distributeur: {
    firstName: "Thomas",
    lastName: "Houbert",
    signedAt: new Date().toISOString(),
    signatureDataUrl: null,
  },
  cosigner: {
    firstName: "Mélanie",
    lastName: "Houbert",
    role: "Co-fondatrice · Lor'Squad",
    signedAt: null,
    signatureDataUrl: null,
  },
  pourquoiText:
    "Aider d'autres familles à retrouver l'énergie et la liberté qu'on a trouvée chez Herbalife.",
  objectif12Mois: "Supervisor confirmé · 30 clients actifs · 5 distributeurs en lignée.",
  documentDate: new Date(),
};

export function AdminCharterThumbsPage() {
  const navigate = useNavigate();
  const { currentUser } = useAppContext();
  const officielleRef = useRef<HTMLDivElement>(null);
  const manifesteRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<CharterTemplate | null>(null);

  if (currentUser?.role !== "admin") {
    return (
      <div style={{ padding: 40, color: "var(--ls-text-muted)" }}>
        Accès admin uniquement.
      </div>
    );
  }

  function refForTemplate(t: CharterTemplate): React.RefObject<HTMLDivElement> {
    if (t === "manifeste") return manifesteRef;
    if (t === "story") return storyRef;
    return officielleRef;
  }

  async function handleDownload(template: CharterTemplate) {
    const ref = refForTemplate(template);
    if (!ref.current) return;
    setDownloading(template);
    try {
      if (typeof document !== "undefined" && (document as Document).fonts) {
        await (document as Document).fonts.ready;
      }
      await downloadCertPng(ref.current, `charter-thumb-${template}.png`);
      alert(
        `✅ PNG téléchargé : charter-thumb-${template}.png\n\nRenomme-le en "${template}.png" et drop-le dans /public/charter-thumbs/`,
      );
    } catch (err) {
      console.warn("[AdminCharterThumbs] download failed", err);
      alert("Téléchargement impossible. Réessaie.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="space-y-6" style={{ padding: 20, paddingBottom: 60 }}>
      <button
        type="button"
        onClick={() => navigate(-1)}
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
        ← Retour
      </button>

      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--ls-gold)", fontWeight: 700, marginBottom: 6 }}>
          Outil admin
        </div>
        <h1 style={{ fontFamily: "Syne, serif", fontSize: 24, margin: 0, color: "var(--ls-text)" }}>
          Génération des thumbnails charter
        </h1>
        <p style={{ fontSize: 13, color: "var(--ls-text-muted)", margin: "8px 0 0", lineHeight: 1.55 }}>
          Click "📥 Télécharger PNG" pour chaque template, renomme en
          <code style={{ background: "var(--ls-surface2)", padding: "2px 6px", borderRadius: 4, margin: "0 4px" }}>
            officielle.png / manifeste.png / story.png
          </code>
          puis drop dans <code style={{ background: "var(--ls-surface2)", padding: "2px 6px", borderRadius: 4 }}>/public/charter-thumbs/</code>.
        </p>
      </div>

      {TEMPLATES.map((t) => (
        <section
          key={t.id}
          style={{
            padding: 20,
            background: "var(--ls-surface)",
            border: "0.5px solid var(--ls-border)",
            borderRadius: 14,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <h2 style={{ fontFamily: "Syne, serif", fontSize: 18, margin: 0, color: "var(--ls-text)" }}>
              ✦ {t.label}
            </h2>
            <button
              type="button"
              onClick={() => void handleDownload(t.id)}
              disabled={downloading !== null}
              style={{
                padding: "10px 18px",
                background: "linear-gradient(135deg, var(--ls-gold), color-mix(in srgb, var(--ls-gold) 70%, var(--ls-coral)))",
                color: "var(--ls-bg)",
                border: "none",
                borderRadius: 10,
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 13,
                cursor: downloading === t.id ? "wait" : "pointer",
                opacity: downloading !== null && downloading !== t.id ? 0.4 : 1,
              }}
            >
              {downloading === t.id ? "⏳ Capture…" : "📥 Télécharger PNG"}
            </button>
          </div>

          {/* Preview à scale réduite (le PNG sera capturé à pleine taille) */}
          <div
            style={{
              transform: t.id === "story" ? "scale(0.35)" : "scale(0.3)",
              transformOrigin: "top left",
              width: t.id === "story" ? 450 : 794,
              height: t.id === "story" ? 800 : 1123,
              marginBottom: t.id === "story" ? -520 : -780,
              pointerEvents: "none",
            }}
          >
            <CharteDistributeur
              ref={t.id === "officielle" ? officielleRef : t.id === "manifeste" ? manifesteRef : storyRef}
              template={t.id}
              distributeur={FAKE_DATA.distributeur}
              cosigner={FAKE_DATA.cosigner}
              pourquoiText={FAKE_DATA.pourquoiText}
              objectif12Mois={FAKE_DATA.objectif12Mois}
              documentDate={FAKE_DATA.documentDate}
              mode="print"
            />
          </div>
        </section>
      ))}
    </div>
  );
}
