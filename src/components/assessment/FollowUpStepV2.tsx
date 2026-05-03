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

import { type ReactNode } from "react";
import type {
  DecisionClient,
  TypeDeSuite,
  MessageALaisser,
  Objective,
} from "../../types/domain";
import { AssessmentSectionV2 } from "./AssessmentSectionV2";

export interface FollowUpStepV2Props {
  // Resume context
  objective: Objective;
  afterAssessmentAction: "started" | "pending";
  clientFirstName: string;
  // Form values
  decisionClient: DecisionClient | null;
  typeDeSuite: TypeDeSuite | null;
  messageALaisser: MessageALaisser | null;
  nextFollowUp: string;
  comment: string;
  // Setters
  onDecisionClient: (v: DecisionClient) => void;
  onTypeDeSuite: (v: TypeDeSuite) => void;
  onMessageALaisser: (v: MessageALaisser) => void;
  onNextFollowUp: (v: string) => void;
  onComment: (v: string) => void;
}

export function FollowUpStepV2({
  objective,
  afterAssessmentAction,
  clientFirstName,
  decisionClient,
  typeDeSuite,
  messageALaisser,
  nextFollowUp,
  comment,
  onDecisionClient,
  onTypeDeSuite,
  onMessageALaisser,
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
      {/* ─── 1. Mini-pill demarrage (discret en haut) ─── */}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: startsImmediately
              ? "color-mix(in srgb, var(--ls-teal) 12%, var(--ls-surface))"
              : "color-mix(in srgb, var(--ls-gold) 12%, var(--ls-surface))",
            border: `0.5px solid color-mix(in srgb, ${startsImmediately ? "var(--ls-teal)" : "var(--ls-gold)"} 40%, transparent)`,
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
            color: startsImmediately ? "var(--ls-teal)" : "var(--ls-gold)",
            letterSpacing: "0.04em",
          }}
        >
          <span aria-hidden="true">{startsImmediately ? "✦" : "⏸"}</span>
          {startsImmediately ? "Démarrage immédiat" : "À relancer plus tard"}
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

        {/* 2 promesses automatiques */}
        <div
          style={{
            position: "relative",
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <AutoActionCard
            emoji="📅"
            title="Ajouté à ton agenda"
            desc="Le RDV apparaît automatiquement dans ton calendrier Lor'Squad et tes rappels."
            color="var(--ls-teal)"
          />
          <AutoActionCard
            emoji="📲"
            title="Envoyé sur son téléphone"
            desc="Le client reçoit l'invitation et le lien d'accès à son espace après validation du bilan."
            color="var(--ls-gold)"
          />
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

      {/* ─── 3. Cadrage du suivi (3 ChoiceGroup compactes) ─── */}
      <AssessmentSectionV2
        emoji="🎯"
        eyebrow="Cadrage · ton du suivi"
        title="Comment on cadre la suite"
        description="Trois lectures rapides : où en est le client, comment on suit, et avec quel ton on revient."
        accent="gold"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {/* Decision */}
          <PillsGroup
            label="Décision client"
            options={[
              { value: "partant", label: "Partant", emoji: "🔥" },
              { value: "a_rassurer", label: "À rassurer", emoji: "🤝" },
              { value: "a_confirmer", label: "À confirmer", emoji: "💭" },
            ]}
            value={decisionClient}
            onChange={(v) => onDecisionClient(v as DecisionClient)}
          />
          <PillsGroup
            label="Type de suite"
            options={[
              { value: "rdv_fixe", label: "RDV fixe", emoji: "📅" },
              { value: "message_rappel", label: "Message rappel", emoji: "💬" },
              { value: "relance_douce", label: "Relance douce", emoji: "🌿" },
              { value: "suivi_libre", label: "Suivi libre", emoji: "🪶" },
            ]}
            value={typeDeSuite}
            onChange={(v) => onTypeDeSuite(v as TypeDeSuite)}
          />
          <PillsGroup
            label="Message à laisser"
            options={[
              { value: "simple", label: "Simple", emoji: "✨" },
              { value: "progressif", label: "Progressif", emoji: "📈" },
              { value: "cadre_clair", label: "Cadre clair", emoji: "🎯" },
            ]}
            value={messageALaisser}
            onChange={(v) => onMessageALaisser(v as MessageALaisser)}
          />
        </div>
        <p
          style={{
            fontSize: 11.5,
            color: "var(--ls-text-muted)",
            margin: 0,
            fontFamily: "DM Sans, sans-serif",
          }}
        >
          Ce choix affecte le statut du client dans ta base (actif / pas démarré / fragile).
        </p>
      </AssessmentSectionV2>

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
        padding: "14px 16px",
        borderRadius: 14,
        background: `color-mix(in srgb, ${color} 6%, var(--ls-surface))`,
        border: `0.5px solid color-mix(in srgb, ${color} 28%, var(--ls-border))`,
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 70%, var(--ls-bg)) 100%)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          boxShadow: `0 2px 8px color-mix(in srgb, ${color} 30%, transparent)`,
          flexShrink: 0,
        }}
      >
        {emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "Syne, serif",
            fontWeight: 700,
            fontSize: 13.5,
            color: "var(--ls-text)",
            letterSpacing: "-0.01em",
            marginBottom: 3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: 11.5,
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

function PillsGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; emoji: string }>;
  value: T | null;
  onChange: (v: T) => void;
}): ReactNode {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ls-text)",
          letterSpacing: "-0.005em",
        }}
      >
        {label}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`ls-pill${active ? " ls-pill--selected" : ""}`}
              style={{ fontSize: 12, padding: "6px 12px", gap: 4 }}
              aria-pressed={active}
            >
              <span aria-hidden="true" style={{ fontSize: 13 }}>
                {opt.emoji}
              </span>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
