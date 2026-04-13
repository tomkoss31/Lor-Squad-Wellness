import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { useBilans } from "../hooks/useBilans";
import type { Recommendation } from "../lib/types";

type BilanDraft = {
  wake_time: string;
  sleep_time: string;
  sleep_quality: number;
  energy_level: number;
  stress_level: number;
  breakfast: string;
  breakfast_time: string;
  lunch: string;
  dinner: string;
  snacking: string;
  snacking_frequency: string;
  water_liters: number;
  other_drinks: string;
  sport_type: string;
  sport_frequency: string;
  sport_duration: string;
  health_issues: string;
  medications: string;
  digestion_quality: number;
  transit: string;
  main_objective: string;
  secondary_objective: string;
  blockers: string[];
  motivation_level: number;
  notes: string;
};

const defaultDraft: BilanDraft = {
  wake_time: "",
  sleep_time: "",
  sleep_quality: 3,
  energy_level: 3,
  stress_level: 3,
  breakfast: "",
  breakfast_time: "",
  lunch: "",
  dinner: "",
  snacking: "non",
  snacking_frequency: "",
  water_liters: 1.5,
  other_drinks: "",
  sport_type: "",
  sport_frequency: "",
  sport_duration: "",
  health_issues: "",
  medications: "",
  digestion_quality: 3,
  transit: "",
  main_objective: "perte de poids",
  secondary_objective: "",
  blockers: [],
  motivation_level: 3,
  notes: ""
};

const blockerOptions = ["manque de temps", "motivation", "budget", "organisation", "autre"];

export function NewBilanPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createBilan } = useBilans(id);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<BilanDraft>(defaultDraft);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = useMemo(() => `bilan_draft_${id}`, [id]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return;
    }

    try {
      setDraft({ ...defaultDraft, ...(JSON.parse(raw) as Partial<BilanDraft>) });
    } catch (error) {
      console.error(error);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(draft));
  }, [draft, storageKey]);

  async function handleSubmit() {
    if (!id) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createBilan({
        client_id: id,
        wake_time: draft.wake_time,
        sleep_time: draft.sleep_time,
        sleep_quality: draft.sleep_quality,
        energy_level: draft.energy_level,
        stress_level: draft.stress_level,
        breakfast: draft.breakfast,
        breakfast_time: draft.breakfast_time,
        lunch: draft.lunch,
        dinner: draft.dinner,
        snacking: draft.snacking,
        snacking_frequency: draft.snacking_frequency,
        water_liters: draft.water_liters,
        other_drinks: draft.other_drinks,
        sport_type: draft.sport_type,
        sport_frequency: draft.sport_frequency,
        sport_duration: draft.sport_duration,
        health_issues: draft.health_issues,
        medications: draft.medications,
        digestion_quality: draft.digestion_quality,
        transit: draft.transit,
        main_objective: draft.main_objective,
        secondary_objective: draft.secondary_objective,
        blockers: draft.blockers.join(", "),
        motivation_level: draft.motivation_level,
        recommendations: generateRecommendations(draft),
        notes: draft.notes
      });

      localStorage.removeItem(storageKey);
      navigate(`/clients/${id}`);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-[920px] space-y-6">
      <Card className="p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow-label">Bilan bien-être</p>
            <h2 className="mt-3 text-[1.8rem] font-bold">Étape {step} sur 5</h2>
          </div>
          <p className="text-sm text-[var(--lor-muted)]">Brouillon sauvegardé automatiquement</p>
        </div>
        <div className="mt-5 h-2 rounded-full bg-[var(--lor-surface2)]">
          <div className="h-2 rounded-full bg-[var(--lor-gold)]" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
      </Card>

      <Card className="p-6">
        {step === 1 ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Heure de réveil">
              <input type="time" value={draft.wake_time} onChange={(event) => setDraft((current) => ({ ...current, wake_time: event.target.value }))} className="lor-field" />
            </Field>
            <Field label="Heure de coucher">
              <input type="time" value={draft.sleep_time} onChange={(event) => setDraft((current) => ({ ...current, sleep_time: event.target.value }))} className="lor-field" />
            </Field>
            <RatingField label="Qualité du sommeil" value={draft.sleep_quality} onChange={(value) => setDraft((current) => ({ ...current, sleep_quality: value }))} />
            <RatingField label="Niveau d'énergie" value={draft.energy_level} onChange={(value) => setDraft((current) => ({ ...current, energy_level: value }))} />
            <RatingField label="Niveau de stress" value={draft.stress_level} onChange={(value) => setDraft((current) => ({ ...current, stress_level: value }))} />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Petit-déjeuner">
              <textarea value={draft.breakfast} onChange={(event) => setDraft((current) => ({ ...current, breakfast: event.target.value }))} className="lor-textarea" />
            </Field>
            <Field label="Heure du petit-déjeuner">
              <input type="time" value={draft.breakfast_time} onChange={(event) => setDraft((current) => ({ ...current, breakfast_time: event.target.value }))} className="lor-field" />
            </Field>
            <Field label="Déjeuner">
              <textarea value={draft.lunch} onChange={(event) => setDraft((current) => ({ ...current, lunch: event.target.value }))} className="lor-textarea" />
            </Field>
            <Field label="Dîner">
              <textarea value={draft.dinner} onChange={(event) => setDraft((current) => ({ ...current, dinner: event.target.value }))} className="lor-textarea" />
            </Field>
            <Field label="Grignotage">
              <select value={draft.snacking} onChange={(event) => setDraft((current) => ({ ...current, snacking: event.target.value }))} className="lor-select">
                <option value="non">Non</option>
                <option value="oui">Oui</option>
              </select>
            </Field>
            {draft.snacking === "oui" ? (
              <Field label="Fréquence du grignotage">
                <input value={draft.snacking_frequency} onChange={(event) => setDraft((current) => ({ ...current, snacking_frequency: event.target.value }))} className="lor-field" placeholder="Ex: souvent l'après-midi" />
              </Field>
            ) : null}
            <Field label="Boissons autres qu'eau">
              <textarea value={draft.other_drinks} onChange={(event) => setDraft((current) => ({ ...current, other_drinks: event.target.value }))} className="lor-textarea" />
            </Field>
          </section>
        ) : null}

        {step === 3 ? (
          <section className="space-y-5">
            <Field label={`Litres d'eau par jour: ${draft.water_liters.toFixed(2)}L`}>
              <input type="range" min="0" max="3.5" step="0.25" value={draft.water_liters} onChange={(event) => setDraft((current) => ({ ...current, water_liters: Number(event.target.value) }))} />
            </Field>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Type de sport">
                <input value={draft.sport_type} onChange={(event) => setDraft((current) => ({ ...current, sport_type: event.target.value }))} className="lor-field" />
              </Field>
              <Field label="Fréquence">
                <input value={draft.sport_frequency} onChange={(event) => setDraft((current) => ({ ...current, sport_frequency: event.target.value }))} className="lor-field" />
              </Field>
              <Field label="Durée">
                <input value={draft.sport_duration} onChange={(event) => setDraft((current) => ({ ...current, sport_duration: event.target.value }))} className="lor-field" />
              </Field>
            </div>
          </section>
        ) : null}

        {step === 4 ? (
          <section className="grid gap-4 md:grid-cols-2">
            <Field label="Problèmes de santé">
              <textarea value={draft.health_issues} onChange={(event) => setDraft((current) => ({ ...current, health_issues: event.target.value }))} className="lor-textarea" />
            </Field>
            <Field label="Médicaments">
              <textarea value={draft.medications} onChange={(event) => setDraft((current) => ({ ...current, medications: event.target.value }))} className="lor-textarea" />
            </Field>
            <RatingField label="Qualité de digestion" value={draft.digestion_quality} onChange={(value) => setDraft((current) => ({ ...current, digestion_quality: value }))} />
            <Field label="Transit">
              <select value={draft.transit} onChange={(event) => setDraft((current) => ({ ...current, transit: event.target.value }))} className="lor-select">
                <option value="">Sélectionner</option>
                <option value="régulier">Régulier</option>
                <option value="irrégulier">Irrégulier</option>
                <option value="constipation">Constipation</option>
                <option value="accéléré">Accéléré</option>
              </select>
            </Field>
          </section>
        ) : null}

        {step === 5 ? (
          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Objectif principal">
                <select value={draft.main_objective} onChange={(event) => setDraft((current) => ({ ...current, main_objective: event.target.value }))} className="lor-select">
                  <option value="perte de poids">Perte de poids</option>
                  <option value="prise de muscle">Prise de muscle</option>
                  <option value="énergie">Énergie</option>
                  <option value="bien-être">Bien-être</option>
                  <option value="autre">Autre</option>
                </select>
              </Field>
              <Field label="Objectif secondaire">
                <input value={draft.secondary_objective} onChange={(event) => setDraft((current) => ({ ...current, secondary_objective: event.target.value }))} className="lor-field" />
              </Field>
            </div>

            <Field label="Principaux freins">
              <div className="grid gap-3 md:grid-cols-2">
                {blockerOptions.map((blocker) => {
                  const checked = draft.blockers.includes(blocker);
                  return (
                    <label key={blocker} className="flex items-center gap-3 rounded-[12px] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-3">
                      <input type="checkbox" checked={checked} onChange={() => setDraft((current) => ({ ...current, blockers: checked ? current.blockers.filter((item) => item !== blocker) : [...current.blockers, blocker] }))} />
                      <span>{blocker}</span>
                    </label>
                  );
                })}
              </div>
            </Field>

            <RatingField label="Niveau de motivation" value={draft.motivation_level} onChange={(value) => setDraft((current) => ({ ...current, motivation_level: value }))} />

            <Field label="Notes libres du coach">
              <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} className="lor-textarea" />
            </Field>
          </section>
        ) : null}

        {error ? <div className="lor-danger-banner mt-5 rounded-[12px] px-4 py-3 text-sm">{error}</div> : null}

        <div className="mt-8 flex justify-between gap-3">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep((current) => current - 1)}>Précédent</Button>
          {step < 5 ? <Button onClick={() => setStep((current) => current + 1)}>Suivant</Button> : <Button onClick={() => void handleSubmit()} loading={submitting}>Enregistrer le bilan</Button>}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="lor-label">{label}</span>
      {children}
    </label>
  );
}

function RatingField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, index) => {
          const current = index + 1;
          const active = current <= value;
          return (
            <button key={current} type="button" onClick={() => onChange(current)} className={[ "flex h-10 w-10 items-center justify-center rounded-full border text-lg transition", active ? "border-[rgba(201,168,76,0.34)] bg-[rgba(201,168,76,0.14)] text-[var(--lor-gold2)]" : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--lor-muted)]" ].join(" ")}>
              ★
            </button>
          );
        })}
      </div>
    </Field>
  );
}

function generateRecommendations(draft: BilanDraft): Recommendation[] {
  const recommendations: Recommendation[] = [];
  if (draft.sleep_quality <= 2) recommendations.push({ category: "Sommeil", priority: "haute", product: "Herbalife24 Rebuild Strength", reason: "Qualité du sommeil insuffisante" });
  if (draft.water_liters < 1.5) recommendations.push({ category: "Hydratation", priority: "haute", product: "Herbal Aloe Concentrate", reason: "Hydratation en dessous des besoins" });
  if (draft.stress_level >= 4) recommendations.push({ category: "Stress", priority: "haute", reason: "Niveau de stress élevé détecté" });
  if (draft.snacking === "oui" && draft.snacking_frequency.toLowerCase().includes("souvent")) recommendations.push({ category: "Grignotage", priority: "moyenne", product: "Formula 1 shake", reason: "Grignotage fréquent" });
  if (draft.digestion_quality <= 2) recommendations.push({ category: "Digestion", priority: "haute", product: "Herbal Aloe", reason: "Digestion difficile" });
  return recommendations;
}

export default NewBilanPage;
