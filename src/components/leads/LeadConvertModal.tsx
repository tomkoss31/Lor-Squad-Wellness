// =============================================================================
// LeadConvertModal — "sandbox" de conversion Lead online → fiche client.
// Chantier #3 étape 3.1 (2026-06-03).
//
// Le bilan online est léger : on pré-remplit ce qu'on a (prénom, contact,
// âge, taille, ville, objectif mappé) et le coach complète le manquant.
// Obligatoire : nom + sexe (décision Thomas 2026-06-03). Optionnel : poids
// (active le protocole de suivi), programme, "démarre maintenant", notes.
//
// À la validation : createClientWithInitialAssessment (même fonction que le
// bilan présentiel, payload MINIMAL via buildEmptyQuestionnaire) puis
// onConverted(clientId) marque le lead converti. État succès → "Ouvrir la
// fiche". Le coach complétera un vrai bilan (body scan, produits) plus tard.
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import type { OnlineBilanRow } from "../../hooks/useOnlineBilans";
import type { AssessmentRecord, BiologicalSex, Objective } from "../../types/domain";
import {
  buildEmptyBodyScan,
  buildEmptyQuestionnaire,
  mapOnlineObjective,
  objectiveLabel,
} from "../../lib/leadConversion";
import { ClientAccessModal } from "../client/ClientAccessModal";

interface Props {
  bilan: OnlineBilanRow;
  onClose: () => void;
  /** Marque le lead converti en DB (hook useOnlineBilans.convertLead). */
  onConverted: (clientId: string) => Promise<void> | void;
}

const OBJECTIVE_OPTIONS: Objective[] = [
  "weight-loss",
  "sport",
  "mass-gain",
  "strength",
  "cutting",
  "endurance",
  "fitness",
  "competition",
];

export function LeadConvertModal({ bilan, onClose, onConverted }: Props) {
  const navigate = useNavigate();
  const { createClientWithInitialAssessment, currentUser, users } = useAppContext();
  const { push: pushToast } = useToast();

  const [lastName, setLastName] = useState("");
  const [sex, setSex] = useState<BiologicalSex | "">("");
  const [objective, setObjective] = useState<Objective>(
    () => mapOnlineObjective(bilan.objectives),
  );
  const [weightStr, setWeightStr] = useState("");
  const [programTitle, setProgramTitle] = useState("");
  const [startsImmediately, setStartsImmediately] = useState(false);
  const [notes, setNotes] = useState(bilan.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [createdClientId, setCreatedClientId] = useState<string | null>(null);
  const [showAccess, setShowAccess] = useState(false);

  // Distributeur : le coach assigné au lead, sinon celui qui convertit.
  const distributorId =
    bilan.assigned_to_user_id ?? bilan.coach_user_id ?? currentUser?.id ?? "";
  const distributorName = useMemo(() => {
    const u = users.find((x) => x.id === distributorId);
    return u?.name ?? currentUser?.name ?? "La Base 360";
  }, [users, distributorId, currentUser]);

  const canSubmit = lastName.trim().length > 0 && sex !== "" && !submitting;

  async function handleSubmit() {
    // Garde directe sur l'union (pas via canSubmit : TS narrow les conditions
    // aliasées et croit alors sex déjà réduit à BiologicalSex → TS2367).
    if (submitting || sex === "" || lastName.trim().length === 0) return;
    setSubmitting(true);
    try {
      const now = new Date();
      const assessmentDate = now.toISOString();
      const weight = Number.parseFloat(weightStr.replace(",", "."));
      const hasWeight = Number.isFinite(weight) && weight > 0;
      const objLabel = objectiveLabel(objective);

      // Cible de poids si on connaît le poids actuel + l'objectif de perte.
      const targetWeight =
        hasWeight && bilan.weight_loss_target_kg
          ? Math.max(0, weight - bilan.weight_loss_target_kg)
          : undefined;

      const summary = `Fiche créée depuis le bilan online (objectif : ${objLabel.toLowerCase()}).`;

      const assessment: AssessmentRecord = {
        id: `a-${now.getTime()}`,
        date: assessmentDate,
        type: "initial",
        objective,
        programTitle: programTitle.trim(),
        summary,
        notes: notes.trim() || summary,
        bodyScan: buildEmptyBodyScan(hasWeight ? weight : 0),
        questionnaire: buildEmptyQuestionnaire({
          objectiveFocus: objLabel,
          motivation: bilan.motivation_score ?? 0,
          ...(targetWeight !== undefined ? { targetWeight } : {}),
        }),
        pedagogicalFocus: ["Hydratation", "Routine matin", "Assiette équilibrée"],
        coachNotesInitial: notes.trim() || null,
      };

      // RDV "prise de contact" à J+3 (comportement normal de l'app : une
      // fiche a toujours un prochain suivi). Le coach peut le replanifier.
      const nextFollowUp = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

      const clientId = await createClientWithInitialAssessment({
        client: {
          firstName: bilan.first_name.trim(),
          lastName: lastName.trim(),
          sex,
          phone: bilan.phone?.trim() ?? "",
          email: bilan.email?.trim().toLowerCase() ?? "",
          age: bilan.age ?? 0,
          birthDate: null,
          height: bilan.height_cm ?? 0,
          job: "Non renseigné",
          city: bilan.city?.trim() || undefined,
          distributorId,
          distributorName,
          objective,
        },
        assessment,
        clientStatus: startsImmediately ? "active" : "pending",
        currentProgram: programTitle.trim(),
        started: startsImmediately,
        nextFollowUp,
        followUpType: "Prise de contact",
        followUpStatus: "scheduled",
        notes:
          notes.trim() ||
          "Lead online converti en fiche. Bilan complet (body scan, produits) à compléter.",
        afterAssessmentAction: startsImmediately ? "started" : "pending",
      });

      await onConverted(clientId);
      setCreatedClientId(clientId);
      pushToast({ tone: "success", title: `Fiche de ${bilan.first_name} créée ✓` });
    } catch (err) {
      pushToast(
        buildSupabaseErrorToast(err, "Impossible de créer la fiche client."),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lcm-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <style>{STYLES}</style>
      <div className="lcm-panel" onClick={(e) => e.stopPropagation()}>
        <button className="lcm-close" onClick={onClose} aria-label="Fermer">×</button>

        {createdClientId ? (
          // ─── État succès ───────────────────────────────────────────────
          <div className="lcm-success">
            <div className="lcm-success-emoji" aria-hidden="true">🎉</div>
            <h2 className="lcm-success-title">Fiche créée</h2>
            <p className="lcm-success-text">
              La fiche de <strong>{bilan.first_name} {lastName.trim()}</strong> est
              dans ta base. Complète le bilan (body scan, produits) et partage
              l'accès à l'app client depuis la fiche.
            </p>
            <div className="lcm-actions">
              <button
                type="button"
                className="lcm-primary"
                onClick={() => navigate(`/clients/${createdClientId}`)}
              >
                Ouvrir la fiche →
              </button>
              <button
                type="button"
                className="lcm-secondary"
                onClick={() => setShowAccess(true)}
              >
                📲 Partager l'app client
              </button>
              <button type="button" className="lcm-ghost" onClick={onClose}>
                Retour aux leads
              </button>
            </div>

            <ClientAccessModal
              open={showAccess}
              onClose={() => setShowAccess(false)}
              clientId={createdClientId}
              clientFirstName={bilan.first_name}
              clientLastName={lastName.trim()}
              clientPhone={bilan.phone}
              clientEmail={bilan.email}
            />
          </div>
        ) : (
          // ─── Formulaire sandbox ────────────────────────────────────────
          <>
            <div className="lcm-header">
              <div className="lcm-eyebrow">✅ Valider le bilan · créer la fiche</div>
              <h2 className="lcm-title">{bilan.first_name}</h2>
              <p className="lcm-meta">
                On reprend ses infos du bilan online — complète le nom et le
                sexe (obligatoires), le reste est optionnel.
              </p>
            </div>

            {/* Récap pré-rempli (lecture seule) */}
            <div className="lcm-recap">
              {bilan.age != null && <span className="lcm-chip">🎂 {bilan.age} ans</span>}
              {bilan.height_cm != null && <span className="lcm-chip">📏 {bilan.height_cm} cm</span>}
              {bilan.city && <span className="lcm-chip">📍 {bilan.city}</span>}
              {bilan.phone && <span className="lcm-chip">📞 {bilan.phone}</span>}
              {bilan.email && <span className="lcm-chip">📧 {bilan.email}</span>}
            </div>

            <div className="lcm-grid">
              <label className="lcm-field">
                <span className="lcm-label">Nom <span className="lcm-req">*</span></span>
                <input
                  className="lcm-input"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Nom de famille"
                  autoFocus
                />
              </label>

              <div className="lcm-field">
                <span className="lcm-label">Sexe <span className="lcm-req">*</span></span>
                <div className="lcm-seg">
                  <button
                    type="button"
                    className={`lcm-seg-btn${sex === "female" ? " is-active" : ""}`}
                    onClick={() => setSex("female")}
                  >
                    Femme
                  </button>
                  <button
                    type="button"
                    className={`lcm-seg-btn${sex === "male" ? " is-active" : ""}`}
                    onClick={() => setSex("male")}
                  >
                    Homme
                  </button>
                </div>
              </div>

              <label className="lcm-field">
                <span className="lcm-label">Objectif</span>
                <select
                  className="lcm-input"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value as Objective)}
                >
                  {OBJECTIVE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{objectiveLabel(o)}</option>
                  ))}
                </select>
              </label>

              <label className="lcm-field">
                <span className="lcm-label">Poids actuel (kg)</span>
                <input
                  className="lcm-input"
                  type="number"
                  inputMode="decimal"
                  value={weightStr}
                  onChange={(e) => setWeightStr(e.target.value)}
                  placeholder="optionnel"
                />
                <span className="lcm-hint">Renseigné → active le suivi J+1/3/7/10.</span>
              </label>

              <label className="lcm-field lcm-field-wide">
                <span className="lcm-label">Programme</span>
                <input
                  className="lcm-input"
                  value={programTitle}
                  onChange={(e) => setProgramTitle(e.target.value)}
                  placeholder="optionnel — ex. Programme Découverte"
                />
              </label>
            </div>

            <label className="lcm-toggle">
              <input
                type="checkbox"
                checked={startsImmediately}
                onChange={(e) => setStartsImmediately(e.target.checked)}
              />
              <span>
                <strong>Démarre maintenant</strong>
                <span className="lcm-hint"> — client actif tout de suite (sinon « à confirmer »).</span>
              </span>
            </label>

            <label className="lcm-field lcm-field-wide">
              <span className="lcm-label">Notes coach</span>
              <textarea
                className="lcm-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Contexte, ce qu'il faut retenir du lead…"
              />
            </label>

            <div className="lcm-actions">
              <button
                type="button"
                className="lcm-primary"
                disabled={!canSubmit}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Création…" : "Créer la fiche client"}
              </button>
              <button type="button" className="lcm-ghost" onClick={onClose}>
                Annuler
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const STYLES = `
  .lcm-backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.6);
    backdrop-filter: blur(4px); z-index: 1100;
    display: flex; align-items: flex-end; justify-content: center; padding: 0;
    animation: lcm-fade 180ms ease-out;
  }
  @keyframes lcm-fade { from { opacity: 0; } to { opacity: 1; } }
  .lcm-panel {
    position: relative; background: var(--ls-surface, #fff); color: var(--ls-text, #0F172A);
    width: 100%; max-width: 540px; max-height: 92vh; overflow-y: auto;
    border-radius: 20px 20px 0 0; padding: 26px 22px;
    box-shadow: 0 -10px 40px rgba(15,23,42,0.18);
    animation: lcm-slide 260ms cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes lcm-slide { from { transform: translateY(40px); } to { transform: translateY(0); } }
  @media (min-width: 640px) {
    .lcm-backdrop { align-items: center; padding: 32px; }
    .lcm-panel { border-radius: 20px; }
  }
  .lcm-close {
    position: absolute; top: 12px; right: 12px; width: 36px; height: 36px;
    border-radius: 50%; border: none; background: rgba(0,0,0,0.05);
    color: var(--ls-text, #0F172A); font-size: 22px; cursor: pointer; line-height: 1;
  }
  .lcm-close:hover { background: rgba(0,0,0,0.10); }
  .lcm-header { padding-right: 40px; margin-bottom: 14px; }
  .lcm-eyebrow {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--ls-teal, #0D9488); margin-bottom: 6px;
  }
  .lcm-title { font-family: 'Syne', 'Inter', sans-serif; font-size: 22px; font-weight: 700; margin: 0; }
  .lcm-meta { font-size: 13px; color: var(--ls-text-muted, #6B7280); margin: 6px 0 0; line-height: 1.45; }

  .lcm-recap { display: flex; flex-wrap: wrap; gap: 6px; margin: 14px 0 18px; }
  .lcm-chip {
    background: var(--ls-surface2, #F9FAFB); border: 1px solid var(--ls-border, #E5E7EB);
    color: var(--ls-text-muted, #4B5563); padding: 4px 10px; border-radius: 999px;
    font-size: 12px; font-weight: 500;
  }

  .lcm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .lcm-field { display: flex; flex-direction: column; gap: 6px; }
  .lcm-field-wide { grid-column: 1 / -1; }
  .lcm-label { font-size: 12.5px; font-weight: 600; color: var(--ls-text, #0F172A); }
  .lcm-req { color: var(--ls-coral, #DC2626); }
  .lcm-hint { font-size: 11px; color: var(--ls-text-muted, #9CA3AF); font-weight: 400; }
  .lcm-input, .lcm-textarea {
    width: 100%; box-sizing: border-box; padding: 9px 11px;
    border: 1px solid var(--ls-border, #E5E7EB); border-radius: 9px;
    background: var(--ls-surface, #fff); color: var(--ls-text, #0F172A);
    font-family: inherit; font-size: 14px;
  }
  .lcm-input:focus, .lcm-textarea:focus {
    outline: none; border-color: var(--ls-teal, #2DD4BF);
    box-shadow: 0 0 0 3px rgba(45,212,191,0.15);
  }
  .lcm-textarea { resize: vertical; }

  .lcm-seg { display: flex; gap: 8px; }
  .lcm-seg-btn {
    flex: 1; padding: 9px 0; border-radius: 9px; border: 1px solid var(--ls-border, #E5E7EB);
    background: var(--ls-surface, #fff); color: var(--ls-text-muted, #6B7280);
    font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: all 0.15s ease;
  }
  .lcm-seg-btn.is-active {
    border-color: var(--ls-teal, #2DD4BF); background: rgba(45,212,191,0.10);
    color: var(--ls-teal, #0D9488);
  }

  .lcm-toggle {
    display: flex; align-items: flex-start; gap: 10px; margin: 16px 0;
    padding: 12px 14px; border-radius: 10px; background: var(--ls-surface2, #F9FAFB);
    border: 1px solid var(--ls-border, #E5E7EB); cursor: pointer; font-size: 13px; line-height: 1.4;
  }
  .lcm-toggle input { margin-top: 2px; flex-shrink: 0; }

  .lcm-actions { display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
  .lcm-primary {
    flex: 1; min-width: 180px; padding: 12px 18px; border: none; border-radius: 11px;
    background: var(--ls-gold, #C9A84C); color: var(--ls-gold-contrast, #0B0D11);
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
    transition: opacity 0.15s ease;
  }
  .lcm-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .lcm-secondary {
    padding: 12px 18px; border-radius: 11px;
    border: 1px solid rgba(45,212,191,0.40); background: rgba(45,212,191,0.08);
    color: var(--ls-teal, #0D9488); font-family: 'Syne', sans-serif;
    font-size: 13.5px; font-weight: 700; cursor: pointer;
  }
  .lcm-secondary:hover { background: rgba(45,212,191,0.16); }
  .lcm-ghost {
    padding: 12px 18px; border: 1px solid var(--ls-border, #E5E7EB); border-radius: 11px;
    background: transparent; color: var(--ls-text-muted, #6B7280);
    font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
  }

  .lcm-success { text-align: center; padding: 16px 4px 4px; }
  .lcm-success-emoji { font-size: 44px; line-height: 1; }
  .lcm-success-title {
    font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800;
    margin: 8px 0 0; color: var(--ls-text, #0F172A);
  }
  .lcm-success-text {
    font-size: 14px; color: var(--ls-text-muted, #4B5563); line-height: 1.55;
    margin: 10px auto 0; max-width: 400px;
  }
`;
