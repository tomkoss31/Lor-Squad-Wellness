// =============================================================================
// BilanOnlinePage — Formulaire bilan online publique (chantier #1 étape 1.3).
//
// Route : /bilan-online/:coachSlug?
//   - 5 étapes avec progress bar
//   - Auto-save localStorage (clé `ls-bilan-online-<slug>`) à chaque change
//   - Validation par étape (impossible d'avancer si required manquant)
//   - Mobile-first, touch targets >= 44px, font >= 16px
//   - Soumission → edge function `submit-online-bilan` → redirect /merci
//
// La page Welcome (hero + photo coach) sera ajoutée en étape 1.4. Pour
// l'instant le formulaire démarre direct sur l'étape 1.
// =============================================================================

import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";

type ObjectiveKey =
  | "weight_loss"
  | "mass_gain"
  | "energy"
  | "sleep"
  | "wellbeing";

type PreviousAttempt = "diet" | "coach" | "sport" | "supplements" | "nothing";
type MealType =
  | "sweet"
  | "salty"
  | "smoothie"
  | "coffee_only"
  | "other"
  | "home"
  | "canteen"
  | "sandwich"
  | "fastfood"
  | "skip"
  | "delivery"
  | "light";
type BudgetTier = "2" | "4" | "8" | "10" | "15+";

interface FormState {
  // Étape 1
  first_name: string;
  age: string;
  height_cm: string;
  city: string;
  // Étape 2
  objectives: ObjectiveKey[];
  weight_loss_target_kg: string;
  motivation_score: number;
  // Étape 3
  previous_attempts: PreviousAttempt[];
  previous_attempts_result: string;
  // Étape 4
  breakfast: MealType | "";
  breakfast_other: string;
  lunch: MealType | "";
  dinner: MealType | "";
  fastfood_per_week: number;
  // Étape 5
  daily_food_budget: BudgetTier | "";
  active_daily: "yes" | "no" | "";
  active_daily_detail: string;
  consent: boolean;
}

const INITIAL_FORM: FormState = {
  first_name: "",
  age: "",
  height_cm: "",
  city: "",
  objectives: [],
  weight_loss_target_kg: "",
  motivation_score: 7,
  previous_attempts: [],
  previous_attempts_result: "",
  breakfast: "",
  breakfast_other: "",
  lunch: "",
  dinner: "",
  fastfood_per_week: 0,
  daily_food_budget: "",
  active_daily: "",
  active_daily_detail: "",
  consent: false,
};

const TOTAL_STEPS = 5;

export function BilanOnlinePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = coachSlug?.trim() || "";
  const storageKey = useMemo(() => `ls-bilan-online-${slug || "none"}`, [slug]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate depuis localStorage au mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState> & { _step?: number };
        setForm((prev) => ({ ...prev, ...parsed }));
        if (parsed._step && parsed._step >= 1 && parsed._step <= TOTAL_STEPS) {
          setStep(parsed._step);
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, [storageKey]);

  // Auto-save à chaque change après hydration
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...form, _step: step }));
    } catch {
      /* ignore quota */
    }
  }, [form, step, storageKey, hydrated]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleObjective(o: ObjectiveKey) {
    setForm((prev) => ({
      ...prev,
      objectives: prev.objectives.includes(o)
        ? prev.objectives.filter((x) => x !== o)
        : [...prev.objectives, o],
    }));
  }

  function togglePreviousAttempt(o: PreviousAttempt) {
    setForm((prev) => ({
      ...prev,
      previous_attempts: prev.previous_attempts.includes(o)
        ? prev.previous_attempts.filter((x) => x !== o)
        : [...prev.previous_attempts, o],
    }));
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (form.first_name.trim().length < 2) return "Ton prénom (au moins 2 lettres).";
      const age = Number(form.age);
      if (!form.age || !Number.isFinite(age) || age < 16 || age > 99) return "Âge entre 16 et 99.";
      const h = Number(form.height_cm);
      if (!form.height_cm || !Number.isFinite(h) || h < 100 || h > 220) return "Taille entre 100 et 220 cm.";
      if (form.city.trim().length < 2) return "Ta ville.";
    }
    if (s === 2) {
      if (form.objectives.length === 0) return "Choisis au moins un objectif.";
      if (form.objectives.includes("weight_loss")) {
        const kg = Number(form.weight_loss_target_kg);
        if (!form.weight_loss_target_kg || !Number.isFinite(kg) || kg < 1 || kg > 50) {
          return "Combien de kilos viser ? (1 à 50)";
        }
      }
    }
    if (s === 4) {
      if (!form.breakfast) return "Comment se passe ton petit-déj ?";
      if (form.breakfast === "other" && form.breakfast_other.trim().length < 2) {
        return "Précise ton petit-déj.";
      }
      if (!form.lunch) return "Et le midi ?";
      if (!form.dinner) return "Et le soir ?";
    }
    if (s === 5) {
      if (!form.daily_food_budget) return "Quel budget alimentaire / jour ?";
      if (!form.active_daily) return "Actif au quotidien ? (oui/non)";
      if (!form.consent) return "Le consentement RGPD est obligatoire.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prev() {
    setErrorMsg("");
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep(5);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      // Payload structuré : top-level pour les champs indexables, le reste
      // dans payload jsonb (étapes 3-5 + dérivés).
      const payloadDetail = {
        previous_attempts: form.previous_attempts,
        previous_attempts_result: form.previous_attempts_result.trim() || null,
        habits: {
          breakfast: form.breakfast,
          breakfast_other:
            form.breakfast === "other" ? form.breakfast_other.trim() : null,
          lunch: form.lunch,
          dinner: form.dinner,
          fastfood_per_week: form.fastfood_per_week,
        },
        budget: form.daily_food_budget,
        active_daily: form.active_daily === "yes",
        active_daily_detail:
          form.active_daily === "yes" ? form.active_daily_detail.trim() || null : null,
      };

      const { data, error } = await sb.functions.invoke("submit-online-bilan", {
        body: {
          coach_slug: slug || null,
          first_name: form.first_name.trim(),
          age: Number(form.age),
          height_cm: Number(form.height_cm),
          city: form.city.trim(),
          objectives: form.objectives,
          weight_loss_target_kg: form.objectives.includes("weight_loss")
            ? Number(form.weight_loss_target_kg)
            : null,
          motivation_score: form.motivation_score,
          payload: payloadDetail,
          consent: form.consent,
        },
      });

      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly =
          raw === "rate_limited"
            ? "Trop de tentatives — merci de réessayer dans une heure."
            : raw;
        throw new Error(friendly);
      }

      // Succès → on nettoie l'autosave + redirect page remerciement
      try {
        localStorage.removeItem(storageKey);
      } catch {
        /* ignore */
      }
      const params = new URLSearchParams({
        firstName: form.first_name.trim(),
      });
      navigate(
        `/bilan-online${slug ? `/${slug}` : ""}/merci?${params.toString()}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      setErrorMsg(msg);
      setSubmitting(false);
    }
  }

  const progressPct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="bo-root">
      <style>{STYLES}</style>

      <div className="bo-container">
        {/* Progress bar */}
        <div className="bo-progress-wrap" aria-label={`Étape ${step} sur ${TOTAL_STEPS}`}>
          <div className="bo-progress-label">
            Étape {step}/{TOTAL_STEPS}
          </div>
          <div className="bo-progress-track">
            <div className="bo-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {step === 1 && (
          <StepIdentity form={form} update={update} />
        )}
        {step === 2 && (
          <StepObjectives form={form} update={update} toggle={toggleObjective} />
        )}
        {step === 3 && (
          <StepExperience form={form} update={update} toggle={togglePreviousAttempt} />
        )}
        {step === 4 && (
          <StepHabits form={form} update={update} />
        )}
        {step === 5 && (
          <StepBudget form={form} update={update} />
        )}

        {errorMsg && <div className="bo-error" role="alert">{errorMsg}</div>}

        <div className="bo-nav">
          {step > 1 && (
            <button
              type="button"
              className="bo-btn bo-btn-ghost"
              onClick={prev}
              disabled={submitting}
            >
              ← Précédent
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              type="button"
              className="bo-btn bo-btn-primary"
              onClick={next}
              disabled={submitting}
            >
              Continuer →
            </button>
          ) : (
            <button
              type="button"
              className="bo-btn bo-btn-primary"
              onClick={submit}
              disabled={submitting || !form.consent}
            >
              {submitting ? "Envoi…" : "Envoyer mon bilan"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants étapes ────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

function StepIdentity({ form, update }: StepProps) {
  return (
    <section className="bo-step">
      <h1 className="bo-h1">Faisons connaissance 👋</h1>
      <p className="bo-sub">Quelques infos rapides pour personnaliser ton bilan.</p>

      <Field label="Prénom" required>
        <input
          type="text"
          className="bo-input"
          value={form.first_name}
          onChange={(e) => update("first_name", e.target.value)}
          maxLength={50}
          autoComplete="given-name"
          placeholder="Marie, Karim…"
        />
      </Field>

      <div className="bo-row">
        <Field label="Âge" required>
          <input
            type="number"
            className="bo-input"
            value={form.age}
            onChange={(e) => update("age", e.target.value)}
            min={16}
            max={99}
            inputMode="numeric"
          />
        </Field>
        <Field label="Taille (cm)" required>
          <input
            type="number"
            className="bo-input"
            value={form.height_cm}
            onChange={(e) => update("height_cm", e.target.value)}
            min={100}
            max={220}
            inputMode="numeric"
          />
        </Field>
      </div>

      <Field label="Ville" required>
        <input
          type="text"
          className="bo-input"
          value={form.city}
          onChange={(e) => update("city", e.target.value)}
          maxLength={80}
          autoComplete="address-level2"
          placeholder="Paris, Lyon…"
        />
      </Field>
    </section>
  );
}

function StepObjectives({
  form,
  update,
  toggle,
}: StepProps & { toggle: (o: ObjectiveKey) => void }) {
  const OBJECTIVES: { key: ObjectiveKey; label: string; emoji: string }[] = [
    { key: "weight_loss", label: "Perte de poids", emoji: "⚖️" },
    { key: "mass_gain", label: "Prise de masse", emoji: "💪" },
    { key: "energy", label: "Plus d'énergie", emoji: "⚡" },
    { key: "sleep", label: "Mieux dormir / récupérer", emoji: "😴" },
    { key: "wellbeing", label: "Bien-être général", emoji: "🌿" },
  ];

  return (
    <section className="bo-step">
      <h1 className="bo-h1">Tes objectifs 🎯</h1>
      <p className="bo-sub">Choisis ce qui te parle (plusieurs réponses possibles).</p>

      <div className="bo-cards">
        {OBJECTIVES.map((o) => {
          const active = form.objectives.includes(o.key);
          return (
            <button
              key={o.key}
              type="button"
              className={`bo-card ${active ? "bo-card-active" : ""}`}
              onClick={() => toggle(o.key)}
              aria-pressed={active}
            >
              <span className="bo-card-emoji">{o.emoji}</span>
              <span className="bo-card-label">{o.label}</span>
            </button>
          );
        })}
      </div>

      {form.objectives.includes("weight_loss") && (
        <Field label="Combien de kilos viser ?" required>
          <input
            type="number"
            className="bo-input"
            value={form.weight_loss_target_kg}
            onChange={(e) => update("weight_loss_target_kg", e.target.value)}
            min={1}
            max={50}
            inputMode="numeric"
            placeholder="5"
          />
        </Field>
      )}

      <Field label={`Motivation — ${form.motivation_score}/10`}>
        <input
          type="range"
          className="bo-range"
          min={1}
          max={10}
          step={1}
          value={form.motivation_score}
          onChange={(e) => update("motivation_score", Number(e.target.value))}
        />
        <div className="bo-range-legend">
          <span>Je teste pour voir</span>
          <span>Prêt à m'engager</span>
        </div>
      </Field>
    </section>
  );
}

function StepExperience({
  form,
  update,
  toggle,
}: StepProps & { toggle: (o: PreviousAttempt) => void }) {
  const ATTEMPTS: { key: PreviousAttempt; label: string }[] = [
    { key: "diet", label: "Régimes" },
    { key: "coach", label: "Coach / accompagnement" },
    { key: "sport", label: "Sport" },
    { key: "supplements", label: "Suppléments" },
    { key: "nothing", label: "Rien encore" },
  ];

  const hasAttempt = form.previous_attempts.some((a) => a !== "nothing");

  return (
    <section className="bo-step">
      <h1 className="bo-h1">Ton vécu 🌱</h1>
      <p className="bo-sub">As-tu déjà essayé quelque chose pour ça ?</p>

      <div className="bo-checks">
        {ATTEMPTS.map((a) => {
          const active = form.previous_attempts.includes(a.key);
          return (
            <button
              key={a.key}
              type="button"
              className={`bo-check ${active ? "bo-check-active" : ""}`}
              onClick={() => toggle(a.key)}
              aria-pressed={active}
            >
              <span className="bo-check-tick">{active ? "✓" : ""}</span>
              <span>{a.label}</span>
            </button>
          );
        })}
      </div>

      {hasAttempt && (
        <Field label="Qu'est-ce que ça a donné ? (optionnel)">
          <textarea
            className="bo-textarea"
            value={form.previous_attempts_result}
            onChange={(e) => update("previous_attempts_result", e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Ce qui a marché, ce qui n'a pas marché…"
          />
        </Field>
      )}
    </section>
  );
}

function StepHabits({ form, update }: StepProps) {
  const BREAKFAST: { key: MealType; label: string; emoji: string }[] = [
    { key: "sweet", label: "Sucré", emoji: "🥐" },
    { key: "salty", label: "Salé", emoji: "🥚" },
    { key: "smoothie", label: "Smoothie / healthy", emoji: "🥤" },
    { key: "coffee_only", label: "Café seulement / rien", emoji: "☕" },
    { key: "other", label: "Autre", emoji: "✏️" },
  ];
  const LUNCH: { key: MealType; label: string; emoji: string }[] = [
    { key: "home", label: "Maison", emoji: "🏠" },
    { key: "canteen", label: "Cantine / resto", emoji: "🍽️" },
    { key: "sandwich", label: "Sandwich / wrap", emoji: "🥪" },
    { key: "fastfood", label: "Fast-food", emoji: "🍔" },
    { key: "skip", label: "Je saute", emoji: "⏭️" },
  ];
  const DINNER: { key: MealType; label: string; emoji: string }[] = [
    { key: "home", label: "Maison", emoji: "🏠" },
    { key: "delivery", label: "Livraison", emoji: "🛵" },
    { key: "fastfood", label: "Fast-food", emoji: "🍔" },
    { key: "light", label: "Léger / snack", emoji: "🥗" },
    { key: "skip", label: "Je saute", emoji: "⏭️" },
  ];

  return (
    <section className="bo-step">
      <h1 className="bo-h1">Tes habitudes 🍽️</h1>
      <p className="bo-sub">Au plus juste — pas de jugement, juste comprendre.</p>

      <Field label="Petit-déj" required>
        <RadioCards
          options={BREAKFAST}
          value={form.breakfast}
          onChange={(v) => update("breakfast", v as MealType)}
        />
        {form.breakfast === "other" && (
          <input
            type="text"
            className="bo-input"
            value={form.breakfast_other}
            onChange={(e) => update("breakfast_other", e.target.value)}
            maxLength={50}
            placeholder="Précise…"
            style={{ marginTop: 10 }}
          />
        )}
      </Field>

      <Field label="Midi" required>
        <RadioCards
          options={LUNCH}
          value={form.lunch}
          onChange={(v) => update("lunch", v as MealType)}
        />
      </Field>

      <Field label="Soir" required>
        <RadioCards
          options={DINNER}
          value={form.dinner}
          onChange={(v) => update("dinner", v as MealType)}
        />
      </Field>

      <Field label={`Fast-food / semaine — ${form.fastfood_per_week}${form.fastfood_per_week >= 7 ? "+" : ""}`}>
        <input
          type="range"
          className="bo-range"
          min={0}
          max={7}
          step={1}
          value={form.fastfood_per_week}
          onChange={(e) => update("fastfood_per_week", Number(e.target.value))}
        />
        <div className="bo-range-legend">
          <span>0</span>
          <span>7+</span>
        </div>
      </Field>
    </section>
  );
}

function StepBudget({ form, update }: StepProps) {
  const BUDGETS: { key: BudgetTier; label: string }[] = [
    { key: "2", label: "2 €" },
    { key: "4", label: "4 €" },
    { key: "8", label: "8 €" },
    { key: "10", label: "10 €" },
    { key: "15+", label: "15 € et +" },
  ];

  return (
    <section className="bo-step">
      <h1 className="bo-h1">Dernière étape ✨</h1>
      <p className="bo-sub">Budget et activité, puis on te recontacte.</p>

      <Field label="Budget alimentaire / jour" required>
        <div className="bo-budget-grid">
          {BUDGETS.map((b) => {
            const active = form.daily_food_budget === b.key;
            return (
              <button
                key={b.key}
                type="button"
                className={`bo-budget ${active ? "bo-budget-active" : ""}`}
                onClick={() => update("daily_food_budget", b.key)}
                aria-pressed={active}
              >
                💰 {b.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Actif au quotidien ? (marche, escaliers, manuel…)" required>
        <div className="bo-yesno">
          <button
            type="button"
            className={`bo-yesno-btn ${form.active_daily === "yes" ? "bo-yesno-active" : ""}`}
            onClick={() => update("active_daily", "yes")}
            aria-pressed={form.active_daily === "yes"}
          >
            Oui
          </button>
          <button
            type="button"
            className={`bo-yesno-btn ${form.active_daily === "no" ? "bo-yesno-active" : ""}`}
            onClick={() => update("active_daily", "no")}
            aria-pressed={form.active_daily === "no"}
          >
            Non
          </button>
        </div>
        {form.active_daily === "yes" && (
          <input
            type="text"
            className="bo-input"
            value={form.active_daily_detail}
            onChange={(e) => update("active_daily_detail", e.target.value)}
            maxLength={100}
            placeholder="Quoi ? (optionnel)"
            style={{ marginTop: 10 }}
          />
        )}
      </Field>

      <label className="bo-consent">
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
        />
        <span>
          J'accepte que mes données soient transmises à mon coach pour analyse
          de mon bilan.
        </span>
      </label>
    </section>
  );
}

// ─── Petits helpers UI ─────────────────────────────────────────────────────

function Field({
  label,
  children,
  required,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="bo-field">
      <label className="bo-label">
        {label}
        {required && <span className="bo-req"> *</span>}
      </label>
      {children}
    </div>
  );
}

function RadioCards({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string; emoji: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bo-radio-grid">
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            className={`bo-radio ${active ? "bo-radio-active" : ""}`}
            onClick={() => onChange(o.key)}
            aria-pressed={active}
          >
            <span className="bo-radio-emoji">{o.emoji}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Styles inline (mobile-first, self-contained) ─────────────────────────

const STYLES = `
  .bo-root {
    min-height: 100vh;
    min-height: 100dvh;
    color-scheme: light;
    background:
      radial-gradient(circle at 20% 10%, rgba(16, 185, 129, 0.18) 0%, transparent 55%),
      radial-gradient(circle at 80% 30%, rgba(6, 182, 212, 0.16) 0%, transparent 55%),
      radial-gradient(circle at 50% 100%, rgba(139, 92, 246, 0.14) 0%, transparent 60%),
      #FAFAF7;
    color: #0F172A;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding: 16px;
    padding-bottom: env(safe-area-inset-bottom, 16px);
  }
  .bo-container {
    max-width: 560px;
    margin: 0 auto;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.6);
    border-radius: 24px;
    padding: 24px 20px;
    box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08);
  }
  .bo-progress-wrap { margin-bottom: 24px; }
  .bo-progress-label {
    font-size: 13px;
    font-weight: 600;
    color: #C9A84C;
    margin-bottom: 8px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
  .bo-progress-track {
    width: 100%;
    height: 6px;
    background: #F2F4EE;
    border-radius: 999px;
    overflow: hidden;
  }
  .bo-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #C9A84C 0%, #E0BF6B 100%);
    border-radius: 999px;
    transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1);
  }

  .bo-step { display: flex; flex-direction: column; gap: 16px; }
  .bo-h1 {
    font-family: 'Sora', 'Inter', sans-serif;
    font-size: 26px;
    font-weight: 700;
    margin: 0;
    color: #0F172A;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  .bo-sub {
    font-size: 15px;
    color: #4B5563;
    margin: 0 0 8px 0;
  }
  .bo-field { display: flex; flex-direction: column; gap: 8px; }
  .bo-label {
    font-size: 14px;
    font-weight: 600;
    color: #1F2937;
  }
  .bo-req { color: #C9A84C; }
  .bo-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .bo-root .bo-input,
  .bo-root .bo-textarea {
    width: 100%;
    font-size: 16px;
    font-family: inherit;
    padding: 12px 14px;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    background: #ffffff !important;
    color: #0F172A !important;
    -webkit-text-fill-color: #0F172A;
    color-scheme: light;
    transition: border-color 160ms, box-shadow 160ms;
    min-height: 48px;
    box-sizing: border-box;
  }
  .bo-root .bo-input::placeholder,
  .bo-root .bo-textarea::placeholder { color: #9CA3AF !important; opacity: 1; }
  .bo-root input[type="range"].bo-range {
    background: transparent !important;
  }
  .bo-textarea { min-height: 88px; resize: vertical; }
  .bo-input:focus,
  .bo-textarea:focus {
    outline: none;
    border-color: #C9A84C;
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }

  .bo-range {
    width: 100%;
    accent-color: #C9A84C;
    min-height: 44px;
  }
  .bo-range-legend {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #6B7280;
  }

  .bo-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .bo-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 16px 10px;
    background: #ffffff;
    border: 1.5px solid #E5E7EB;
    border-radius: 14px;
    cursor: pointer;
    transition: all 160ms;
    min-height: 90px;
    font-family: inherit;
    font-size: 14px;
    color: #1F2937;
    text-align: center;
    -webkit-tap-highlight-color: transparent;
  }
  .bo-card-active {
    border-color: #C9A84C;
    background: rgba(201, 168, 76, 0.08);
    box-shadow: 0 4px 12px rgba(201, 168, 76, 0.15);
  }
  .bo-card-emoji { font-size: 26px; }
  .bo-card-label { font-weight: 500; line-height: 1.25; }

  .bo-checks { display: flex; flex-direction: column; gap: 8px; }
  .bo-check {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    cursor: pointer;
    font-size: 15px;
    color: #1F2937;
    font-family: inherit;
    text-align: left;
    min-height: 48px;
  }
  .bo-check-active {
    border-color: #C9A84C;
    background: rgba(201, 168, 76, 0.06);
  }
  .bo-check-tick {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1.5px solid #D1D5DB;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: #C9A84C;
    font-weight: 700;
    background: #fff;
  }
  .bo-check-active .bo-check-tick {
    border-color: #C9A84C;
    background: #fff;
  }

  .bo-radio-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .bo-radio {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    font-size: 14px;
    color: #1F2937;
    font-family: inherit;
    cursor: pointer;
    min-height: 48px;
    text-align: left;
  }
  .bo-radio-active {
    border-color: #C9A84C;
    background: rgba(201, 168, 76, 0.08);
  }
  .bo-radio-emoji { font-size: 18px; }

  .bo-budget-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }
  .bo-budget {
    padding: 14px 12px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    color: #1F2937;
    font-family: inherit;
    cursor: pointer;
    min-height: 48px;
  }
  .bo-budget-active {
    border-color: #C9A84C;
    background: rgba(201, 168, 76, 0.08);
  }

  .bo-yesno { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .bo-yesno-btn {
    padding: 14px;
    background: #fff;
    border: 1.5px solid #E5E7EB;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    color: #1F2937;
    font-family: inherit;
    cursor: pointer;
    min-height: 52px;
  }
  .bo-yesno-active {
    border-color: #C9A84C;
    background: rgba(201, 168, 76, 0.10);
    color: #C9A84C;
  }

  .bo-consent {
    display: flex;
    gap: 10px;
    align-items: flex-start;
    padding: 14px;
    background: #FAFAF7;
    border: 1px solid #E5E7EB;
    border-radius: 12px;
    font-size: 13px;
    line-height: 1.45;
    color: #374151;
    cursor: pointer;
  }
  .bo-consent input { margin-top: 2px; min-width: 18px; min-height: 18px; }

  .bo-error {
    background: #FEE2E2;
    color: #991B1B;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    margin-top: 12px;
  }

  .bo-nav {
    display: flex;
    gap: 10px;
    margin-top: 24px;
    flex-direction: row-reverse;
  }
  .bo-btn {
    flex: 1;
    padding: 14px 18px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    min-height: 52px;
    border: 1.5px solid transparent;
    transition: all 160ms;
  }
  .bo-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .bo-btn-primary {
    background: linear-gradient(90deg, #C9A84C 0%, #E0BF6B 100%);
    color: #fff;
    box-shadow: 0 4px 14px rgba(201, 168, 76, 0.30);
  }
  .bo-btn-primary:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 18px rgba(201, 168, 76, 0.38);
  }
  .bo-btn-ghost {
    background: transparent;
    color: #6B7280;
    border-color: #E5E7EB;
  }

  @media (min-width: 640px) {
    .bo-root { padding: 32px; }
    .bo-container { padding: 32px; }
    .bo-h1 { font-size: 28px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .bo-progress-fill,
    .bo-btn-primary:hover { transition: none; transform: none; }
  }
`;
