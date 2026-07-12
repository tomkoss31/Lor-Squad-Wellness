// Chantier Academy direction 6 (2026-04-28) — refonte premium
// (2026-04-29). Logo reel, sceau central style medaille, signatures
// cursive, 2 formats (A4 portrait + Story Instagram 9:16).
//
// Visible uniquement si view.isCompleted === true. Sinon redirect
// vers /academy.

import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { useAppContext } from "../context/AppContext";
import { APP_NAME, APP_FALLBACK_DISTRI } from "../lib/branding";

const LOGO_URL = "/brand/labase360/apple-touch-icon-180.png";
type CertFormat = "a4" | "story";

// ─── Design tokens (refonte premium 2026-07-08) ──────────────────────────
// Cale sur la charte La Base 360 : gradient « vitalFusion » emerald→cyan→
// violet, papier ivoire, polices Fraunces (serif editoriale) + Sora (labels)
// + Cormorant (corps) + Dancing Script (signatures) — toutes chargees dans
// index.html.
const BRAND_GRAD = "linear-gradient(100deg,#0E9E77 0%,#06B6D4 46%,#8B5CF6 100%)";
const INK = "#16292C";
const MUTED = "#6E7A72";
const HINT = "#9AA49C";
const SAND = "#C7B892";
const GOLD = "#B78B3A";
const TEAL = "#0E9E77"; // fallback solide du nom en gradient (html2canvas)
const FONT_TITLE = "'Fraunces', Georgia, serif";
const FONT_LABEL = "'Sora', system-ui, sans-serif";
const FONT_BODY = "'Cormorant Garamond', Georgia, serif";
const FONT_SIGN = "'Dancing Script', cursive";

// Texte rempli avec le gradient de marque. `color` sert de repli teal si le
// moteur ne supporte pas background-clip:text (cas de html2canvas au
// telechargement) → le texte reste lisible et on-brand au lieu de disparaitre.
const gradientText = {
  background: BRAND_GRAD,
  WebkitBackgroundClip: "text",
  backgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
  color: TEAL,
};

/** Convertit un nom user en slug fichier safe. */
function slugify(name: string): string {
  return (name || "certificat")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Capture un element HTML en canvas haute resolution via html2canvas. */
async function captureNode(node: HTMLElement): Promise<HTMLCanvasElement> {
  // Lazy import pour ne pas alourdir le chunk initial.
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(node, {
    scale: 2.5, // x2.5 pour un rendu print-quality
    backgroundColor: null,
    useCORS: true,
    logging: false,
  });
}

async function downloadPng(node: HTMLElement, filename: string) {
  const canvas = await captureNode(node);
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

async function downloadJpeg(node: HTMLElement, filename: string) {
  const canvas = await captureNode(node);
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    },
    "image/jpeg",
    0.95,
  );
}

async function downloadPdf(node: HTMLElement, filename: string, format: CertFormat) {
  const canvas = await captureNode(node);
  const { default: jsPDF } = await import("jspdf");
  // Dimensions PDF selon format
  // A4 portrait : 210x297mm. Story 9/16 : 90x160mm (taille custom mais
  // ratio respecte, imprimable a 100% sans deformer).
  const pdfWidth = format === "a4" ? 210 : 90;
  const pdfHeight = format === "a4" ? 297 : 160;
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: format === "a4" ? "a4" : [pdfWidth, pdfHeight],
    compress: true,
  });
  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
  pdf.save(filename);
}

// Fusionne les mots CONSÉCUTIFS identiques (insensible à la casse) d'un nom.
// « Victoria Cavalec Cavalec » → « Victoria Cavalec ». Garde les répétitions
// non consécutives au cas où (rare).
function dedupeConsecutiveWords(s: string): string {
  const words = s.trim().split(/\s+/).filter(Boolean);
  return words
    .filter((w, i) => i === 0 || w.toLowerCase() !== words[i - 1].toLowerCase())
    .join(" ");
}

export function AcademyCertificatePage() {
  const navigate = useNavigate();
  const { view } = useAcademyProgress();
  const { currentUser } = useAppContext();
  const [format, setFormat] = useState<CertFormat>("a4");
  const [downloading, setDownloading] = useState<null | "png" | "jpeg" | "pdf">(null);
  const certRef = useRef<HTMLDivElement | null>(null);

  async function handleDownload(kind: "png" | "jpeg" | "pdf") {
    const node = certRef.current;
    if (!node) return;
    const slug = slugify(currentUser?.name ?? "certificat");
    const fmtSuffix = format === "a4" ? "a4" : "story";
    const base = `certificat-academy-${slug}-${fmtSuffix}`;
    setDownloading(kind);
    try {
      if (kind === "png") await downloadPng(node, `${base}.png`);
      else if (kind === "jpeg") await downloadJpeg(node, `${base}.jpg`);
      else await downloadPdf(node, `${base}.pdf`, format);
    } catch (err) {
      console.warn("[AcademyCertificate] download failed", err);
      alert("Téléchargement impossible. Réessaie ou utilise Imprimer.");
    } finally {
      setDownloading(null);
    }
  }

  if (!view.loaded) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#6B6B62" }}>
        Chargement…
      </div>
    );
  }

  if (!view.isCompleted) {
    navigate("/academy", { replace: true });
    return null;
  }

  // Robustesse nom (2026-06-16) : certaines fiches ont un nom de famille
  // dupliqué (ex. « Victoria Cavalec Cavalec »). On fusionne les mots
  // consécutifs identiques pour un rendu propre sur le diplôme.
  const userName = dedupeConsecutiveWords(currentUser?.name ?? APP_FALLBACK_DISTRI);
  const completedAt = new Date();
  const dateLabel = completedAt.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      className="ls-cert-wrapper"
      style={{
        minHeight: "100vh",
        background: "#F5EFDC",
        padding: "32px 16px 60px",
        fontFamily: "var(--ls-font-sans, system-ui, sans-serif)",
      }}
    >
      <style>{`
        @media print {
          /* Technique radicale : on cache TOUT le DOM, puis on rend visible
             uniquement la page certif. Cible n importe quel layout parent
             (sidebar, bottom nav, headers, etc.) sans avoir a les nommer. */
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
            page-break-inside: avoid;
          }
          .ls-cert-page::before, .ls-cert-page::after { visibility: visible !important; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      {/* Header navigation + sélecteur format (caché impression) */}
      <div
        className="ls-cert-header"
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
          onClick={() => navigate("/academy")}
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
          ← Retour à l&apos;Academy
        </button>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setFormat("a4")}
            style={{
              background: format === "a4" ? TEAL : "transparent",
              color: format === "a4" ? "white" : TEAL,
              border: `1px solid ${TEAL}`,
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            📄 A4 portrait
          </button>
          <button
            type="button"
            onClick={() => setFormat("story")}
            style={{
              background: format === "story" ? TEAL : "transparent",
              color: format === "story" ? "white" : TEAL,
              border: `1px solid ${TEAL}`,
              padding: "8px 16px",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
              fontFamily: "DM Sans, sans-serif",
            }}
          >
            📱 Story Instagram
          </button>
        </div>
      </div>

      {/* Render conditionnel A4 ou Story — ref sur le wrapper pour download */}
      <div ref={certRef}>
        {format === "a4" ? (
          <CertificateA4 userName={userName} completedDate={dateLabel} />
        ) : (
          <CertificateStory userName={userName} completedDate={dateLabel} />
        )}
      </div>

      {/* Boutons actions (caché impression) */}
      <div
        className="ls-cert-actions"
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
            background: BRAND_GRAD,
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 6px 16px rgba(6,150,160,0.32)",
            opacity: downloading && downloading !== "pdf" ? 0.5 : 1,
          }}
        >
          {downloading === "pdf" ? "📄 Génération…" : "📄 Télécharger PDF"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("png")}
          disabled={downloading !== null}
          style={{
            background: "white",
            color: "#5C4A0F",
            border: "1px solid #B8922A",
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            opacity: downloading && downloading !== "png" ? 0.5 : 1,
          }}
        >
          {downloading === "png" ? "🖼️ Génération…" : "🖼️ Télécharger PNG"}
        </button>
        <button
          type="button"
          onClick={() => handleDownload("jpeg")}
          disabled={downloading !== null}
          style={{
            background: "white",
            color: "#5C4A0F",
            border: "1px solid #B8922A",
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
            opacity: downloading && downloading !== "jpeg" ? 0.5 : 1,
          }}
        >
          {downloading === "jpeg" ? "📷 Génération…" : "📷 Télécharger JPEG"}
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          disabled={downloading !== null}
          style={{
            background: "transparent",
            color: "#5F5E5A",
            border: "0.5px solid #C9C2AB",
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          🖨️ Imprimer
        </button>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          disabled={downloading !== null}
          style={{
            background: "transparent",
            color: "#5F5E5A",
            border: "0.5px solid #C9C2AB",
            padding: "12px 18px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 500,
            cursor: downloading ? "wait" : "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          ← Academy
        </button>
      </div>
    </div>
  );
}

// ─── Sub-composants ──────────────────────────────────────────────────────

interface CertProps {
  userName: string;
  completedDate: string;
}

function OfficialSeal({ size = 118, gid = "seal" }: { size?: number; gid?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#10B981" />
          <stop offset="0.5" stopColor="#06B6D4" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="55" fill="none" stroke={`url(#${gid})`} strokeWidth="2" />
      <circle cx="60" cy="60" r="50" fill="none" stroke={SAND} strokeWidth="0.7" />
      <circle cx="60" cy="60" r="45" fill="#FCF8EC" stroke={`url(#${gid})`} strokeWidth="1" />
      {/* 4 losanges N/S/E/W en gradient */}
      <g fill={`url(#${gid})`}>
        <path d="M60 6.5 l1.5 3.2 -1.5 3.2 -1.5 -3.2z" />
        <path d="M60 107 l1.5 3.2 -1.5 3.2 -1.5 -3.2z" />
        <path d="M6.5 60 l3.2 1.5 3.2 -1.5 -3.2 -1.5z" />
        <path d="M107 60 l3.2 1.5 3.2 -1.5 -3.2 -1.5z" />
      </g>
      <text x="60" y="46" textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="6.4" fontWeight="600" letterSpacing="1.6" fill={INK}>LA BASE 360</text>
      <text x="60" y="63" textAnchor="middle" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="15" fontWeight="600" fill={`url(#${gid})`}>Academy</text>
      <line x1="42" y1="70" x2="78" y2="70" stroke={SAND} strokeWidth="0.6" />
      <text x="60" y="80" textAnchor="middle" fontFamily="Sora, sans-serif" fontSize="5.2" letterSpacing="2.2" fill={HINT}>EST. 2026</text>
    </svg>
  );
}

/** Fin flourish : hairline + point gradient + hairline (remplace les lauriers). */
function Flourish({ width = 46 }: { width?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ height: 1, width, background: `linear-gradient(90deg,transparent,${SAND})` }} />
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: BRAND_GRAD }} />
      <div style={{ height: 1, width, background: `linear-gradient(90deg,${SAND},transparent)` }} />
    </div>
  );
}

function CornerOrnament({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const transforms: Record<typeof position, string | undefined> = {
    tl: undefined,
    tr: "scaleX(-1)",
    bl: "scaleY(-1)",
    br: "scale(-1,-1)",
  };
  const styles: Record<typeof position, React.CSSProperties> = {
    tl: { top: 28, left: 28 },
    tr: { top: 28, right: 28 },
    bl: { bottom: 28, left: 28 },
    br: { bottom: 28, right: 28 },
  };
  return (
    <svg
      width={48}
      height={48}
      viewBox="0 0 100 100"
      style={{ position: "absolute", ...styles[position], transform: transforms[position] }}
    >
      <path
        d="M0,0 L46,0 L46,3.5 L3.5,3.5 L3.5,46 L0,46 Z M8,8 L30,8 L30,10.5 L10.5,10.5 L10.5,30 L8,30 Z"
        fill={GOLD}
      />
    </svg>
  );
}

function SignatureBlock({
  cursive,
  fullName,
  title,
  width,
  cursiveSize,
  fullSize,
  titleSize,
  letterspacing,
}: {
  cursive: string;
  fullName: string;
  title: string;
  width: number;
  cursiveSize: number;
  fullSize: number;
  titleSize: number;
  letterspacing: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        minWidth: width,
      }}
    >
      <div
        style={{
          fontFamily: FONT_SIGN,
          fontWeight: 600,
          fontSize: cursiveSize,
          color: INK,
          height: cursiveSize * 1.15,
          lineHeight: 1,
        }}
      >
        {cursive}
      </div>
      <div style={{ height: 0.5, width, background: INK, opacity: 0.75, marginBottom: 6 }} />
      <div
        style={{
          fontFamily: FONT_TITLE,
          fontSize: fullSize,
          color: INK,
          fontWeight: 600,
        }}
      >
        {fullName}
      </div>
      <div
        style={{
          fontFamily: FONT_LABEL,
          fontSize: titleSize,
          letterSpacing: letterspacing,
          color: HINT,
          marginTop: 4,
        }}
      >
        {title}
      </div>
    </div>
  );
}

// ═══ Format A4 portrait ═════════════════════════════════════════════════

function CertificateA4({ userName, completedDate }: CertProps) {
  return (
    <div
      className="ls-cert-page"
      style={{
        background:
          "radial-gradient(620px 420px at 12% 8%, rgba(16,185,129,.055), transparent 60%)," +
          "radial-gradient(680px 520px at 92% 96%, rgba(139,92,246,.06), transparent 62%)," +
          "radial-gradient(760px 600px at 88% 10%, rgba(6,182,212,.045), transparent 60%)," +
          "linear-gradient(160deg,#FCFAF2 0%, #FBF7EC 52%, #F5EFDF 100%)",
        border: `1.5px solid ${SAND}`,
        maxWidth: 800,
        aspectRatio: "210 / 297",
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "62px 60px 0",
        fontFamily: FONT_BODY,
        color: INK,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
      }}
    >
      {/* Hairline intérieure teal */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 12,
          border: "0.5px solid rgba(14,158,119,0.30)",
          pointerEvents: "none",
        }}
      />

      {/* Filigrane monogramme « B » (très discret) */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "52%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: FONT_TITLE,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 400,
          lineHeight: 1,
          color: "rgba(22,41,44,0.028)",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        B
      </div>

      {/* Ornements 4 coins */}
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />

      {/* Logo réel + wordmark */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
        <img
          src={LOGO_URL}
          alt="La Base 360"
          style={{
            width: 84,
            height: 84,
            borderRadius: 20,
            objectFit: "contain",
            display: "block",
            boxShadow: "0 12px 26px rgba(6,120,120,0.28)",
          }}
        />
        <div
          style={{
            marginTop: 16,
            fontFamily: FONT_TITLE,
            fontSize: 30,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: INK,
          }}
        >
          La Base 360
        </div>
        <div
          style={{
            marginTop: 7,
            fontFamily: FONT_LABEL,
            fontSize: 10,
            letterSpacing: "0.34em",
            color: "#2E9E8E",
            fontWeight: 600,
          }}
        >
          THE WELLNESS CLUB
        </div>
      </div>

      {/* Titre + flourish */}
      <div style={{ marginTop: 30, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h1
          style={{
            fontFamily: FONT_TITLE,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: 46,
            lineHeight: 1.04,
            margin: 0,
            color: INK,
            letterSpacing: "0.005em",
            textAlign: "center",
          }}
        >
          Certificat
          <br />
          de&nbsp;formation
        </h1>
        <div style={{ marginTop: 16 }}>
          <Flourish />
        </div>
      </div>

      {/* "Décerné avec honneur à" */}
      <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 15 }}>
        <div style={{ height: 0.5, width: 56, background: `linear-gradient(90deg,transparent,${GOLD})` }} />
        <div
          style={{
            fontFamily: FONT_LABEL,
            fontSize: 10.5,
            letterSpacing: "0.3em",
            color: MUTED,
            fontWeight: 500,
          }}
        >
          DÉCERNÉ AVEC HONNEUR À
        </div>
        <div style={{ height: 0.5, width: 56, background: `linear-gradient(90deg,${GOLD},transparent)` }} />
      </div>

      {/* Nom du diplômé — gradient de marque (repli teal pour html2canvas) */}
      <h2
        style={{
          fontFamily: FONT_TITLE,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 56,
          margin: "18px 0 0 0",
          lineHeight: 1,
          letterSpacing: "0.01em",
          textAlign: "center",
          padding: "0 6px 4px",
          ...gradientText,
        }}
      >
        {userName}
      </h2>

      {/* Paragraphe corps */}
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 18,
          lineHeight: 1.6,
          color: "#4C5A54",
          textAlign: "center",
          maxWidth: 528,
          margin: "24px 0 0",
          fontStyle: "italic",
        }}
      >
        a complété avec succès l&apos;intégralité du parcours{" "}
        <strong style={{ fontStyle: "normal", fontWeight: 600, fontFamily: FONT_TITLE, ...gradientText }}>
          La Base&nbsp;360 Academy
        </strong>{" "}
        — les <strong style={{ fontStyle: "normal", fontWeight: 600, fontFamily: FONT_TITLE, ...gradientText }}>7 chapitres</strong> qui couvrent tout le métier : démarrage,
        maîtrise de l&apos;app, bilan &amp; premier client, prospection &amp; conversion,
        fidélisation, pilotage &amp; croissance, et outils personnels.
      </p>

      {/* Bandeau « 100% maîtrisé » — gradient vitalFusion */}
      <div
        style={{
          marginTop: 24,
          display: "inline-flex",
          alignItems: "center",
          gap: 11,
          padding: "11px 30px",
          borderRadius: 999,
          background: BRAND_GRAD,
          color: "#fff",
          fontFamily: FONT_LABEL,
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.2em",
          boxShadow: "0 10px 26px rgba(6,150,160,0.34), inset 0 1px 0 rgba(255,255,255,0.28)",
        }}
      >
        <span style={{ opacity: 0.9 }}>✦</span> PARCOURS 100&nbsp;% MAÎTRISÉ <span style={{ opacity: 0.9 }}>✦</span>
      </div>

      {/* Date */}
      <div style={{ marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ fontFamily: FONT_LABEL, fontSize: 9.5, letterSpacing: "0.28em", color: HINT }}>
          DÉLIVRÉ LE
        </div>
        <div style={{ fontFamily: FONT_TITLE, fontSize: 18, color: INK, fontWeight: 500 }}>
          {completedDate}
        </div>
        <div
          style={{
            marginTop: 7,
            fontFamily: FONT_LABEL,
            fontSize: 10,
            letterSpacing: "0.3em",
            color: "#2E9E8E",
            fontWeight: 600,
          }}
        >
          PROMOTION 2026
        </div>
      </div>

      {/* Sceau central + halo cyan discret */}
      <div style={{ marginTop: 22, position: "relative", display: "flex", justifyContent: "center" }}>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-20px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(6,182,212,0.10), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ position: "relative" }}>
          <OfficialSeal size={118} gid="seal-a4" />
        </div>
      </div>

      {/* Signatures */}
      <div
        style={{
          marginTop: "auto",
          marginBottom: 50,
          display: "flex",
          gap: 60,
          alignItems: "flex-end",
        }}
      >
        <SignatureBlock
          cursive="Thomas Houbert"
          fullName="Thomas Houbert"
          title="CO-FONDATEUR"
          width={180}
          cursiveSize={30}
          fullSize={13}
          titleSize={9.5}
          letterspacing="0.24em"
        />
        <SignatureBlock
          cursive="Mélanie Houbert"
          fullName="Mélanie Houbert"
          title="CO-FONDATRICE"
          width={180}
          cursiveSize={30}
          fullSize={13}
          titleSize={9.5}
          letterspacing="0.24em"
        />
      </div>
    </div>
  );
}

// ═══ Format Story Instagram (9:16) ══════════════════════════════════════

function CertificateStory({ userName, completedDate }: CertProps) {
  return (
    <div
      className="ls-cert-page"
      style={{
        background:
          "radial-gradient(320px 320px at 12% 6%, rgba(16,185,129,.06), transparent 60%)," +
          "radial-gradient(340px 340px at 90% 96%, rgba(139,92,246,.07), transparent 62%)," +
          "radial-gradient(360px 360px at 88% 12%, rgba(6,182,212,.05), transparent 60%)," +
          "linear-gradient(160deg,#FCFAF2 0%, #FBF7EC 52%, #F5EFDF 100%)",
        maxWidth: 380,
        aspectRatio: "9 / 16",
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "44px 30px",
        fontFamily: FONT_BODY,
        color: INK,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10)",
      }}
    >
      {/* Bordures doubles (sand + hairline teal) */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 18, border: `1.2px solid ${SAND}`, pointerEvents: "none" }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 25,
          border: "0.5px solid rgba(14,158,119,0.30)",
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 16,
        }}
      >
        <img
          src={LOGO_URL}
          alt="La Base 360"
          style={{
            width: 72,
            height: 72,
            borderRadius: 18,
            objectFit: "contain",
            display: "block",
            boxShadow: "0 10px 22px rgba(6,120,120,0.28)",
          }}
        />
        <div
          style={{
            marginTop: 12,
            fontFamily: FONT_TITLE,
            fontSize: 23,
            fontWeight: 600,
            letterSpacing: "0.01em",
            color: INK,
          }}
        >
          La Base 360
        </div>
        <div
          style={{
            marginTop: 6,
            fontFamily: FONT_LABEL,
            fontSize: 9,
            letterSpacing: "0.32em",
            color: "#2E9E8E",
            fontWeight: 600,
          }}
        >
          THE WELLNESS CLUB
        </div>
      </div>

      {/* Eyebrow "DIPLÔMÉ DE" */}
      <div style={{ marginTop: 26, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ height: 0.5, width: 28, background: `linear-gradient(90deg,transparent,${GOLD})` }} />
        <div
          style={{
            fontFamily: FONT_LABEL,
            fontSize: 9,
            letterSpacing: "0.3em",
            color: MUTED,
            fontWeight: 500,
          }}
        >
          DIPLÔMÉ DE
        </div>
        <div style={{ height: 0.5, width: 28, background: `linear-gradient(90deg,${GOLD},transparent)` }} />
      </div>

      {/* Titre {APP_NAME} Academy */}
      <h1
        style={{
          fontFamily: FONT_TITLE,
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: 28,
          margin: "10px 0 0 0",
          color: INK,
          textAlign: "center",
          lineHeight: 1.15,
          letterSpacing: "0.005em",
        }}
      >
        {APP_NAME}
        <br />
        Academy
      </h1>

      {/* Sceau central agrandi */}
      <div style={{ marginTop: 30 }}>
        <OfficialSeal size={188} gid="seal-story" />
      </div>

      {/* Décerné à */}
      <div
        style={{
          marginTop: 24,
          fontFamily: FONT_LABEL,
          fontSize: 9,
          letterSpacing: "0.3em",
          color: MUTED,
          fontWeight: 500,
        }}
      >
        DÉCERNÉ À
      </div>

      {/* Nom — gradient de marque (repli teal pour html2canvas) */}
      <h2
        style={{
          fontFamily: FONT_TITLE,
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: 34,
          margin: "10px 0 0 0",
          textAlign: "center",
          lineHeight: 1.1,
          padding: "0 4px 3px",
          ...gradientText,
        }}
      >
        {userName}
      </h2>

      {/* Séparateur : point gradient */}
      <div style={{ marginTop: 16 }}>
        <Flourish width={26} />
      </div>

      {/* Sub */}
      <p
        style={{
          fontFamily: FONT_BODY,
          fontSize: 12.5,
          lineHeight: 1.55,
          color: "#4C5A54",
          textAlign: "center",
          margin: "14px 6px 0",
          fontStyle: "italic",
        }}
      >
        Pour avoir complété avec succès les <b style={{ fontStyle: "normal", fontWeight: 600, fontFamily: FONT_TITLE, ...gradientText }}>7&nbsp;chapitres</b> du parcours La&nbsp;Base&nbsp;360 Academy — tout le métier, du démarrage à la croissance.
      </p>

      {/* Date de délivrance */}
      <div style={{ marginTop: 14, fontFamily: FONT_LABEL, fontSize: 8.5, letterSpacing: "0.24em", color: HINT, fontWeight: 500 }}>
        DÉLIVRÉ LE {completedDate.toUpperCase()} · PROMOTION 2026
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
          <SignatureBlock
            cursive="Thomas Houbert"
            fullName="Thomas Houbert"
            title="CO-FONDATEUR"
            width={92}
            cursiveSize={19}
            fullSize={9}
            titleSize={7}
            letterspacing="0.18em"
          />
          <SignatureBlock
            cursive="Mélanie Houbert"
            fullName="Mélanie Houbert"
            title="CO-FONDATRICE"
            width={92}
            cursiveSize={19}
            fullSize={9}
            titleSize={7}
            letterspacing="0.18em"
          />
        </div>
        <div
          style={{
            fontFamily: FONT_LABEL,
            fontSize: 9,
            letterSpacing: "0.36em",
            fontWeight: 600,
            marginTop: 8,
            ...gradientText,
          }}
        >
          #LABASE360ACADEMY
        </div>
      </div>
    </div>
  );
}
