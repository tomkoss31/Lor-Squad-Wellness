// =============================================================================
// BilanOnlinePage — Formulaire bilan online 5 étapes, mockup Égypte validé.
// docs/mockups/bilan-online.html (commit 25c0165), view "form".
// Route : /bilan-online/:coachSlug?/formulaire
// =============================================================================

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import { BO, BilanOnlineShell, BoCtaPrimary } from "../components/bilan-online/BilanOnlineShell";

type ObjectiveKey = "weight_loss" | "mass_gain" | "energy" | "sleep" | "wellbeing";
type PreviousAttempt = "diet" | "coach" | "sport" | "supplements" | "nothing";
type MealType =
  | "sweet" | "salty" | "smoothie" | "coffee_only"
  | "home" | "canteen" | "sandwich" | "fastfood";
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
  lunch: MealType | "";
  fastfood_per_week: number;
  daily_food_budget: BudgetTier | "";
  active_daily: "yes" | "no" | "";
  active_daily_detail: string;
  consent: boolean;
}
const INITIAL: FormState = {
  first_name: "", age: "", height_cm: "", city: "",
  objectives: [], weight_loss_target_kg: "", motivation_score: 7,
  previous_attempts: [], previous_attempts_result: "",
  breakfast: "", lunch: "", fastfood_per_week: 2,
  daily_food_budget: "", active_daily: "", active_daily_detail: "",
  consent: false,
};

const TOTAL_STEPS = 5;
const MOTIV_LABELS = [
  "", "Pas trop", "Hésitant(e)", "Hésitant(e)", "Curieux(se)",
  "Curieux(se)", "Motivé(e)", "Plutôt motivé(e)", "Très motivé(e)",
  "Engagé(e) à fond", "Engagé(e) à fond",
];
const FF_LABELS = [
  "Excellent !", "Modéré", "Modéré", "Habituel",
  "Habituel", "Souvent", "Très souvent", "Tous les jours",
];

export function BilanOnlinePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const slug = coachSlug?.trim() || "";
  const storageKey = useMemo(() => `ls-bilan-online-${slug || "none"}`, [slug]);

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
  function togglePreviousAttempt(o: PreviousAttempt) {
    setForm((p) => ({
      ...p,
      previous_attempts: p.previous_attempts.includes(o)
        ? p.previous_attempts.filter((x) => x !== o)
        : [...p.previous_attempts, o],
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
        if (!form.weight_loss_target_kg || !Number.isFinite(kg) || kg < 1 || kg > 50) return "Combien de kilos viser ?";
      }
    }
    if (s === 4) {
      if (!form.breakfast) return "Choisis ton petit-déj.";
      if (!form.lunch) return "Choisis ton repas du midi.";
    }
    if (s === 5) {
      if (!form.daily_food_budget) return "Choisis ton budget.";
      if (!form.active_daily) return "Es-tu actif au quotidien ?";
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
          lunch: form.lunch,
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
    <BilanOnlineShell>
      {/* Header sticky : progress + meta */}
      <div style={{
        padding: "16px 20px",
        background: BO.surface,
        borderBottom: `1px solid ${BO.border}`,
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 8, fontSize: 12, color: BO.textMuted,
        }}>
          <button
            type="button"
            onClick={prev}
            disabled={step === 1 || submitting}
            style={{
              background: "none", border: "none",
              fontSize: 14, color: BO.textMuted,
              cursor: step === 1 ? "not-allowed" : "pointer",
              opacity: step === 1 ? 0.3 : 1,
              padding: "4px 8px 4px 0",
              display: "flex", alignItems: "center", gap: 4,
              fontFamily: "inherit",
            }}
          >
            ← Précédent
          </button>
          <span>Étape {step}/{TOTAL_STEPS}</span>
          <span style={{
            color: BO.tealDark, fontWeight: 600,
            opacity: savedFlash ? 1 : 0,
            transition: "opacity 0.4s",
          }}>
            💾 Sauvegardé
          </span>
        </div>
        <div style={{
          width: "100%", height: 6,
          background: BO.surface2, borderRadius: 3, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", width: `${progressPct}%`,
            background: `linear-gradient(90deg, ${BO.gold}, ${BO.teal})`,
            borderRadius: 3,
            transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
          }} />
        </div>
      </div>

      {/* Steps */}
      <div
        key={step}
        style={{
          padding: "24px 20px 120px",
          animation: "bo-slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {step === 1 && <StepIdentity form={form} update={update} />}
        {step === 2 && <StepObjectives form={form} update={update} toggle={toggleObjective} />}
        {step === 3 && <StepExperience form={form} update={update} toggle={togglePreviousAttempt} />}
        {step === 4 && <StepHabits form={form} update={update} />}
        {step === 5 && <StepBudget form={form} update={update} />}

        {errorMsg && (
          <div style={{
            marginTop: 16, padding: "10px 14px", borderRadius: 10,
            background: "rgba(251, 113, 133, 0.10)",
            color: "#9F1239", fontSize: 13,
            border: "1px solid rgba(251, 113, 133, 0.3)",
          }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Bottom fixed CTA */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        padding: "12px 20px 16px",
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderTop: `1px solid ${BO.border}`,
        zIndex: 5,
        paddingBottom: `calc(16px + env(safe-area-inset-bottom, 0px))`,
      }}>
        <BoCtaPrimary onClick={next} disabled={submitting}>
          {submitting ? "Envoi…" : isLast ? "Envoyer mon bilan ✓" : "Suivant →"}
        </BoCtaPrimary>
      </div>
    </BilanOnlineShell>
  );
}

// ── Helpers primitives ──────────────────────────────────────────────────────

interface StepProps {
  form: FormState;
  update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}

function StepHero({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <>
      <div style={{ fontSize: 36, lineHeight: 1, marginBottom: 12 }}>
        {emoji}
      </div>
      <div style={{
        fontFamily: BO.fontDisplay, fontSize: 22, fontWeight: 700,
        color: BO.text, marginBottom: 6, lineHeight: 1.25,
      }}>
        {title}
      </div>
      <div style={{ fontSize: 13, color: BO.textMuted, marginBottom: 22 }}>
        {subtitle}
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: "block", fontSize: 13, fontWeight: 600,
        color: BO.text, marginBottom: 6,
      }}>
        {label}
        {required && <span style={{ color: BO.coral }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function BoInput(p: {
  value: string; onChange: (v: string) => void;
  type?: string; inputMode?: "text" | "numeric";
  maxLength?: number; min?: number; max?: number;
  placeholder?: string;
}) {
  return (
    <input
      type={p.type ?? "text"} inputMode={p.inputMode}
      value={p.value}
      onChange={(e) => p.onChange(e.target.value)}
      maxLength={p.maxLength} min={p.min} max={p.max}
      placeholder={p.placeholder}
      style={inputStyle}
      onFocus={(e) => { e.currentTarget.style.borderColor = BO.teal; e.currentTarget.style.background = "white"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = BO.border; e.currentTarget.style.background = BO.surface2; }}
    />
  );
}

const inputStyle: CSSProperties = {
  width: "100%", padding: "14px 16px",
  border: `1px solid ${BO.border}`, borderRadius: 12,
  fontSize: 16, fontFamily: "inherit",
  background: BO.surface2, color: BO.text,
  outline: "none", boxSizing: "border-box",
  transition: "border 0.15s, background 0.15s",
  colorScheme: "light",
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
      style={{
        background: selected ? "rgba(45, 212, 191, 0.10)" : BO.surface2,
        border: `1.5px solid ${selected ? BO.teal : "transparent"}`,
        borderRadius: 12, padding: "14px 12px",
        cursor: "pointer", textAlign: "center",
        transition: "all 0.18s",
        userSelect: "none",
        gridColumn: full ? "span 2" : "auto",
      }}
    >
      <span style={{ fontSize: 26, lineHeight: 1, marginBottom: 6, display: "block" }}>
        {emoji}
      </span>
      <span style={{
        fontSize: 13, fontWeight: 600,
        color: selected ? BO.tealDark : BO.text,
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
      style={{
        background: selected ? "rgba(201, 168, 76, 0.10)" : BO.surface2,
        border: `1.5px solid ${selected ? BO.gold : "transparent"}`,
        borderRadius: 12, padding: "12px 14px",
        cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
        transition: "all 0.18s",
      }}
    >
      <span style={{ fontSize: 22 }}>{emoji}</span>
      <span style={{
        flex: 1, fontSize: 14,
        fontWeight: selected ? 600 : 500,
        color: selected ? "#633806" : BO.text,
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
      background: BO.surface2, borderRadius: 12,
      padding: 16, marginTop: 6,
    }}>
      <div style={{
        textAlign: "center", fontFamily: BO.fontDisplay,
        fontSize: 32, fontWeight: 700, color: BO.gold,
        marginBottom: 4, lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{
        textAlign: "center", fontSize: 11, color: BO.textMuted, marginBottom: 12,
      }}>
        {valueLabel}
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%", height: 6,
          WebkitAppearance: "none", appearance: "none",
          background: `linear-gradient(90deg, ${BO.coral}, ${BO.gold}, ${BO.teal})`,
          borderRadius: 3, outline: "none",
        }}
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 26px; height: 26px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${BO.gold};
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
        input[type="range"]::-moz-range-thumb {
          width: 26px; height: 26px;
          border-radius: 50%;
          background: white;
          border: 3px solid ${BO.gold};
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }
      `}</style>
      <div style={{
        display: "flex", justifyContent: "space-between",
        marginTop: 6, fontSize: 10, color: BO.textHint,
      }}>
        <span>{scaleStart}</span><span>{scaleMid}</span><span>{scaleEnd}</span>
      </div>
    </div>
  );
}

function SubField({ visible, children }: { visible: boolean; children: ReactNode }) {
  if (!visible) return null;
  return (
    <div style={{
      marginTop: 12, padding: 14,
      background: "rgba(45, 212, 191, 0.06)",
      borderRadius: 10,
      borderLeft: `3px solid ${BO.teal}`,
      animation: "bo-fadeIn 0.3s ease",
    }}>
      {children}
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────

function StepIdentity({ form, update }: StepProps) {
  return (
    <>
      <StepHero emoji="👋" title="Faisons connaissance" subtitle="4 infos rapides pour personnaliser ton bilan." />
      <Field label="Ton prénom" required>
        <BoInput value={form.first_name} onChange={(v) => update("first_name", v)} maxLength={50} placeholder="Marie" />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Âge" required>
          <BoInput value={form.age} onChange={(v) => update("age", v)} type="number" inputMode="numeric" min={16} max={99} placeholder="32" />
        </Field>
        <Field label="Taille (cm)" required>
          <BoInput value={form.height_cm} onChange={(v) => update("height_cm", v)} type="number" inputMode="numeric" min={100} max={220} placeholder="168" />
        </Field>
      </div>
      <Field label="Ta ville" required>
        <BoInput value={form.city} onChange={(v) => update("city", v)} maxLength={80} placeholder="Metz" />
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
    { key: "wellbeing", emoji: "🌿", label: "Bien-être général", full: true },
  ];
  return (
    <>
      <StepHero emoji="🎯" title="Tes objectifs" subtitle="Tu peux en cocher plusieurs." />
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
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Combien de kilos vises-tu ?
        </div>
        <BoInput
          value={form.weight_loss_target_kg}
          onChange={(v) => update("weight_loss_target_kg", v)}
          type="number" inputMode="numeric" min={1} max={50}
          placeholder="5"
        />
      </SubField>
      <div style={{ marginTop: 24 }}>
        <label style={{
          display: "block", fontSize: 13, fontWeight: 600,
          color: BO.text, marginBottom: 6,
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

function StepExperience({ form, update, toggle }: StepProps & { toggle: (o: PreviousAttempt) => void }) {
  const ATT: { key: PreviousAttempt; emoji: string; label: string; full?: boolean }[] = [
    { key: "diet", emoji: "🥗", label: "Régimes" },
    { key: "coach", emoji: "👤", label: "Coach" },
    { key: "sport", emoji: "🏃", label: "Sport" },
    { key: "supplements", emoji: "💊", label: "Suppléments" },
    { key: "nothing", emoji: "🤷", label: "Rien encore", full: true },
  ];
  const hasAttempt = form.previous_attempts.length > 0;
  return (
    <>
      <StepHero
        emoji="🧭" title="Ton vécu"
        subtitle="As-tu déjà essayé quelque chose pour atteindre tes objectifs ?"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {ATT.map((a) => (
          <ChoiceCard
            key={a.key} emoji={a.emoji} label={a.label} full={a.full}
            selected={form.previous_attempts.includes(a.key)}
            onClick={() => toggle(a.key)}
          />
        ))}
      </div>
      <SubField visible={hasAttempt}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Qu'est-ce que ça a donné ? (optionnel)
        </div>
        <textarea
          value={form.previous_attempts_result}
          onChange={(e) => update("previous_attempts_result", e.target.value)}
          rows={3}
          maxLength={200}
          placeholder="J'ai perdu 4 kg avec un régime, mais je les ai repris…"
          style={{
            ...inputStyle, fontSize: 14, resize: "vertical", minHeight: 80,
          }}
        />
      </SubField>
    </>
  );
}

function StepHabits({ form, update }: StepProps) {
  const PDJ: { key: MealType; emoji: string; label: string }[] = [
    { key: "sweet", emoji: "🥐", label: "Sucré (croissant, céréales)" },
    { key: "salty", emoji: "🥚", label: "Salé (œufs, charcuterie)" },
    { key: "smoothie", emoji: "🥤", label: "Smoothie / healthy" },
    { key: "coffee_only", emoji: "☕", label: "Café seulement / rien" },
  ];
  const MIDI: { key: MealType; emoji: string; label: string }[] = [
    { key: "home", emoji: "🏠", label: "Maison" },
    { key: "canteen", emoji: "🍽️", label: "Cantine / resto" },
    { key: "sandwich", emoji: "🥪", label: "Sandwich / wrap" },
    { key: "fastfood", emoji: "🍔", label: "Fast-food" },
  ];
  return (
    <>
      <StepHero
        emoji="🍽️" title="Tes habitudes"
        subtitle="Format ultra-court — choisis ce qui te ressemble le plus."
      />
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: BO.text, margin: "16px 0 8px" }}>
        Petit-déjeuner
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {PDJ.map((m) => (
          <RadioCard
            key={m.key} emoji={m.emoji} label={m.label}
            selected={form.breakfast === m.key}
            onClick={() => update("breakfast", m.key)}
          />
        ))}
      </div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: BO.text, margin: "18px 0 8px" }}>
        Repas du midi
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {MIDI.map((m) => (
          <RadioCard
            key={m.key} emoji={m.emoji} label={m.label}
            selected={form.lunch === m.key}
            onClick={() => update("lunch", m.key)}
          />
        ))}
      </div>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: BO.text, margin: "18px 0 8px" }}>
        Fast-food par semaine
      </label>
      <SliderWrap
        value={form.fastfood_per_week} min={0} max={7}
        valueLabel={FF_LABELS[form.fastfood_per_week] || ""}
        onChange={(v) => update("fastfood_per_week", v)}
      />
    </>
  );
}

function StepBudget({ form, update }: StepProps) {
  const BUDGETS: { key: BudgetTier; emoji: string; label: string; full?: boolean }[] = [
    { key: "2", emoji: "💰", label: "2 €" },
    { key: "4", emoji: "💰", label: "4 €" },
    { key: "8", emoji: "💰", label: "8 €" },
    { key: "10", emoji: "💰", label: "10 €" },
    { key: "15+", emoji: "💎", label: "15 € et +", full: true },
  ];
  return (
    <>
      <StepHero emoji="💰" title="Budget + activité" subtitle="Dernière étape, on y est presque !" />
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: BO.text, margin: "14px 0 8px" }}>
        Budget alimentaire / jour
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {BUDGETS.map((b) => (
          <ChoiceCard
            key={b.key} emoji={b.emoji} label={b.label} full={b.full}
            selected={form.daily_food_budget === b.key}
            onClick={() => update("daily_food_budget", b.key)}
          />
        ))}
      </div>

      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: BO.text, margin: "22px 0 8px" }}>
        Es-tu actif au quotidien ? (marche, escaliers, jardin)
      </label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <RadioCard
          emoji="✅" label="Oui"
          selected={form.active_daily === "yes"}
          onClick={() => update("active_daily", "yes")}
        />
        <RadioCard
          emoji="❌" label="Non"
          selected={form.active_daily === "no"}
          onClick={() => update("active_daily", "no")}
        />
      </div>
      <SubField visible={form.active_daily === "yes"}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Quoi exactement ? (optionnel)
        </div>
        <BoInput
          value={form.active_daily_detail}
          onChange={(v) => update("active_daily_detail", v)}
          maxLength={100}
          placeholder="Marche 30 min/jour pour aller au travail"
        />
      </SubField>

      <label style={{
        display: "flex", alignItems: "flex-start", gap: 10,
        marginTop: 18, padding: 12,
        background: BO.surface2, borderRadius: 10,
        fontSize: 12, color: BO.textMuted, cursor: "pointer",
      }}>
        <input
          type="checkbox" checked={form.consent}
          onChange={(e) => update("consent", e.target.checked)}
          style={{ marginTop: 2, flexShrink: 0, accentColor: BO.gold }}
        />
        <span>
          J'accepte que mes données soient transmises à mon coach pour analyse
          de mon bilan. Pas de spam, pas de revente.
        </span>
      </label>
    </>
  );
}
