// =============================================================================
// LeadScheduleModal — programmer un RDV depuis un Lead bilan online.
// Chantier #3 étape 3.2 (2026-06-03).
//
// Le lead n'est pas encore client → on crée un `prospect` dans l'agenda
// (table prospects, réutilise createProspect d'AppContext). Source = "Autre"
// + détail "Bilan online" (pas de valeur enum dédiée → évite un risque de
// CHECK constraint côté DB). Pré-rempli depuis le lead. À la création, le
// parent peut faire passer le lead en "Contacté" (onScheduled).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../../context/ToastContext";
import type { OnlineBilanRow } from "../../hooks/useOnlineBilans";

interface Props {
  bilan: OnlineBilanRow;
  onClose: () => void;
  /** Appelé après création du prospect (le parent peut bump le statut). */
  onScheduled?: () => Promise<void> | void;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "perte de poids",
  mass_gain: "prise de masse",
  energy: "énergie",
  sleep: "sommeil",
  wellbeing: "bien-être",
  perf_pro: "performance pro",
};

/** Valeur initiale du datetime-local : demain 10:00 (heure locale). */
function defaultRdvLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(10, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LeadScheduleModal({ bilan, onClose, onScheduled }: Props) {
  const navigate = useNavigate();
  const { createProspect, currentUser } = useAppContext();
  const { push: pushToast } = useToast();

  const objectivesText = useMemo(
    () => bilan.objectives.map((o) => OBJECTIVE_LABELS[o] ?? o).join(", "),
    [bilan.objectives],
  );

  const [rdvLocal, setRdvLocal] = useState(defaultRdvLocal);
  const [note, setNote] = useState(
    objectivesText ? `Lead bilan online — objectif : ${objectivesText}.` : "Lead bilan online.",
  );
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const distributorId =
    bilan.assigned_to_user_id ?? bilan.coach_user_id ?? currentUser?.id ?? "";

  async function handleSubmit() {
    if (submitting || !rdvLocal) return;
    setSubmitting(true);
    try {
      const rdvDate = new Date(rdvLocal);
      if (Number.isNaN(rdvDate.getTime())) {
        pushToast({ tone: "error", title: "Date de RDV invalide." });
        setSubmitting(false);
        return;
      }
      await createProspect({
        firstName: bilan.first_name.trim(),
        lastName: "",
        phone: bilan.phone?.trim() || undefined,
        email: bilan.email?.trim().toLowerCase() || undefined,
        rdvDate: rdvDate.toISOString(),
        source: "Autre",
        sourceDetail: "Bilan online",
        note: note.trim() || undefined,
        distributorId,
      });
      await onScheduled?.();
      setDone(true);
      pushToast({ tone: "success", title: `RDV programmé avec ${bilan.first_name} ✓` });
    } catch (err) {
      pushToast(buildSupabaseErrorToast(err, "Impossible de créer le RDV."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="lsm-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <style>{STYLES}</style>
      <div className="lsm-panel" onClick={(e) => e.stopPropagation()}>
        <button className="lsm-close" onClick={onClose} aria-label="Fermer">×</button>

        {done ? (
          <div className="lsm-success">
            <div className="lsm-success-emoji" aria-hidden="true">📅</div>
            <h2 className="lsm-success-title">RDV programmé</h2>
            <p className="lsm-success-text">
              Le RDV avec <strong>{bilan.first_name}</strong> est dans ton agenda
              (onglet prospects). Tu recevras un rappel push ~1h avant.
            </p>
            <div className="lsm-actions">
              <button type="button" className="lsm-primary" onClick={() => navigate("/agenda")}>
                Voir l'agenda →
              </button>
              <button type="button" className="lsm-ghost" onClick={onClose}>
                Retour aux leads
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="lsm-header">
              <div className="lsm-eyebrow">📅 Programmer un RDV</div>
              <h2 className="lsm-title">{bilan.first_name}</h2>
              <p className="lsm-meta">
                Crée un RDV prospect dans ton agenda. À l'issue du RDV, tu pourras
                le convertir en fiche client.
              </p>
            </div>

            <label className="lsm-field">
              <span className="lsm-label">Date et heure</span>
              <input
                className="lsm-input"
                type="datetime-local"
                value={rdvLocal}
                onChange={(e) => setRdvLocal(e.target.value)}
              />
            </label>

            <label className="lsm-field">
              <span className="lsm-label">Note</span>
              <textarea
                className="lsm-textarea"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </label>

            <div className="lsm-actions">
              <button
                type="button"
                className="lsm-primary"
                disabled={submitting || !rdvLocal}
                onClick={() => void handleSubmit()}
              >
                {submitting ? "Création…" : "Programmer le RDV"}
              </button>
              <button type="button" className="lsm-ghost" onClick={onClose}>
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
  .lsm-backdrop {
    position: fixed; inset: 0; background: rgba(15,23,42,0.6);
    backdrop-filter: blur(4px); z-index: 1100;
    display: flex; align-items: flex-end; justify-content: center; padding: 0;
    animation: lsm-fade 180ms ease-out;
  }
  @keyframes lsm-fade { from { opacity: 0; } to { opacity: 1; } }
  .lsm-panel {
    position: relative; background: var(--ls-surface, #fff); color: var(--ls-text, #0F172A);
    width: 100%; max-width: 480px; max-height: 92vh; overflow-y: auto;
    border-radius: 20px 20px 0 0; padding: 26px 22px;
    box-shadow: 0 -10px 40px rgba(15,23,42,0.18);
    animation: lsm-slide 260ms cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes lsm-slide { from { transform: translateY(40px); } to { transform: translateY(0); } }
  @media (min-width: 640px) {
    .lsm-backdrop { align-items: center; padding: 32px; }
    .lsm-panel { border-radius: 20px; }
  }
  .lsm-close {
    position: absolute; top: 12px; right: 12px; width: 36px; height: 36px;
    border-radius: 50%; border: none; background: rgba(0,0,0,0.05);
    color: var(--ls-text, #0F172A); font-size: 22px; cursor: pointer; line-height: 1;
  }
  .lsm-close:hover { background: rgba(0,0,0,0.10); }
  .lsm-header { padding-right: 40px; margin-bottom: 16px; }
  .lsm-eyebrow {
    font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    color: var(--ls-teal, #0D9488); margin-bottom: 6px;
  }
  .lsm-title { font-family: 'Syne', 'Inter', sans-serif; font-size: 22px; font-weight: 700; margin: 0; }
  .lsm-meta { font-size: 13px; color: var(--ls-text-muted, #6B7280); margin: 6px 0 0; line-height: 1.45; }
  .lsm-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
  .lsm-label { font-size: 12.5px; font-weight: 600; color: var(--ls-text, #0F172A); }
  .lsm-input, .lsm-textarea {
    width: 100%; box-sizing: border-box; padding: 9px 11px;
    border: 1px solid var(--ls-border, #E5E7EB); border-radius: 9px;
    background: var(--ls-surface, #fff); color: var(--ls-text, #0F172A);
    font-family: inherit; font-size: 14px;
  }
  .lsm-input:focus, .lsm-textarea:focus {
    outline: none; border-color: var(--ls-teal, #2DD4BF);
    box-shadow: 0 0 0 3px rgba(45,212,191,0.15);
  }
  .lsm-textarea { resize: vertical; }
  .lsm-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
  .lsm-primary {
    flex: 1; min-width: 160px; padding: 12px 18px; border: none; border-radius: 11px;
    background: var(--ls-teal, #2DD4BF); color: #04221C;
    font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .lsm-primary:disabled { opacity: 0.45; cursor: not-allowed; }
  .lsm-ghost {
    padding: 12px 18px; border: 1px solid var(--ls-border, #E5E7EB); border-radius: 11px;
    background: transparent; color: var(--ls-text-muted, #6B7280);
    font-family: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
  }
  .lsm-success { text-align: center; padding: 16px 4px 4px; }
  .lsm-success-emoji { font-size: 44px; line-height: 1; }
  .lsm-success-title { font-family: 'Syne', sans-serif; font-size: 22px; font-weight: 800; margin: 8px 0 0; }
  .lsm-success-text {
    font-size: 14px; color: var(--ls-text-muted, #4B5563); line-height: 1.55;
    margin: 10px auto 0; max-width: 380px;
  }
`;
