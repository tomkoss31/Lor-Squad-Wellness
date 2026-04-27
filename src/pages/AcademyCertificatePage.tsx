// Chantier Academy direction 6 (2026-04-28) — refonte premium
// (2026-04-29). Logo reel, sceau central style medaille, signatures
// cursive, 2 formats (A4 portrait + Story Instagram 9:16).
//
// Visible uniquement si view.isCompleted === true. Sinon redirect
// vers /academy.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAcademyProgress } from "../features/academy/hooks/useAcademyProgress";
import { useAppContext } from "../context/AppContext";

const LOGO_URL = "/icons/lor-squad-icon-180.png";
type CertFormat = "a4" | "story";

export function AcademyCertificatePage() {
  const navigate = useNavigate();
  const { view } = useAcademyProgress();
  const { currentUser } = useAppContext();
  const [format, setFormat] = useState<CertFormat>("a4");

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

  const userName = currentUser?.name ?? "Distributeur Lor'Squad";
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
          body, html { background: white !important; margin: 0 !important; padding: 0 !important; }
          .ls-cert-header, .ls-cert-actions { display: none !important; }
          .ls-cert-wrapper { background: white !important; padding: 0 !important; }
          .ls-cert-page {
            box-shadow: none !important;
            margin: 0 auto !important;
            page-break-inside: avoid;
          }
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
              background: format === "a4" ? "#B8922A" : "transparent",
              color: format === "a4" ? "white" : "#B8922A",
              border: "1px solid #B8922A",
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
              background: format === "story" ? "#B8922A" : "transparent",
              color: format === "story" ? "white" : "#B8922A",
              border: "1px solid #B8922A",
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
          <span
            style={{
              alignSelf: "center",
              background: "rgba(216,90,48,0.15)",
              color: "#993556",
              padding: "4px 10px",
              borderRadius: 999,
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            🚧 Mode beta
          </span>
        </div>
      </div>

      {/* Render conditionnel A4 ou Story */}
      {format === "a4" ? (
        <CertificateA4 userName={userName} completedDate={dateLabel} />
      ) : (
        <CertificateStory userName={userName} completedDate={dateLabel} />
      )}

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
          onClick={() => window.print()}
          style={{
            background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
            color: "white",
            border: "none",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
            boxShadow: "0 4px 12px rgba(186,117,23,0.30)",
          }}
        >
          🖨️ {format === "a4" ? "Imprimer / Exporter PDF" : "Télécharger Story"}
        </button>
        <button
          type="button"
          onClick={() => navigate("/academy")}
          style={{
            background: "white",
            color: "#5F5E5A",
            border: "0.5px solid #C9C2AB",
            padding: "12px 22px",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Retour à l&apos;Academy
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

function OfficialSeal({ size = 130 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="46" fill="none" stroke="#B8922A" strokeWidth="0.6" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#B8922A" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="38" fill="#FCF5E1" stroke="#B8922A" strokeWidth="0.4" />
      {/* 4 petits losanges N/S/E/W */}
      <g fill="#B8922A">
        <path d="M50 12 L51 14 L50 16 L49 14 Z" />
        <path d="M50 84 L51 86 L50 88 L49 86 Z" />
        <path d="M12 50 L14 51 L16 50 L14 49 Z" />
        <path d="M84 50 L86 51 L88 50 L86 49 Z" />
      </g>
      {/* Couronnes laurier internes gauche */}
      <g fill="#B8922A" opacity="0.85">
        <path d="M28 38 Q32 28 38 26 Q35 32 32 35 Q38 33 42 31 Q37 37 32 38 Q38 39 42 41 Q35 41 32 38 Z" />
        <path d="M28 56 Q32 50 38 48 Q35 54 32 57 Q38 55 42 53 Q37 59 32 60 Q38 61 42 63 Q35 63 32 60 Z" />
      </g>
      {/* Couronnes laurier internes droite (mirror) */}
      <g fill="#B8922A" opacity="0.85" transform="translate(100,0) scale(-1,1)">
        <path d="M28 38 Q32 28 38 26 Q35 32 32 35 Q38 33 42 31 Q37 37 32 38 Q38 39 42 41 Q35 41 32 38 Z" />
        <path d="M28 56 Q32 50 38 48 Q35 54 32 57 Q38 55 42 53 Q37 59 32 60 Q38 61 42 63 Q35 63 32 60 Z" />
      </g>
      <text x="50" y="44" textAnchor="middle" fontFamily="Georgia, serif" fontSize="7" fontWeight="500" fill="#5C4A0F" letterSpacing="0.18em">LOR&apos;SQUAD</text>
      <text x="50" y="55" textAnchor="middle" fontFamily="Georgia, serif" fontSize="9" fontWeight="500" fill="#B8922A" fontStyle="italic">Academy</text>
      <text x="50" y="66" textAnchor="middle" fontFamily="Georgia, serif" fontSize="5.5" fill="#888780" letterSpacing="0.15em">EST. 2026</text>
    </svg>
  );
}

function LaurelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <svg
        width={340}
        height={70}
        viewBox="0 0 240 56"
        style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", opacity: 0.55 }}
      >
        <g fill="#B8922A">
          <path d="M40 28 Q44 18 50 16 Q47 22 44 25 Q49 24 53 22 Q49 27 44 28 Q49 29 53 31 Q47 31 44 28 Z" />
          <path d="M55 32 Q60 22 66 20 Q63 26 60 29 Q66 28 70 26 Q65 31 60 32 Q66 33 70 35 Q63 35 60 32 Z" />
          <path d="M70 36 Q76 26 82 24 Q79 30 76 33 Q82 32 86 30 Q81 35 76 36 Q82 37 86 39 Q79 39 76 36 Z" />
          <path d="M88 38 Q95 30 102 30 Q98 34 95 36 Q102 36 107 35 Q101 39 95 40 Q102 41 107 43 Q98 42 95 40 Z" />
        </g>
        <g fill="#B8922A" transform="translate(240,0) scale(-1,1)">
          <path d="M40 28 Q44 18 50 16 Q47 22 44 25 Q49 24 53 22 Q49 27 44 28 Q49 29 53 31 Q47 31 44 28 Z" />
          <path d="M55 32 Q60 22 66 20 Q63 26 60 29 Q66 28 70 26 Q65 31 60 32 Q66 33 70 35 Q63 35 60 32 Z" />
          <path d="M70 36 Q76 26 82 24 Q79 30 76 33 Q82 32 86 30 Q81 35 76 36 Q82 37 86 39 Q79 39 76 36 Z" />
          <path d="M88 38 Q95 30 102 30 Q98 34 95 36 Q102 36 107 35 Q101 39 95 40 Q102 41 107 43 Q98 42 95 40 Z" />
        </g>
      </svg>
      <h1
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 38,
          fontWeight: 400,
          margin: 0,
          color: "#2C2C2A",
          letterSpacing: "0.01em",
          textAlign: "center",
          padding: "0 80px",
          position: "relative",
          zIndex: 2,
          fontStyle: "italic",
          lineHeight: 1.1,
        }}
      >
        {children}
      </h1>
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
        d="M0,0 L40,0 L40,3 L3,3 L3,40 L0,40 Z M3,5 L25,5 L25,7 L5,7 L5,25 L3,25 Z"
        fill="#B8922A"
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
          fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive",
          fontSize: cursiveSize,
          color: "#2C2C2A",
          height: cursiveSize * 1.3,
          lineHeight: 1,
        }}
      >
        {cursive}
      </div>
      <div style={{ height: 0.5, width, background: "#2C2C2A", marginBottom: 6 }} />
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: fullSize,
          color: "#2C2C2A",
          fontWeight: 500,
        }}
      >
        {fullName}
      </div>
      <div
        style={{
          fontFamily: "system-ui, sans-serif",
          fontSize: titleSize,
          letterSpacing: letterspacing,
          color: "#888780",
          marginTop: 3,
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
        background: "#FAF6E8",
        border: "2px solid #B8922A",
        maxWidth: 800,
        aspectRatio: "210 / 297",
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 0,
        fontFamily: "Georgia, serif",
        color: "#2C2C2A",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}
    >
      {/* Bordure double trait intérieure */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 16,
          border: "0.5px solid #B8922A",
          pointerEvents: "none",
        }}
      />

      {/* Ornements 4 coins */}
      <CornerOrnament position="tl" />
      <CornerOrnament position="tr" />
      <CornerOrnament position="bl" />
      <CornerOrnament position="br" />

      {/* Logo réel + eyebrow */}
      <div
        style={{
          marginTop: 70,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <img
          src={LOGO_URL}
          alt="Lor'Squad"
          style={{ width: 72, height: 72, objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 12,
            fontFamily: "system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: "0.32em",
            color: "#B8922A",
            fontWeight: 500,
          }}
        >
          LOR&apos;SQUAD WELLNESS
        </div>
      </div>

      {/* Titre + couronnes laurier */}
      <div style={{ marginTop: 28 }}>
        <LaurelTitle>
          Certificat
          <br />
          de formation
        </LaurelTitle>
      </div>

      {/* "Décerné avec honneur à" */}
      <div
        style={{
          marginTop: 32,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div style={{ height: 0.5, width: 56, background: "#B8922A" }} />
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 11,
            letterSpacing: "0.3em",
            color: "#6B6B62",
            fontStyle: "italic",
          }}
        >
          DÉCERNÉ AVEC HONNEUR À
        </div>
        <div style={{ height: 0.5, width: 56, background: "#B8922A" }} />
      </div>

      {/* Nom du diplômé */}
      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 52,
          fontWeight: 400,
          margin: "20px 0 0 0",
          color: "#5C4A0F",
          fontStyle: "italic",
          letterSpacing: "0.02em",
          textAlign: "center",
        }}
      >
        {userName}
      </h2>

      {/* Paragraphe corps */}
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 14,
          lineHeight: 1.7,
          color: "#5F5E5A",
          textAlign: "center",
          maxWidth: 520,
          margin: "32px 32px 0",
          fontStyle: "italic",
        }}
      >
        a complété avec succès l&apos;intégralité du parcours{" "}
        <strong style={{ color: "#B8922A", fontStyle: "normal", fontWeight: 500 }}>
          Lor&apos;Squad Academy
        </strong>{" "}
        — les 8 sections de formation au métier de distributeur Herbalife, à
        la gestion d&apos;activité et à l&apos;accompagnement client.
      </p>

      {/* Date */}
      <div
        style={{
          marginTop: 28,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 10,
            letterSpacing: "0.25em",
            color: "#888780",
          }}
        >
          DÉLIVRÉ LE
        </div>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 16,
            color: "#2C2C2A",
            fontWeight: 500,
          }}
        >
          {completedDate}
        </div>
      </div>

      {/* Sceau central */}
      <div style={{ marginTop: 36 }}>
        <OfficialSeal size={130} />
      </div>

      {/* Signatures */}
      <div
        style={{
          marginTop: "auto",
          marginBottom: 50,
          display: "flex",
          gap: 70,
          alignItems: "flex-end",
        }}
      >
        <SignatureBlock
          cursive="T. Houbert"
          fullName="Thomas Houbert"
          title="CO-FONDATEUR"
          width={170}
          cursiveSize={30}
          fullSize={13}
          titleSize={10}
          letterspacing="0.25em"
        />
        <SignatureBlock
          cursive="M. Houbert"
          fullName="Mélanie Houbert"
          title="CO-FONDATRICE"
          width={170}
          cursiveSize={30}
          fullSize={13}
          titleSize={10}
          letterspacing="0.25em"
        />
      </div>
    </div>
  );
}

// ═══ Format Story Instagram (9:16) ══════════════════════════════════════

function CertificateStory({ userName, completedDate }: CertProps) {
  // completedDate non utilise dans le format story actuel — on peut
  // l ajouter en sub plus tard si besoin.
  void completedDate;

  return (
    <div
      className="ls-cert-page"
      style={{
        background: "#FAF6E8",
        maxWidth: 380,
        aspectRatio: "9 / 16",
        margin: "0 auto",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "48px 32px",
        fontFamily: "Georgia, serif",
        color: "#2C2C2A",
        boxShadow: "0 8px 40px rgba(0,0,0,0.08)",
      }}
    >
      {/* Bordures doubles */}
      <div
        aria-hidden="true"
        style={{ position: "absolute", inset: 20, border: "1.5px solid #B8922A", pointerEvents: "none" }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 28,
          border: "0.5px solid #B8922A",
          opacity: 0.5,
          pointerEvents: "none",
        }}
      />

      {/* Logo */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: 20,
        }}
      >
        <img
          src={LOGO_URL}
          alt="Lor'Squad"
          style={{ width: 56, height: 56, objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 12,
            fontFamily: "system-ui, sans-serif",
            fontSize: 9,
            letterSpacing: "0.32em",
            color: "#B8922A",
            fontWeight: 500,
          }}
        >
          LOR&apos;SQUAD WELLNESS
        </div>
      </div>

      {/* Eyebrow "DIPLÔMÉ DE" */}
      <div style={{ marginTop: 28, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ height: 0.5, width: 28, background: "#B8922A" }} />
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 9,
            letterSpacing: "0.3em",
            color: "#6B6B62",
            fontStyle: "italic",
          }}
        >
          DIPLÔMÉ DE
        </div>
        <div style={{ height: 0.5, width: 28, background: "#B8922A" }} />
      </div>

      {/* Titre Lor'Squad Academy */}
      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 28,
          fontWeight: 400,
          margin: "10px 0 0 0",
          color: "#2C2C2A",
          textAlign: "center",
          lineHeight: 1.15,
          fontStyle: "italic",
          letterSpacing: "0.01em",
        }}
      >
        Lor&apos;Squad
        <br />
        Academy
      </h1>

      {/* Sceau central agrandi */}
      <div style={{ marginTop: 32 }}>
        <OfficialSeal size={200} />
      </div>

      {/* Décerné à */}
      <div
        style={{
          marginTop: 24,
          fontFamily: "system-ui, sans-serif",
          fontSize: 9,
          letterSpacing: "0.3em",
          color: "#6B6B62",
        }}
      >
        DÉCERNÉ À
      </div>

      {/* Nom */}
      <h2
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 32,
          fontWeight: 400,
          margin: "10px 0 0 0",
          color: "#5C4A0F",
          fontStyle: "italic",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {userName}
      </h2>

      {/* Séparateur losange */}
      <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ height: 1, width: 24, background: "#B8922A" }} />
        <div style={{ width: 5, height: 5, transform: "rotate(45deg)", background: "#B8922A" }} />
        <div style={{ height: 1, width: 24, background: "#B8922A" }} />
      </div>

      {/* Sub */}
      <p
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 11,
          lineHeight: 1.6,
          color: "#5F5E5A",
          textAlign: "center",
          margin: "16px 8px 0",
          fontStyle: "italic",
        }}
      >
        Pour avoir complété les 8 sections du parcours de formation au métier
        de distributeur Herbalife
      </p>

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
        <div style={{ display: "flex", gap: 28, alignItems: "flex-end" }}>
          <SignatureBlock
            cursive="T. Houbert"
            fullName="Thomas Houbert"
            title="CO-FONDATEUR"
            width={84}
            cursiveSize={16}
            fullSize={9}
            titleSize={7}
            letterspacing="0.2em"
          />
          <SignatureBlock
            cursive="M. Houbert"
            fullName="Mélanie Houbert"
            title="CO-FONDATRICE"
            width={84}
            cursiveSize={16}
            fullSize={9}
            titleSize={7}
            letterspacing="0.2em"
          />
        </div>
        <div
          style={{
            fontFamily: "system-ui, sans-serif",
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "#B8922A",
            fontWeight: 500,
            marginTop: 8,
          }}
        >
          #LORSQUADACADEMY
        </div>
      </div>
    </div>
  );
}
