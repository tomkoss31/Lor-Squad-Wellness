// =============================================================================
// BilanOnlinePage V2 — formulaire bilan online 7 étapes (refonte 2026-05-27).
//
// V1 livré 2026-05-18 (5 étapes). V2 (chantier "bilan online V2") :
//  - Étape 1 : ajout téléphone + email (au moins un des deux requis)
//  - Étape 2 : ajout objectif "performance pro"
//  - Étape 3 : pivoté du passé au présent — "qu'est-ce que tu fais déjà ?"
//  - Étape 4 : refondu en auto-perception + hydratation (eau/café/sodas/alcool)
//  - Étape 5 NEW : sommeil + stress + charge mentale
//  - Étape 6 NEW : job + cercle de vie
//  - Étape 7 : finalize — activité + fréquence sport + budget + préférence contact + consent
//
// DB : phone + email = colonnes first-class (migration 20261123000000).
// Le reste va dans le payload jsonb existant. Edge fn submit-online-bilan
// étendue pour accepter phone/email.
//
// LocalStorage key bumpée à v2 pour invalider les drafts V1 incompatibles.
//
// Route : /bilan-online/:coachSlug?/formulaire
// =============================================================================

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import {
  PublicShell,
  PublicCtaPrimary,
  PUBLIC_TOKENS,
  PUBLIC_FONTS,
  publicGradText,
} from "../components/public/PublicShell";

// ── Types ───────────────────────────────────────────────────────────────────

type ObjectiveKey =
  | "weight_loss" | "mass_gain" | "energy" | "sleep" | "wellbeing" | "perf_pro";
type CurrentAction = "sport" | "good_food" | "supplements" | "coach" | "nothing";
type MealsBalanced = "yes" | "no" | "unsure";
type WaterTier = "1-3" | "4-6" | "7-10" | "10+";
type CoffeeTier = "0" | "1-2" | "3-4" | "5+";
type SodaTier = "0" | "1" | "2-3" | "4+";
type AlcoholTier = "0" | "1-3" | "4-7" | "8+";
type SleepQuality = "bad" | "meh" | "ok" | "great";
type SleepHours = "<6" | "6-7" | "7-8" | "8+";
type MentalLoad = "light" | "ok" | "heavy" | "crushed";
type JobFeeling = "great" | "valued" | "routine" | "demotivated" | "lost";
type SocialCircle = "family" | "couple" | "friends" | "alone";
type SportFrequency = "never" | "1x" | "2-3x" | "4+x";
type BudgetTier = "2" | "4" | "8" | "10" | "15+";
type ContactPref = "phone" | "email" | "whatsapp";

interface FormState {
  // Étape 1 — Identité + contact
  first_name: string;
  age: string;
  height_cm: string;
  city: string;
  phone: string;
  email: string;
  // Étape 2 — Objectifs
  objectives: ObjectiveKey[];
  weight_loss_target_kg: string;
  motivation_score: number;
  // Étape 3 — Présent
  current_actions: CurrentAction[];
  current_actions_detail: string;
  // Étape 4 — Assiette & verre
  meals_balanced: MealsBalanced | "";
  water_per_day: WaterTier | "";
  coffee_per_day: CoffeeTier | "";
  soda_per_day: SodaTier | "";
  alcohol_per_week: AlcoholTier | "";
  // Étape 5 — Sommeil & tête
  sleep_quality: SleepQuality | "";
  sleep_hours: SleepHours | "";
  stress_level: number;
  mental_load: MentalLoad | "";
  // Étape 6 — Job & cercle
  job_feeling: JobFeeling | "";
  social_circle: SocialCircle | "";
  // Étape 7 — Finalisation
  active_daily: "yes" | "no" | "";
  active_daily_detail: string;
  sport_frequency: SportFrequency | "";
  daily_food_budget: BudgetTier | "";
  contact_pref: ContactPref | "";
  consent: boolean;
}

const INITIAL: FormState = {
  first_name: "", age: "", height_cm: "", city: "",
  phone: "", email: "",
  objectives: [], weight_loss_target_kg: "", motivation_score: 7,
  current_actions: [], current_actions_detail: "",
  meals_balanced: "",
  water_per_day: "", coffee_per_day: "", soda_per_day: "", alcohol_per_week: "",
  sleep_quality: "", sleep_hours: "", stress_level: 5, mental_load: "",
  job_feeling: "", social_circle: "",
  active_daily: "", active_daily_detail: "",
  sport_frequency: "",
  daily_food_budget: "",
  contact_pref: "",
  consent: false,
};

const TOTAL_STEPS = 7;
const MOTIV_LABELS = [
  "", "Pas trop", "Hésitant(e)", "Hésitant(e)", "Curieux(se)",
  "Curieux(se)", "Motivé(e)", "Plutôt motivé(e)", "Très motivé(e)",
  "Engagé(e) à fond", "Engagé(e) à fond",
];
const STRESS_LABELS = [
  "", "Zen total", "Très calme", "Calme", "Plutôt serein",
  "Ça va", "Tendu", "Stressé", "Très stressé",
  "Sous pression", "À bout",
];

// Validation email + téléphone (alignée avec l'edge fn).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[\d\s.\-()]{6,20}$/;

export function BilanOnlinePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = coachSlug?.trim() || "";
  // Bump v2 pour invalider les drafts V1 (shape FormState change).
  const storageKey = useMemo(() => `ls-bilan-online-v2-${slug || "none"}`, [slug]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

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
      setSavedFlash(true);
      const t = setTimeout(() => setSavedFlash(false), 1500);
      return () => clearTimeout(t);
    } catch { /* quota */ }
  }, [form, step, storageKey, hydrated]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((p) => ({ ...p, [key]: value }));
  }
  function toggleObjective(o: ObjectiveKey) {
    setForm((p) => ({
      ...p,
      objectives: p.objectives.includes(o)
        ? p.objectives.filter((x) => x !== o)
        : [...p.objectives, o],
    }));
  }
  function toggleCurrentAction(o: CurrentAction) {
    setForm((p) => {
      const exists = p.current_actions.includes(o);
      let next: CurrentAction[];
      if (exists) {
        next = p.current_actions.filter((x) => x !== o);
      } else if (o === "nothing") {
        // "Rien encore" exclusif : on vide tout le reste
        next = ["nothing"];
      } else {
        // Sélection d'une vraie action → retire "nothing" s'il y était
        next = [...p.current_actions.filter((x) => x !== "nothing"), o];
      }
      return { ...p, current_actions: next };
    });
  }

  function validateStep(s: number): string | null {
    if (s === 1) {
      if (form.first_name.trim().length < 2) return "Ton prénom (au moins 2 lettres).";
      const age = Number(form.age);
      if (!form.age || !Number.isFinite(age) || age < 16 || age > 99) return "Âge entre 16 et 99.";
      const h = Number(form.height_cm);
      if (!form.height_cm || !Number.isFinite(h) || h < 100 || h > 220) return "Taille entre 100 et 220 cm.";
      if (form.city.trim().length < 2) return "Ta ville.";
      const hasPhone = form.phone.trim().length > 0;
      const hasEmail = form.email.trim().length > 0;
      if (!hasPhone && !hasEmail) return "Un moyen de te recontacter (tél ou email).";
      if (hasEmail && !EMAIL_RE.test(form.email.trim())) return "Email invalide.";
      if (hasPhone && !PHONE_RE.test(form.phone.trim())) return "Téléphone invalide.";
    }
    if (s === 2) {
      if (form.objectives.length === 0) return "Choisis au moins un objectif.";
      if (form.objectives.includes("weight_loss")) {
        const kg = Number(form.weight_loss_target_kg);
        if (!form.weight_loss_target_kg || !Number.isFinite(kg) || kg < 1 || kg > 50) return "Combien de kilos viser ?";
      }
    }
    if (s === 3) {
      if (form.current_actions.length === 0) return "Coche au moins une option (ou « Rien encore »).";
    }
    if (s === 4) {
      if (!form.meals_balanced) return "Ton ressenti sur tes repas.";
      if (!form.water_per_day) return "Ton hydratation eau.";
      if (!form.coffee_per_day) return "Ta conso café.";
      if (!form.soda_per_day) return "Ta conso sodas / jus.";
      if (!form.alcohol_per_week) return "Ta conso alcool.";
    }
    if (s === 5) {
      if (!form.sleep_quality) return "Qualité de ton sommeil.";
      if (!form.sleep_hours) return "Heures de sommeil par nuit.";
      if (!form.mental_load) return "Ta charge mentale.";
    }
    if (s === 6) {
      if (!form.job_feeling) return "Ton ressenti au boulot.";
      if (!form.social_circle) return "Ton entourage.";
    }
    if (s === 7) {
      if (!form.active_daily) return "Es-tu actif au quotidien ?";
      if (!form.sport_frequency) return "Ta fréquence de sport.";
      if (!form.daily_food_budget) return "Ton budget alimentaire.";
      if (!form.contact_pref) return "Comment ton coach te recontacte.";
      if (!form.consent) return "Le consentement RGPD est obligatoire.";
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void submit();
    }
  }
  function prev() {
    setErrorMsg("");
    setStep(Math.max(1, step - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    const err = validateStep(TOTAL_STEPS);
    if (err) { setErrorMsg(err); return; }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const payloadDetail = {
        // Étape 3 — présent
        current_actions: form.current_actions,
        current_actions_detail: form.current_actions_detail.trim() || null,
        // Étape 4 — assiette & verre
        meals: {
          balanced: form.meals_balanced,
          water_per_day: form.water_per_day,
          coffee_per_day: form.coffee_per_day,
          soda_per_day: form.soda_per_day,
          alcohol_per_week: form.alcohol_per_week,
        },
        // Étape 5 — sommeil & tête
        sleep_mind: {
          quality: form.sleep_quality,
          hours: form.sleep_hours,
          stress_level: form.stress_level,
          mental_load: form.mental_load,
        },
        // Étape 6 — job & cercle
        life: {
          job_feeling: form.job_feeling,
          social_circle: form.social_circle,
        },
        // Étape 7 — finalize
        finalize: {
          active_daily: form.active_daily === "yes",
          active_daily_detail: form.active_daily === "yes"
            ? form.active_daily_detail.trim() || null
            : null,
          sport_frequency: form.sport_frequency,
          budget: form.daily_food_budget,
          contact_pref: form.contact_pref,
        },
        // Compat avec LeadDetailModal V1 (budget + active_daily lus à la racine)
        budget: form.daily_food_budget,
        active_daily: form.active_daily === "yes",
        active_daily_detail: form.active_daily === "yes"
          ? form.active_daily_detail.trim() || null
          : null,
      };
      const { data, error } = await sb.functions.invoke("submit-online-bilan", {
        body: {
          coach_slug: slug || null,
          first_name: form.first_name.trim(),
          age: Number(form.age),
          height_cm: Number(form.height_cm),
          city: form.city.trim(),
          phone: form.phone.trim() || null,
          email: form.email.trim() || null,
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
        throw new Error(raw === "rate_limited"
          ? "Trop de tentatives — réessaie dans une heure."
          : raw);
      }
      try { localStorage.removeItem(storageKey); } catch { /* */ }
      const params = new URLSearchParams({ firstName: form.first_name.trim() });
      navigate(`/bilan-online${slug ? `/${slug}` : ""}/merci?${params.toString()}`);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erreur inconnue.");
      setSubmitting(false);
    }
  }

  const progressPct = (step / TOTAL_STEPS) * 100;
  const isLast = step === TOTAL_STEPS;

  return (
    <PublicShell defaultTheme="dark">
      {/* Header sticky : progress + meta — glassmorphism dark */}
      <div style={{
        padding: "16px 22px",
        background: "var(--surface-overlay)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--hair)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 10, fontFamily: PUBLIC_FONTS.mono, fontSize: 11,
          color: "var(--cream-muted)", letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          <button
            type="button"
            onClick={prev}
            disabled={step === 1 || submitting}
            style={{
              background: "none", border: "none",
              fontSize: 13, color: "var(--cream-muted)",
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.3 : 1,
              padding: "4px 8px 4px 0",
              fontFamily: "inherit",
            }}
          >
            ← Précédent
          </button>
          <span>Étape {step}/{TOTAL_STEPS}</span>
          <span style={{
            color: PUBLIC_TOKENS.teal,
            fontWeight: 600,
            opacity: savedFlash ? 1 : 0,
            transition: "opacity 0.4s",
          }}>
            ✓ Sauvegardé
          </span>
        </div>
        <div style={{
          width: "100%", height: 4,
          background: "var(--hair)", borderRadius: 2, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${progressPct}%`,
            background: PUBLIC_TOKENS.gradProgress,
            borderRadius: 2,
            transition: "width 0.45s cubic-bezier(.2,.7,.2,1)",
          }} />
        </div>
      </div>

      {/* Steps */}
      <div
        key={step}
        className="ps-slide-in"
        style={{ padding: "32px 22px 120px" }}
      >
        {step === 1 && <StepIdentity form={form} update={update} />}
        {step === 2 && <StepObjectives form={form} update={update} toggle={toggleObjective} />}
        {step === 3 && <StepPresent form={form} update={update} toggle={toggleCurrentAction} />}
        {step === 4 && <StepFoodWater form={form} update={update} />}
        {step === 5 && <StepSleepMind form={form} update={update} />}
        {step === 6 && <StepJobCircle form={form} update={update} />}
        {step === 7 && <StepFinalize form={form} update={update} />}

        {errorMsg && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: "rgba(251, 113, 133, 0.12)",
            color: PUBLIC_TOKENS.coral, fontSize: 13,
            border: "1px solid rgba(251, 113, 133, 0.40)",
          }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Bottom fixed CTA — glassmorphism dark */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 560,
        padding: "12px 22px 16px",
        background: "var(--surface-overlay-strong)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid var(--hair)",
        zIndex: 60,
        paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <PublicCtaPrimary onClick={next} disabled={submitting}>
          {submitting ? "Envoi…" : isLast ? "Envoyer mon bilan ✓" : "Suivant →"}
        </PublicCtaPrimary>
      </div>
    </PublicShell>
  );
}

// ── Helpers primitives ──────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}

function StepHero({ emoji, title, gradWord, subtitle }: {
  emoji: string;
  title: string;
  gradWord?: string;
  subtitle: string;
}) {
  return (
    <>
      <div style={{
        fontSize: 42,
        lineHeight: 1,
        marginBottom: 14,
        display: "inline-block",
        filter: "drop-shadow(0 4px 16px rgba(45,212,191,0.30))",
      }}>
        {emoji}
      </div>
      <div style={{
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 28, fontWeight: 600,
        color: "var(--cream)",
        marginBottom: 8, lineHeight: 1.18,
        letterSpacing: "-0.02em",
      }}>
        {gradWord ? (
          <>
            {title} <span style={publicGradText}>{gradWord}</span>
          </>
        ) : (
          title
        )}
      </div>
      <div style={{
        fontSize: 14,
        color: "var(--cream-muted)",
        marginBottom: 26,
      }}>
        {subtitle}
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block",
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 11, fontWeight: 600,
        color: "var(--cream-muted)",
        textTransform: "uppercase", letterSpacing: "0.12em",
        marginBottom: 8,
      }}>
        {label}
        {required && <span style={{ color: PUBLIC_TOKENS.coral }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function PsInput(p: {
  value: string; onChange: (v: string) => void;
  type?: string; inputMode?: "text" | "numeric" | "tel" | "email";
  maxLength?: number; min?: number; max?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <input
      type={p.type ?? "text"} inputMode={p.inputMode}
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      maxLength={p.maxLength} min={p.min} max={p.max}
      placeholder={p.placeholder}
      autoComplete={p.autoComplete}
      className="ps-input"
      style={inputStyle}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = PUBLIC_TOKENS.teal;
        e.currentTarget.style.background = "var(--glass-input-focus)";
        e.currentTarget.style.boxShadow = "0 0 0 4px rgba(45,212,191,0.12)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--hair-strong)";
        e.currentTarget.style.background = "var(--glass-input)";
        e.currentTarget.style.boxShadow = "none";
      }}
    />
  );
}

const inputStyle: CSSProperties = {
  width: "100%", padding: "14px 16px",
  background: "var(--glass-input)",
  border: "1px solid var(--hair-strong)",
  borderRadius: 14,
  fontFamily: PUBLIC_FONTS.body, fontSize: 16,
  color: "var(--cream)",
  outline: "none", boxSizing: "border-box",
  transition: "all 0.22s",
  WebkitAppearance: "none",
};

function ChoiceCard({
  emoji, label, selected, onClick, full,
}: { emoji: string; label: string; selected: boolean; onClick: () => void; full?: boolean }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={`ps-choice-card${selected ? " is-selected" : ""}`}
      style={{
        background: selected ? "var(--accent-teal-bg)" : "var(--glass)",
        border: `1.5px solid ${selected ? PUBLIC_TOKENS.teal : "var(--hair)"}`,
        borderRadius: 14, padding: "16px 14px",
        cursor: "pointer", textAlign: "center",
        transition: "all 0.22s cubic-bezier(.2,.7,.2,1)",
        userSelect: "none",
        gridColumn: full ? "span 2" : "auto",
        boxShadow: selected ? "0 4px 16px rgba(45,212,191,0.20)" : "none",
      }}
    >
      <span style={{ fontSize: 28, lineHeight: 1, marginBottom: 6, display: "block" }}>
        {emoji}
      </span>
      <span style={{
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 13, fontWeight: 600,
        color: selected ? PUBLIC_TOKENS.teal : "var(--cream)",
      }}>
        {label}
      </span>
    </div>
  );
}

function RadioCard({
  emoji, label, selected, onClick,
}: { emoji: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      className={`ps-radio-card${selected ? " is-selected" : ""}`}
      style={{
        background: selected ? "var(--accent-violet-bg)" : "var(--glass)",
        border: `1.5px solid ${selected ? PUBLIC_TOKENS.violet : "var(--hair)"}`,
        borderRadius: 14, padding: "14px 16px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 12,
        transition: "all 0.22s",
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{
        flex: 1, fontSize: 14,
        fontFamily: PUBLIC_FONTS.body,
        fontWeight: selected ? 600 : 500,
        color: selected ? PUBLIC_TOKENS.violet : "var(--cream)",
      }}>
        {label}
      </span>
    </div>
  );
}

function SliderWrap({
  value, min, max, valueLabel, onChange,
}: {
  value: number; min: number; max: number; valueLabel: string;
  onChange: (v: number) => void;
}) {
  const scaleStart = `${min}`;
  const scaleMid = `${Math.round((min + max) / 2)}`;
  const scaleEnd = `${max}${max >= 7 ? "+" : ""}`;
  return (
    <div style={{
      background: "var(--glass)",
      border: "1px solid var(--hair)",
      borderRadius: 14,
      padding: 18, marginTop: 6,
    }}>
      <div style={{
        textAlign: "center",
        fontFamily: PUBLIC_FONTS.display,
        fontSize: 40, fontWeight: 700,
        marginBottom: 4, lineHeight: 1,
        ...publicGradText,
      }}>
        {value}
      </div>
      <div style={{
        textAlign: "center", fontSize: 11, color: "var(--cream-muted)", marginBottom: 14,
        letterSpacing: "0.04em",
      }}>
        {valueLabel}
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 6,
          WebkitAppearance: "none", appearance: "none",
          background: PUBLIC_TOKENS.gradProgress,
          borderRadius: 3, outline: "none",
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: ${PUBLIC_TOKENS.cream};
          border: 3px solid ${PUBLIC_TOKENS.teal};
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(45,212,191,0.40);
        }
        input[type="range"]::-moz-range-thumb {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: ${PUBLIC_TOKENS.cream};
          border: 3px solid ${PUBLIC_TOKENS.teal};
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(45,212,191,0.40);
        }
      `}</style>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 8, fontSize: 10, color: "var(--cream-hint)",
        fontFamily: PUBLIC_FONTS.mono,
      }}>
        <span>{scaleStart}</span><span>{scaleMid}</span><span>{scaleEnd}</span>
      </div>
    </div>
  );
}

function SubField({ visible, children }: { visible: boolean; children: ReactNode }) {
  if (!visible) return null;
  return (
    <div className="ps-fade-in" style={{
      marginTop: 12, padding: 14,
      background: "var(--glass-input-focus)",
      borderRadius: 12,
      borderLeft: `3px solid ${PUBLIC_TOKENS.teal}`,
    }}>
      {children}
    </div>
  );
}

const sectionLabel: CSSProperties = {
  display: "block",
  fontFamily: PUBLIC_FONTS.display,
  fontSize: 11, fontWeight: 600,
  color: "var(--cream-muted)",
  textTransform: "uppercase", letterSpacing: "0.12em",
  margin: "20px 0 10px",
};

// ── Steps ──────────────────────────────────────────────────────────────────

function StepIdentity({ form, update }: StepProps) {
  return (
    <>
      <StepHero emoji="👋" title="Faisons" gradWord="connaissance" subtitle="Quelques infos pour personnaliser ton bilan." />
      <Field label="Ton prénom" required>
        <PsInput value={form.first_name} onChange={(v) => update("first_name", v)} maxLength={50} placeholder="Marie" autoComplete="given-name" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Âge" required>
          <PsInput value={form.age} onChange={(v) => update("age", v)} type="number" inputMode="numeric" min={16} max={99} placeholder="32" />
        </Field>
        <Field label="Taille (cm)" required>
          <PsInput value={form.height_cm} onChange={(v) => update("height_cm", v)} type="number" inputMode="numeric" min={100} max={220} placeholder="168" />
        </Field>
      </div>
      <Field label="Ta ville" required>
        <PsInput value={form.city} onChange={(v) => update("city", v)} maxLength={80} placeholder="Metz" autoComplete="address-level2" />
      </Field>

      <div style={{
        marginTop: 6, marginBottom: 14, padding: "12px 14px",
        background: "var(--glass-input-focus)",
        borderRadius: 12,
        borderLeft: `3px solid ${PUBLIC_TOKENS.teal}`,
        fontSize: 12.5, color: "var(--cream-muted)", lineHeight: 1.5,
      }}>
        📬 On a besoin d'au moins <strong style={{ color: "var(--cream)" }}>un moyen de te recontacter</strong> — téléphone ou email.
      </div>

      <Field label="Téléphone">
        <PsInput value={form.phone} onChange={(v) => update("phone", v)} type="tel" inputMode="tel" maxLength={20} placeholder="06 12 34 56 78" autoComplete="tel" />
      </Field>
      <Field label="Email">
        <PsInput value={form.email} onChange={(v) => update("email", v)} type="email" inputMode="email" maxLength={120} placeholder="marie@email.com" autoComplete="email" />
      </Field>
    </>
  );
}

function StepObjectives({ form, update, toggle }: StepProps & { toggle: (o: ObjectiveKey) => void }) {
  const OBJS: { key: ObjectiveKey; emoji: string; label: string; full?: boolean }[] = [
    { key: "weight_loss", emoji: "⚖️", label: "Perte de poids" },
    { key: "mass_gain", emoji: "💪", label: "Prise de masse" },
    { key: "energy", emoji: "⚡", label: "Plus d'énergie" },
    { key: "sleep", emoji: "😴", label: "Mieux dormir" },
    { key: "wellbeing", emoji: "🌿", label: "Bien-être général" },
    { key: "perf_pro", emoji: "💼", label: "Performance au travail", full: true },
  ];
  return (
    <>
      <StepHero emoji="🎯" title="Tes" gradWord="objectifs" subtitle="Tu peux en cocher plusieurs." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {OBJS.map((o) => (
          <ChoiceCard
            key={o.key} emoji={o.emoji} label={o.label} full={o.full}
            selected={form.objectives.includes(o.key)}
            onClick={() => toggle(o.key)}
          />
        ))}
      </div>
      <SubField visible={form.objectives.includes("weight_loss")}>
        <div style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 12, fontWeight: 600, marginBottom: 8,
          color: PUBLIC_TOKENS.teal,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Combien de kilos vises-tu ?
        </div>
        <PsInput
          value={form.weight_loss_target_kg}
          onChange={(v) => update("weight_loss_target_kg", v)}
          type="number" inputMode="numeric" min={1} max={50}
          placeholder="5"
        />
      </SubField>
      <div style={{ marginTop: 24 }}>
        <label style={{
          display: "block",
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 11, fontWeight: 600,
          color: "var(--cream-muted)",
          textTransform: "uppercase", letterSpacing: "0.12em",
          marginBottom: 8,
        }}>
          Ta motivation, tu la situes à combien sur 10 ?
        </label>
        <SliderWrap
          value={form.motivation_score} min={1} max={10}
          valueLabel={MOTIV_LABELS[form.motivation_score] || ""}
          onChange={(v) => update("motivation_score", v)}
        />
      </div>
    </>
  );
}

function StepPresent({ form, update, toggle }: StepProps & { toggle: (o: CurrentAction) => void }) {
  const ACTIONS: { key: CurrentAction; emoji: string; label: string; full?: boolean }[] = [
    { key: "sport", emoji: "🏃", label: "Sport régulier" },
    { key: "good_food", emoji: "🥗", label: "Alimentation soignée" },
    { key: "supplements", emoji: "💊", label: "Suppléments / vitamines" },
    { key: "coach", emoji: "👤", label: "Suivi coach / pro" },
    { key: "nothing", emoji: "🤷", label: "Rien encore", full: true },
  ];
  const hasRealAction = form.current_actions.some((a) => a !== "nothing");
  return (
    <>
      <StepHero
        emoji="🧭" title="Et" gradWord="aujourd'hui ?"
        subtitle="Qu'est-ce que tu fais déjà pour ta santé ?"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ACTIONS.map((a) => (
          <ChoiceCard
            key={a.key} emoji={a.emoji} label={a.label} full={a.full}
            selected={form.current_actions.includes(a.key)}
            onClick={() => toggle(a.key)}
          />
        ))}
      </div>
      <SubField visible={hasRealAction}>
        <div style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 12, fontWeight: 600, marginBottom: 8,
          color: PUBLIC_TOKENS.teal,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Ce qui marche ou pas pour toi ? (optionnel)
        </div>
        <textarea
          value={form.current_actions_detail}
          onChange={(e) => update("current_actions_detail", e.target.value)}
          rows={3}
          maxLength={300}
          placeholder="Je cours 2× par semaine mais j'ai du mal à tenir l'alimentation…"
          className="ps-textarea"
          style={{ ...inputStyle, fontSize: 14, resize: "vertical", minHeight: 80 }}
        />
      </SubField>
    </>
  );
}

function StepFoodWater({ form, update }: StepProps) {
  const BALANCED: { key: MealsBalanced; emoji: string; label: string; full?: boolean }[] = [
    { key: "yes", emoji: "✅", label: "Oui, plutôt" },
    { key: "no", emoji: "❌", label: "Non, pas vraiment" },
    { key: "unsure", emoji: "🤔", label: "Je ne sais pas", full: true },
  ];
  const WATER: { key: WaterTier; emoji: string; label: string }[] = [
    { key: "1-3", emoji: "💧", label: "1 à 3 verres" },
    { key: "4-6", emoji: "💧💧", label: "4 à 6 verres" },
    { key: "7-10", emoji: "💧💧💧", label: "7 à 10 verres" },
    { key: "10+", emoji: "🌊", label: "10 et +" },
  ];
  const COFFEE: { key: CoffeeTier; emoji: string; label: string }[] = [
    { key: "0", emoji: "🚫", label: "Aucun" },
    { key: "1-2", emoji: "☕", label: "1 à 2" },
    { key: "3-4", emoji: "☕☕", label: "3 à 4" },
    { key: "5+", emoji: "☕☕☕", label: "5 et +" },
  ];
  const SODA: { key: SodaTier; emoji: string; label: string }[] = [
    { key: "0", emoji: "🚫", label: "Aucun" },
    { key: "1", emoji: "🥤", label: "1" },
    { key: "2-3", emoji: "🥤🥤", label: "2 à 3" },
    { key: "4+", emoji: "🥤🥤🥤", label: "4 et +" },
  ];
  const ALCOHOL: { key: AlcoholTier; emoji: string; label: string }[] = [
    { key: "0", emoji: "🚫", label: "Aucun" },
    { key: "1-3", emoji: "🍷", label: "1 à 3 verres" },
    { key: "4-7", emoji: "🍷🍷", label: "4 à 7 verres" },
    { key: "8+", emoji: "🍷🍷🍷", label: "8 et +" },
  ];
  return (
    <>
      <StepHero
        emoji="🍽️" title="Ton assiette &" gradWord="ton verre"
        subtitle="On capte l'essentiel — ressenti + hydratation."
      />

      <label style={sectionLabel}>D'après toi, tes repas sont équilibrés ?</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BALANCED.map((b) => (
          <ChoiceCard
            key={b.key} emoji={b.emoji} label={b.label} full={b.full}
            selected={form.meals_balanced === b.key}
            onClick={() => update("meals_balanced", b.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>💧 Eau / jour</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {WATER.map((w) => (
          <ChoiceCard
            key={w.key} emoji={w.emoji} label={w.label}
            selected={form.water_per_day === w.key}
            onClick={() => update("water_per_day", w.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>☕ Café / jour</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {COFFEE.map((c) => (
          <ChoiceCard
            key={c.key} emoji={c.emoji} label={c.label}
            selected={form.coffee_per_day === c.key}
            onClick={() => update("coffee_per_day", c.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>🥤 Sodas / jus sucrés / jour</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {SODA.map((s) => (
          <ChoiceCard
            key={s.key} emoji={s.emoji} label={s.label}
            selected={form.soda_per_day === s.key}
            onClick={() => update("soda_per_day", s.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>🍷 Alcool / semaine</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ALCOHOL.map((a) => (
          <ChoiceCard
            key={a.key} emoji={a.emoji} label={a.label}
            selected={form.alcohol_per_week === a.key}
            onClick={() => update("alcohol_per_week", a.key)}
          />
        ))}
      </div>
    </>
  );
}

function StepSleepMind({ form, update }: StepProps) {
  const QUALITY: { key: SleepQuality; emoji: string; label: string }[] = [
    { key: "bad", emoji: "😫", label: "Mauvais" },
    { key: "meh", emoji: "😕", label: "Moyen" },
    { key: "ok", emoji: "🙂", label: "Correct" },
    { key: "great", emoji: "😊", label: "Top" },
  ];
  const HOURS: { key: SleepHours; emoji: string; label: string }[] = [
    { key: "<6", emoji: "🌙", label: "Moins de 6 h" },
    { key: "6-7", emoji: "🌙", label: "6 à 7 h" },
    { key: "7-8", emoji: "🌙", label: "7 à 8 h" },
    { key: "8+", emoji: "🌙", label: "Plus de 8 h" },
  ];
  const LOAD: { key: MentalLoad; emoji: string; label: string }[] = [
    { key: "light", emoji: "🌿", label: "Légère" },
    { key: "ok", emoji: "😐", label: "Ça va" },
    { key: "heavy", emoji: "😰", label: "Lourde" },
    { key: "crushed", emoji: "🌪️", label: "Écrasante" },
  ];
  return (
    <>
      <StepHero
        emoji="😴" title="Sommeil &" gradWord="tête"
        subtitle="Comment tu te sens niveau récup' et mental."
      />

      <label style={sectionLabel}>Qualité de sommeil</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {QUALITY.map((q) => (
          <ChoiceCard
            key={q.key} emoji={q.emoji} label={q.label}
            selected={form.sleep_quality === q.key}
            onClick={() => update("sleep_quality", q.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>Heures / nuit</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {HOURS.map((h) => (
          <ChoiceCard
            key={h.key} emoji={h.emoji} label={h.label}
            selected={form.sleep_hours === h.key}
            onClick={() => update("sleep_hours", h.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>Niveau de stress (1 = zen, 10 = à bout)</label>
      <SliderWrap
        value={form.stress_level} min={1} max={10}
        valueLabel={STRESS_LABELS[form.stress_level] || ""}
        onChange={(v) => update("stress_level", v)}
      />

      <label style={sectionLabel}>Charge mentale au quotidien</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {LOAD.map((l) => (
          <ChoiceCard
            key={l.key} emoji={l.emoji} label={l.label}
            selected={form.mental_load === l.key}
            onClick={() => update("mental_load", l.key)}
          />
        ))}
      </div>
    </>
  );
}

function StepJobCircle({ form, update }: StepProps) {
  const JOB: { key: JobFeeling; emoji: string; label: string }[] = [
    { key: "great", emoji: "🌟", label: "Super, j'adore ce que je fais" },
    { key: "valued", emoji: "✨", label: "Plutôt valorisé(e)" },
    { key: "routine", emoji: "🔁", label: "Dans la routine" },
    { key: "demotivated", emoji: "😞", label: "Démotivé(e)" },
    { key: "lost", emoji: "🌧️", label: "Perdu(e) / en transition" },
  ];
  const CIRCLE: { key: SocialCircle; emoji: string; label: string }[] = [
    { key: "family", emoji: "👨‍👩‍👧", label: "Famille présente / soutien" },
    { key: "couple", emoji: "💑", label: "En couple, ça m'épaule" },
    { key: "friends", emoji: "👥", label: "Entouré(e) d'amis" },
    { key: "alone", emoji: "🌿", label: "Plutôt seul(e) en ce moment" },
  ];
  return (
    <>
      <StepHero
        emoji="💼" title="Job &" gradWord="cercle"
        subtitle="Le contexte autour de toi compte aussi."
      />

      <label style={sectionLabel}>Au boulot, en ce moment</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {JOB.map((j) => (
          <RadioCard
            key={j.key} emoji={j.emoji} label={j.label}
            selected={form.job_feeling === j.key}
            onClick={() => update("job_feeling", j.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>Ton entourage</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CIRCLE.map((c) => (
          <RadioCard
            key={c.key} emoji={c.emoji} label={c.label}
            selected={form.social_circle === c.key}
            onClick={() => update("social_circle", c.key)}
          />
        ))}
      </div>
    </>
  );
}

function StepFinalize({ form, update }: StepProps) {
  const SPORT: { key: SportFrequency; emoji: string; label: string }[] = [
    { key: "never", emoji: "🛋️", label: "Jamais" },
    { key: "1x", emoji: "👟", label: "1× par semaine" },
    { key: "2-3x", emoji: "💪", label: "2 à 3× par semaine" },
    { key: "4+x", emoji: "🔥", label: "4× et +" },
  ];
  const BUDGETS: { key: BudgetTier; emoji: string; label: string; full?: boolean }[] = [
    { key: "2", emoji: "💰", label: "2 €" },
    { key: "4", emoji: "💰", label: "4 €" },
    { key: "8", emoji: "💰", label: "8 €" },
    { key: "10", emoji: "💰", label: "10 €" },
    { key: "15+", emoji: "💎", label: "15 € et +", full: true },
  ];
  const CONTACT: { key: ContactPref; emoji: string; label: string }[] = [
    { key: "phone", emoji: "📞", label: "Téléphone" },
    { key: "email", emoji: "📧", label: "Email" },
    { key: "whatsapp", emoji: "💬", label: "WhatsApp" },
  ];
  return (
    <>
      <StepHero emoji="💪" title="On" gradWord="finalise" subtitle="Quelques infos pour boucler la boucle." />

      <label style={sectionLabel}>Actif au quotidien ? (marche, escaliers, jardin)</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <RadioCard
          emoji="✅" label="Oui"
          selected={form.active_daily === "yes"}
          onClick={() => update("active_daily", "yes")}
        />
        <RadioCard
          emoji="❌" label="Non, plutôt sédentaire"
          selected={form.active_daily === "no"}
          onClick={() => update("active_daily", "no")}
        />
      </div>
      <SubField visible={form.active_daily === "yes"}>
        <div style={{
          fontFamily: PUBLIC_FONTS.display,
          fontSize: 12, fontWeight: 600, marginBottom: 8,
          color: PUBLIC_TOKENS.teal,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          Quoi exactement ? (optionnel)
        </div>
        <PsInput
          value={form.active_daily_detail}
          onChange={(v) => update("active_daily_detail", v)}
          maxLength={100}
          placeholder="Marche 30 min/jour pour aller au travail"
        />
      </SubField>

      <label style={sectionLabel}>🏋️ Fréquence sport / semaine</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {SPORT.map((s) => (
          <ChoiceCard
            key={s.key} emoji={s.emoji} label={s.label}
            selected={form.sport_frequency === s.key}
            onClick={() => update("sport_frequency", s.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>💰 Budget alimentaire / jour</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BUDGETS.map((b) => (
          <ChoiceCard
            key={b.key} emoji={b.emoji} label={b.label} full={b.full}
            selected={form.daily_food_budget === b.key}
            onClick={() => update("daily_food_budget", b.key)}
          />
        ))}
      </div>

      <label style={sectionLabel}>📬 Tu préfères qu'on te recontacte par</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {CONTACT.map((c) => (
          <RadioCard
            key={c.key} emoji={c.emoji} label={c.label}
            selected={form.contact_pref === c.key}
            onClick={() => update("contact_pref", c.key)}
          />
        ))}
      </div>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 12,
        marginTop: 20, padding: 14,
        background: "var(--glass)",
        border: "1px solid var(--hair)",
        borderRadius: 12,
        fontSize: 13, color: "var(--cream-muted)",
        cursor: "pointer", lineHeight: 1.5,
      }}>
        <input
          type="checkbox" checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
          style={{
            marginTop: 2, flexShrink: 0,
            accentColor: PUBLIC_TOKENS.teal,
            width: 18, height: 18,
          }}
        />
        <span>
          J'accepte que mes données soient transmises à mon coach pour analyse
          de mon bilan. Pas de spam, pas de revente.
        </span>
      </label>
    </>
  );
}
