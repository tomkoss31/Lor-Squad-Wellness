// =============================================================================
// CharterManifeste — template "Manifeste" A4 paper crème (2026-05-03)
//
// Reproduit pixel-perfect `charte-v3-manifeste-v2.html` (validé Thomas
// "pète sa mère"). Format A4 portrait, logo "Lor'Squad" metallic gros
// 58px Cinzel + tornade dorée + serment 100% original Lor'Squad
// (Posture / Attitude / Engagement quotidien) + quote centrale +
// fillable pourquoi/objectif (mini-cards, pas lignes pointillées —
// décision UX validée Thomas) + phrase finale + attribution Mark Hughes.
//
// PAS de coins art déco, PAS de cachet, PAS de cards engagements
// (le serment poétique remplace les cards).
// =============================================================================

import { forwardRef } from "react";
import type {
  CharterDisplayMode,
  CharterPersonInfo,
} from "../../types/charter";
import { CharterTornadoManifeste } from "./CharterTornadoManifeste";
import { CharterLeafWatermark } from "./CharterLeafWatermark";

interface Props {
  distributeur: CharterPersonInfo;
  cosigner: CharterPersonInfo;
  pourquoiText?: string;
  objectif12Mois?: string;
  documentDate?: Date;
  mode: CharterDisplayMode;
  onPourquoiChange?: (v: string) => void;
  onObjectifChange?: (v: string) => void;
  onSignClick?: () => void;
  onCosignClick?: () => void;
}

export const CharterManifeste = forwardRef<HTMLDivElement, Props>(
  function CharterManifeste(
    {
      distributeur,
      cosigner,
      pourquoiText,
      objectif12Mois,
      documentDate,
      mode,
      onPourquoiChange,
      onObjectifChange,
      onSignClick,
      onCosignClick,
    },
    ref,
  ) {
    const docDate = documentDate ?? new Date();
    const distriFirst = distributeur.firstName || "Distributeur";
    const cosignerFull = `${cosigner.firstName} ${cosigner.lastName}`.trim() || "Coach";

    return (
      <div
        ref={ref}
        className="ls-charter-manifeste"
        style={{
          width: "100%",
          maxWidth: 794,
          minHeight: 1123,
          margin: "0 auto",
          background: "#FFFEF8",
          backgroundImage:
            "radial-gradient(ellipse at 50% 0%, rgba(212, 169, 55, 0.06) 0%, transparent 60%), linear-gradient(180deg, #FFFEF8 0%, #FCFAF0 50%, #F5EDD3 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "0 40px 100px rgba(0, 0, 0, 0.6), 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(184, 146, 42, 0.2)",
          padding: "75px 90px 80px",
          fontFamily: "'Cormorant Garamond', serif",
          color: "#2A2419",
        }}
      >
        {/* Tornades dorées background */}
        <CharterTornadoManifeste />

        {/* Header LOGO METALLIC ─────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 58,
              fontWeight: 800,
              backgroundImage:
                "linear-gradient(180deg, #FFF4D4 0%, #F8DDA0 12%, #E5C476 28%, #D4A937 50%, #B8922A 72%, #8B6F1F 88%, #5A4612 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter:
                "drop-shadow(0 1px 0 rgba(91, 68, 18, 0.95)) drop-shadow(0 2px 0 rgba(91, 68, 18, 0.7)) drop-shadow(0 3px 0 rgba(91, 68, 18, 0.45)) drop-shadow(0 4px 0 rgba(91, 68, 18, 0.25)) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.2))",
              letterSpacing: 1,
              lineHeight: 1,
              display: "inline-block",
            }}
          >
            Lor&apos;Squad
            <span style={{ fontSize: 28, verticalAlign: "super", marginLeft: 4 }}>
              ✦
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: 5,
              color: "#8B6F1F",
              textTransform: "uppercase",
              fontWeight: 600,
              marginTop: 8,
            }}
          >
            Wellness · Manifeste du Distributeur
          </p>
        </div>

        {/* Ornement diviseur */}
        <Divider />

        {/* Titre */}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: 6,
              color: "#B8922A",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 10,
            }}
          >
            Le Serment
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 38,
              fontWeight: 600,
              color: "#2A2419",
              fontStyle: "italic",
              letterSpacing: 1,
              lineHeight: 1.1,
              margin: 0,
            }}
          >
            L&apos;éthique du distributeur
          </h1>
        </div>

        {/* SERMENT — 3 sections */}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginBottom: 26 }}>
          <SermentSection title="— Ma posture —">
            <SermentLine>La manière de parler à un prospect</SermentLine>
            <SermentLine>de regarder dans les yeux</SermentLine>
            <SermentLine>de dire ce que je pense vraiment</SermentLine>
            <SermentLine bold>et de tenir ce que je promets.</SermentLine>
          </SermentSection>

          <SermentSection title="— Mon attitude —">
            <SermentLine italic>Toujours présent</SermentLine>
            <SermentLine italic>toujours prêt à servir</SermentLine>
            <SermentLine italic>toujours fier d&apos;appartenir à Lor&apos;Squad.</SermentLine>
          </SermentSection>

          <SermentSection title="— Mon engagement quotidien —">
            <SermentLine gold>Partager mes succès</SermentLine>
            <SermentLine gold>partager mes échecs aussi</SermentLine>
            <SermentLine gold>transmettre ce que j&apos;apprends</SermentLine>
            <SermentLine gold>soutenir ceux qui démarrent.</SermentLine>
          </SermentSection>
        </div>

        {/* Ornement diviseur */}
        <Divider />

        {/* Quote centrale */}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginBottom: 26 }}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 19,
              fontStyle: "italic",
              color: "#2A2419",
              fontWeight: 600,
              lineHeight: 1.55,
              letterSpacing: 0.5,
              padding: "0 30px",
              margin: 0,
            }}
          >
            Tout ceci à faire{" "}
            <span style={uppercaseGold}>de mon éthique personnelle</span>
            <br />
            et tout ceci se reflètera{" "}
            <span style={uppercaseGold}>au sein de Lor&apos;Squad</span>.
          </p>
        </div>

        {/* Pourquoi + Objectif (mini-cards, decision UX) */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
            marginBottom: 26,
          }}
        >
          <ManifesteFillCard
            label="Mon « pourquoi »"
            value={pourquoiText ?? ""}
            placeholder="Pourquoi je fais ça…"
            mode={mode}
            onChange={onPourquoiChange}
            color="teal"
          />
          <ManifesteFillCard
            label="Mon objectif 12 mois"
            value={objectif12Mois ?? ""}
            placeholder="Cible chiffrée + cible humaine."
            mode={mode}
            onChange={onObjectifChange}
            color="gold"
          />
        </div>

        {/* Phrase finale + attribution Hughes */}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginBottom: 28 }}>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 18,
              fontStyle: "italic",
              color: "#8B6F1F",
              fontWeight: 600,
              lineHeight: 1.55,
              margin: "22px 0",
            }}
          >
            « Je ne suis pas un vendeur de produits.
            <br />
            Je suis un ambassadeur de la transformation
            <br />
            qui s&apos;opère grâce à moi, autour de moi. »
          </p>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 12,
              fontStyle: "italic",
              color: "#6B5C40",
              marginTop: 8,
              letterSpacing: 0.5,
            }}
          >
            Inspiré du serment originel posé par{" "}
            <strong style={{ color: "#8B6F1F", fontWeight: 700, fontStyle: "normal" }}>
              Mark Hughes
            </strong>
            , fondateur d&apos;Herbalife
          </p>
        </div>

        {/* Feuille Herbalife bottom right */}
        <CharterLeafWatermark />

        {/* Signatures */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 60,
            marginTop: 32,
            paddingTop: 24,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "60%",
              height: 1,
              background:
                "linear-gradient(90deg, transparent, #B8922A 50%, transparent)",
            }}
          />
          <ManifesteSignBlock
            label="✦ Distributeur ✦"
            displayName={distriFirst}
            caption={distributeur.signedAt ? "Signé" : "En attente de signature"}
            signatureDataUrl={distributeur.signatureDataUrl}
            signedAt={distributeur.signedAt}
            mode={mode}
            onSignClick={onSignClick}
          />
          <ManifesteSignBlock
            label="✦ Coach ✦"
            displayName={cosignerFull}
            caption={cosigner.role ?? "Fondateur · Lor'Squad"}
            signatureDataUrl={cosigner.signatureDataUrl}
            signedAt={cosigner.signedAt}
            mode={mode}
            onSignClick={onCosignClick}
            cursiveColor="#B8922A"
          />
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            zIndex: 3,
            textAlign: "center",
            fontFamily: "'Cinzel', serif",
            fontSize: 9,
            letterSpacing: 3,
            color: "#8B6F1F",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          ✦ Établi le{" "}
          {docDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          <span style={{ margin: "0 8px", color: "#D4A937" }}>·</span>
          Lor&apos;Squad Wellness {docDate.getFullYear()} ✦
        </div>
      </div>
    );
  },
);

// ─── Sub-components ──────────────────────────────────────────────────────────

function Divider() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        margin: "22px 0",
        position: "relative",
        zIndex: 3,
      }}
    >
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)",
          flex: 1,
          maxWidth: 140,
        }}
      />
      <span style={{ fontSize: 16, color: "#B8922A" }} aria-hidden="true">✦</span>
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)",
          flex: 1,
          maxWidth: 140,
        }}
      />
    </div>
  );
}

function SermentSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <p
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 11,
          letterSpacing: 5,
          color: "#B8922A",
          textTransform: "uppercase",
          fontWeight: 700,
          margin: "24px 0 12px",
        }}
      >
        {title}
      </p>
      {children}
    </>
  );
}

function SermentLine({
  children,
  bold,
  italic,
  gold,
}: {
  children: React.ReactNode;
  bold?: boolean;
  italic?: boolean;
  gold?: boolean;
}) {
  return (
    <p
      style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 17,
        fontWeight: bold ? 700 : gold ? 600 : 500,
        fontStyle: italic || gold ? "italic" : "normal",
        color: gold ? "#8B6F1F" : italic ? "#4A3F2A" : "#2A2419",
        lineHeight: 1.85,
        letterSpacing: 0.3,
        margin: 0,
      }}
    >
      {children}
    </p>
  );
}

function ManifesteFillCard({
  label,
  value,
  placeholder,
  mode,
  onChange,
  color,
}: {
  label: string;
  value: string;
  placeholder: string;
  mode: CharterDisplayMode;
  onChange?: (v: string) => void;
  color: "gold" | "teal";
}) {
  const accent = color === "gold" ? "#8B6F1F" : "#14704F";
  return (
    <div
      style={{
        padding: "14px 16px",
        background: "rgba(255, 254, 248, 0.5)",
        border: `1px dashed ${color === "gold" ? "rgba(184, 146, 42, 0.5)" : "rgba(29, 158, 117, 0.4)"}`,
        borderRadius: 6,
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 10,
          letterSpacing: 4,
          color: accent,
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 8,
        }}
      >
        — {label} —
      </div>
      {mode === "fillable" ? (
        <textarea
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "#2A2419",
            textAlign: "center",
            resize: "none",
            minHeight: 40,
          }}
        />
      ) : (
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontStyle: "italic",
            fontSize: 14,
            color: value ? "#2A2419" : "#A89272",
            margin: 0,
            minHeight: 40,
            whiteSpace: "pre-wrap",
          }}
        >
          {value || placeholder}
        </p>
      )}
    </div>
  );
}

function ManifesteSignBlock({
  label,
  displayName,
  caption,
  signatureDataUrl,
  signedAt,
  mode,
  onSignClick,
  cursiveColor = "#1D9E75",
}: {
  label: string;
  displayName: string;
  caption: string;
  signatureDataUrl?: string | null;
  signedAt?: string | null;
  mode: CharterDisplayMode;
  onSignClick?: () => void;
  cursiveColor?: string;
}) {
  const isSigned = !!signatureDataUrl;
  const canSign = mode === "fillable" && !!onSignClick && !isSigned;
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 9,
          letterSpacing: 4,
          color: "#8B6F1F",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      {isSigned ? (
        <img
          src={signatureDataUrl ?? ""}
          alt={`Signature ${displayName}`}
          style={{
            display: "block",
            margin: "0 auto",
            maxHeight: 60,
            maxWidth: "85%",
            objectFit: "contain",
          }}
        />
      ) : (
        <div
          onClick={canSign ? onSignClick : undefined}
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 32,
            color: canSign ? cursiveColor : `${cursiveColor}66`,
            fontWeight: 600,
            lineHeight: 1,
            cursor: canSign ? "pointer" : "default",
            fontStyle: "italic",
          }}
        >
          {displayName}
        </div>
      )}
      <div
        style={{
          width: "75%",
          height: 1,
          margin: "6px auto 8px",
          background: "#4A3F2A",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 11,
          color: "#4A3F2A",
          fontStyle: "italic",
        }}
      >
        {isSigned && signedAt
          ? `Signé le ${new Date(signedAt).toLocaleDateString("fr-FR")}`
          : caption}
      </div>
    </div>
  );
}

const uppercaseGold: React.CSSProperties = {
  textTransform: "uppercase",
  fontStyle: "normal",
  letterSpacing: 2,
  color: "#8B6F1F",
  fontWeight: 700,
};
