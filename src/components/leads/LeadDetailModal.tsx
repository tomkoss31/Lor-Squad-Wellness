// =============================================================================
// LeadDetailModal — détail d'un Lead bilan online + actions.
// Chantier #1 étape 1.6 (2026-05-17).
//
// V1 : affichage payload + status + notes. Templates de réponse multi-
// canal (WhatsApp/SMS/Telegram) ajoutés en étape 1.8.
// =============================================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_ORDER,
  type LeadStatus,
  type OnlineBilanRow,
} from "../../hooks/useOnlineBilans";
import { LeadResponsePanel } from "./LeadResponsePanel";
import { LeadConvertModal } from "./LeadConvertModal";
import { LeadScheduleModal } from "./LeadScheduleModal";
import { useAppContext } from "../../context/AppContext";

interface Props {
  bilan: OnlineBilanRow;
  onClose: () => void;
  onStatusChange: (s: LeadStatus) => Promise<void>;
  onNotesChange: (notes: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onDelete?: () => Promise<void>;
  /** Chantier #3 (2026-06-03) : marque le lead converti en fiche client. */
  onConverted?: (clientId: string) => Promise<void>;
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Plus d'énergie",
  sleep: "Mieux dormir / récupérer",
  wellbeing: "Bien-être général",
  perf_pro: "Performance au travail",
};
// Legacy V1 — bilan online avant 2026-05-27. Conservé pour compat affichage.
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
// V2 — bilan online refondu 2026-05-27.
const CURRENT_ACTION_LABELS: Record<string, string> = {
  sport: "🏃 Sport régulier",
  good_food: "🥗 Alimentation soignée",
  supplements: "💊 Suppléments / vitamines",
  coach: "👤 Suivi coach / pro",
  nothing: "🤷 Rien encore",
};
const MEALS_BALANCED_LABELS: Record<string, string> = {
  yes: "✅ Oui, plutôt",
  no: "❌ Non, pas vraiment",
  unsure: "🤔 Ne sait pas",
};
const WATER_LABELS: Record<string, string> = {
  "1-3": "1-3 verres",
  "4-6": "4-6 verres",
  "7-10": "7-10 verres",
  "10+": "10+ verres",
};
const COFFEE_LABELS: Record<string, string> = {
  "0": "Aucun", "1-2": "1-2", "3-4": "3-4", "5+": "5+",
};
const SODA_LABELS: Record<string, string> = {
  "0": "Aucun", "1": "1", "2-3": "2-3", "4+": "4+",
};
const ALCOHOL_LABELS: Record<string, string> = {
  "0": "Aucun", "1-3": "1-3 verres/sem", "4-7": "4-7 verres/sem", "8+": "8+ verres/sem",
};
const SLEEP_QUALITY_LABELS: Record<string, string> = {
  bad: "😫 Mauvais", meh: "😕 Moyen", ok: "🙂 Correct", great: "😊 Top",
};
const SLEEP_HOURS_LABELS: Record<string, string> = {
  "<6": "Moins de 6 h", "6-7": "6 à 7 h", "7-8": "7 à 8 h", "8+": "Plus de 8 h",
};
const MENTAL_LOAD_LABELS: Record<string, string> = {
  light: "🌿 Légère", ok: "😐 Ça va", heavy: "😰 Lourde", crushed: "🌪️ Écrasante",
};
const JOB_LABELS: Record<string, string> = {
  great: "🌟 Super, j'adore",
  valued: "✨ Plutôt valorisé(e)",
  routine: "🔁 Dans la routine",
  demotivated: "😞 Démotivé(e)",
  lost: "🌧️ Perdu(e) / en transition",
};
const CIRCLE_LABELS: Record<string, string> = {
  family: "👨‍👩‍👧 Famille soutien",
  couple: "💑 En couple",
  friends: "👥 Entouré(e) d'amis",
  alone: "🌿 Plutôt seul(e)",
};
const SPORT_FREQ_LABELS: Record<string, string> = {
  never: "Jamais",
  "1x": "1× / semaine",
  "2-3x": "2-3× / semaine",
  "4+x": "4× et + / semaine",
};
const CONTACT_PREF_LABELS: Record<string, string> = {
  phone: "📞 Téléphone",
  email: "📧 Email",
  whatsapp: "💬 WhatsApp",
};

export function LeadDetailModal({ bilan, onClose, onStatusChange, onNotesChange, onDelete, onConverted }: Props) {
  const { currentUser } = useAppContext();
  const navigate = useNavigate();
  const [notes, setNotes] = useState(bilan.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const isConverted = Boolean(bilan.converted_to_client_id);
  const coachFirstName = (currentUser?.name ?? "").trim().split(/\s+/)[0] ?? "";
  const isAdmin = currentUser?.role === "admin";

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

  async function handleDelete() {
    if (!onDelete) return;
    const label = `${bilan.first_name}${bilan.age != null ? `, ${bilan.age} ans` : ""}`;
    const ok = window.confirm(
      `Supprimer définitivement le lead « ${label} » ?\n\nCette action est irréversible. Les notes, le statut et les données du bilan seront perdus.`,
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue";
      window.alert(`Suppression impossible : ${msg}`);
    } finally {
      setDeleting(false);
    }
  }

  const payload = bilan.payload ?? {};
  // V1 legacy (avant 2026-05-27)
  const habits = (payload.habits as Record<string, unknown>) ?? {};
  const previousAttempts = Array.isArray(payload.previous_attempts)
    ? (payload.previous_attempts as string[])
    : [];
  const previousAttemptsResult = (payload.previous_attempts_result as string | null) ?? null;
  const budget = payload.budget as string | undefined;
  const activeDaily = payload.active_daily as boolean | undefined;
  const activeDailyDetail = payload.active_daily_detail as string | null | undefined;
  // V2 (chantier "bilan online V2")
  const currentActions = Array.isArray(payload.current_actions)
    ? (payload.current_actions as string[])
    : [];
  const currentActionsDetail = (payload.current_actions_detail as string | null) ?? null;
  const meals = (payload.meals as Record<string, unknown>) ?? {};
  const sleepMind = (payload.sleep_mind as Record<string, unknown>) ?? {};
  const life = (payload.life as Record<string, unknown>) ?? {};
  const finalize = (payload.finalize as Record<string, unknown>) ?? {};
  const hasV2Meals = !!meals.balanced || !!meals.water_per_day;
  const hasV2SleepMind = !!sleepMind.quality || !!sleepMind.hours;
  const hasV2Life = !!life.job_feeling || !!life.social_circle;
  const hasV2Finalize = !!finalize.sport_frequency || !!finalize.contact_pref;

  return (
    <>
    <div
      className="ldm-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <style>{STYLES}</style>
      <div className="ldm-panel" onClick={(e) => e.stopPropagation()}>
        <button className="ldm-back" onClick={onClose} type="button">
          ← Retour aux leads
        </button>
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
          {(bilan.phone || bilan.email) && (
            <div className="ldm-contact-row">
              {bilan.phone && (
                <a
                  className="ldm-contact-chip"
                  href={`tel:${bilan.phone.replace(/\s/g, "")}`}
                  aria-label="Appeler"
                >
                  📞 {bilan.phone}
                </a>
              )}
              {bilan.email && (
                <a
                  className="ldm-contact-chip"
                  href={`mailto:${bilan.email}`}
                  aria-label="Envoyer un email"
                >
                  📧 {bilan.email}
                </a>
              )}
            </div>
          )}
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

        {/* Chantier #3 (2026-06-03) : conversion lead → fiche client */}
        <div className="ldm-convert-row">
          {isConverted ? (
            <button
              type="button"
              className="ldm-convert-btn ldm-convert-done"
              onClick={() => navigate(`/clients/${bilan.converted_to_client_id}`)}
            >
              ✅ Fiche créée — Ouvrir la fiche →
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ldm-convert-btn"
                onClick={() => setShowConvert(true)}
              >
                ✅ Valider le bilan → créer la fiche client
              </button>
              <button
                type="button"
                className="ldm-schedule-btn"
                onClick={() => setShowSchedule(true)}
              >
                📅 Programmer un RDV
              </button>
            </>
          )}
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

        {/* === V2 sections (chantier "bilan online V2", 2026-05-27) === */}
        {currentActions.length > 0 && (
          <Section title="Ce qu'iel fait déjà">
            <div className="ldm-tags">
              {currentActions.map((a) => (
                <span key={a} className="ldm-tag">
                  {CURRENT_ACTION_LABELS[a] ?? a}
                </span>
              ))}
            </div>
            {currentActionsDetail && (
              <p className="ldm-quote">« {currentActionsDetail} »</p>
            )}
          </Section>
        )}

        {hasV2Meals && (
          <Section title="Assiette & hydratation">
            {meals.balanced != null && (
              <p className="ldm-line">
                <strong>Repas équilibrés :</strong>{" "}
                {MEALS_BALANCED_LABELS[String(meals.balanced)] ?? String(meals.balanced)}
              </p>
            )}
            {meals.water_per_day != null && (
              <p className="ldm-line">
                <strong>💧 Eau / jour :</strong>{" "}
                {WATER_LABELS[String(meals.water_per_day)] ?? String(meals.water_per_day)}
              </p>
            )}
            {meals.coffee_per_day != null && (
              <p className="ldm-line">
                <strong>☕ Café / jour :</strong>{" "}
                {COFFEE_LABELS[String(meals.coffee_per_day)] ?? String(meals.coffee_per_day)}
              </p>
            )}
            {meals.soda_per_day != null && (
              <p className="ldm-line">
                <strong>🥤 Sodas/jus / jour :</strong>{" "}
                {SODA_LABELS[String(meals.soda_per_day)] ?? String(meals.soda_per_day)}
              </p>
            )}
            {meals.alcohol_per_week != null && (
              <p className="ldm-line">
                <strong>🍷 Alcool / semaine :</strong>{" "}
                {ALCOHOL_LABELS[String(meals.alcohol_per_week)] ?? String(meals.alcohol_per_week)}
              </p>
            )}
          </Section>
        )}

        {hasV2SleepMind && (
          <Section title="Sommeil & tête">
            {sleepMind.quality != null && (
              <p className="ldm-line">
                <strong>Qualité sommeil :</strong>{" "}
                {SLEEP_QUALITY_LABELS[String(sleepMind.quality)] ?? String(sleepMind.quality)}
              </p>
            )}
            {sleepMind.hours != null && (
              <p className="ldm-line">
                <strong>Heures / nuit :</strong>{" "}
                {SLEEP_HOURS_LABELS[String(sleepMind.hours)] ?? String(sleepMind.hours)}
              </p>
            )}
            {typeof sleepMind.stress_level === "number" && (
              <p className="ldm-line">
                <strong>Stress :</strong> {String(sleepMind.stress_level)}/10
              </p>
            )}
            {sleepMind.mental_load != null && (
              <p className="ldm-line">
                <strong>Charge mentale :</strong>{" "}
                {MENTAL_LOAD_LABELS[String(sleepMind.mental_load)] ?? String(sleepMind.mental_load)}
              </p>
            )}
          </Section>
        )}

        {hasV2Life && (
          <Section title="Job & cercle de vie">
            {life.job_feeling != null && (
              <p className="ldm-line">
                <strong>Au boulot :</strong>{" "}
                {JOB_LABELS[String(life.job_feeling)] ?? String(life.job_feeling)}
              </p>
            )}
            {life.social_circle != null && (
              <p className="ldm-line">
                <strong>Entourage :</strong>{" "}
                {CIRCLE_LABELS[String(life.social_circle)] ?? String(life.social_circle)}
              </p>
            )}
          </Section>
        )}

        {hasV2Finalize && (
          <Section title="Activité & préférence contact">
            {finalize.sport_frequency != null && (
              <p className="ldm-line">
                <strong>🏋️ Sport :</strong>{" "}
                {SPORT_FREQ_LABELS[String(finalize.sport_frequency)] ?? String(finalize.sport_frequency)}
              </p>
            )}
            {finalize.contact_pref != null && (
              <p className="ldm-line">
                <strong>Préférence contact :</strong>{" "}
                {CONTACT_PREF_LABELS[String(finalize.contact_pref)] ?? String(finalize.contact_pref)}
              </p>
            )}
          </Section>
        )}

        <Section title="Répondre">
          <LeadResponsePanel
            bilan={bilan}
            coachFirstName={coachFirstName}
            onAfterSend={async (s) => {
              if (bilan.lead_status === "new") {
                await onStatusChange(s);
              }
            }}
          />
        </Section>

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

        {isAdmin && onDelete && (
          <div className="ldm-danger-zone">
            <button
              type="button"
              className="ldm-delete-btn"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
            >
              {deleting ? "Suppression…" : "🗑️ Supprimer ce lead"}
            </button>
            <p className="ldm-danger-hint">
              Action admin uniquement · irréversible · pour nettoyer les comptes test.
            </p>
          </div>
        )}
      </div>
    </div>

    {showConvert && onConverted && (
      <LeadConvertModal
        bilan={bilan}
        onClose={() => setShowConvert(false)}
        onConverted={onConverted}
      />
    )}

    {showSchedule && (
      <LeadScheduleModal
        bilan={bilan}
        onClose={() => setShowSchedule(false)}
        onScheduled={async () => {
          // Programmer un RDV implique un contact → bump new → contact.
          if (bilan.lead_status === "new") {
            await onStatusChange("contact");
          }
        }}
      />
    )}
    </>
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

  .ldm-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: 1px solid rgba(15, 23, 42, 0.12);
    color: var(--ls-text, #0F172A);
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 999px;
    cursor: pointer;
    margin-bottom: 12px;
    transition: background 0.15s ease;
  }
  .ldm-back:hover { background: rgba(15, 23, 42, 0.05); }

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
  .ldm-contact-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
  }
  .ldm-contact-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 5px 10px;
    border-radius: 999px;
    background: rgba(45, 212, 191, 0.10);
    color: #0D9488;
    font-size: 12.5px;
    font-weight: 600;
    text-decoration: none;
    border: 1px solid rgba(45, 212, 191, 0.25);
    transition: background 0.15s ease, transform 0.15s ease;
  }
  .ldm-contact-chip:hover {
    background: rgba(45, 212, 191, 0.18);
    transform: translateY(-1px);
  }
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

  .ldm-convert-row { margin: 0 0 18px; display: flex; flex-direction: column; gap: 8px; }
  .ldm-schedule-btn {
    width: 100%;
    padding: 11px 16px;
    border: 1px solid rgba(45, 212, 191, 0.40);
    border-radius: 11px;
    background: rgba(45, 212, 191, 0.08);
    color: #0D9488;
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .ldm-schedule-btn:hover { background: rgba(45, 212, 191, 0.16); }
  .ldm-convert-btn {
    width: 100%;
    padding: 13px 16px;
    border: none;
    border-radius: 11px;
    background: var(--ls-gold, #C9A84C);
    color: var(--ls-gold-contrast, #0B0D11);
    font-family: 'Syne', 'Inter', sans-serif;
    font-size: 14.5px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }
  .ldm-convert-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(201, 168, 76, 0.30);
  }
  .ldm-convert-done {
    background: rgba(16, 185, 129, 0.12);
    color: #047857;
    border: 1px solid rgba(16, 185, 129, 0.35);
  }
  .ldm-convert-done:hover { box-shadow: 0 6px 16px rgba(16, 185, 129, 0.20); }

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

  .ldm-danger-zone {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px dashed rgba(220, 38, 38, 0.25);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .ldm-delete-btn {
    background: transparent;
    color: #DC2626;
    border: 1px solid rgba(220, 38, 38, 0.35);
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
  }
  .ldm-delete-btn:hover:not(:disabled) {
    background: rgba(220, 38, 38, 0.08);
    border-color: #DC2626;
  }
  .ldm-delete-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .ldm-danger-hint {
    margin: 0;
    font-size: 11.5px;
    color: var(--ls-text-muted, #9CA3AF);
    font-style: italic;
  }
`;
