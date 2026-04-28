// =============================================================================
// AcademyPlaybookPage — Le playbook personnalise (Tier B #7 — 2026-04-28)
// =============================================================================
//
// Apres completion de l Academy, le user accede a /academy/playbook (CTA
// gold sur AcademyOverview a cote du certificat). La page rend une cover
// nominative + 8 pages A4 (une par section) avec les concepts cles.
//
// Telechargement : PDF multi-pages via jsPDF + html2canvas (chaque page
// est captured separement, puis assemblee en un seul PDF A4 portrait).
// =============================================================================

import { forwardRef, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { useAppContext } from "../context/AppContext";
import {
  PLAYBOOK_SECTIONS,
  type PlaybookSection,
} from "../features/academy/playbookContent";

const LOGO_URL = "/icons/lor-squad-icon-180.png";

function slugify(name: string): string {
  return (name || "playbook")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function formatDateLong(): string {
  return new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function AcademyPlaybookPage() {
  const navigate = useNavigate();
  const { view } = useAcademyProgress();
  const { currentUser } = useAppContext();
  const [downloading, setDownloading] = useState(false);
  const pagesRef = useRef<Array<HTMLDivElement | null>>([]);

  const userFirstName = useMemo(() => {
    const name = (currentUser?.name || "").trim();
    return name.split(/\s+/)[0] || "Distri";
  }, [currentUser?.name]);
  const userFullName = currentUser?.name || "Lor'Squad Distri";

  // Garde-fou : redirige si pas complete (admin peut bypass via URL).
  if (view.loaded && !view.isCompleted && currentUser?.role !== "admin") {
    navigate("/academy");
    return null;
  }

  async function handleDownloadPdf() {
    if (downloading) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      const pdfWidth = 210;
      const pdfHeight = 297;

      const validNodes = pagesRef.current.filter(
        (n): n is HTMLDivElement => n !== null,
      );

      for (let i = 0; i < validNodes.length; i++) {
        const node = validNodes[i];
        const canvas = await html2canvas(node, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
      }

      const slug = slugify(userFirstName);
      pdf.save(`playbook-${slug}.pdf`);
    } catch (err) {
      console.error("[Playbook] download failed:", err);
      alert("Impossible de générer le PDF. Réessaie ou contacte un admin.");
    } finally {
      setDownloading(false);
    }
  }

  if (!view.loaded) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "var(--ls-text-muted)" }}>
        Chargement…
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ls-bg)",
        padding: "24px 16px 48px",
        fontFamily: "DM Sans, sans-serif",
      }}
    >
      {/* Bandeau actions */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ls-text-muted)",
            fontSize: 13,
            cursor: "pointer",
            padding: 0,
          }}
        >
          ← Retour à l'Academy
        </button>
        <button
          type="button"
          onClick={() => void handleDownloadPdf()}
          disabled={downloading}
          style={{
            padding: "12px 22px",
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            border: "none",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 700,
            cursor: downloading ? "wait" : "pointer",
            boxShadow: "0 4px 12px rgba(186,117,23,0.30)",
            opacity: downloading ? 0.7 : 1,
          }}
        >
          {downloading ? "Génération…" : "📄 Télécharger le PDF"}
        </button>
      </div>

      {/* Pages */}
      <div
        style={{
          maxWidth: 760,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        {/* Cover */}
        <PlaybookCoverPage
          ref={(el) => {
            pagesRef.current[0] = el;
          }}
          firstName={userFirstName}
          fullName={userFullName}
          dateStr={formatDateLong()}
        />

        {/* 1 page par section */}
        {PLAYBOOK_SECTIONS.map((section, idx) => (
          <PlaybookSectionPage
            key={section.sectionId}
            ref={(el) => {
              pagesRef.current[idx + 1] = el;
            }}
            section={section}
            pageNumber={idx + 2}
            totalPages={PLAYBOOK_SECTIONS.length + 1}
            firstName={userFirstName}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Cover page ─────────────────────────────────────────────────────────────

interface CoverProps {
  firstName: string;
  fullName: string;
  dateStr: string;
}

const PlaybookCoverPage = forwardRef<HTMLDivElement, CoverProps>(
  ({ firstName, fullName, dateStr }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          aspectRatio: "210 / 297",
          background:
            "linear-gradient(180deg, #FAF6E8 0%, #FCF5E1 50%, #FAEEDA 100%)",
          borderRadius: 14,
          padding: "8% 8%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#2C2C2A",
          fontFamily: "DM Sans, sans-serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.10)",
          textAlign: "center",
          position: "relative",
        }}
      >
        {/* Border decorative gold */}
        <div
          style={{
            position: "absolute",
            inset: "20px",
            border: "1px solid rgba(184,146,42,0.45)",
            borderRadius: 8,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: "26px",
            border: "0.5px solid rgba(184,146,42,0.20)",
            borderRadius: 6,
            pointerEvents: "none",
          }}
        />

        {/* Top — Logo + eyebrow */}
        <div style={{ paddingTop: "4%" }}>
          <img
            src={LOGO_URL}
            alt="Lor'Squad"
            style={{
              width: 80,
              height: 80,
              borderRadius: 16,
              boxShadow: "0 4px 16px rgba(184,146,42,0.30)",
              marginBottom: 16,
            }}
          />
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#B8922A",
              fontWeight: 600,
              marginBottom: 4,
            }}
          >
            Lor&apos;Squad Academy
          </div>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.15em",
              color: "#6B6B62",
              textTransform: "uppercase",
            }}
          >
            Le Playbook personnel
          </div>
        </div>

        {/* Center — Titre + nom */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 42,
              fontWeight: 500,
              lineHeight: 1.1,
              color: "#2C2C2A",
              marginBottom: 14,
            }}
          >
            Le playbook
            <br />
            de
          </div>
          <div
            style={{
              fontFamily: "Syne, serif",
              fontSize: 36,
              fontWeight: 700,
              color: "#5C4A0F",
              fontStyle: "italic",
              lineHeight: 1.2,
            }}
          >
            {firstName}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#6B6B62",
              marginTop: 6,
              fontStyle: "italic",
            }}
          >
            {fullName}
          </div>
        </div>

        {/* Quote */}
        <div
          style={{
            maxWidth: "80%",
            margin: "0 auto",
            padding: "16px 0",
            borderTop: "1px solid rgba(184,146,42,0.30)",
            borderBottom: "1px solid rgba(184,146,42,0.30)",
            fontSize: 13,
            fontStyle: "italic",
            color: "#5F5E5A",
            lineHeight: 1.6,
          }}
        >
          « Les concepts essentiels que tu maîtrises maintenant, à garder
          sous la main pour ne rien oublier. »
        </div>

        {/* Footer date */}
        <div
          style={{
            paddingBottom: "2%",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#888",
          }}
        >
          Édition du {dateStr}
        </div>
      </div>
    );
  },
);
PlaybookCoverPage.displayName = "PlaybookCoverPage";

// ─── Section page ────────────────────────────────────────────────────────────

interface SectionProps {
  section: PlaybookSection;
  pageNumber: number;
  totalPages: number;
  firstName: string;
}

const PlaybookSectionPage = forwardRef<HTMLDivElement, SectionProps>(
  ({ section, pageNumber, totalPages, firstName }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: "100%",
          aspectRatio: "210 / 297",
          background: "#FFFEF8",
          borderRadius: 14,
          padding: "6% 6%",
          display: "flex",
          flexDirection: "column",
          color: "#2C2C2A",
          fontFamily: "DM Sans, sans-serif",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          position: "relative",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            paddingBottom: 14,
            borderBottom: "1px solid rgba(184,146,42,0.25)",
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Playbook · Section
            </div>
            <h1
              style={{
                fontFamily: "Syne, serif",
                fontSize: 26,
                fontWeight: 600,
                color: "#2C2C2A",
                margin: 0,
                lineHeight: 1.15,
              }}
            >
              <span style={{ marginRight: 12 }}>{section.icon}</span>
              {section.pageTitle}
            </h1>
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#888",
              letterSpacing: "0.1em",
              textAlign: "right",
            }}
          >
            <div>
              Page {pageNumber} / {totalPages}
            </div>
            <div style={{ marginTop: 2 }}>{firstName}</div>
          </div>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 13,
            color: "#5F5E5A",
            lineHeight: 1.6,
            margin: "0 0 22px",
            fontStyle: "italic",
          }}
        >
          {section.subtitle}
        </p>

        {/* Takeaways */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            flex: 1,
          }}
        >
          {section.takeaways.map((takeaway) => (
            <div
              key={takeaway.title}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: "12px 14px",
                background: "#FAF6E8",
                border: "0.5px solid rgba(184,146,42,0.30)",
                borderRadius: 10,
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {takeaway.emoji}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "Syne, serif",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#2C2C2A",
                    marginBottom: 4,
                  }}
                >
                  {takeaway.title}
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "#5F5E5A",
                    lineHeight: 1.5,
                  }}
                >
                  {takeaway.detail}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Key number (optionnel) */}
        {section.keyNumber ? (
          <div
            style={{
              marginTop: 16,
              padding: "10px 14px",
              background:
                "linear-gradient(135deg, rgba(184,146,42,0.10), rgba(127,119,221,0.06))",
              border: "0.5px solid rgba(184,146,42,0.40)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                fontFamily: "Syne, serif",
                fontSize: 28,
                fontWeight: 700,
                color: "#B8922A",
                lineHeight: 1,
              }}
            >
              {section.keyNumber.value}
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#5F5E5A",
                fontWeight: 500,
              }}
            >
              {section.keyNumber.label}
            </div>
          </div>
        ) : null}

        {/* Punchline */}
        <div
          style={{
            marginTop: 18,
            padding: "14px 16px",
            background: "linear-gradient(135deg, #FCF5E1, #FAEEDA)",
            borderLeft: "3px solid #B8922A",
            borderRadius: 8,
            fontFamily: "Syne, serif",
            fontSize: 13,
            fontStyle: "italic",
            color: "#5C4A0F",
            lineHeight: 1.5,
          }}
        >
          “ {section.punchline} ”
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 8,
            borderTop: "0.5px dashed rgba(184,146,42,0.30)",
            fontSize: 9,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#999",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Lor&apos;Squad Academy</span>
          <span>Playbook personnel</span>
        </div>
      </div>
    );
  },
);
PlaybookSectionPage.displayName = "PlaybookSectionPage";
