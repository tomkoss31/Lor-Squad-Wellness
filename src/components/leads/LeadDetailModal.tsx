// =============================================================================
// LeadDetailModal — détail d'un Lead bilan online + actions.
// Chantier #1 étape 1.6 (2026-05-17).
//
// V1 : affichage payload + status + notes. Templates de réponse multi-
// canal (WhatsApp/SMS/Telegram) ajoutés en étape 1.8.
// =============================================================================

import { useEffect, useState } from "react";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  type LeadStatus,
  type OnlineBilanRow,
} from "../../hooks/useOnlineBilans";

interface Props {
  bilan: OnlineBilanRow;
  onClose: () => void;
  onStatusChange: (s: LeadStatus) => Promise<void>;
  onNotesChange: (notes: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Plus d'énergie",
  sleep: "Mieux dormir / récupérer",
  wellbeing: "Bien-être général",
};
const ATTEMPT_LABELS: Record<string, string> = {
  diet: "Régimes",
  coach: "Coach / accompagnement",
  sport: "Sport",
  supplements: "Suppléments",
  nothing: "Rien encore",
};
const MEAL_LABELS: Record<string, string> = {
  sweet: "Sucré",
  salty: "Salé",
  smoothie: "Smoothie / healthy",
  coffee_only: "Café seulement / rien",
  other: "Autre",
  home: "Maison",
  canteen: "Cantine / resto",
  sandwich: "Sandwich / wrap",
  fastfood: "Fast-food",
  skip: "Je saute",
  delivery: "Livraison",
  light: "Léger / snack",
};

export function LeadDetailModal({ bilan, onClose, onStatusChange, onNotesChange }: Props) {
  const [notes, setNotes] = useState(bilan.notes ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleStatusChange(s: LeadStatus) {
    setSaving(true);
    try {
      await onStatusChange(s);
    } finally {
      setSaving(false);
    }
  }

  async function handleNotesBlur() {
    if (notes === (bilan.notes ?? "")) return;
    setSaving(true);
    try {
      await onNotesChange(notes);
    } finally {
      setSaving(false);
    }
  }

  const payload = bilan.payload ?? {};
  const habits = (payload.habits as Record<string, unknown>) ?? {};
  const previousAttempts = Array.isArray(payload.previous_attempts)
    ? (payload.previous_attempts as string[])
    : [];
  const previousAttemptsResult = (payload.previous_attempts_result as string | null) ?? null;
  const budget = payload.budget as string | undefined;
  const activeDaily = payload.active_daily as boolean | undefined;
  const activeDailyDetail = payload.active_daily_detail as string | null | undefined;

  return (
    <div
      className="ldm-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <style>{STYLES}</style>
      <div className="ldm-panel" onClick={(e) => e.stopPropagation()}>
        <button className="ldm-close" onClick={onClose} aria-label="Fermer">×</button>

        <div className="ldm-header">
          <h2 className="ldm-name">
            {bilan.first_name}
            {bilan.age != null ? `, ${bilan.age} ans` : ""}
            {bilan.city ? ` · ${bilan.city}` : ""}
          </h2>
          <p className="ldm-meta">
            Reçu le {new Date(bilan.created_at).toLocaleString("fr-FR", {
              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
            })}
            {bilan.coach_slug ? ` · via /${bilan.coach_slug}` : " · bilan libre"}
          </p>
        </div>

        <div className="ldm-status-row">
          <label className="ldm-label">Statut</label>
          <select
            className="ldm-status"
            value={bilan.lead_status}
            disabled={saving}
            onChange={(e) => void handleStatusChange(e.target.value as LeadStatus)}
          >
            {LEAD_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <Section title="Objectifs">
          <div className="ldm-tags">
            {bilan.objectives.map((o) => (
              <span key={o} className="ldm-tag">{OBJECTIVE_LABELS[o] ?? o}</span>
            ))}
          </div>
          {bilan.weight_loss_target_kg != null && (
            <p className="ldm-line">
              <strong>Cible :</strong> –{bilan.weight_loss_target_kg} kg
            </p>
          )}
          {bilan.motivation_score != null && (
            <p className="ldm-line">
              <strong>Motivation :</strong> {bilan.motivation_score}/10
            </p>
          )}
        </Section>

        {bilan.height_cm != null && (
          <Section title="Profil">
            <p className="ldm-line">Taille : {bilan.height_cm} cm</p>
          </Section>
        )}

        {previousAttempts.length > 0 && (
          <Section title="Vécu">
            <div className="ldm-tags">
              {previousAttempts.map((a) => (
                <span key={a} className="ldm-tag ldm-tag-muted">
                  {ATTEMPT_LABELS[a] ?? a}
                </span>
              ))}
            </div>
            {previousAttemptsResult && (
              <p className="ldm-quote">« {previousAttemptsResult} »</p>
            )}
          </Section>
        )}

        {(habits.breakfast || habits.lunch || habits.dinner) ? (
          <Section title="Habitudes">
            {habits.breakfast ? (
              <p className="ldm-line">
                <strong>Petit-déj :</strong>{" "}
                {MEAL_LABELS[String(habits.breakfast)] ?? String(habits.breakfast)}
                {habits.breakfast_other ? ` (${String(habits.breakfast_other)})` : ""}
              </p>
            ) : null}
            {habits.lunch ? (
              <p className="ldm-line">
                <strong>Midi :</strong> {MEAL_LABELS[String(habits.lunch)] ?? String(habits.lunch)}
              </p>
            ) : null}
            {habits.dinner ? (
              <p className="ldm-line">
                <strong>Soir :</strong> {MEAL_LABELS[String(habits.dinner)] ?? String(habits.dinner)}
              </p>
            ) : null}
            {typeof habits.fastfood_per_week === "number" && (
              <p className="ldm-line">
                <strong>Fast-food / semaine :</strong> {String(habits.fastfood_per_week)}
              </p>
            )}
          </Section>
        ) : null}

        {(budget || activeDaily != null) && (
          <Section title="Budget & activité">
            {budget && (
              <p className="ldm-line"><strong>Budget alim. / jour :</strong> {budget} €</p>
            )}
            {activeDaily != null && (
              <p className="ldm-line">
                <strong>Actif au quotidien :</strong> {activeDaily ? "Oui" : "Non"}
                {activeDailyDetail ? ` — ${activeDailyDetail}` : ""}
              </p>
            )}
          </Section>
        )}

        <Section title="Notes coach">
          <textarea
            className="ldm-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => void handleNotesBlur()}
            placeholder="Suivi, fil de discussion, contexte personnel…"
            rows={4}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="ldm-section">
      <h3 className="ldm-section-title">{title}</h3>
      <div className="ldm-section-body">{children}</div>
    </section>
  );
}

const STYLES = `
  .ldm-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding: 0;
    animation: ldm-fade 200ms ease-out;
  }
  @keyframes ldm-fade { from { opacity: 0; } to { opacity: 1; } }

  .ldm-panel {
    position: relative;
    background: var(--ls-surface, #fff);
    color: var(--ls-text, #0F172A);
    width: 100%;
    max-width: 560px;
    max-height: 92vh;
    overflow-y: auto;
    border-radius: 20px 20px 0 0;
    padding: 24px 20px;
    box-shadow: 0 -10px 40px rgba(15, 23, 42, 0.15);
    animation: ldm-slide 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes ldm-slide { from { transform: translateY(40px); } to { transform: translateY(0); } }

  @media (min-width: 640px) {
    .ldm-backdrop { align-items: center; padding: 32px; }
    .ldm-panel { border-radius: 20px; }
  }

  .ldm-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(0,0,0,0.05);
    color: var(--ls-text, #0F172A);
    font-size: 22px;
    cursor: pointer;
    line-height: 1;
    z-index: 1;
  }
  .ldm-close:hover { background: rgba(0,0,0,0.10); }

  .ldm-header { padding-right: 40px; margin-bottom: 16px; }
  .ldm-name {
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 20px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }
  .ldm-meta {
    font-size: 13px;
    color: var(--ls-text-muted, #6B7280);
    margin: 0;
  }

  .ldm-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: var(--ls-surface2, #F9FAFB);
    border-radius: 10px;
    margin-bottom: 16px;
  }
  .ldm-label {
    font-size: 13px;
    font-weight: 600;
    color: var(--ls-text-muted, #4B5563);
  }
  .ldm-status {
    flex: 1;
    padding: 8px 10px;
    border-radius: 8px;
    border: 1px solid var(--ls-border, #E5E7EB);
    background: var(--ls-surface, #fff);
    color: var(--ls-text, #0F172A);
    font-size: 14px;
    font-family: inherit;
  }

  .ldm-section { margin-bottom: 16px; }
  .ldm-section-title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ls-gold, #C9A84C);
    margin: 0 0 8px 0;
  }
  .ldm-section-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .ldm-line { margin: 0; font-size: 14px; line-height: 1.45; }
  .ldm-line strong { color: var(--ls-text, #0F172A); font-weight: 600; }
  .ldm-quote {
    margin: 6px 0 0 0;
    font-style: italic;
    color: var(--ls-text-muted, #4B5563);
    padding-left: 10px;
    border-left: 2px solid var(--ls-gold, #C9A84C);
    font-size: 13.5px;
  }

  .ldm-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .ldm-tag {
    background: rgba(45, 212, 191, 0.10);
    color: #0D9488;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 12.5px;
    font-weight: 500;
  }
  .ldm-tag-muted {
    background: rgba(107, 114, 128, 0.10);
    color: #4B5563;
  }

  .ldm-notes {
    width: 100%;
    min-height: 100px;
    padding: 10px 12px;
    border: 1px solid var(--ls-border, #E5E7EB);
    border-radius: 10px;
    background: var(--ls-surface, #fff);
    color: var(--ls-text, #0F172A);
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
    box-sizing: border-box;
  }
  .ldm-notes:focus {
    outline: none;
    border-color: var(--ls-gold, #C9A84C);
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }
`;
