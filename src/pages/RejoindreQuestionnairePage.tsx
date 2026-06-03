// =============================================================================
// RejoindreQuestionnairePage — Funnel Opportunité « gated », ÉTAPE 2 (2026-06).
// Brief : docs/BRIEF_OPPORTUNITE_GATED_2026-06.md
//
// Le questionnaire « rebondissant » :
//   - 1 question par écran, barre de progression
//   - micro-rebonds (salutation prénom, encouragements)
//   - branches conditionnelles selon le profil (curieux / complément / reconversion)
//   - transitions slide + prefers-reduced-motion
//
// ÉTAPE 2 = UI + collecte d'état uniquement. Le SUBMIT + scoring + écriture
// `prospect_leads` + sorties routées « après » = étapes 3-4 (à venir).
// Pour l'instant l'écran final est un récap « merci » (stub, pas d'écriture DB).
// =============================================================================

import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getSupabaseClient } from "../services/supabaseClient";
import { extractFunctionError } from "../lib/utils/extractFunctionError";
import { scoreOpportunityLead, type OpportunityScore } from "../lib/opportunityLeadScore";
import { buildPreEvaluation } from "../lib/opportunityPreEval";

const C = {
  emerald: "#10B981",
  cyan: "#06B6D4",
  violet: "#8B5CF6",
  ink: "#0B0D11",
  cream: "#F0EDE8",
  creamMuted: "rgba(240,237,232,0.62)",
  creamHint: "rgba(240,237,232,0.40)",
  hair: "rgba(255,255,255,0.10)",
  hairStrong: "rgba(255,255,255,0.18)",
};

type AnswerMap = Record<string, string>;

type StepType = "text" | "email" | "tel" | "choice" | "consent";

interface Option {
  value: string;
  label: string;
  emoji?: string;
}

interface StepDef {
  id: string;
  type: StepType;
  question: string;
  hint?: string;
  placeholder?: string;
  optional?: boolean;
  options?: Option[];
  /** Condition d'affichage (branches). */
  when?: (a: AnswerMap) => boolean;
}

// ─── Arborescence (cf. §3 du brief) ──────────────────────────────────────────
const STEPS: StepDef[] = [
  // Identité
  { id: "firstName", type: "text", question: "Pour commencer, c'est quoi ton prénom ?", placeholder: "Ton prénom" },
  { id: "lastName", type: "text", question: "Et ton nom ?", placeholder: "Ton nom" },
  { id: "email", type: "email", question: "Ton email ?", hint: "Pour t'envoyer ton accès et le récap.", placeholder: "toi@email.com" },
  { id: "phone", type: "tel", question: "Ton numéro ?", hint: "Pour caler un échange si ça matche.", placeholder: "06 XX XX XX XX" },
  { id: "city", type: "text", question: "Tu es où ?", hint: "Optionnel.", placeholder: "Ta ville", optional: true },

  // Source
  {
    id: "source",
    type: "choice",
    question: "Comment tu as connu La Base 360 ?",
    options: [
      { value: "coach", label: "Un coach m'a parlé", emoji: "🧑‍🏫" },
      { value: "instagram", label: "Instagram", emoji: "📸" },
      { value: "facebook", label: "Facebook", emoji: "📘" },
      { value: "tiktok", label: "TikTok", emoji: "🎵" },
      { value: "bouche", label: "Bouche-à-oreille", emoji: "💬" },
      { value: "shakebar", label: "Le shake bar / club", emoji: "🥤" },
      { value: "autre", label: "Autre", emoji: "✨" },
    ],
  },

  // ROUTAGE profil
  {
    id: "profile",
    type: "choice",
    question: "Aujourd'hui, qu'est-ce qui t'attire le plus ?",
    hint: "Sois honnête, il n'y a pas de mauvaise réponse.",
    options: [
      { value: "curious", label: "Je suis curieux·se, je veux comprendre", emoji: "🔍" },
      { value: "side_income", label: "Un complément de revenu, à côté", emoji: "💸" },
      { value: "career_change", label: "Une vraie reconversion, changer de vie", emoji: "🚀" },
    ],
  },

  // Transverses
  {
    id: "occupation",
    type: "choice",
    question: "Tu fais quoi en ce moment ?",
    options: [
      { value: "salarie", label: "Salarié·e", emoji: "💼" },
      { value: "independant", label: "Indépendant·e", emoji: "🧑‍💻" },
      { value: "sans_emploi", label: "Sans emploi", emoji: "🔄" },
      { value: "parent", label: "Parent au foyer", emoji: "🏡" },
      { value: "etudiant", label: "Étudiant·e", emoji: "🎓" },
      { value: "retraite", label: "Retraité·e", emoji: "🌅" },
    ],
  },
  {
    id: "network_love",
    type: "choice",
    question: "Tu es plutôt du genre à aimer échanger avec les gens autour de toi ?",
    options: [
      { value: "beaucoup", label: "Oui, j'adore ça", emoji: "🤗" },
      { value: "depend", label: "Ça dépend des moments", emoji: "🙂" },
      { value: "peu", label: "Pas trop, je suis réservé·e", emoji: "😌" },
    ],
  },
  {
    id: "network_knows",
    type: "choice",
    question: "Tu connais des gens sensibles au bien-être, sport ou nutrition ?",
    options: [
      { value: "plein", label: "Plein !", emoji: "🌟" },
      { value: "quelques", label: "Quelques-uns", emoji: "👍" },
      { value: "pas", label: "Pas vraiment", emoji: "🤔" },
    ],
  },
  {
    id: "product_affinity",
    type: "choice",
    question: "Ton rapport au bien-être / nutrition aujourd'hui ?",
    options: [
      { value: "passionne", label: "Passionné·e", emoji: "🔥" },
      { value: "jemymets", label: "Je m'y mets", emoji: "🌱" },
      { value: "curieux", label: "Curieux·se", emoji: "👀" },
      { value: "pasdutout", label: "Pas du tout (encore !)", emoji: "🤷" },
    ],
  },
  {
    id: "why_now",
    type: "choice",
    question: "Qu'est-ce qui te pousse à regarder ça aujourd'hui ?",
    options: [
      { value: "marre_job", label: "Marre de mon job actuel", emoji: "😮‍💨" },
      { value: "besoin_sous", label: "J'ai besoin de revenus en plus", emoji: "💰" },
      { value: "liberte", label: "Envie de liberté / de sens", emoji: "🕊️" },
      { value: "teste", label: "Je teste, je verrai bien", emoji: "🧪" },
      { value: "autre", label: "Autre chose", emoji: "✨" },
    ],
  },

  // ─── Branche 🔍 Curieux ───────────────────────────────────────────────────
  {
    id: "curious_focus",
    type: "choice",
    question: "Ce qui t'intrigue le plus ?",
    when: (a) => a.profile === "curious",
    options: [
      { value: "produits", label: "Les produits", emoji: "🧴" },
      { value: "business", label: "Le business / les revenus", emoji: "📈" },
      { value: "communaute", label: "La communauté", emoji: "👥" },
    ],
  },
  {
    id: "curious_ready",
    type: "choice",
    question: "Tu en es où ?",
    when: (a) => a.profile === "curious",
    options: [
      { value: "info", label: "Je veux juste m'informer", emoji: "📚" },
      { value: "tester", label: "Je suis prêt·e à tester", emoji: "✅" },
    ],
  },

  // ─── Branche 💸 Complément ────────────────────────────────────────────────
  {
    id: "side_amount",
    type: "choice",
    question: "Quel complément mensuel changerait vraiment ton quotidien ?",
    hint: "Une aspiration, pas une promesse 🙂",
    when: (a) => a.profile === "side_income",
    options: [
      { value: "200", label: "~200 € / mois", emoji: "🙂" },
      { value: "500", label: "~500 € / mois", emoji: "😃" },
      { value: "1000", label: "~1000 € / mois", emoji: "🤩" },
      { value: "plus", label: "Plus encore", emoji: "🚀" },
    ],
  },
  {
    id: "side_flex",
    type: "choice",
    question: "Ton activité actuelle te laisse de la flexibilité ?",
    when: (a) => a.profile === "side_income",
    options: [
      { value: "oui", label: "Oui, je gère mon temps", emoji: "🕒" },
      { value: "un_peu", label: "Un peu, le soir / week-end", emoji: "🌙" },
      { value: "peu", label: "Pas beaucoup", emoji: "⏳" },
    ],
  },

  // ─── Branche 🚀 Reconversion ──────────────────────────────────────────────
  {
    id: "career_why",
    type: "choice",
    question: "Qu'est-ce qui te donne le plus envie de changer ?",
    when: (a) => a.profile === "career_change",
    options: [
      { value: "sens", label: "Donner du sens à mon travail", emoji: "🎯" },
      { value: "argent", label: "Gagner mieux ma vie", emoji: "💶" },
      { value: "liberte", label: "Être libre / mon propre patron", emoji: "🦅" },
      { value: "burnout", label: "Je n'en peux plus de l'actuel", emoji: "🆘" },
    ],
  },
  {
    id: "career_delay",
    type: "choice",
    question: "Dans quel délai tu aimerais en vivre ?",
    when: (a) => a.profile === "career_change",
    options: [
      { value: "3m", label: "3 mois", emoji: "⚡" },
      { value: "6m", label: "6 mois", emoji: "📆" },
      { value: "12m", label: "1 an", emoji: "🗓️" },
      { value: "pas_presse", label: "Pas pressé·e", emoji: "🐢" },
    ],
  },
  {
    id: "career_train",
    type: "choice",
    question: "Prêt·e à te former sérieusement et à être accompagné·e ?",
    when: (a) => a.profile === "career_change",
    options: [
      { value: "oui", label: "Oui, à fond", emoji: "💪" },
      { value: "voir", label: "Si c'est bien encadré", emoji: "🤝" },
    ],
  },

  // Clôture
  {
    id: "hours",
    type: "choice",
    question: "Combien d'heures par semaine tu pourrais y consacrer ?",
    options: [
      { value: "lt2", label: "Moins de 2h", emoji: "🌱" },
      { value: "2_5", label: "2 à 5h", emoji: "🙂" },
      { value: "5_10", label: "5 à 10h", emoji: "💪" },
      { value: "10p", label: "10h et +", emoji: "🔥" },
    ],
  },
  {
    id: "wants_visio",
    type: "choice",
    question: "Tu serais dispo pour un échange de 20 min en visio ?",
    options: [
      { value: "semaine", label: "Oui, cette semaine", emoji: "📞" },
      { value: "plus_tard", label: "Plus tard", emoji: "🗓️" },
      { value: "pas_encore", label: "Pas encore", emoji: "✋" },
    ],
  },
  {
    id: "consent",
    type: "consent",
    question: "Dernière étape !",
    hint: "On a juste besoin de ton accord.",
  },
];

const EMAIL_RE = /.+@.+\..+/;

export function RejoindreQuestionnairePage() {
  const navigate = useNavigate();
  const { coachSlug } = useParams<{ coachSlug?: string }>();
  const [searchParams] = useSearchParams();

  const [answers, setAnswers] = useState<AnswerMap>({});
  const [consentChecked, setConsentChecked] = useState(false);
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [phase, setPhase] = useState<"form" | "submitting" | "done" | "error">("form");
  const [result, setResult] = useState<OpportunityScore | null>(null);
  const [submitError, setSubmitError] = useState("");

  // Submit → scoring + écriture prospect_leads (via metadata, pas de migration).
  async function submitLead() {
    setPhase("submitting");
    setSubmitError("");
    const sc = scoreOpportunityLead(answers);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");
      const ref = searchParams.get("ref") || undefined;
      const { data, error } = await sb.functions.invoke("submit-prospect-lead", {
        body: {
          first_name: (answers.firstName || "").trim(),
          phone: (answers.phone || "").trim(),
          city: (answers.city || "").trim() || undefined,
          source: "rejoindre-funnel",
          coach_slug: coachSlug || undefined,
          referrer_user_id: ref,
          referral_source: answers.source,
          consent_recontact: true,
          metadata: {
            funnel: "opportunite-gated",
            profile: sc.profile,
            score: sc.score,
            temperature: sc.temperature,
            email: (answers.email || "").trim(),
            last_name: (answers.lastName || "").trim(),
            answers,
          },
        },
      });
      if (error || !data?.success) {
        const raw = await extractFunctionError(data, error, "Erreur inconnue.");
        throw new Error(raw === "rate_limited" ? "Trop de tentatives, réessaie dans 1h." : raw);
      }
      setResult(sc);
      setPhase("done");
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Erreur inconnue.");
      setPhase("error");
    }
  }

  // Steps visibles selon les branches (recalculé à chaque réponse)
  const visibleSteps = useMemo(() => STEPS.filter((s) => !s.when || s.when(answers)), [answers]);
  const total = visibleSteps.length;
  const step = visibleSteps[Math.min(idx, total - 1)];
  const progress = Math.round(((idx + 1) / total) * 100);

  const firstName = answers.firstName?.trim() || "";

  // Micro-rebond contextuel affiché au-dessus de la question
  const rebond = useMemo(() => {
    if (!step) return "";
    if (step.id === "lastName" && firstName) return `Enchanté ${firstName} 👋`;
    if (step.id === "source") return "Parfait. Quelques questions et c'est bon.";
    if (step.id === "profile") return "La question clé 👇";
    if (idx > 0 && idx === total - 1) return "Promis, c'est la dernière 🙌";
    if (progress >= 60 && step.type === "choice") return "Plus que quelques questions 💪";
    return "";
  }, [step, firstName, idx, total, progress]);

  const currentValue = step ? answers[step.id] ?? "" : "";

  const canAdvance = useMemo(() => {
    if (!step) return false;
    if (step.type === "consent") return consentChecked;
    if (step.optional) return true;
    const v = (currentValue || "").trim();
    if (step.type === "text") return v.length >= 2;
    if (step.type === "email") return EMAIL_RE.test(v);
    if (step.type === "tel") return v.replace(/\D/g, "").length >= 6;
    if (step.type === "choice") return v.length > 0;
    return false;
  }, [step, currentValue, consentChecked]);

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function goNext() {
    if (!canAdvance) return;
    if (idx >= total - 1) {
      void submitLead();
      return;
    }
    setDir(1);
    setIdx((i) => i + 1);
  }

  function goBack() {
    if (idx === 0) {
      const qs = searchParams.toString();
      const base = coachSlug ? `/rejoindre/${coachSlug}` : "/rejoindre";
      navigate(qs ? `${base}?${qs}` : base);
      return;
    }
    setDir(-1);
    setIdx((i) => i - 1);
  }

  // Pour un choix : on sélectionne ET on avance automatiquement (fluidité).
  function pickChoice(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
    if (idx >= total - 1) {
      void submitLead();
      return;
    }
    setDir(1);
    // Laisse le temps de voir la sélection avant de glisser
    window.setTimeout(() => setIdx((i) => i + 1), 180);
  }

  if (phase === "submitting") {
    return (
      <div style={styles.page}>
        <style>{KEYFRAMES}</style>
        <div aria-hidden="true" style={styles.glowTop} />
        <div style={{ ...styles.container, textAlign: "center", paddingTop: 120 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }} className="rj-pop">⏳</div>
          <h1 style={styles.h1}>On enregistre tes réponses…</h1>
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={styles.page}>
        <style>{KEYFRAMES}</style>
        <div aria-hidden="true" style={styles.glowTop} />
        <div style={{ ...styles.container, textAlign: "center", paddingTop: 90 }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>😕</div>
          <h1 style={{ ...styles.h1, fontSize: "clamp(24px,6vw,32px)" }}>Oups, ça a coincé</h1>
          <p style={styles.lead}>{submitError}</p>
          <button type="button" onClick={() => void submitLead()} style={styles.cta}>
            Réessayer →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    const ref = searchParams.get("ref");
    const bizParams = new URLSearchParams();
    if (ref) bizParams.set("ref", ref);
    bizParams.set("from", "funnel"); // → /business remplace le form §07 par un remerciement
    const businessUrl = `/business?${bizParams.toString()}`;
    const profile = result?.profile;
    const sc = result ?? scoreOpportunityLead(answers);
    const evalu = buildPreEvaluation(answers, sc, firstName);
    const cta =
      profile === "side_income"
        ? { label: "Calculer mon plan →", href: `${businessUrl}#simulateur` }
        : profile === "career_change"
          ? { label: "Découvrir l'opportunité →", href: businessUrl }
          : { label: "Découvrir à mon rythme →", href: businessUrl };
    const toneColor =
      evalu.verdictTone === "hot" ? C.emerald : evalu.verdictTone === "warm" ? C.cyan : C.violet;

    return (
      <div style={styles.page}>
        <style>{KEYFRAMES}</style>
        <div aria-hidden="true" style={styles.glowTop} />
        <div style={{ ...styles.container, paddingTop: 48 }}>
          {/* En-tête centré */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 14 }} className="rj-pop">{evalu.emoji}</div>
            <div
              style={{
                display: "inline-block",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontFamily: "Sora, sans-serif",
                color: toneColor,
                marginBottom: 10,
              }}
            >
              Ta pré-évaluation
            </div>
            <h1 style={styles.h1}>{evalu.headline}</h1>
            <p style={{ ...styles.lead, marginBottom: 28 }}>{evalu.verdict}</p>
          </div>

          {/* Atouts dérivés des réponses */}
          <div style={{ marginBottom: evalu.goal || evalu.watchout ? 18 : 28 }}>
            <div style={styles.evalSectionTitle}>✅ Ce que tu as déjà pour toi</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {evalu.assets.map((asset, i) => (
                <div
                  key={asset.label}
                  className="rj-fade-up"
                  style={{ ...styles.assetCard, animationDelay: `${0.06 * i}s` }}
                >
                  <span style={styles.assetEmoji} aria-hidden="true">{asset.emoji}</span>
                  <span>
                    <span style={styles.assetLabel}>{asset.label}</span>
                    <span style={styles.assetWhy}>{asset.why}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Objectif reformulé */}
          {evalu.goal ? (
            <div style={styles.goalBox}>
              <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">🎯</span>
              <span style={{ fontSize: 14, lineHeight: 1.5, color: C.cream }}>{evalu.goal}</span>
            </div>
          ) : null}

          {/* Point d'honnêteté */}
          {evalu.watchout ? (
            <div style={styles.watchoutBox}>{evalu.watchout}</div>
          ) : null}

          <button type="button" onClick={() => navigate(cta.href)} style={styles.cta}>
            {cta.label}
          </button>
          <div style={styles.trustDone}>✓ On a bien reçu tes infos · ✓ Un coach revient vers toi vite</div>
        </div>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div style={styles.page}>
      <style>{KEYFRAMES}</style>
      <div aria-hidden="true" style={styles.glowTop} />

      <div style={styles.container}>
        {/* Header : back + progress */}
        <div style={styles.topRow}>
          <button type="button" onClick={goBack} style={styles.backBtn} aria-label="Précédent">
            ←
          </button>
          <div style={styles.progressTrack} aria-hidden="true">
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>
          <span style={styles.progressLabel}>
            {idx + 1}/{total}
          </span>
        </div>

        {/* Question (clé = idx pour rejouer l'anim slide) */}
        <div key={`${step.id}-${idx}`} style={dir === 1 ? styles.slideIn : styles.slideInBack}>
          {rebond ? <div style={styles.rebond}>{rebond}</div> : null}

          <h1 style={styles.question}>{step.question}</h1>
          {step.hint ? <p style={styles.hint}>{step.hint}</p> : null}

          {/* Champs texte / email / tel */}
          {(step.type === "text" || step.type === "email" || step.type === "tel") && (
            <input
              type={step.type === "tel" ? "tel" : step.type === "email" ? "email" : "text"}
              value={currentValue}
              onChange={(e) => setAnswer(step.id, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goNext();
              }}
              placeholder={step.placeholder}
              autoFocus
              maxLength={80}
              style={styles.input}
            />
          )}

          {/* Choix */}
          {step.type === "choice" && step.options && (
            <div style={styles.options}>
              {step.options.map((opt) => {
                const selected = currentValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => pickChoice(step.id, opt.value)}
                    style={{
                      ...styles.option,
                      ...(selected ? styles.optionSelected : null),
                    }}
                  >
                    {opt.emoji ? <span style={styles.optionEmoji}>{opt.emoji}</span> : null}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Consentement final */}
          {step.type === "consent" && (
            <label style={styles.consent}>
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: C.emerald, flexShrink: 0 }}
              />
              <span style={{ fontSize: 14, color: C.creamMuted, lineHeight: 1.5 }}>
                J'accepte d'être recontacté·e par un coach La Base 360. Mes données ne sont ni
                revendues ni utilisées hors de ce contexte.
              </span>
            </label>
          )}
        </div>

        {/* CTA suivant (caché pour les choix qui avancent tout seuls) */}
        {step.type !== "choice" && (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance}
            style={{ ...styles.cta, opacity: canAdvance ? 1 : 0.45, cursor: canAdvance ? "pointer" : "not-allowed" }}
          >
            {step.type === "consent" ? "Voir mon résultat →" : step.optional && !currentValue ? "Passer →" : "Continuer →"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(ellipse at top, rgba(16,185,129,0.12) 0%, transparent 55%)," +
      "radial-gradient(ellipse at bottom right, rgba(139,92,246,0.10) 0%, transparent 55%)," +
      C.ink,
    color: C.cream,
    fontFamily: "Inter, system-ui, sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    background: "radial-gradient(circle, rgba(16,185,129,0.16), transparent 65%)",
    pointerEvents: "none",
    filter: "blur(8px)",
  },
  container: { position: "relative", zIndex: 1, maxWidth: 520, margin: "0 auto", padding: "28px 22px 56px" },
  topRow: { display: "flex", alignItems: "center", gap: 12, marginBottom: 36 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    border: `1px solid ${C.hair}`,
    background: "rgba(255,255,255,0.04)",
    color: C.cream,
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },
  progressTrack: { flex: 1, height: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" },
  progressFill: {
    height: "100%",
    background: `linear-gradient(90deg, ${C.emerald}, ${C.cyan} 60%, ${C.violet})`,
    borderRadius: 999,
    transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
  },
  progressLabel: { fontSize: 12, color: C.creamHint, fontFamily: "Sora, sans-serif", fontWeight: 600, minWidth: 38, textAlign: "right" },
  rebond: {
    display: "inline-block",
    fontSize: 13,
    color: C.emerald,
    fontWeight: 600,
    marginBottom: 12,
    fontFamily: "Sora, sans-serif",
  },
  question: {
    fontFamily: "Sora, sans-serif",
    fontSize: "clamp(24px, 5.5vw, 32px)",
    fontWeight: 800,
    lineHeight: 1.18,
    letterSpacing: "-0.02em",
    margin: "0 0 10px",
    color: C.cream,
  },
  grad: {
    fontStyle: "italic",
    fontWeight: 400,
    background: `linear-gradient(120deg, ${C.emerald}, ${C.cyan} 55%, ${C.violet})`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  },
  hint: { fontSize: 14, color: C.creamMuted, lineHeight: 1.5, margin: "0 0 22px" },
  lead: { fontSize: 15.5, color: C.creamMuted, lineHeight: 1.6, margin: "0 auto 24px", maxWidth: 420 },
  input: {
    width: "100%",
    marginTop: 8,
    padding: "15px 16px",
    background: "rgba(255,255,255,0.05)",
    border: `1px solid ${C.hairStrong}`,
    borderRadius: 14,
    fontFamily: "Inter, sans-serif",
    fontSize: 16,
    color: C.cream,
    outline: "none",
    boxSizing: "border-box",
  },
  options: { display: "flex", flexDirection: "column", gap: 10, marginTop: 8 },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    width: "100%",
    padding: "15px 16px",
    borderRadius: 14,
    border: `1px solid ${C.hair}`,
    background: "rgba(255,255,255,0.04)",
    color: C.cream,
    fontFamily: "Inter, sans-serif",
    fontSize: 15.5,
    fontWeight: 500,
    textAlign: "left",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s, transform 0.1s",
  },
  optionSelected: {
    borderColor: C.emerald,
    background: "color-mix(in srgb, #10B981 14%, transparent)",
    boxShadow: "0 0 0 3px color-mix(in srgb, #10B981 16%, transparent)",
  },
  optionEmoji: { fontSize: 22, flexShrink: 0 },
  consent: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 14,
    padding: "16px",
    borderRadius: 14,
    border: `1px solid ${C.hair}`,
    background: "rgba(255,255,255,0.04)",
    cursor: "pointer",
  },
  cta: {
    width: "100%",
    marginTop: 28,
    padding: "16px 20px",
    borderRadius: 14,
    border: "none",
    background: `linear-gradient(135deg, ${C.emerald} 0%, ${C.cyan} 50%, ${C.violet} 100%)`,
    color: "white",
    fontFamily: "Sora, sans-serif",
    fontWeight: 700,
    fontSize: 16,
    boxShadow: "0 10px 28px rgba(16,185,129,0.30)",
  },
  trustDone: { marginTop: 18, fontSize: 12.5, color: C.creamHint, textAlign: "center" },
  h1: {
    fontFamily: "Sora, sans-serif",
    fontSize: "clamp(24px, 5.5vw, 32px)",
    fontWeight: 800,
    lineHeight: 1.2,
    letterSpacing: "-0.02em",
    margin: "0 0 12px",
    color: C.cream,
  },
  evalSectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: C.creamMuted,
    fontFamily: "Sora, sans-serif",
    marginBottom: 12,
  },
  assetCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: 13,
    padding: "14px 15px",
    borderRadius: 14,
    border: `1px solid ${C.hair}`,
    background: "rgba(255,255,255,0.04)",
  },
  assetEmoji: { fontSize: 22, flexShrink: 0, lineHeight: 1.2 },
  assetLabel: { display: "block", fontSize: 15, fontWeight: 700, color: C.cream, fontFamily: "Sora, sans-serif" },
  assetWhy: { display: "block", fontSize: 13.5, color: C.creamMuted, lineHeight: 1.45, marginTop: 3 },
  goalBox: {
    display: "flex",
    alignItems: "flex-start",
    gap: 11,
    padding: "14px 16px",
    borderRadius: 14,
    border: `1px solid color-mix(in srgb, ${C.emerald} 30%, transparent)`,
    background: `linear-gradient(135deg, color-mix(in srgb, ${C.emerald} 10%, transparent), color-mix(in srgb, ${C.violet} 8%, transparent))`,
    marginBottom: 14,
  },
  watchoutBox: {
    padding: "12px 15px",
    borderRadius: 12,
    border: `1px dashed ${C.hairStrong}`,
    background: "rgba(255,255,255,0.02)",
    fontSize: 13,
    lineHeight: 1.5,
    color: C.creamMuted,
    marginBottom: 22,
  },
  slideIn: { animation: "rj-slide-in 0.32s cubic-bezier(0.4,0,0.2,1)" },
  slideInBack: { animation: "rj-slide-in-back 0.32s cubic-bezier(0.4,0,0.2,1)" },
};

const KEYFRAMES = `
@keyframes rj-slide-in { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes rj-slide-in-back { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: translateX(0); } }
@keyframes rj-pop { 0% { transform: scale(0.6); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
.rj-pop { animation: rj-pop 0.5s cubic-bezier(0.2,0.8,0.2,1) both; }
@keyframes rj-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
.rj-fade-up { animation: rj-fade-up 0.4s cubic-bezier(0.4,0,0.2,1) both; }
@media (prefers-reduced-motion: reduce) {
  [style*="rj-slide"], .rj-pop, .rj-fade-up { animation: none !important; }
}
`;

export default RejoindreQuestionnairePage;
