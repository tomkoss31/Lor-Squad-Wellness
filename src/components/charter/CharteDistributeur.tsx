// =============================================================================
// CharteDistributeur — composant principal du document A4 (2026-05-03)
//
// Reproduit pixel-perfect le visuel HTML `charte-distributeur-premium.html`
// (livré par Thomas, validé). Structure A4 imprimable + 4 coins art déco
// + 2 swirls dorés + médaillons + 5 cards engagements + signatures.
//
// 3 modes :
//   - preview  : lecture seule (admin voit la charte d'un distri)
//   - fillable : édition active (le distri remplit + signe)
//   - print    : version optimisée pour PDF (sans hover, sans canvas modale)
// =============================================================================

import { forwardRef } from "react";
import type {
  CharterDisplayMode,
  CharterPersonInfo,
} from "../../types/charter";
import { CharterCornerArtDeco } from "./CharterCornerArtDeco";
import { CharterSwirlBackground } from "./CharterSwirlBackground";
import { CharterLeafWatermark } from "./CharterLeafWatermark";
import { CharterCachet } from "./CharterCachet";
import { CharterMedallion } from "./CharterMedallion";
import { CharterEngagementCard } from "./CharterEngagementCard";
import { CharterSignatureBlock } from "./CharterSignatureBlock";

interface Props {
  distributeur: CharterPersonInfo;
  cosigner: CharterPersonInfo;
  pourquoiText?: string;
  objectif12Mois?: string;
  /** Date affichée dans le footer ("Établi le …"). Default = signedAt sinon
   *  createdAt sinon today. */
  documentDate?: Date;
  mode: CharterDisplayMode;

  // Callbacks (mode fillable)
  onPourquoiChange?: (v: string) => void;
  onObjectifChange?: (v: string) => void;
  onSignClick?: () => void;
  onCosignClick?: () => void;
}

export const CharteDistributeur = forwardRef<HTMLDivElement, Props>(
  function CharteDistributeur(
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
    const distriFullName = `${distributeur.firstName} ${distributeur.lastName}`.trim();
    const cosignerFullName = `${cosigner.firstName} ${cosigner.lastName}`.trim();

    return (
      <div
        ref={ref}
        className="ls-charter-page"
        style={{
          width: "100%",
          maxWidth: 794,
          minHeight: 1123,
          margin: "0 auto",
          background:
            "linear-gradient(135deg, #FBF7E9 0%, #F5EDD3 50%, #F0E6CC 100%)",
          backgroundImage:
            "radial-gradient(circle at 18% 28%, rgba(184, 146, 42, 0.05) 0%, transparent 45%), radial-gradient(circle at 82% 72%, rgba(184, 146, 42, 0.06) 0%, transparent 50%), linear-gradient(135deg, #FBF7E9 0%, #F5EDD3 50%, #F0E6CC 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "0 40px 100px rgba(0, 0, 0, 0.6), 0 15px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(184, 146, 42, 0.2)",
          padding: "70px 75px 50px",
          fontFamily: "'DM Sans', sans-serif",
          color: "#2A2419",
        }}
      >
        {/* Bordure intérieure double or */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 28,
            border: "1px solid #B8922A",
            pointerEvents: "none",
            zIndex: 1,
            boxShadow:
              "inset 0 0 0 4px #FBF7E9, inset 0 0 0 5px rgba(184, 146, 42, 0.4)",
          }}
        />

        {/* Décors background */}
        <CharterSwirlBackground />
        <CharterLeafWatermark />

        {/* 4 coins art déco */}
        <CharterCornerArtDeco position="tl" />
        <CharterCornerArtDeco position="tr" />
        <CharterCornerArtDeco position="bl" />
        <CharterCornerArtDeco position="br" />

        {/* Cachet bottom-left */}
        <CharterCachet />

        {/* HEADER */}
        <div style={{ position: "relative", zIndex: 3, textAlign: "center", marginBottom: 36 }}>
          <CharterMedallion size="lg" />
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 11,
              letterSpacing: 5,
              color: "#8B6F1F",
              textTransform: "uppercase",
              fontWeight: 600,
              margin: "0 0 18px 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
            }}
          >
            <span style={overlineLine} />
            Lor&apos;Squad Wellness · Engagement Distributeur
            <span style={overlineLine} />
          </p>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 78,
              fontWeight: 700,
              backgroundImage:
                "linear-gradient(180deg, #F8DDA0 0%, #E5C476 18%, #D4A937 35%, #B8922A 55%, #8B6F1F 80%, #5A4612 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter:
                "drop-shadow(0 1px 0 rgba(122, 92, 14, 0.85)) drop-shadow(0 2px 0 rgba(122, 92, 14, 0.5)) drop-shadow(0 3px 0 rgba(122, 92, 14, 0.25)) drop-shadow(0 6px 12px rgba(0, 0, 0, 0.2))",
              letterSpacing: -1.5,
              lineHeight: 0.95,
              margin: "0 0 22px 0",
              fontStyle: "italic",
            }}
          >
            Charte du Distributeur
          </h1>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 17,
              fontStyle: "italic",
              color: "#4A3F2A",
              maxWidth: 540,
              margin: "0 auto",
              lineHeight: 1.65,
              fontWeight: 500,
              position: "relative",
              padding: "0 30px",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: -2,
                top: -8,
                fontSize: 36,
                color: "#B8922A",
                fontFamily: "'Cormorant Garamond', serif",
                lineHeight: 1,
              }}
            >
              «
            </span>
            Une signature transforme une intention en engagement. Cette charte
            n&apos;est pas un contrat, c&apos;est une boussole. Tu la signes
            pour toi.
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                right: -2,
                bottom: -18,
                fontSize: 36,
                color: "#B8922A",
                fontFamily: "'Cormorant Garamond', serif",
                lineHeight: 1,
              }}
            >
              »
            </span>
          </p>
        </div>

        {/* Diviseur ornement */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            margin: "26px 0 22px 0",
            position: "relative",
            zIndex: 3,
          }}
        >
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)", flex: 1, maxWidth: 140 }} />
          <span style={diamondStyle} aria-hidden="true" />
          <span style={{ fontSize: 14, color: "#B8922A" }} aria-hidden="true">✦</span>
          <span style={diamondStyle} aria-hidden="true" />
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)", flex: 1, maxWidth: 140 }} />
        </div>

        {/* CARDS ENGAGEMENTS */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <CharterEngagementCard
            mode={mode}
            icon="🤝"
            title="Engagement éthique"
            body="Je m'engage à représenter Lor'Squad et Herbalife avec intégrité — pas de promesses de revenus garantis, pas de pression commerciale, pas de jugement. Je présente l'opportunité, je laisse choisir."
          />
          <CharterEngagementCard
            mode={mode}
            icon="💪"
            title="Engagement personnel"
            body="Je consomme avant de vendre. Je suis l'exemple — pas l'expert. Je m'autorise à apprendre, à me tromper, à ajuster. Je traite mon activité comme une vraie entreprise."
          />
          <CharterEngagementCard
            mode={mode}
            icon="👥"
            title="Engagement équipe"
            body="Je soutiens ma lignée comme on soutient une équipe : sans paternalisme, sans abandon. Je transmets ce que j'apprends. Je célèbre les wins de mes recrues comme les miens."
          />
          <CharterEngagementCard
            mode={mode}
            variant="teal"
            icon="🧡"
            title="Mon « pourquoi »"
            hint="Pourquoi je fais ça. Ce que je veux changer pour moi, mes proches, ou ma vie."
            fillableValue={pourquoiText}
            fillablePlaceholder="Ex : retrouver une vraie vie de famille, aider d'autres femmes à se ré-aimer, sortir de la dépendance financière…"
            onFillableChange={onPourquoiChange}
          />
          <CharterEngagementCard
            mode={mode}
            icon="🎯"
            title="Mon objectif 12 mois"
            hint="Une cible chiffrée + une cible humaine. Sois précis·e."
            fillableValue={objectif12Mois}
            fillablePlaceholder="Ex : 30 clients actifs · 3 distributeurs en lignée · 1 500€/mois · rang Supervisor confirmé"
            onFillableChange={onObjectifChange}
          />
        </div>

        {/* SIGNATURES */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 50,
            marginTop: 28,
            paddingTop: 22,
          }}
        >
          {/* Ligne séparation */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "70%",
              height: 1,
              background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)",
            }}
          />
          <CharterSignatureBlock
            label="Signature distributeur"
            fullName={distriFullName}
            caption="Distributeur Lor'Squad"
            signatureDataUrl={distributeur.signatureDataUrl}
            signedAt={distributeur.signedAt}
            mode={mode}
            onSignClick={onSignClick}
          />
          <CharterSignatureBlock
            label="Signature coach"
            fullName={cosignerFullName || "En attente"}
            caption={cosigner.role ?? "Coach Lor'Squad"}
            signatureDataUrl={cosigner.signatureDataUrl}
            signedAt={cosigner.signedAt}
            mode={mode}
            onSignClick={onCosignClick}
            cursiveColor="#B8922A"
          />
        </div>

        {/* Co-fondateurs (statique) */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            textAlign: "center",
            marginTop: 24,
            paddingTop: 18,
            borderTop: "1px dashed rgba(184, 146, 42, 0.35)",
          }}
        >
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              letterSpacing: 3.5,
              color: "#8B6F1F",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            ✦ Co-fondateurs Lor&apos;Squad Wellness ✦
          </div>
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: 24,
              color: "#B8922A",
              fontWeight: 600,
              lineHeight: 1.1,
              fontStyle: "italic",
            }}
          >
            Mélanie &amp; Thomas Houbert
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 26,
          }}
        >
          <CharterMedallion size="sm" />
          <p
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 10,
              letterSpacing: 3,
              color: "#8B6F1F",
              textTransform: "uppercase",
              fontWeight: 500,
              margin: 0,
            }}
          >
            Établi le {docDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            <span style={{ color: "#B8922A", margin: "0 8px" }}>·</span>
            Lor&apos;Squad Wellness {docDate.getFullYear()}
          </p>
        </div>
      </div>
    );
  },
);

const overlineLine: React.CSSProperties = {
  width: 50,
  height: 1,
  background: "linear-gradient(90deg, transparent, #B8922A 50%, transparent)",
};

const diamondStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  background: "#B8922A",
  transform: "rotate(45deg)",
  display: "inline-block",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.15)",
};
