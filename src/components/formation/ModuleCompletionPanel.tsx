// =============================================================================
// ModuleCompletionPanel — coquille validation pyramidale (2026-05-01)
//
// Affiche en bas de chaque page module /formation. Gere le workflow de
// validation cascade :
//   1. submit       — module termine, le distri clique "Soumettre validation"
//   2. pending      — en attente du sponsor N+1 (relais admin si > 48h)
//   3. validated    — valide (auto si quiz 100%, sinon par sponsor/admin)
//
// V0 = COQUILLE PURE : 3 etats visuels + props/callbacks. La logique
// metier (notif sponsor, cascade 48h, quiz auto-pass) sera branchee en
// Phase 3 quand la spec coaching pyramidal sera complete.
//
// Pattern visuel aligne sur GuideCompletionFooter et ParcoursLevelCard
// (Card + Button + var(--ls-*) + eyebrow-label).
// =============================================================================

import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

export type ModuleCompletionStatus = "submit" | "pending" | "validated";

export type ModuleValidationSource = "auto-quiz" | "sponsor" | "admin";

interface Props {
  /** Etat courant du module pour le user. */
  status: ModuleCompletionStatus;
  /** Titre du module (affiche dans le panel). */
  moduleTitle?: string;
  /** Si status=pending, depuis combien d heures le module est en attente. */
  pendingHours?: number;
  /** Si status=validated, qui a valide (auto/sponsor/admin). */
  validatedBy?: ModuleValidationSource;
  /** Si status=validated, ISO date de validation. */
  validatedAt?: string;
  /** Si status=validated, prenom du valideur (sponsor ou admin). */
  validatorName?: string;
  /** Click "Soumettre validation" (V0 = stub, branche en Phase 3). */
  onSubmit?: () => void | Promise<void>;
  /** Bouton secondaire optionnel ("Retour parcours" par defaut). */
  onBackToParcours?: () => void;
  /** Disable du bouton submit (pendant l upload, par ex). */
  submitting?: boolean;
}

export function ModuleCompletionPanel({
  status,
  moduleTitle,
  pendingHours,
  validatedBy,
  validatedAt,
  validatorName,
  onSubmit,
  onBackToParcours,
  submitting = false,
}: Props) {
  if (status === "validated") {
    return <ValidatedState
      moduleTitle={moduleTitle}
      validatedBy={validatedBy}
      validatedAt={validatedAt}
      validatorName={validatorName}
      onBackToParcours={onBackToParcours}
    />;
  }

  if (status === "pending") {
    return <PendingState
      moduleTitle={moduleTitle}
      pendingHours={pendingHours}
      onBackToParcours={onBackToParcours}
    />;
  }

  return <SubmitState
    moduleTitle={moduleTitle}
    onSubmit={onSubmit}
    onBackToParcours={onBackToParcours}
    submitting={submitting}
  />;
}

// ─── Etat 1 : SUBMIT ──────────────────────────────────────────────────────

function SubmitState({
  moduleTitle,
  onSubmit,
  onBackToParcours,
  submitting,
}: {
  moduleTitle?: string;
  onSubmit?: () => void | Promise<void>;
  onBackToParcours?: () => void;
  submitting: boolean;
}) {
  return (
    <Card className="space-y-3" style={{ marginTop: 32 }}>
      <p className="eyebrow-label">Validation pyramidale</p>
      <p
        style={{
          fontSize: 14,
          color: "var(--ls-text)",
          lineHeight: 1.5,
          fontWeight: 600,
        }}
      >
        Tu as termine{moduleTitle ? ` « ${moduleTitle} »` : " ce module"}.
      </p>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        Soumets ta validation : ton sponsor recevra une notification pour
        confirmer que tu maitrises le contenu. Si tu as fait le quiz avec
        100&nbsp;%, la validation sera automatique.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button
          onClick={() => void onSubmit?.()}
          disabled={submitting || !onSubmit}
        >
          {submitting ? "Envoi…" : "Soumettre la validation"}
        </Button>
        {onBackToParcours ? (
          <Button variant="secondary" onClick={onBackToParcours}>
            Retour au parcours
          </Button>
        ) : null}
      </div>
    </Card>
  );
}

// ─── Etat 2 : PENDING ─────────────────────────────────────────────────────

function PendingState({
  moduleTitle,
  pendingHours,
  onBackToParcours,
}: {
  moduleTitle?: string;
  pendingHours?: number;
  onBackToParcours?: () => void;
}) {
  const showRelayNotice = typeof pendingHours === "number" && pendingHours >= 48;
  return (
    <Card className="space-y-3" style={{ marginTop: 32 }}>
      <p className="eyebrow-label">En attente de validation</p>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "color-mix(in srgb, var(--ls-gold) 12%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-gold) 40%, transparent)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">⏳</span>
        <span>
          {moduleTitle ? `« ${moduleTitle} »` : "Ce module"} attend la
          validation de ton sponsor.
          {typeof pendingHours === "number" ? ` (${pendingHours} h)` : ""}
        </span>
      </div>
      {showRelayNotice ? (
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
          Pas de reponse depuis 48&nbsp;h : un admin Lor&apos;Squad va prendre
          le relais sous peu.
        </p>
      ) : (
        <p style={{ fontSize: 12, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
          Tu peux continuer ton parcours pendant ce temps. Tu seras notifie
          des que la validation est faite.
        </p>
      )}
      {onBackToParcours ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button variant="secondary" onClick={onBackToParcours}>
            Retour au parcours
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

// ─── Etat 3 : VALIDATED ───────────────────────────────────────────────────

function ValidatedState({
  moduleTitle,
  validatedBy,
  validatedAt,
  validatorName,
  onBackToParcours,
}: {
  moduleTitle?: string;
  validatedBy?: ModuleValidationSource;
  validatedAt?: string;
  validatorName?: string;
  onBackToParcours?: () => void;
}) {
  const sourceLabel = (() => {
    if (validatedBy === "auto-quiz") return "validation automatique (quiz 100%)";
    if (validatedBy === "admin") return `valide par ${validatorName ?? "un admin"}`;
    if (validatedBy === "sponsor") return `valide par ${validatorName ?? "ton sponsor"}`;
    return "valide";
  })();

  const dateLabel = validatedAt
    ? new Date(validatedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <Card className="space-y-3" style={{ marginTop: 32 }}>
      <p className="eyebrow-label">Module valide</p>
      <div
        style={{
          padding: "10px 12px",
          borderRadius: 10,
          background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
          border: "0.5px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
          color: "var(--ls-text)",
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span aria-hidden="true">✓</span>
        <span>
          {moduleTitle ? `« ${moduleTitle} » ` : "Ce module "}— {sourceLabel}
          {dateLabel ? ` le ${dateLabel}` : ""}.
        </span>
      </div>
      <p style={{ fontSize: 13, color: "var(--ls-text-muted)", lineHeight: 1.5 }}>
        Tu peux passer au module suivant ou refaire celui-ci si tu veux
        consolider.
      </p>
      {onBackToParcours ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={onBackToParcours}>Retour au parcours</Button>
        </div>
      ) : null}
    </Card>
  );
}
