// =============================================================================
// FormationCertificatePage — quick win #5 (2026-11-04)
//
// Certificat PDF/PNG/JPEG quand un niveau Formation est 100% complete.
// Pattern repris d AcademyCertificatePage + adapte au context Formation
// (badge niveau, modules valides, citation parcours).
//
// Route : /formation/certificat?level=<demarrer|construire|dupliquer>
// Si niveau pas 100% complete → redirect /formation.
//
// Variants visuels par niveau :
//   - Demarrer : gold (Niveau 1)
//   - Construire : teal (Niveau 2)
//   - Dupliquer : purple (Niveau 3)
//
// 2 formats : A4 portrait + Story Instagram 9:16.
// =============================================================================

import { useRef, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useFormationProgress } from "../hooks/useFormationProgress";
import { useAppContext } from "../context/AppContext";
import { APP_NAME, APP_FALLBACK_DISTRI } from "../lib/branding";
import { FORMATION_LEVELS, type FormationLevelId } from "../data/formation";
import {
  type CertFormat,
  slugifyForFilename,
  downloadCertPng,
  downloadCertJpeg,
  downloadCertPdf,
} from "../lib/certificateExport";

const LOGO_URL = "/icons/lor-squad-icon-180.png";

interface LevelMeta {
  id: FormationLevelId;
  name: string;
  romanNumeral: string;
  accent: string;
  accentDark: string;
  emoji: string;
  tagline: string;
  citation: string;
}

const LEVEL_META: Record<FormationLevelId, LevelMeta> = {
  demarrer: {
    id: "demarrer",
    name: "Démarrer",
    romanNumeral: "I",
    accent: "#C9A84C",
    accentDark: "#8B6F2A",
    emoji: "🚀",
    tagline: "Les fondations sont posées.",
    citation: "« Le voyage de mille lieues commence par un pas. »",
  },
  construire: {
    id: "construire",
    name: "Construire",
    romanNumeral: "II",
    accent: "#2DD4BF",
    accentDark: "#0D9488",
    emoji: "🏗️",
    tagline: "Les bases tiennent. La méthode prend racine.",
    citation: "« Ce qui est facile à faire est facile à ne pas faire. »",
  },
  dupliquer: {
    id: "dupliquer",
    name: "Dupliquer",
    romanNumeral: "III",
    accent: "#A78BFA",
    accentDark: "#7C3AED",
    emoji: "🌟",
    tagline: "Tu transmets. Tu deviens leader.",
    citation: "« Le maître a échoué plus de fois que l'élève n'a essayé. »",
  },
};

export function FormationCertificatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { stats } = useFormationProgress();
  const { currentUser } = useAppContext();
  const [format, setFormat] = useState<CertFormat>("a4");
  const [downloading, setDownloading] = useState<null | "png" | "jpeg" | "pdf">(null);
  const certRef = useRef<HTMLDivElement | null>(null);

  const levelParam = (searchParams.get("level") ?? "demarrer") as FormationLevelId;
  const levelMeta = LEVEL_META[levelParam];
  const level = FORMATION_LEVELS.find((l) => l.id === levelParam);
  const levelStats = stats[levelParam];

  const userName = currentUser?.name ?? APP_FALLBACK_DISTRI;
  const completedDate = useMemo(
    () =>
      new Date().toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );

  // Guard : si niveau pas 100% complete, redirect
  if (!levelMeta || !level) {
    navigate("/formation", { replace: true });
    return null;
  }
  if (!levelStats.isComplete) {
    navigate("/formation", { replace: true });
    return null;
  }

  async function handleDownload(kind: "png" | "jpeg" | "pdf") {
    const node = certRef.current;
    if (!node) return;
    const slug = slugifyForFilename(userName, "certificat");
    const fmtSuffix = format === "a4" ? "a4" : "story";
    const base = `certificat-formation-${levelParam}-${slug}-${fmtSuffix}`;
    setDownloading(kind);
    try {
      if (kind === "png") await downloadCertPng(node, `${base}.png`);
      else if (kind === "jpeg") await downloadCertJpeg(node, `${base}.jpg`);
      else await downloadCertPdf(node, `${base}.pdf`, format);
    } catch (err) {
      console.warn("[FormationCertificate] download failed", err);
      alert("Téléchargement impossible. Réessaie ou utilise Imprimer.");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5EFDC",
        padding: "32px 16px 60px",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .ls-cert-page, .ls-cert-page * { visibility: visible !important; }
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
          }
          .ls-cert-page {
            position: absolute !important;
            top: 0 !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            box-shadow: none !important;
          }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Header navigation + sélecteur format */}
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/formation")}
          style={{
            background: "transparent",
            border: "0.5px solid #C9C2AB",
            color: "#5F5E5A",
            padding: "8px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ← Retour à Formation
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["a4", "story"] as const).map((fmt) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormat(fmt)}
              style={{
                background: format === fmt ? levelMeta.accentDark : "transparent",
                color: format === fmt ? "white" : levelMeta.accentDark,
                border: `1px solid ${levelMeta.accentDark}`,
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 500,
                fontFamily: "DM Sans, sans-serif",
              }}
            >
              {fmt === "a4" ? "📄 A4 portrait" : "📱 Story Instagram"}
            </button>
          ))}
        </div>
      </div>

      {/* Render conditionnel A4 ou Story */}
      <div ref={certRef}>
        {format === "a4" ? (
          <CertA4
            userName={userName}
            completedDate={completedDate}
            levelMeta={levelMeta}
            modulesCount={levelStats.totalCount}
          />
        ) : (
          <CertStory
            userName={userName}
            completedDate={completedDate}
            levelMeta={levelMeta}
            modulesCount={levelStats.totalCount}
          />
        )}
      </div>

      {/* Boutons actions */}
      <div
        style={{
          maxWidth: 800,
          margin: "24px auto 0",
          display: "flex",
          justifyContent: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => handleDownload("pdf")}
          disabled={downloading !== null}
          style={{
            background: `linear-gradient(135deg, ${levelMeta.accent} 0%, ${levelMeta.accentDark} 100%)`,
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: `0 4px 12px ${levelMeta.accentDark}44`,
            opacity: downloading && downloading !== "pdf" ? 0.5 : 1,
          }}
        >
          {downloading === "pdf" ? "⏳ Génération…" : "📥 Télécharger PDF"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("png")}
          disabled={downloading !== null}
          style={{
            background: "white",
            color: levelMeta.accentDark,
            border: `1px solid ${levelMeta.accentDark}`,
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {downloading === "png" ? "⏳…" : "🖼️ PNG"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("jpeg")}
          disabled={downloading !== null}
          style={{
            background: "white",
            color: levelMeta.accentDark,
            border: `1px solid ${levelMeta.accentDark}`,
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          {downloading === "jpeg" ? "⏳…" : "📷 JPEG"}
        </button>
      </div>
    </div>
  );
}

// ─── Cert A4 portrait ──────────────────────────────────────────────────────
function CertA4({
  userName,
  completedDate,
  levelMeta,
  modulesCount,
}: {
  userName: string;
  completedDate: string;
  levelMeta: LevelMeta;
  modulesCount: number;
}) {
  return (
    <div
      className="ls-cert-page"
      style={{
        width: 700,
        maxWidth: "100%",
        aspectRatio: "210/297",
        margin: "0 auto",
        background:
          "linear-gradient(135deg, #FAF7E8 0%, #F5EFDC 50%, #EFE6CC 100%)",
        position: "relative",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        overflow: "hidden",
        padding: "40px 50px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* Bordure ornement */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          bottom: 16,
          border: `1.5px solid ${levelMeta.accent}55`,
          borderRadius: 4,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 22,
          left: 22,
          right: 22,
          bottom: 22,
          border: `0.5px solid ${levelMeta.accent}33`,
          borderRadius: 2,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <img
        src={LOGO_URL}
        alt={APP_NAME}
        style={{ width: 64, height: 64, marginBottom: 14, opacity: 0.92 }}
      />

      {/* Eyebrow */}
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color: levelMeta.accentDark,
          fontWeight: 700,
          marginBottom: 6,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ✦ Lor&apos;Squad Formation · Niveau {levelMeta.romanNumeral}
      </div>

      {/* Titre */}
      <h1
        style={{
          fontSize: 30,
          fontFamily: "Syne, serif",
          fontWeight: 800,
          color: "#3A2F0F",
          margin: "4px 0 4px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Certificat de Réussite
      </h1>
      <p
        style={{
          fontSize: 13,
          color: "#5C5448",
          marginBottom: 24,
          fontFamily: "DM Sans, sans-serif",
          fontStyle: "italic",
        }}
      >
        {levelMeta.tagline}
      </p>

      {/* Sceau */}
      <div
        style={{
          width: 130,
          height: 130,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${levelMeta.accent} 0%, ${levelMeta.accentDark} 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          boxShadow: `0 8px 24px ${levelMeta.accentDark}55, inset 0 2px 0 rgba(255,255,255,0.30), inset 0 -2px 0 rgba(0,0,0,0.10)`,
          marginBottom: 22,
          position: "relative",
        }}
      >
        <div style={{ fontSize: 32, lineHeight: 1 }}>{levelMeta.emoji}</div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: "-0.03em",
            marginTop: 4,
            lineHeight: 1,
          }}
        >
          N{levelMeta.romanNumeral === "I" ? "1" : levelMeta.romanNumeral === "II" ? "2" : "3"}
        </div>
        <div
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            opacity: 0.9,
            marginTop: 4,
            fontFamily: "DM Sans, sans-serif",
            fontWeight: 600,
          }}
        >
          {levelMeta.name}
        </div>
      </div>

      {/* Décerné à */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#7A6E54",
          marginBottom: 8,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
        }}
      >
        Décerné à
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 28,
          color: "#2A2418",
          letterSpacing: "-0.02em",
          marginBottom: 6,
          padding: "0 10px",
          maxWidth: "90%",
          wordBreak: "break-word",
        }}
      >
        {userName}
      </div>
      <p
        style={{
          fontSize: 12,
          color: "#5C5448",
          fontFamily: "DM Sans, sans-serif",
          maxWidth: 460,
          lineHeight: 1.55,
          margin: "8px 0 18px",
        }}
      >
        Pour avoir validé les <strong>{modulesCount} modules</strong> du Niveau {levelMeta.romanNumeral} ·{" "}
        <strong>{levelMeta.name}</strong> du parcours Lor&apos;Squad Formation, et démontré son engagement
        à devenir un distributeur d&apos;exception.
      </p>

      {/* Citation */}
      <div
        style={{
          fontSize: 11.5,
          fontStyle: "italic",
          color: levelMeta.accentDark,
          fontFamily: "Syne, serif",
          maxWidth: 380,
          lineHeight: 1.6,
          margin: "8px 0 24px",
          padding: "10px 16px",
          borderTop: `0.5px solid ${levelMeta.accent}66`,
          borderBottom: `0.5px solid ${levelMeta.accent}66`,
        }}
      >
        {levelMeta.citation}
      </div>

      {/* Footer date + signature */}
      <div
        style={{
          marginTop: "auto",
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 10,
          color: "#7A6E54",
          fontFamily: "DM Sans, sans-serif",
          gap: 16,
        }}
      >
        <div style={{ textAlign: "left" }}>
          <div style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600, marginBottom: 2 }}>
            Délivré le
          </div>
          <div style={{ fontSize: 13, color: "#3A2F0F", fontFamily: "Syne, serif", fontWeight: 700 }}>
            {completedDate}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "'Brush Script MT', cursive",
              fontSize: 22,
              color: levelMeta.accentDark,
              lineHeight: 1,
              marginBottom: 2,
            }}
          >
            Thomas Houbert
          </div>
          <div style={{ letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
            Fondateur · Lor&apos;Squad
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cert Story 9:16 ───────────────────────────────────────────────────────
function CertStory({
  userName,
  completedDate,
  levelMeta,
  modulesCount,
}: {
  userName: string;
  completedDate: string;
  levelMeta: LevelMeta;
  modulesCount: number;
}) {
  return (
    <div
      className="ls-cert-page"
      style={{
        width: 360,
        maxWidth: "100%",
        aspectRatio: "9/16",
        margin: "0 auto",
        background: `linear-gradient(180deg, #1A1410 0%, #2A1F12 50%, ${levelMeta.accentDark}33 100%)`,
        position: "relative",
        boxShadow: "0 8px 32px rgba(0,0,0,0.30)",
        overflow: "hidden",
        padding: "28px 26px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        color: "#F5EFDC",
      }}
    >
      <img src={LOGO_URL} alt={APP_NAME} style={{ width: 50, height: 50, marginBottom: 12 }} />

      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          color: levelMeta.accent,
          fontWeight: 700,
          marginBottom: 4,
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        ✦ Niveau {levelMeta.romanNumeral} · {levelMeta.name}
      </div>

      <h1
        style={{
          fontSize: 26,
          fontFamily: "Syne, serif",
          fontWeight: 800,
          color: "#F5EFDC",
          margin: "4px 0 6px 0",
          letterSpacing: "-0.02em",
        }}
      >
        Certificat
      </h1>

      <p
        style={{
          fontSize: 11,
          color: "#C9C2AB",
          marginBottom: 18,
          fontStyle: "italic",
          fontFamily: "DM Sans, sans-serif",
        }}
      >
        {levelMeta.tagline}
      </p>

      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: "50%",
          background: `radial-gradient(circle at 30% 30%, ${levelMeta.accent} 0%, ${levelMeta.accentDark} 100%)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          boxShadow: `0 8px 24px ${levelMeta.accentDark}88, inset 0 2px 0 rgba(255,255,255,0.30)`,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 28, lineHeight: 1 }}>{levelMeta.emoji}</div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 800,
            fontSize: 24,
            letterSpacing: "-0.03em",
            marginTop: 2,
          }}
        >
          N{levelMeta.romanNumeral === "I" ? "1" : levelMeta.romanNumeral === "II" ? "2" : "3"}
        </div>
      </div>

      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#C9C2AB",
          marginBottom: 6,
          fontFamily: "DM Sans, sans-serif",
          fontWeight: 600,
        }}
      >
        Décerné à
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 800,
          fontSize: 22,
          color: "#FAF7E8",
          letterSpacing: "-0.02em",
          marginBottom: 12,
          padding: "0 6px",
          wordBreak: "break-word",
        }}
      >
        {userName}
      </div>

      <p
        style={{
          fontSize: 10.5,
          color: "#C9C2AB",
          fontFamily: "DM Sans, sans-serif",
          lineHeight: 1.55,
          margin: "0 0 14px",
        }}
      >
        Validation des {modulesCount} modules du Niveau {levelMeta.romanNumeral}
      </p>

      <div
        style={{
          fontSize: 10,
          fontStyle: "italic",
          color: levelMeta.accent,
          fontFamily: "Syne, serif",
          lineHeight: 1.6,
          padding: "10px 12px",
          borderTop: `0.5px solid ${levelMeta.accent}66`,
          borderBottom: `0.5px solid ${levelMeta.accent}66`,
          margin: "4px 0",
        }}
      >
        {levelMeta.citation}
      </div>

      <div
        style={{
          marginTop: "auto",
          fontSize: 9,
          color: "#C9C2AB",
          fontFamily: "DM Sans, sans-serif",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        Délivré le {completedDate}
      </div>
      <div
        style={{
          fontFamily: "'Brush Script MT', cursive",
          fontSize: 18,
          color: levelMeta.accent,
          marginTop: 4,
        }}
      >
        Thomas Houbert · Lor&apos;Squad
      </div>
    </div>
  );
}
