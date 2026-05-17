// =============================================================================
// BilanOnlinePage — Formulaire bilan online éditorial 5 étapes.
// Chantier #1 étape 1.3 (2026-05-17) — refonte design Claude Design.
// Route : /bilan-online/:coachSlug?/formulaire
//
// 5 étapes avec progress bar, auto-save localStorage, validation par étape.
// Design : Whoop × Aesop, Sora 600 H1 éditoriaux, cards glassmorphism,
// slider motivation gradient, CTA gold, microcopy RGPD.
// =============================================================================

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import {
  BO_TOKENS,
  BilanOnlineShell,
  BoEyebrow,
  BoHero,
  BoLead,
  BoCta,
  BoArrow,
  BoFooterRgpd,
} from "../components/bilan-online/BilanOnlineShell";

type ObjectiveKey = "weight_loss" | "mass_gain" | "energy" | "sleep" | "wellbeing";
type PreviousAttempt = "diet" | "coach" | "sport" | "supplements" | "nothing";
type MealType =
  | "sweet" | "salty" | "smoothie" | "coffee_only" | "other"
  | "home" | "canteen" | "sandwich" | "fastfood" | "skip"
  | "delivery" | "light";
type BudgetTier = "2" | "4" | "8" | "10" | "15+";

interface FormState {
  first_name: string;
  age: string;
  height_cm: string;
  city: string;
  objectives: ObjectiveKey[];
  weight_loss_target_kg: string;
  motivation_score: number;
  previous_attempts: PreviousAttempt[];
  previous_attempts_result: string;
  breakfast: MealType | "";
  breakfast_other: string;
  lunch: MealType | "";
  dinner: MealType | "";
  fastfood_per_week: number;
  daily_food_budget: BudgetTier | "";
  active_daily: "yes" | "no" | "";
  active_daily_detail: string;
  consent: boolean;
}

const INITIAL_FORM: FormState = {
  first_name: "", age: "", height_cm: "", city: "",
  objectives: [], weight_loss_target_kg: "", motivation_score: 7,
  previous_attempts: [], previous_attempts_result: "",
  breakfast: "", breakfast_other: "", lunch: "", dinner: "", fastfood_per_week: 0,
  daily_food_budget: "", active_daily: "", active_daily_detail: "",
  consent: false,
};

const TOTAL_STEPS = 5;
const STEP_LABELS = ["IDENTITÉ", "OBJECTIFS", "VÉCU", "HABITUDES", "BUDGET & VIE"];
const MOTIVATION_LABELS = [
  "Pas encore là", "Pas encore là", "En réflexion", "En réflexion",
  "Un peu hésitant(e)", "Tiède mais ok", "Décidé(e)",
  "Plutôt motivé(e)", "Très motivé(e)", "Engagé(e)", "Tout donner",
];

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
    } catch { /* ignore */ }
    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...form, _step: step }));
    } catch { /* ignore quota */ }
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
    if (err) { setErrorMsg(err); return; }
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
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      const payloadDetail = {
        previous_attempts: form.previous_attempts,
        previous_attempts_result: form.previous_attempts_result.trim() || null,
        habits: {
          breakfast: form.breakfast,
          breakfast_other: form.breakfast === "other" ? form.breakfast_other.trim() : null,
          lunch: form.lunch,
          dinner: form.dinner,
          fastfood_per_week: form.fastfood_per_week,
        },
        budget: form.daily_food_budget,
        active_daily: form.active_daily === "yes",
        active_daily_detail: form.active_daily === "yes" ? form.active_daily_detail.trim() || null : null,
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
            ? Number(form.weight_loss_target_kg) : null,
          motivation_score: form.motivation_score,
          payload: payloadDetail,
          consent: form.consent,
        },
      });

      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        const friendly = raw === "rate_limited"
          ? "Trop de tentatives — merci de réessayer dans une heure."
          : raw;
        throw new Error(friendly);
      }

      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      const params = new URLSearchParams({ firstName: form.first_name.trim() });
      navigate(`/bilan-online${slug ? `/${slug}` : ""}/merci?${params.toString()}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur inconnue.";
      setErrorMsg(msg);
      setSubmitting(false);
    }
  }

  const progress = step / TOTAL_STEPS;
  const eyebrow = `0${step} — ${STEP_LABELS[step - 1]}`;
  const heroes: Record<number, { title: string; lead: string }> = {
    1: { title: "Faisons connaissance.", lead: "Quelques infos rapides pour personnaliser ton bilan." },
    2: { title: "Parle-nous de ton objectif.", lead: "Choisis ce qui te parle. Tu peux en cocher plusieurs." },
    3: { title: "Et avant aujourd'hui ?", lead: "Ce que tu as essayé compte — on ne juge pas, on comprend." },
    4: { title: "Ce que tu manges en vrai.", lead: "Au plus juste — pas de jugement, juste comprendre." },
    5: { title: "Dernière étape.", lead: "Budget et activité, puis on te recontacte." },
  };
  const hero = heroes[step];

  return (
    <BilanOnlineShell progress={progress}>
      <div style={{
        padding: "clamp(56px, 8vw, 112px) clamp(20px, 5vw, 56px) clamp(40px, 5vw, 80px)",
        maxWidth: "clamp(560px, 60vw, 720px)", margin: "0 auto",
      }}>
        <BoEyebrow>{eyebrow}</BoEyebrow>
        <div style={{ height: 24 }} />
        <BoHero>{hero.title}</BoHero>
        <div style={{ height: 16 }} />
        <BoLead>{hero.lead}</BoLead>
        <div style={{ height: 40 }} />

        {step === 1 && <StepIdentity form={form} update={update} />}
        {step === 2 && (
          <StepObjectives
            form={form}
            update={update}
            toggle={toggleObjective}
          />
        )}
        {step === 3 && (
          <StepExperience
            form={form}
            update={update}
            toggle={togglePreviousAttempt}
          />
        )}
        {step === 4 && <StepHabits form={form} update={update} />}
        {step === 5 && <StepBudget form={form} update={update} />}

        {errorMsg && (
          <div style={{
            marginTop: 24, padding: "12px 16px", borderRadius: 12,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.20)",
            color: "#991B1B",
            fontFamily: BO_TOKENS.fontBody, fontSize: 14, lineHeight: 1.45,
          }} role="alert">
            {errorMsg}
          </div>
        )}

        <div style={{ height: 32 }} />

        {step < TOTAL_STEPS ? (
          <BoCta onClick={next} disabled={submitting}>
            Suivant
            <BoArrow />
          </BoCta>
        ) : (
          <BoCta onClick={submit} disabled={submitting || !form.consent}>
            {submitting ? "Envoi…" : "Envoyer mon bilan"}
            {!submitting && <BoArrow />}
          </BoCta>
        )}

        {step > 1 && (
          <>
            <div style={{ height: 12 }} />
            <button
              type="button"
              onClick={prev}
              disabled={submitting}
              style={{
                all: "unset", width: "100%", textAlign: "center", cursor: "pointer",
                padding: "10px 0",
                fontFamily: BO_TOKENS.fontBody, fontSize: 13,
                color: BO_TOKENS.navy, opacity: 0.55,
                letterSpacing: 0.1,
              }}
            >
              ← Précédent
            </button>
          </>
        )}

        <div style={{ height: 16 }} />
        <BoFooterRgpd />
        <div style={{ height: 24 }} />
      </div>
    </BilanOnlineShell>
  );
}

// ── Steps ─────────────────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}

function StepIdentity({ form, update }: StepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Prénom" required>
        <BoInput
          value={form.first_name}
          onChange={(v) => update("first_name", v)}
          maxLength={50}
          autoComplete="given-name"
          placeholder="Marie, Karim…"
        />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Âge" required>
          <BoInput
            type="number" inputMode="numeric"
            value={form.age}
            onChange={(v) => update("age", v)}
            min={16} max={99}
          />
        </Field>
        <Field label="Taille (cm)" required>
          <BoInput
            type="number" inputMode="numeric"
            value={form.height_cm}
            onChange={(v) => update("height_cm", v)}
            min={100} max={220}
          />
        </Field>
      </div>

      <Field label="Ville" required>
        <BoInput
          value={form.city}
          onChange={(v) => update("city", v)}
          maxLength={80}
          autoComplete="address-level2"
          placeholder="Paris, Lyon…"
        />
      </Field>
    </div>
  );
}

function StepObjectives({
  form, update, toggle,
}: StepProps & { toggle: (o: ObjectiveKey) => void }) {
  const OBJECTIVES: { key: ObjectiveKey; emoji: string; label: string; full?: boolean }[] = [
    { key: "weight_loss", emoji: "⚖️", label: "Perte de poids" },
    { key: "mass_gain", emoji: "💪", label: "Prise de masse" },
    { key: "energy", emoji: "⚡", label: "Plus d'énergie" },
    { key: "sleep", emoji: "😴", label: "Mieux dormir" },
    { key: "wellbeing", emoji: "🌿", label: "Bien-être général", full: true },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {OBJECTIVES.map((o) => (
          <ObjCard
            key={o.key}
            emoji={o.emoji}
            label={o.label}
            full={o.full}
            active={form.objectives.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
      </div>

      {form.objectives.includes("weight_loss") && (
        <Field label="Combien de kilos viser ?" required>
          <BoInput
            type="number" inputMode="numeric"
            value={form.weight_loss_target_kg}
            onChange={(v) => update("weight_loss_target_kg", v)}
            min={1} max={50}
            placeholder="5"
          />
        </Field>
      )}

      <MotivationSlider
        value={form.motivation_score}
        onChange={(v) => update("motivation_score", v)}
      />
    </div>
  );
}

function StepExperience({
  form, update, toggle,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {ATTEMPTS.map((a) => (
          <ChipRow
            key={a.key}
            label={a.label}
            active={form.previous_attempts.includes(a.key)}
            onClick={() => toggle(a.key)}
          />
        ))}
      </div>

      {hasAttempt && (
        <Field label="Qu'est-ce que ça a donné ? (optionnel)">
          <BoTextarea
            value={form.previous_attempts_result}
            onChange={(v) => update("previous_attempts_result", v)}
            maxLength={200}
            rows={3}
            placeholder="Ce qui a marché, ce qui n'a pas marché…"
          />
        </Field>
      )}
    </div>
  );
}

function StepHabits({ form, update }: StepProps) {
  const BREAKFAST: { key: MealType; emoji: string; label: string }[] = [
    { key: "sweet", emoji: "🥐", label: "Sucré" },
    { key: "salty", emoji: "🥚", label: "Salé" },
    { key: "smoothie", emoji: "🥤", label: "Smoothie / healthy" },
    { key: "coffee_only", emoji: "☕", label: "Café seulement / rien" },
    { key: "other", emoji: "✏️", label: "Autre" },
  ];
  const LUNCH: { key: MealType; emoji: string; label: string }[] = [
    { key: "home", emoji: "🏠", label: "Maison" },
    { key: "canteen", emoji: "🍽️", label: "Cantine / resto" },
    { key: "sandwich", emoji: "🥪", label: "Sandwich / wrap" },
    { key: "fastfood", emoji: "🍔", label: "Fast-food" },
    { key: "skip", emoji: "⏭️", label: "Je saute" },
  ];
  const DINNER: { key: MealType; emoji: string; label: string }[] = [
    { key: "home", emoji: "🏠", label: "Maison" },
    { key: "delivery", emoji: "🛵", label: "Livraison" },
    { key: "fastfood", emoji: "🍔", label: "Fast-food" },
    { key: "light", emoji: "🥗", label: "Léger / snack" },
    { key: "skip", emoji: "⏭️", label: "Je saute" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <Field label="Petit-déj" required>
        <RadioGrid
          options={BREAKFAST}
          value={form.breakfast}
          onChange={(v) => update("breakfast", v as MealType)}
        />
        {form.breakfast === "other" && (
          <div style={{ marginTop: 10 }}>
            <BoInput
              value={form.breakfast_other}
              onChange={(v) => update("breakfast_other", v)}
              maxLength={50}
              placeholder="Précise…"
            />
          </div>
        )}
      </Field>

      <Field label="Midi" required>
        <RadioGrid
          options={LUNCH}
          value={form.lunch}
          onChange={(v) => update("lunch", v as MealType)}
        />
      </Field>

      <Field label="Soir" required>
        <RadioGrid
          options={DINNER}
          value={form.dinner}
          onChange={(v) => update("dinner", v as MealType)}
        />
      </Field>

      <FastfoodSlider
        value={form.fastfood_per_week}
        onChange={(v) => update("fastfood_per_week", v)}
      />
    </div>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <Field label="Budget alimentaire / jour" required>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {BUDGETS.map((b, i) => (
            <BudgetCard
              key={b.key}
              label={b.label}
              active={form.daily_food_budget === b.key}
              onClick={() => update("daily_food_budget", b.key)}
              full={i === BUDGETS.length - 1}
            />
          ))}
        </div>
      </Field>

      <Field label="Actif au quotidien ? (marche, escaliers, manuel…)" required>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <YesNoBtn
            active={form.active_daily === "yes"}
            onClick={() => update("active_daily", "yes")}
          >
            Oui
          </YesNoBtn>
          <YesNoBtn
            active={form.active_daily === "no"}
            onClick={() => update("active_daily", "no")}
          >
            Non
          </YesNoBtn>
        </div>
        {form.active_daily === "yes" && (
          <div style={{ marginTop: 10 }}>
            <BoInput
              value={form.active_daily_detail}
              onChange={(v) => update("active_daily_detail", v)}
              maxLength={100}
              placeholder="Quoi ? (optionnel)"
            />
          </div>
        )}
      </Field>

      <label style={{
        display: "flex", gap: 10, alignItems: "flex-start",
        padding: 16, background: "rgba(255, 255, 255, 0.65)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        border: `1px solid ${BO_TOKENS.hair}`, borderRadius: 14,
        fontFamily: BO_TOKENS.fontBody, fontSize: 13, lineHeight: 1.5,
        color: BO_TOKENS.navy, cursor: "pointer",
      }}>
        <input
          type="checkbox"
          checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
          style={{ marginTop: 2, minWidth: 18, minHeight: 18, accentColor: BO_TOKENS.gold }}
        />
        <span>
          J'accepte que mes données soient transmises à mon coach pour
          l'analyse de mon bilan personnalisé.
        </span>
      </label>
    </div>
  );
}

// ── Primitives UI ─────────────────────────────────────────────────────────

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label style={{
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 14,
        color: BO_TOKENS.navy, letterSpacing: "-0.005em",
      }}>
        {label}
        {required && <span style={{ color: BO_TOKENS.gold, marginLeft: 4 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

interface BoInputProps {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: "text" | "numeric" | "decimal";
  maxLength?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  autoComplete?: string;
}
function BoInput(p: BoInputProps) {
  return (
    <input
      type={p.type ?? "text"}
      inputMode={p.inputMode}
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      maxLength={p.maxLength}
      min={p.min} max={p.max}
      placeholder={p.placeholder}
      autoComplete={p.autoComplete}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "14px 16px", borderRadius: 14,
        border: `1.5px solid ${BO_TOKENS.hair}`,
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontFamily: BO_TOKENS.fontBody, fontSize: 16, fontWeight: 400,
        color: BO_TOKENS.navy,
        outline: "none", minHeight: 50,
        transition: "border-color 160ms, box-shadow 160ms",
        colorScheme: "light",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = BO_TOKENS.gold;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(201, 168, 76, 0.15)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = BO_TOKENS.hair;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function BoTextarea(p: { value: string; onChange: (v: string) => void; maxLength?: number; rows?: number; placeholder?: string }) {
  return (
    <textarea
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      maxLength={p.maxLength}
      rows={p.rows ?? 3}
      placeholder={p.placeholder}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "14px 16px", borderRadius: 14,
        border: `1.5px solid ${BO_TOKENS.hair}`,
        background: "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        fontFamily: BO_TOKENS.fontBody, fontSize: 15, lineHeight: 1.5,
        color: BO_TOKENS.navy,
        outline: "none", resize: "vertical", minHeight: 88,
        transition: "border-color 160ms, box-shadow 160ms",
        colorScheme: "light",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = BO_TOKENS.gold;
        e.currentTarget.style.boxShadow = `0 0 0 3px rgba(201, 168, 76, 0.15)`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = BO_TOKENS.hair;
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

function ObjCard({
  emoji, label, active, onClick, full,
}: { emoji: string; label: string; active: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: "unset", cursor: "pointer",
        gridColumn: full ? "span 2" : "auto",
        boxSizing: "border-box", minHeight: 96,
        padding: "20px 16px", borderRadius: 14,
        background: active
          ? "color-mix(in oklab, #C9A84C 8%, rgba(255, 255, 255, 0.92))"
          : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(16px) saturate(160%)",
        WebkitBackdropFilter: "blur(16px) saturate(160%)",
        border: `1.5px solid ${active ? BO_TOKENS.gold : BO_TOKENS.hair}`,
        boxShadow: active
          ? "0 4px 14px rgba(201, 168, 76, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6)"
          : "0 1px 0 rgba(15, 23, 42, 0.02), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 8, transition: "all 220ms cubic-bezier(.2, .7, .2, 1)",
        position: "relative",
      }}
    >
      <span style={{
        fontSize: 28, lineHeight: 1,
        filter: active ? "none" : "saturate(0.92)",
      }}>
        {emoji}
      </span>
      <span style={{
        fontFamily: BO_TOKENS.fontBody, fontWeight: 500, fontSize: 15,
        color: BO_TOKENS.navy, letterSpacing: -0.1,
      }}>
        {label}
      </span>
      {active && (
        <span style={{
          position: "absolute", top: 10, right: 10,
          width: 16, height: 16, borderRadius: 999,
          background: BO_TOKENS.gold, color: "white",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, fontWeight: 700,
        }}>
          ✓
        </span>
      )}
    </button>
  );
}

function ChipRow({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: "unset", cursor: "pointer",
        boxSizing: "border-box", width: "100%",
        padding: "14px 16px", borderRadius: 14,
        background: active
          ? "color-mix(in oklab, #C9A84C 6%, rgba(255, 255, 255, 0.92))"
          : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid ${active ? BO_TOKENS.gold : BO_TOKENS.hair}`,
        display: "flex", alignItems: "center", gap: 12,
        fontFamily: BO_TOKENS.fontBody, fontSize: 15, color: BO_TOKENS.navy,
        minHeight: 50, transition: "all 200ms cubic-bezier(.2, .7, .2, 1)",
      }}
    >
      <span style={{
        width: 20, height: 20, borderRadius: 6,
        border: `1.5px solid ${active ? BO_TOKENS.gold : "#D1D5DB"}`,
        background: active ? BO_TOKENS.gold : "white",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "white", fontSize: 12, fontWeight: 700,
        flexShrink: 0,
      }}>
        {active ? "✓" : ""}
      </span>
      <span>{label}</span>
    </button>
  );
}

function RadioGrid({
  options, value, onChange,
}: {
  options: { key: string; emoji: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      {options.map((o) => {
        const active = value === o.key;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            style={{
              all: "unset", cursor: "pointer",
              boxSizing: "border-box", minHeight: 56,
              padding: "12px 14px", borderRadius: 12,
              background: active
                ? "color-mix(in oklab, #C9A84C 8%, rgba(255, 255, 255, 0.92))"
                : "rgba(255, 255, 255, 0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: `1.5px solid ${active ? BO_TOKENS.gold : BO_TOKENS.hair}`,
              display: "flex", alignItems: "center", gap: 10,
              fontFamily: BO_TOKENS.fontBody, fontSize: 14,
              color: BO_TOKENS.navy,
              transition: "all 200ms cubic-bezier(.2, .7, .2, 1)",
            }}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>{o.emoji}</span>
            <span>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BudgetCard({
  label, active, onClick, full,
}: { label: string; active: boolean; onClick: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: "unset", cursor: "pointer",
        gridColumn: full ? "span 2" : "auto",
        boxSizing: "border-box", minHeight: 60,
        padding: "16px 14px", borderRadius: 14,
        background: active
          ? "color-mix(in oklab, #C9A84C 8%, rgba(255, 255, 255, 0.92))"
          : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid ${active ? BO_TOKENS.gold : BO_TOKENS.hair}`,
        textAlign: "center",
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 16,
        color: BO_TOKENS.navy,
        transition: "all 200ms cubic-bezier(.2, .7, .2, 1)",
      }}
    >
      {label}
    </button>
  );
}

function YesNoBtn({ children, active, onClick }: { children: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={{
        all: "unset", cursor: "pointer",
        boxSizing: "border-box", minHeight: 56,
        padding: "14px 16px", borderRadius: 14,
        background: active
          ? "color-mix(in oklab, #C9A84C 10%, rgba(255, 255, 255, 0.92))"
          : "rgba(255, 255, 255, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: `1.5px solid ${active ? BO_TOKENS.gold : BO_TOKENS.hair}`,
        textAlign: "center",
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 16,
        color: active ? BO_TOKENS.gold : BO_TOKENS.navy,
        transition: "all 200ms cubic-bezier(.2, .7, .2, 1)",
      }}
    >
      {children}
    </button>
  );
}

// ── Sliders ────────────────────────────────────────────────────────────────

function MotivationSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const pct = value / 10;

  const setFromEvent = useCallback((clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(x * 10));
  }, [onChange]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      setFromEvent(cx);
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move as EventListener, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move as EventListener);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, setFromEvent]);

  return (
    <div>
      <div style={{
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 16,
        color: BO_TOKENS.navy, letterSpacing: -0.1,
      }}>
        Ta motivation, tu la situes à combien sur 10 ?
      </div>
      <div style={{ height: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{
          fontFamily: BO_TOKENS.fontDisplay, fontWeight: 600, fontSize: 32,
          color: BO_TOKENS.gold, letterSpacing: "-0.02em", lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {value}
        </div>
        <div style={{
          fontFamily: BO_TOKENS.fontBody, fontWeight: 400, fontSize: 13,
          color: BO_TOKENS.navy, opacity: 0.7,
        }}>
          {MOTIVATION_LABELS[value]}
        </div>
      </div>
      <div style={{ height: 16 }} />
      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setFromEvent(e.clientX); }}
        onTouchStart={(e) => { setDragging(true); setFromEvent(e.touches[0].clientX); }}
        style={{
          position: "relative", height: 24, width: "100%",
          display: "flex", alignItems: "center", cursor: "pointer",
          touchAction: "none",
        }}
      >
        <div style={{
          position: "absolute", left: 0, right: 0, height: 6, borderRadius: 6,
          background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 50%, #10B981 100%)",
          boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
        }} />
        <div style={{
          position: "absolute", left: `calc(${pct * 100}% - 12px)`,
          width: 24, height: 24, borderRadius: 999,
          background: "white", border: `2px solid ${BO_TOKENS.gold}`,
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.20), 0 0 0 6px rgba(201, 168, 76, 0.06)",
          transition: dragging ? "none" : "left 160ms cubic-bezier(.2, .7, .2, 1)",
        }} />
      </div>
      <div style={{
        marginTop: 8, display: "flex", justifyContent: "space-between",
        fontFamily: BO_TOKENS.fontBody, fontSize: 11, color: BO_TOKENS.navy, opacity: 0.45,
        letterSpacing: 0.4, textTransform: "uppercase",
      }}>
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

function FastfoodSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const pct = value / 7;
  const label = value === 0 ? "Jamais" : value <= 2 ? "Modéré" : value <= 4 ? "Souvent" : value <= 6 ? "Beaucoup" : "Très fréquent";

  const setFromEvent = useCallback((clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    onChange(Math.round(x * 7));
  }, [onChange]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent | TouchEvent) => {
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      setFromEvent(cx);
    };
    const up = () => setDragging(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move as EventListener, { passive: true });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move as EventListener);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, setFromEvent]);

  return (
    <div>
      <div style={{
        fontFamily: BO_TOKENS.fontDisplay, fontWeight: 500, fontSize: 16,
        color: BO_TOKENS.navy, letterSpacing: -0.1,
      }}>
        Fast-food par semaine
      </div>
      <div style={{ height: 16 }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{
          fontFamily: BO_TOKENS.fontDisplay, fontWeight: 600, fontSize: 32,
          color: BO_TOKENS.gold, letterSpacing: "-0.02em", lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}>
          {value}{value >= 7 ? "+" : ""}
        </div>
        <div style={{
          fontFamily: BO_TOKENS.fontBody, fontWeight: 400, fontSize: 13,
          color: BO_TOKENS.navy, opacity: 0.7,
        }}>
          {label}
        </div>
      </div>
      <div style={{ height: 16 }} />
      <div
        ref={trackRef}
        onMouseDown={(e) => { setDragging(true); setFromEvent(e.clientX); }}
        onTouchStart={(e) => { setDragging(true); setFromEvent(e.touches[0].clientX); }}
        style={{
          position: "relative", height: 24, width: "100%",
          display: "flex", alignItems: "center", cursor: "pointer",
          touchAction: "none",
        }}
      >
        <div style={{
          position: "absolute", left: 0, right: 0, height: 6, borderRadius: 6,
          background: "linear-gradient(90deg, #10B981 0%, #F59E0B 50%, #EF4444 100%)",
          boxShadow: "inset 0 1px 2px rgba(15, 23, 42, 0.08)",
        }} />
        <div style={{
          position: "absolute", left: `calc(${pct * 100}% - 12px)`,
          width: 24, height: 24, borderRadius: 999,
          background: "white", border: `2px solid ${BO_TOKENS.gold}`,
          boxShadow: "0 2px 8px rgba(15, 23, 42, 0.20), 0 0 0 6px rgba(201, 168, 76, 0.06)",
          transition: dragging ? "none" : "left 160ms cubic-bezier(.2, .7, .2, 1)",
        }} />
      </div>
      <div style={{
        marginTop: 8, display: "flex", justifyContent: "space-between",
        fontFamily: BO_TOKENS.fontBody, fontSize: 11, color: BO_TOKENS.navy, opacity: 0.45,
        letterSpacing: 0.4, textTransform: "uppercase",
      }}>
        <span>0</span><span>3-4</span><span>7+</span>
      </div>
    </div>
  );
}
