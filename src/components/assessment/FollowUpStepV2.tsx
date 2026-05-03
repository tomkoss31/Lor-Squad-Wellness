// =============================================================================
// FollowUpStepV2 — refonte etape 15 du bilan (2026-11-04)
//
// Avant : encart "Resume bilan" redondant avec etape precedente + 3
// ChoiceGroup nues + date picker plat. Pas de hierarchie. Pas de
// "promesse" d accompagnement.
//
// Apres :
//   1. Mini-pill demarrage discret en haut (juste l info utile)
//   2. HERO "Posons le prochain rendez-vous" : date picker premium +
//      2 cards visuelles (📅 Agenda coach + 📲 Envoye au client) qui
//      rassurent en montrant ce qui se passe automatiquement
//   3. Section "Cadrage du suivi" : 3 ChoiceGroup compactees dans une
//      AssessmentSectionV2
//   4. Section "Ce qui attend le client apres le RDV" : 5 mini-cards
//      icon avec la promesse d accompagnement adaptee a l objectif
//      (perte de poids vs prise de masse → contenus differents)
//   5. Commentaire libre (compact)
//
// Theme-aware total via var(--ls-*) + color-mix.
// =============================================================================

import type { TypeDeSuite, Objective } from "../../types/domain";
import { AssessmentSectionV2 } from "./AssessmentSectionV2";

export interface FollowUpStepV2Props {
  // Resume context
  objective: Objective;
  afterAssessmentAction: "started" | "pending";
  clientFirstName: string;
  // Form values
  typeDeSuite: TypeDeSuite | null;
  nextFollowUp: string;
  comment: string;
  // Setters
  onAfterAssessmentAction: (v: "started" | "pending") => void;
  onTypeDeSuite: (v: TypeDeSuite) => void;
  onNextFollowUp: (v: string) => void;
  onComment: (v: string) => void;
}

export function FollowUpStepV2({
  objective,
  afterAssessmentAction,
  clientFirstName,
  typeDeSuite,
  nextFollowUp,
  comment,
  onAfterAssessmentAction,
  onTypeDeSuite,
  onNextFollowUp,
  onComment,
}: FollowUpStepV2Props) {
  const isSport =
    objective === "sport" ||
    objective === "mass-gain" ||
    objective === "strength" ||
    objective === "cutting" ||
    objective === "endurance" ||
    objective === "fitness" ||
    objective === "competition";
  const startsImmediately = afterAssessmentAction === "started";
  const firstName = clientFirstName.trim() || "ton client";
  const suiviLibre = typeDeSuite === "suivi_libre";

  // Helper : auto-set typeDeSuite quand la decision change. Si "Demarrage
  // maintenant" -> rdv_fixe (pour creer un RDV ferme dans l agenda). Si
  // "A relancer plus tard" -> message_rappel (pour le lifecycle pending).
  // Le coach peut overrider depuis la fiche client si besoin (cycle de vie).
  function pickDecision(value: "started" | "pending") {
    onAfterAssessmentAction(value);
    if (value === "started" && typeDeSuite !== "rdv_fixe") {
      onTypeDeSuite("rdv_fixe");
    } else if (value === "pending" && typeDeSuite !== "message_rappel" && typeDeSuite !== "relance_douce") {
      onTypeDeSuite("message_rappel");
    }
  }

  // Promesse adaptee selon objectif
  const promises = isSport
    ? [
        { emoji: "📱", title: "Groupe Telegram Sport", desc: "Tips musculation, prise de masse, récup. Échange en direct avec coachs et autres sportifs.", color: "var(--ls-teal)" },
        { emoji: "🏋️", title: "Programme musculation perso", desc: "Routines adaptées à ton objectif et ta fréquence. Mises à jour selon ta progression.", color: "var(--ls-gold)" },
        { emoji: "🥩", title: "Recettes haute protéine", desc: "Ebook + recettes hebdo pour tenir tes apports sans effort, à la maison ou nomade.", color: "var(--ls-purple)" },
        { emoji: "👥", title: "Communauté motivée", desc: "Squad de pratiquants au même niveau d'engagement. Le bon entourage change tout.", color: "var(--ls-coral)" },
        { emoji: "🚀", title: "Suivi 24/7", desc: "Une question ? Un doute sur un exercice ou une recette ? Réponse rapide via Telegram.", color: "var(--ls-teal)" },
      ]
    : [
        { emoji: "📱", title: "Groupe Telegram Communauté", desc: "Tips perte de poids, motivation, retours d'autres clientes. Tu n'es jamais seul·e.", color: "var(--ls-teal)" },
        { emoji: "📖", title: "Ebook recettes minceur", desc: "Recettes simples, savoureuses, équilibrées. Fini la corvée de \"qu'est-ce que je mange ?\"", color: "var(--ls-gold)" },
        { emoji: "💡", title: "Conseils quotidiens", desc: "Un message court chaque jour pour garder le cap : motivation, astuce, rappel routine.", color: "var(--ls-purple)" },
        { emoji: "👥", title: "Communauté bienveillante", desc: "Les bonnes personnes au bon moment. Témoignages, partages, encouragements.", color: "var(--ls-coral)" },
        { emoji: "🚀", title: "Suivi 24/7", desc: "Une fringale, un doute, un coup de mou ? Ton coach répond, et le groupe aussi.", color: "var(--ls-teal)" },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ─── 1. Decision du jour (validation en haut, pattern etape 11) ─── */}
      <div
        style={{
          padding: "20px 22px",
          borderRadius: 18,
          background: "var(--ls-surface)",
          border: "0.5px solid var(--ls-border)",
          borderLeft: "3px solid var(--ls-purple)",
          transition: "box-shadow 0.2s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                fontWeight: 700,
                color: "var(--ls-purple)",
                fontFamily: "DM Sans, sans-serif",
                marginBottom: 6,
              }}
            >
              ✦ Décision du jour
            </div>
            <div
              style={{
                fontFamily: "Syne, serif",
                fontWeight: 700,
                fontSize: 16,
                color: "var(--ls-text)",
                letterSpacing: "-0.012em",
                lineHeight: 1.2,
              }}
            >
              {firstName} démarre maintenant ou revient plus tard ?
            </div>
          </div>
          <div
            style={{
              padding: "5px 12px",
              borderRadius: 999,
              background: startsImmediately
                ? "color-mix(in srgb, var(--ls-teal) 16%, transparent)"
                : "color-mix(in srgb, var(--ls-gold) 16%, transparent)",
              border: `0.5px solid color-mix(in srgb, ${startsImmediately ? "var(--ls-teal)" : "var(--ls-gold)"} 40%, transparent)`,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "DM Sans, sans-serif",
              color: startsImmediately ? "var(--ls-teal)" : "var(--ls-gold)",
              textTransform: "uppercase",
              letterSpacing: 1.2,
            }}
          >
            {startsImmediately ? "Démarrage maintenant" : "À relancer"}
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {[
            {
              value: "started" as const,
              label: "Démarrage maintenant",
              subtitle: "Le programme commence aujourd'hui",
              emoji: "🚀",
              color: "#2DD4BF",
            },
            {
              value: "pending" as const,
              label: "À relancer plus tard",
              subtitle: "Bilan sans démarrage immédiat",
              emoji: "⏳",
              color: "#A78BFA",
            },
          ].map((opt) => {
            const isActive = afterAssessmentAction === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => pickDecision(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 14,
                  cursor: "pointer",
                  fontFamily: "DM Sans, sans-serif",
                  textAlign: "left",
                  background: isActive
                    ? `linear-gradient(135deg, color-mix(in srgb, ${opt.color} 14%, var(--ls-surface)) 0%, var(--ls-surface) 100%)`
                    : "var(--ls-surface)",
                  border: isActive ? `0.5px solid ${opt.color}` : "0.5px solid var(--ls-border)",
                  boxShadow: isActive
                    ? `0 4px 14px -6px ${opt.color}66, inset 0 0 0 1px ${opt.color}40`
                    : "none",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.borderColor = `color-mix(in srgb, ${opt.color} 40%, var(--ls-border))`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.borderColor = "var(--ls-border)";
                  }
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    flexShrink: 0,
                    borderRadius: 12,
                    background: isActive
                      ? `linear-gradient(135deg, ${opt.color} 0%, color-mix(in srgb, ${opt.color} 70%, #000) 100%)`
                      : `linear-gradient(135deg, color-mix(in srgb, ${opt.color} 18%, var(--ls-surface2)) 0%, var(--ls-surface2) 100%)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    border: isActive ? "none" : `0.5px solid color-mix(in srgb, ${opt.color} 28%, transparent)`,
                    boxShadow: isActive
                      ? `0 4px 12px -4px ${opt.color}80, inset 0 1px 0 rgba(255,255,255,0.20)`
                      : "none",
                    transition: "background 0.2s ease, transform 0.2s ease",
                  }}
                >
                  {opt.emoji}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 700,
                      color: isActive ? opt.color : "var(--ls-text)",
                      fontFamily: "Syne, serif",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {opt.label}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--ls-text-muted)",
                      marginTop: 3,
                      lineHeight: 1.4,
                    }}
                  >
                    {opt.subtitle}
                  </div>
                </div>
                {/* Check radio premium */}
                <div
                  style={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: 999,
                    border: isActive ? `2px solid ${opt.color}` : "1.5px solid var(--ls-border)",
                    background: isActive ? opt.color : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                  }}
                >
                  {isActive && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 2. HERO : Posons le prochain rendez-vous ─── */}
      <div
        style={{
          position: "relative",
          padding: "26px 28px 28px",
          borderRadius: 22,
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ls-gold) 8%, var(--ls-surface)) 0%, color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface)) 100%)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, var(--ls-border))",
          boxShadow: "0 8px 28px -16px color-mix(in srgb, var(--ls-gold) 35%, transparent)",
          overflow: "hidden",
        }}
      >
        {/* Glow ambient */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--ls-gold) 16%, transparent)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ position: "relative", textAlign: "center", marginBottom: 22 }}>
          <div
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-gold)",
              marginBottom: 8,
            }}
          >
            ✦ Le moment décisif
          </div>
          <h2
            style={{
              fontFamily: "Syne, serif",
              fontWeight: 800,
              fontSize: "clamp(22px, 3vw, 30px)",
              letterSpacing: "-0.025em",
              lineHeight: 1.1,
              color: "var(--ls-text)",
              margin: 0,
            }}
          >
            Posons le prochain{" "}
            <span
              style={{
                background: "linear-gradient(90deg, var(--ls-gold) 0%, var(--ls-teal) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              rendez-vous
            </span>
          </h2>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "var(--ls-text-muted)",
              margin: "10px auto 0",
              maxWidth: 520,
            }}
          >
            Sans suite, pas de transformation. {firstName} repart avec une date claire et toi avec un cap.
          </p>
        </div>

        {/* Date picker premium */}
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            padding: "18px 20px",
            borderRadius: 16,
            background: "var(--ls-surface)",
            border: "1px solid var(--ls-border)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden="true" style={{ fontSize: 16 }}>📅</span>
            <label
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--ls-text)",
              }}
            >
              {suiviLibre ? "Prochain rendez-vous (facultatif)" : "Date et heure du prochain RDV"}
            </label>
          </div>
          <input
            type="datetime-local"
            value={nextFollowUp}
            onChange={(e) => onNextFollowUp(e.target.value)}
            disabled={suiviLibre}
            className="ls-input-time"
            style={{
              fontSize: 16,
              fontWeight: 600,
              padding: "12px 14px",
            }}
          />
        </div>

        {/* Section "Ce qui se passe quand tu valides" — accent agenda renforcé */}
        <div style={{ position: "relative", marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
              fontFamily: "DM Sans, sans-serif",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ls-text-muted)",
            }}
          >
            <span
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ls-gold) 30%, transparent) 50%, transparent 100%)",
              }}
            />
            <span>✦ Ce qui se passe automatiquement</span>
            <span
              style={{
                flex: 1,
                height: 1,
                background:
                  "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--ls-gold) 30%, transparent) 50%, transparent 100%)",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            <AutoActionCard
              emoji="📅"
              eyebrow="Côté coach"
              title="Ajouté à ton agenda"
              desc="Le RDV apparaît dans ton calendrier Lor'Squad. Rappel push 30 min avant. Tu n'as rien à reprogrammer."
              color="var(--ls-teal)"
            />
            <AutoActionCard
              emoji="📲"
              eyebrow="Côté client"
              title="Invitation envoyée"
              desc={`${firstName} reçoit la date par notification + l'accès à son espace personnel après validation du bilan.`}
              color="var(--ls-gold)"
            />
          </div>
        </div>

        {suiviLibre ? (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 12,
              background: "color-mix(in srgb, var(--ls-gold) 8%, transparent)",
              border: "0.5px solid color-mix(in srgb, var(--ls-gold) 30%, transparent)",
              fontSize: 12,
              color: "var(--ls-text)",
              lineHeight: 1.5,
              position: "relative",
            }}
          >
            <strong style={{ color: "var(--ls-gold)" }}>✦ Suivi libre sélectionné.</strong>{" "}
            Ce client sera actif mais sans rappel automatique. Tu pourras le rebasculer en suivi planifié depuis sa fiche.
          </div>
        ) : null}
      </div>

      {/* ─── 3. Cadrage supprime (2026-11-04 v2) — redondant avec Decision du
              jour. typeDeSuite + decisionClient + messageALaisser sont
              maintenant gerees automatiquement (cf. logique d auto-set
              dans le caller) ou via le commentaire libre.
              Si besoin de re-exposer ces 3 champs, voir commit 67b7e56. */}

      {/* ─── 4. Promesse d accompagnement (adaptee objectif) ─── */}
      <AssessmentSectionV2
        emoji={isSport ? "🏋️" : "💛"}
        eyebrow={isSport ? "Suivi · communauté sport" : "Suivi · accompagnement complet"}
        title={`Voilà ce qui ${isSport ? "attend" : "attend"} ${firstName}`}
        description={`Le RDV est posé. Mais l'accompagnement Lor'Squad ne s'arrête pas là — voilà tout ce qui ${isSport ? "soutient un sportif" : "soutient une transformation"} entre les bilans.`}
        accent={isSport ? "purple" : "gold"}
      >
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          }}
        >
          {promises.map((p) => (
            <PromiseCard
              key={p.title}
              emoji={p.emoji}
              title={p.title}
              desc={p.desc}
              color={p.color}
            />
          ))}
        </div>
      </AssessmentSectionV2>

      {/* ─── 5. Commentaire libre (compact) ─── */}
      <AssessmentSectionV2
        emoji="📝"
        eyebrow="Optionnel"
        title="Une note à toi-même pour ce RDV ?"
        description="Un détail à retenir, un ton à reprendre, un point à creuser. Visible seulement par toi."
        accent="neutral"
      >
        <textarea
          value={comment}
          onChange={(e) => onComment(e.target.value)}
          placeholder="Ex : Très motivée mais s'épuise vite, prévoir une relance douce le J+10."
          rows={3}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 12,
            background: "var(--ls-input-bg)",
            border: "1px solid var(--ls-border)",
            color: "var(--ls-text)",
            fontFamily: "DM Sans, sans-serif",
            fontSize: 13.5,
            resize: "vertical",
            lineHeight: 1.5,
          }}
        />
      </AssessmentSectionV2>
    </div>
  );
}

// ─── Sous-composants ────────────────────────────────────────────────────────

function AutoActionCard({
  emoji,
  eyebrow,
  title,
  desc,
  color,
}: {
  emoji: string;
  eyebrow: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "18px 18px 16px",
        borderRadius: 16,
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, var(--ls-surface)) 0%, color-mix(in srgb, ${color} 4%, var(--ls-surface)) 100%)`,
        border: `0.5px solid color-mix(in srgb, ${color} 32%, var(--ls-border))`,
        boxShadow: `0 6px 18px -10px color-mix(in srgb, ${color} 35%, transparent)`,
        display: "flex",
        gap: 14,
        alignItems: "flex-start",
        position: "relative",
        overflow: "hidden",
        transition:
          "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.boxShadow = `0 10px 24px -10px color-mix(in srgb, ${color} 50%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "none";
        e.currentTarget.style.boxShadow = `0 6px 18px -10px color-mix(in srgb, ${color} 35%, transparent)`;
      }}
    >
      {/* Glow décoratif */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: "50%",
          background: `color-mix(in srgb, ${color} 22%, transparent)`,
          filter: "blur(32px)",
          pointerEvents: "none",
        }}
      />
      {/* Icône premium */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, var(--ls-bg)) 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          boxShadow: `0 4px 14px color-mix(in srgb, ${color} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.30)`,
          flexShrink: 0,
          position: "relative",
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0, position: "relative" }}>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 9.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: color,
            marginBottom: 4,
          }}
        >
          {eyebrow}
        </div>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--ls-text)",
            letterSpacing: "-0.012em",
            marginBottom: 5,
            lineHeight: 1.18,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 12,
            color: "var(--ls-text-muted)",
            lineHeight: 1.5,
          }}
        >
          {desc}
        </div>
      </div>
    </div>
  );
}

function PromiseCard({
  emoji,
  title,
  desc,
  color,
}: {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div
      style={{
        padding: "16px 16px 14px",
        borderRadius: 14,
        background: "var(--ls-surface)",
        border: `0.5px solid color-mix(in srgb, ${color} 18%, var(--ls-border))`,
        boxShadow: `0 4px 12px -8px color-mix(in srgb, ${color} 25%, transparent)`,
        transition:
          "transform 240ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 240ms cubic-bezier(0.4, 0, 0.2, 1), border-color 240ms ease",
        cursor: "default",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-2px)";
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 40%, var(--ls-border))`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.borderColor = `color-mix(in srgb, ${color} 18%, var(--ls-border))`;
      }}
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 12,
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 14%, var(--ls-surface2)) 0%, color-mix(in srgb, ${color} 6%, var(--ls-surface2)) 100%)`,
          border: `0.5px solid color-mix(in srgb, ${color} 30%, var(--ls-border))`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          marginBottom: 12,
        }}
      >
        {emoji}
      </div>
      <div
        style={{
          fontFamily: "Syne, serif",
          fontWeight: 700,
          fontSize: 14,
          color: "var(--ls-text)",
          letterSpacing: "-0.012em",
          marginBottom: 4,
          lineHeight: 1.2,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          color: "var(--ls-text-muted)",
          lineHeight: 1.5,
        }}
      >
        {desc}
      </div>
    </div>
  );
}

// PillsGroup supprime (2026-11-04 v2) — bloc cadrage retire.
