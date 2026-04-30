// =============================================================================
// ClientVipExplainModal — modale pédagogique côté client app (PWA)
// =============================================================================
//
// Version simplifiée, vocabulaire client-friendly (pas de "distri", pas de
// script pitch). Explique :
//   1. Les 4 paliers (visuels)
//   2. Comment je gagne des points
//   3. Exemple concret (Sarah)
//   4. FAQ courte (3 questions)
//   5. CTA finaux (sandbox + inscription)
// =============================================================================

import { VIP_LEVELS } from "./useClientVip";

interface Props {
  onClose: () => void;
  onOpenSandbox?: () => void;
  onOpenSponsorLink?: () => void;
  coachHerbalifeId?: string | null;
  coachName?: string;
}

export function ClientVipExplainModal({
  onClose,
  onOpenSandbox,
  onOpenSponsorLink,
  coachHerbalifeId,
  coachName = "Coach",
}: Props) {
  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events -- Backdrop, ESC at dialog level
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
        fontFamily: "DM Sans, sans-serif",
      }}
      onClick={onClose}
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- stopPropagation only */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "linear-gradient(180deg, #FFFEF5 0%, #FFF 30%, #FFF 100%)",
          borderRadius: 18,
          maxWidth: 560,
          width: "100%",
          maxHeight: "92vh",
          overflowY: "auto",
          padding: 20,
          position: "relative",
          boxShadow: "0 20px 60px rgba(0,0,0,0.30)",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 36,
            height: 36,
            borderRadius: 10,
            background: "rgba(0,0,0,0.05)",
            border: "none",
            color: "#5C4A0F",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
            zIndex: 2,
          }}
        >
          ✕
        </button>

        {/* Hero */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 9,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: "#B8922A",
              fontWeight: 700,
              marginBottom: 4,
            }}
          >
            ⭐ Programme Client Privilégié
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontSize: 22,
              fontWeight: 700,
              color: "#5C4A0F",
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            Tes courses Herbalife,
            <br />
            jusqu&apos;à <span style={{ color: "#B8922A" }}>-42 % à vie</span> 🎁
          </h2>
          <p
            style={{
              fontSize: 13,
              color: "#5C4A0F",
              opacity: 0.75,
              lineHeight: 1.5,
              marginTop: 8,
            }}
          >
            4 paliers de remise. Plus tu fais découvrir Herbalife à ton
            entourage, plus ta remise grimpe. Et c&apos;est <strong>à vie</strong> :
            tu ne perds jamais ce que tu as gagné.
          </p>
        </div>

        {/* Les 4 paliers */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#888",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Les 4 paliers
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {VIP_LEVELS.filter((lv) => lv.level !== "none").map((lv) => (
              <div
                key={lv.level}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "11px 14px",
                  background: "#FFF",
                  border: `0.5px solid ${lv.color}40`,
                  borderLeft: `3px solid ${lv.color}`,
                  borderRadius: 12,
                }}
              >
                <div style={{ fontSize: 26, flexShrink: 0 }}>{lv.badge}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "Syne, serif",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#1F2937",
                    }}
                  >
                    {lv.label}{" "}
                    <span style={{ color: lv.color }}>-{lv.discount} %</span>
                  </div>
                  <div style={{ fontSize: 11, color: "#6B6B62", marginTop: 1 }}>
                    {clientHint(lv.level)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment je gagne des points */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#888",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Comment ça marche
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Step
              n="1"
              title="Tu commandes"
              text="Chaque produit Herbalife = des points. Plus tu commandes, plus tu cumules."
            />
            <Step
              n="2"
              title="Tu fais découvrir"
              text="Ton entourage s'inscrit avec ton ID sponsor. Leurs commandes te rapportent aussi des points (illimité, même les amis de tes amis)."
            />
            <Step
              n="3"
              title="Ta remise grimpe"
              text="Plus de points = palier supérieur = plus de remise. C'est automatique, c'est à vie."
            />
          </div>
        </div>

        {/* Exemple */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              padding: "14px 16px",
              background:
                "linear-gradient(135deg, rgba(255,254,245,0.8) 0%, rgba(252,229,193,0.4) 100%)",
              border: "0.5px solid rgba(184,146,42,0.30)",
              borderLeft: "3px solid #B8922A",
              borderRadius: 12,
              fontSize: 13,
              color: "#5C4A0F",
              lineHeight: 1.65,
            }}
          >
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "#B8922A",
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              Exemple : Sarah
            </div>
            <p style={{ margin: 0 }}>
              Sarah commence avec <strong>Bronze (-15 %)</strong> dès sa 1ère
              commande.
            </p>
            <p style={{ margin: "8px 0 0" }}>
              Elle parle d&apos;Herbalife à <strong>3 personnes</strong> (sa
              maman, une collègue, sa pote de running). Elles s&apos;inscrivent.
              En 1 mois, Sarah passe directement <strong>Gold (-35 %)</strong> 🥇
            </p>
            <p style={{ margin: "8px 0 0" }}>
              3 mois plus tard, son groupe est passionné → Sarah devient{" "}
              <strong>Ambassadrice (-42 %)</strong> 💎. Quasi gratuit !
            </p>
          </div>
        </div>

        {/* FAQ courte */}
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#888",
              fontWeight: 700,
              marginBottom: 8,
            }}
          >
            Tes questions
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Faq
              q="C'est gratuit ?"
              a="Tu paies un petit pack avantage (36,38 €) une seule fois pour activer ton compte (avec cadeaux : tablier, casque, blender). Ensuite ta remise s'applique automatiquement à toutes tes commandes."
            />
            <Faq
              q="Et si quelqu'un que j'ai recommandé arrête ?"
              a="Tu gardes tes points. Pour toujours. Aucun risque de perdre ton palier."
            />
            <Faq
              q="Comment je m'inscris ?"
              a={
                coachHerbalifeId
                  ? `Sur www.myherbalife.com avec l'ID sponsor de ${coachName} : ${coachHerbalifeId} + les 3 premières lettres de son nom. Ça prend 5 minutes.`
                  : `Sur www.myherbalife.com avec l'ID sponsor de ${coachName} (demande-le si tu ne l'as pas) + les 3 premières lettres de son nom.`
              }
            />
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onOpenSandbox ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSandbox();
              }}
              style={{
                width: "100%",
                padding: "14px 18px",
                background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
                color: "white",
                border: "none",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(186,117,23,0.40)",
              }}
            >
              🎮 Calcule ta remise potentielle
            </button>
          ) : null}
          {onOpenSponsorLink ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenSponsorLink();
              }}
              style={{
                width: "100%",
                padding: "14px 18px",
                background: "white",
                color: "#5C4A0F",
                border: "0.5px solid rgba(184,146,42,0.45)",
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                fontFamily: "Syne, serif",
                cursor: "pointer",
              }}
            >
              ✨ M&apos;inscrire (myherbalife.com)
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function clientHint(level: string): string {
  switch (level) {
    case "bronze":
      return "Dès ta 1ère commande";
    case "silver":
      return "100 points cumulés (toi + tes filleuls)";
    case "gold":
      return "500 points cumulés — top client";
    case "ambassador":
      return "1 000 points sur 3 mois — niveau premium";
    default:
      return "";
  }
}

function Step({ n, title, text }: { n: string; title: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)",
          color: "white",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "Syne, serif",
          fontWeight: 700,
          fontSize: 13,
          flexShrink: 0,
          boxShadow: "0 2px 8px rgba(186,117,23,0.25)",
        }}
      >
        {n}
      </div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 14,
            color: "#1F2937",
            marginBottom: 2,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 12.5, color: "#4B5563", lineHeight: 1.5 }}>
          {text}
        </div>
      </div>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details
      style={{
        padding: "10px 12px",
        background: "rgba(0,0,0,0.025)",
        border: "0.5px solid rgba(0,0,0,0.06)",
        borderRadius: 10,
      }}
    >
      <summary
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "#1F2937",
          cursor: "pointer",
        }}
      >
        {q}
      </summary>
      <p
        style={{
          fontSize: 12,
          color: "#4B5563",
          lineHeight: 1.55,
          margin: "8px 0 0",
        }}
      >
        {a}
      </p>
    </details>
  );
}
