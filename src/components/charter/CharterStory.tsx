// =============================================================================
// CharterStory — template "Story" 9:16 dark luxury (2026-05-03)
//
// Reproduit pixel-perfect `charte-v2-story-instagram-v2.html` (validé Thomas).
// Format vertical 9:16 (1080×1920 quand exporté). Fond charcoal radial,
// 4 coins art déco mini, 1 swirl centré, médaillon L✦S, titre "Charte"
// 88px italic gold metallic + "Du Distributeur" subtitle, 3 engagements
// compact rows, 2 fields duo (pourquoi + objectif), signatures bottom.
//
// Pensé pour partage Instagram Story → export PNG 1080×1920 en commit 4/4.
// =============================================================================

import { forwardRef } from "react";
import type {
  CharterDisplayMode,
  CharterPersonInfo,
} from "../../types/charter";
import { CharterCornerArtDecoMini } from "./CharterCornerArtDecoMini";
import { CharterSwirlStory } from "./CharterSwirlStory";

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

export const CharterStory = forwardRef<HTMLDivElement, Props>(
  function CharterStory(
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
    const cosignerShort = cosigner.firstName
      ? `${cosigner.firstName} ${(cosigner.lastName ?? "").charAt(0)}.`.trim()
      : "Coach";

    return (
      <div
        ref={ref}
        className="ls-charter-story"
        style={{
          width: "100%",
          maxWidth: 450,
          aspectRatio: "9 / 16",
          margin: "0 auto",
          background:
            "radial-gradient(ellipse at 30% 15%, #2A2014 0%, #1A1410 35%, #0D0906 70%, #050302 100%)",
          position: "relative",
          overflow: "hidden",
          boxShadow:
            "0 50px 120px rgba(0, 0, 0, 0.7), 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(184, 146, 42, 0.3)",
          borderRadius: 14,
          color: "#FAF6E8",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Gold dust atmosphere overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(212, 169, 55, 0.10) 0%, transparent 25%), radial-gradient(circle at 82% 78%, rgba(212, 169, 55, 0.08) 0%, transparent 28%), radial-gradient(circle at 50% 50%, rgba(184, 146, 42, 0.04) 0%, transparent 60%)",
            pointerEvents: "none",
            zIndex: 1,
            borderRadius: 14,
          }}
        />

        {/* Bordure or fine intérieure */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 18,
            border: "1px solid #D4A937",
            borderRadius: 8,
            pointerEvents: "none",
            zIndex: 2,
            boxShadow:
              "inset 0 0 0 3px rgba(13, 9, 6, 0.6), inset 0 0 0 4px rgba(184, 146, 42, 0.3), 0 0 30px rgba(184, 146, 42, 0.12)",
          }}
        />

        {/* Coins art déco */}
        <CharterCornerArtDecoMini position="tl" />
        <CharterCornerArtDecoMini position="tr" />
        <CharterCornerArtDecoMini position="bl" />
        <CharterCornerArtDecoMini position="br" />

        {/* Tornade dorée centrale */}
        <CharterSwirlStory />

        {/* CONTENU */}
        <div
          style={{
            position: "relative",
            zIndex: 4,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            padding: "48px 38px 36px",
            justifyContent: "space-between",
          }}
        >
          {/* TOP */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 62,
                height: 62,
                margin: "0 auto 14px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle at 32% 28%, #FFF4D4 0%, #F5DEB3 18%, #D4A937 50%, #8B6F1F 90%, #5A4612 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Cinzel', serif",
                fontSize: 16,
                color: "#FFF8E0",
                fontWeight: 700,
                letterSpacing: 1.5,
                boxShadow:
                  "inset 0 -2px 4px rgba(90, 70, 18, 0.6), inset 0 2px 4px rgba(255, 244, 212, 0.5), inset 0 0 0 1.5px rgba(184, 146, 42, 0.7), 0 5px 16px rgba(184, 146, 42, 0.5), 0 1px 3px rgba(0, 0, 0, 0.4)",
                textShadow: "0 1px 2px rgba(90, 70, 18, 0.6)",
                position: "relative",
              }}
              aria-hidden="true"
            >
              L✦S
              <span
                style={{
                  position: "absolute",
                  inset: 3,
                  borderRadius: "50%",
                  border: "1px solid rgba(255, 244, 212, 0.4)",
                  pointerEvents: "none",
                }}
              />
            </div>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 9.5,
                letterSpacing: 5,
                color: "#D4A937",
                textTransform: "uppercase",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                margin: 0,
              }}
            >
              <span style={handleLine} aria-hidden="true" />
              Lor&apos;Squad Wellness
              <span style={handleLine} aria-hidden="true" />
            </p>
          </div>

          {/* HERO */}
          <div style={{ textAlign: "center", margin: "32px 0 24px" }}>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 9,
                letterSpacing: 6,
                color: "rgba(245, 222, 179, 0.55)",
                textTransform: "uppercase",
                fontWeight: 500,
                marginBottom: 12,
              }}
            >
              Engagement Distributeur
            </p>
            <h1
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 88,
                fontWeight: 700,
                fontStyle: "italic",
                backgroundImage:
                  "linear-gradient(180deg, #FFF4D4 0%, #F8DDA0 12%, #E5C476 28%, #D4A937 50%, #B8922A 75%, #8B6F1F 95%, #5A4612 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter:
                  "drop-shadow(0 1px 0 rgba(91, 68, 18, 0.95)) drop-shadow(0 2px 0 rgba(91, 68, 18, 0.7)) drop-shadow(0 3px 0 rgba(91, 68, 18, 0.4)) drop-shadow(0 6px 16px rgba(184, 146, 42, 0.45))",
                letterSpacing: -2,
                lineHeight: 0.9,
                margin: "0 0 6px 0",
              }}
            >
              Charte
            </h1>
            <p
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 11,
                letterSpacing: 7,
                color: "#F5DEB3",
                textTransform: "uppercase",
                fontWeight: 600,
                marginTop: 6,
              }}
            >
              Du Distributeur
            </p>
            <Ornament />
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 14,
                fontStyle: "italic",
                color: "rgba(245, 222, 179, 0.8)",
                textAlign: "center",
                lineHeight: 1.6,
                fontWeight: 500,
                padding: "0 14px",
                margin: 0,
              }}
            >
              Une signature transforme une intention en engagement.
              <br />
              C&apos;est une boussole. Tu la signes pour toi.
            </p>
          </div>

          {/* 3 ENGAGEMENTS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              margin: "26px 0",
            }}
          >
            <CommitRow icon="🤝" title="Éthique" desc="Intégrité, jamais de pression. Je présente, je laisse choisir." />
            <CommitRow icon="💪" title="Personnel" desc="Je consomme avant de vendre. Je suis l'exemple, pas l'expert." />
            <CommitRow icon="👥" title="Équipe" desc="Je soutiens ma lignée. Je transmets. Je célèbre les wins." />
          </div>

          {/* DUO POURQUOI + OBJECTIF */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              margin: "14px 0 22px",
            }}
          >
            <StoryFillField
              icon="🧡"
              label="Mon pourquoi"
              value={pourquoiText ?? ""}
              placeholder="Pourquoi je fais ça…"
              mode={mode}
              onChange={onPourquoiChange}
              variant="teal"
            />
            <StoryFillField
              icon="🎯"
              label="Objectif 12 mois"
              value={objectif12Mois ?? ""}
              placeholder="Cible chiffrée + humaine"
              mode={mode}
              onChange={onObjectifChange}
              variant="gold"
            />
          </div>

          {/* BOTTOM */}
          <div style={{ marginTop: "auto" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 18,
                paddingTop: 18,
                position: "relative",
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "75%",
                  height: 1,
                  background:
                    "linear-gradient(90deg, transparent, #D4A937 50%, transparent)",
                }}
              />
              <StorySign
                label="✦ Distributeur ✦"
                displayName={distriFirst}
                caption={distributeur.signedAt ? "Signé" : "En attente"}
                signatureDataUrl={distributeur.signatureDataUrl}
                signedAt={distributeur.signedAt}
                mode={mode}
                onSignClick={onSignClick}
              />
              <StorySign
                label="✦ Coach ✦"
                displayName={cosignerShort}
                caption={cosigner.role ?? "Fondateur"}
                signatureDataUrl={cosigner.signatureDataUrl}
                signedAt={cosigner.signedAt}
                mode={mode}
                onSignClick={onCosignClick}
                cursiveColor="#D4A937"
              />
            </div>

            {/* Footer brand */}
            <div
              style={{
                textAlign: "center",
                marginTop: 22,
                paddingTop: 14,
                borderTop: "1px solid rgba(184, 146, 42, 0.18)",
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 12,
                  letterSpacing: 5,
                  color: "#D4A937",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  textShadow: "0 0 14px rgba(184, 146, 42, 0.5)",
                  marginBottom: 5,
                  display: "block",
                }}
              >
                ✦ Lor&apos;Squad Wellness ✦
              </span>
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 8,
                  letterSpacing: 3,
                  color: "rgba(184, 146, 42, 0.7)",
                  textTransform: "uppercase",
                  fontWeight: 500,
                }}
              >
                Établi le {docDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

// ─── Sub-components ──────────────────────────────────────────────────────────

const handleLine: React.CSSProperties = {
  width: 32,
  height: 1,
  background: "linear-gradient(90deg, transparent, #D4A937 50%, transparent)",
  display: "inline-block",
};

function Ornament() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        margin: "14px 0 18px",
      }}
    >
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, #D4A937 50%, transparent)",
          flex: 1,
          maxWidth: 70,
        }}
      />
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          background: "#D4A937",
          transform: "rotate(45deg)",
          boxShadow: "0 0 8px rgba(184, 146, 42, 0.6)",
          display: "inline-block",
        }}
      />
      <span
        aria-hidden="true"
        style={{
          fontSize: 13,
          color: "#D4A937",
          textShadow: "0 0 12px rgba(184, 146, 42, 0.7)",
        }}
      >
        ✦
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          background: "#D4A937",
          transform: "rotate(45deg)",
          boxShadow: "0 0 8px rgba(184, 146, 42, 0.6)",
          display: "inline-block",
        }}
      />
      <div
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent, #D4A937 50%, transparent)",
          flex: 1,
          maxWidth: 70,
        }}
      />
    </div>
  );
}

function CommitRow({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "4px 6px" }}>
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 32% 28%, #FFF4D4 0%, #F5DEB3 18%, #D4A937 55%, #8B6F1F 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          flexShrink: 0,
          boxShadow:
            "inset 0 -2px 3px rgba(90, 70, 18, 0.5), inset 0 2px 3px rgba(255, 244, 212, 0.4), 0 3px 10px rgba(184, 146, 42, 0.4)",
          position: "relative",
        }}
        aria-hidden="true"
      >
        {icon}
        <span
          style={{
            position: "absolute",
            inset: 3,
            borderRadius: "50%",
            border: "1px solid rgba(255, 244, 212, 0.4)",
            pointerEvents: "none",
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 22,
            fontWeight: 700,
            color: "#F5DEB3",
            lineHeight: 1,
            marginBottom: 4,
            letterSpacing: 0.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11.5,
            lineHeight: 1.5,
            color: "rgba(245, 222, 179, 0.65)",
            fontWeight: 400,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function StoryFillField({
  icon,
  label,
  value,
  placeholder,
  mode,
  onChange,
  variant,
}: {
  icon: string;
  label: string;
  value: string;
  placeholder: string;
  mode: CharterDisplayMode;
  onChange?: (v: string) => void;
  variant: "gold" | "teal";
}) {
  return (
    <div
      style={{
        border:
          variant === "teal"
            ? "1px solid rgba(29, 158, 117, 0.4)"
            : "1px solid rgba(184, 146, 42, 0.35)",
        borderRadius: 6,
        padding: "14px 12px",
        textAlign: "center",
        background:
          variant === "teal"
            ? "rgba(29, 158, 117, 0.06)"
            : "rgba(212, 169, 55, 0.04)",
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 4 }} aria-hidden="true">
        {icon}
      </div>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 8,
          letterSpacing: 3,
          color: variant === "teal" ? "#6FD4AE" : "#D4A937",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        {label}
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
            fontSize: 11,
            color: "rgba(245, 222, 179, 0.85)",
            textAlign: "center",
            resize: "none",
            minHeight: 30,
          }}
        />
      ) : (
        <p
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            fontStyle: "italic",
            color: value ? "rgba(245, 222, 179, 0.85)" : "rgba(245, 222, 179, 0.4)",
            lineHeight: 1.4,
            margin: 0,
            minHeight: 30,
            whiteSpace: "pre-wrap",
          }}
        >
          {value || placeholder}
        </p>
      )}
    </div>
  );
}

function StorySign({
  label,
  displayName,
  caption,
  signatureDataUrl,
  signedAt,
  mode,
  onSignClick,
  cursiveColor = "#6FD4AE",
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
          fontSize: 7.5,
          letterSpacing: 3.5,
          color: "#D4A937",
          textTransform: "uppercase",
          fontWeight: 600,
          marginBottom: 8,
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
            maxHeight: 40,
            maxWidth: "85%",
            objectFit: "contain",
            filter: "drop-shadow(0 0 14px rgba(29, 158, 117, 0.4))",
          }}
        />
      ) : (
        <div
          onClick={canSign ? onSignClick : undefined}
          style={{
            fontFamily: "'Dancing Script', cursive",
            fontSize: 28,
            color: canSign ? cursiveColor : `${cursiveColor}59`,
            fontWeight: 600,
            lineHeight: 1,
            marginBottom: 4,
            textShadow: "0 0 14px rgba(29, 158, 117, 0.4)",
            cursor: canSign ? "pointer" : "default",
            fontStyle: "italic",
          }}
        >
          {displayName}
        </div>
      )}
      <div
        style={{
          width: "80%",
          height: 1,
          margin: "4px auto 6px",
          background: "rgba(184, 146, 42, 0.4)",
        }}
      />
      <div
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 9,
          color: "rgba(245, 222, 179, 0.6)",
          fontStyle: "italic",
        }}
      >
        {isSigned && signedAt
          ? new Date(signedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
          : caption}
      </div>
    </div>
  );
}
