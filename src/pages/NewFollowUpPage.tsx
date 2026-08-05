import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { MetabolicAgeInsightCard } from "../components/body-scan/MetabolicAgeInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { EvolutionReportModal } from "../components/assessment/EvolutionReportModal";
import { buildReportData } from "../lib/evolutionReport";
import { getEffectiveAge } from "../lib/age";
import { getSupabaseClient } from "../services/supabaseClient";
import { refreshClientRecap } from "../services/supabaseService";
import { confirmNoAgendaConflict } from "../lib/agendaGuard";
import { useAppContext } from "../context/AppContext";
import { useToast, buildSupabaseErrorToast } from "../context/ToastContext";
import { buildPvTrackingRecords, getPvProductStatusMeta } from "../data/pvCatalog";
import {
  formatDate,
  getFirstAssessment,
  getLatestAssessment,
  getWeightLossPaceInsight,
  getWeightLossPlan,
  normalizeDateTimeLocalInputValue,
  serializeDateTimeForStorage
} from "../lib/calculations";
import type { AssessmentQuestionnaire, AssessmentRecord, BodyScanMetrics } from "../types/domain";

interface FollowUpDraftPayload {
  clientId: string;
  bodyScan: BodyScanMetrics;
  assessmentDate: string;
  dueDate: string;
  followUpType: string;
  energyCheck: string;
  hungerCheck: string;
  quantityCheck: string;
  digestionCheck: string;
  bloatingCheck: string;
  mealPrepCheck: string;
  mealRoutineCheck: string;
  hydrationCheck: string;
  easyWin: string;
  attentionPoint: string;
  coachNote: string;
  optionalProductsToggle: string;
  optionalProductsUsed: string;
  recommendationsContacted: boolean;
}

const FOLLOW_UP_DRAFT_PREFIX = "lor-squad-wellness-follow-up-draft-v1";

// ─── Parcours en 3 étapes (chantier « adoucir la fiche client », 2026-08-03) ──
// Avant : une seule page-fleuve d'une dizaine de blocs empilés, « Valider » noyé
// tout en bas. Le coach ET le client regardent cet écran pendant le RDV, donc on
// avance une chose à la fois, avec l'action toujours visible en bas.
const STEP_LABELS = ["Ressenti", "Body scan", "Validation"] as const;
type StepIndex = 0 | 1 | 2;

// Valeurs par défaut du check-in : servent à détecter si le coach a réellement
// renseigné le ressenti (sinon on garde la section repliée).
const DEFAULT_CHECKS = {
  energy: "Correct",
  hunger: "Plus régulière",
  quantity: "Un peu mieux",
  digestion: "Plutôt correct",
  bloating: "Un peu parfois",
  mealPrep: "Plutôt gérable",
  mealRoutine: "Un peu",
  hydration: "Correcte"
} as const;

/** Métriques du body scan, dans l'ordre de saisie sur la balance. */
const METRIC_DEFS: {
  key: keyof BodyScanMetrics;
  label: string;
  unit: string;
  /** true = monter est une bonne nouvelle (muscle, hydratation…). */
  higherIsBetter?: boolean;
}[] = [
  // Le poids seul dépend de l'objectif (perdre / prendre) : traité à l'usage.
  { key: "weight", label: "Poids", unit: "kg" },
  { key: "bodyFat", label: "Masse grasse", unit: "%", higherIsBetter: false },
  { key: "muscleMass", label: "Masse musculaire", unit: "kg", higherIsBetter: true },
  { key: "hydration", label: "Hydratation", unit: "%", higherIsBetter: true },
  { key: "boneMass", label: "Masse osseuse", unit: "kg", higherIsBetter: true },
  { key: "visceralFat", label: "Graisse viscérale", unit: "", higherIsBetter: false },
  { key: "bmr", label: "BMR", unit: "kcal", higherIsBetter: true },
  { key: "metabolicAge", label: "Âge métabolique", unit: "ans", higherIsBetter: false }
];

function getFollowUpDraftKey(clientId: string) {
  return `${FOLLOW_UP_DRAFT_PREFIX}-${clientId}`;
}

function readFollowUpDraft(clientId: string): FollowUpDraftPayload | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(getFollowUpDraftKey(clientId));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<FollowUpDraftPayload>;
    if (!parsed.clientId || parsed.clientId !== clientId || !parsed.bodyScan) {
      return null;
    }

    return parsed as FollowUpDraftPayload;
  } catch {
    return null;
  }
}

function persistFollowUpDraft(payload: FollowUpDraftPayload) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getFollowUpDraftKey(payload.clientId), JSON.stringify(payload));
  } catch (error) {
    console.error("Sauvegarde du brouillon suivi impossible.", error);
  }
}

function clearFollowUpDraft(clientId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(getFollowUpDraftKey(clientId));
}

export function NewFollowUpPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { currentUser, getClientById, addFollowUpAssessment, pvTransactions, pvClientProducts } = useAppContext();
  const { push: pushToast } = useToast();
  const client = clientId ? getClientById(clientId) : undefined;

  // Hooks AVANT tout early return (rules-of-hooks / chantier nuit 2026-04-20).
  // Les valeurs latest/previous/first et bodyScan sont calculées avec un
  // fallback safe si `client` est undefined.
  const latest = client ? getLatestAssessment(client) : null;
  const first = client ? getFirstAssessment(client) : null;

  const defaultScan: BodyScanMetrics = latest?.bodyScan ?? { weight: 0, bodyFat: 0, muscleMass: 0, hydration: 0, boneMass: 0, visceralFat: 0, bmr: 0, metabolicAge: 0 };
  const [bodyScan, setBodyScan] = useState<BodyScanMetrics>({ ...defaultScan });
  const [assessmentDate, setAssessmentDate] = useState(
    normalizeDateTimeLocalInputValue(new Date().toISOString())
  );
  const [dueDate, setDueDate] = useState(
    normalizeDateTimeLocalInputValue(client?.nextFollowUp ?? "")
  );
  const [followUpType, setFollowUpType] = useState("Suivi terrain");
  const [energyCheck, setEnergyCheck] = useState("Correct");
  const [hungerCheck, setHungerCheck] = useState("Plus régulière");
  const [quantityCheck, setQuantityCheck] = useState("Un peu mieux");
  const [digestionCheck, setDigestionCheck] = useState("Plutôt correct");
  const [bloatingCheck, setBloatingCheck] = useState("Un peu parfois");
  const [mealPrepCheck, setMealPrepCheck] = useState("Plutôt gérable");
  const [mealRoutineCheck, setMealRoutineCheck] = useState("Un peu");
  const [hydrationCheck, setHydrationCheck] = useState("Correcte");
  const [easyWin, setEasyWin] = useState("");
  const [attentionPoint, setAttentionPoint] = useState("");
  const [coachNote, setCoachNote] = useState("");
  const [reportUrl, setReportUrl] = useState<string | null>(null);
  const [optionalProductsToggle, setOptionalProductsToggle] = useState(
    latest?.questionnaire?.optionalProductsUsed?.trim() ? "Oui" : "Non"
  );
  const [optionalProductsUsed, setOptionalProductsUsed] = useState(
    latest?.questionnaire?.optionalProductsUsed ?? ""
  );
  const [recommendationsContacted, setRecommendationsContacted] = useState(
    latest?.questionnaire?.recommendationsContacted ?? false
  );
  const [draftReady, setDraftReady] = useState(false);
  const [step, setStep] = useState<StepIndex>(0);
  const [ressentiOpen, setRessentiOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [pvOpen, setPvOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weightError, setWeightError] = useState(false);

  useEffect(() => {
    if (!client) return;
    const draft = readFollowUpDraft(client.id);
    if (draft) {
      setBodyScan(draft.bodyScan);
      setAssessmentDate(draft.assessmentDate);
      setDueDate(draft.dueDate);
      setFollowUpType(draft.followUpType);
      setEnergyCheck(draft.energyCheck);
      setHungerCheck(draft.hungerCheck);
      setQuantityCheck(draft.quantityCheck);
      setDigestionCheck(draft.digestionCheck);
      setBloatingCheck(draft.bloatingCheck);
      setMealPrepCheck(draft.mealPrepCheck);
      setMealRoutineCheck(draft.mealRoutineCheck);
      setHydrationCheck(draft.hydrationCheck);
      setEasyWin(draft.easyWin);
      setAttentionPoint(draft.attentionPoint);
      setCoachNote(draft.coachNote);
      setOptionalProductsToggle(draft.optionalProductsToggle);
      setOptionalProductsUsed(draft.optionalProductsUsed);
      setRecommendationsContacted(draft.recommendationsContacted);

      // Reprise de brouillon : si le ressenti avait déjà été renseigné, on
      // rouvre la section pour que le coach retrouve son travail (sinon il
      // croirait l'avoir perdu).
      const ressentiTouched =
        draft.easyWin.trim() !== "" ||
        draft.attentionPoint.trim() !== "" ||
        draft.energyCheck !== DEFAULT_CHECKS.energy ||
        draft.hungerCheck !== DEFAULT_CHECKS.hunger ||
        draft.quantityCheck !== DEFAULT_CHECKS.quantity ||
        draft.digestionCheck !== DEFAULT_CHECKS.digestion ||
        draft.bloatingCheck !== DEFAULT_CHECKS.bloating ||
        draft.mealPrepCheck !== DEFAULT_CHECKS.mealPrep ||
        draft.mealRoutineCheck !== DEFAULT_CHECKS.mealRoutine ||
        draft.hydrationCheck !== DEFAULT_CHECKS.hydration;
      if (ressentiTouched) setRessentiOpen(true);
    }

    setDraftReady(true);
  }, [client]);

  useEffect(() => {
    if (!client || !draftReady) {
      return;
    }

    persistFollowUpDraft({
      clientId: client.id,
      bodyScan,
      assessmentDate,
      dueDate,
      followUpType,
      energyCheck,
      hungerCheck,
      quantityCheck,
      digestionCheck,
      bloatingCheck,
      mealPrepCheck,
      mealRoutineCheck,
      hydrationCheck,
      easyWin,
      attentionPoint,
      coachNote,
      optionalProductsToggle,
      optionalProductsUsed,
      recommendationsContacted
    });
  }, [
    assessmentDate,
    attentionPoint,
    bloatingCheck,
    bodyScan,
    coachNote,
    digestionCheck,
    draftReady,
    dueDate,
    easyWin,
    energyCheck,
    followUpType,
    hungerCheck,
    hydrationCheck,
    mealPrepCheck,
    mealRoutineCheck,
    optionalProductsToggle,
    optionalProductsUsed,
    quantityCheck,
    recommendationsContacted,
    client
  ]);

  const pvRecord = useMemo(
    () => (client ? buildPvTrackingRecords([client], pvTransactions, pvClientProducts)[0] ?? null : null),
    [pvClientProducts, pvTransactions, client]
  );

  // Early return APRÈS tous les hooks (rules-of-hooks / chantier nuit 2026-04-20).
  if (!client) {
    return (
      <Card>
        <p className="text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }
  const targetClient = client;

  const weightLossPlan = getWeightLossPlan(
    bodyScan.weight,
    latest?.questionnaire?.targetWeight,
    latest?.questionnaire?.desiredTimeline
  );
  const weightLossPace = getWeightLossPaceInsight(weightLossPlan);
  const followUpSummary = `${energyCheck} • ${hungerCheck} • ${digestionCheck}`;
  const followUpNotes = [
    `Énergie : ${energyCheck}.`,
    `Faim et satiété : ${hungerCheck}.`,
    `Gestion des quantités : ${quantityCheck}.`,
    `Digestion : ${digestionCheck}.`,
    `Ballonnements : ${bloatingCheck}.`,
    `Préparation des repas : ${mealPrepCheck}.`,
    `Gestion des repas : ${mealRoutineCheck}.`,
    `Hydratation : ${hydrationCheck}.`,
    easyWin.trim() ? `Point simple : ${easyWin.trim()}.` : "",
    attentionPoint.trim() ? `Point à relancer : ${attentionPoint.trim()}.` : "",
    "Le client repart avec des repères simples et une suite déjà fixée."
  ]
    .filter(Boolean)
    .join(" ");

  // ── Navigation du parcours ──────────────────────────────────────────────
  // On ne quitte pas le body scan sans poids : c'est la seule valeur dont tout
  // le reste dépend (écarts, courbe, rapport d'évolution).
  function goNext() {
    if (step === 1 && !(bodyScan.weight > 0)) {
      setWeightError(true);
      pushToast({
        tone: "warning",
        title: "Poids manquant",
        message: "Renseigne au moins le poids du jour avant de continuer."
      });
      return;
    }
    setWeightError(false);
    if (step < 2) {
      setStep((step + 1) as StepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goBack() {
    if (step > 0) {
      setStep((step - 1) as StepIndex);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function submitGuarded() {
    if (saving) return;
    setSaving(true);
    try {
      await handleSubmit();
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit() {
    // Garde-fou agenda (helper partagé) : uniquement si un RDV concret est saisi.
    if (currentUser?.id && dueDate) {
      const dueIso = serializeDateTimeForStorage(dueDate);
      const ok = await confirmNoAgendaConflict(currentUser.id, dueIso);
      if (!ok) return;
    }

    const nextQuestionnaire: AssessmentQuestionnaire = {
      ...(latest?.questionnaire ?? {} as AssessmentQuestionnaire),
      desiredTimeline: latest?.questionnaire?.desiredTimeline ?? '',
      recommendations: recommendationsContacted ? [] : (latest?.questionnaire?.recommendations ?? []),
      recommendationsContacted,
      optionalProductsUsed:
        optionalProductsToggle === "Oui" ? optionalProductsUsed.trim() || "Oui" : ""
    };

    const finalNotes = [
      followUpNotes,
      optionalProductsToggle === "Oui"
        ? `Produits optionnels : ${optionalProductsUsed.trim() || "Oui"}.`
        : "Produits optionnels : non pris.",
      coachNote.trim() ? `Note coach : ${coachNote.trim()}.` : ""
    ]
      .filter(Boolean)
      .join(" ");

    const assessment: AssessmentRecord = {
      id: `a-${targetClient.id}-${Date.now()}`,
      date: assessmentDate,
      type: "follow-up",
      objective: targetClient.objective,
      programTitle: targetClient.currentProgram,
      summary: followUpSummary,
      notes: finalNotes,
      nextFollowUp: serializeDateTimeForStorage(dueDate),
      bodyScan,
      questionnaire: nextQuestionnaire,
      pedagogicalFocus: latest?.pedagogicalFocus ?? []
    };

    await addFollowUpAssessment(targetClient.id, assessment, {
      dueDate: serializeDateTimeForStorage(dueDate),
      type: followUpType,
      status: "scheduled"
    });

    // Chantier sync client_recaps (2026-04-20) : le body scan rapide est un
    // follow-up. Sans ce refresh, la vue client /client/:token affiche encore
    // les valeurs du bilan initial. Non-bloquant : le suivi est déjà enregistré.
    try {
      await refreshClientRecap(targetClient.id);
    } catch (err) {
      pushToast(buildSupabaseErrorToast(
        err,
        "Les données ont été enregistrées mais le lien client n'a pas pu être mis à jour. Tu peux régénérer l'accès depuis la fiche."
      ));
    }

    clearFollowUpDraft(targetClient.id);

    // Envoyer les recos dans la messagerie si cochées comme contactées
    // Site 1 du durcissement audit L1 : erreurs remontées en toast pour éviter
    // perte silencieuse des contacts filleuls. On continue la boucle sur les
    // autres recos même si une échoue.
    if (recommendationsContacted && latest?.questionnaire?.recommendations?.length) {
      const sb = await getSupabaseClient();
      if (sb && currentUser) {
        // Durcissement import (2026-04-21) : fallback [] si le questionnaire
        // a été importé sans la clé recommendations.
        for (const reco of latest.questionnaire.recommendations ?? []) {
          if (!reco.name.trim()) continue;
          try {
            const { error } = await sb.from('client_messages').insert({
              client_id: targetClient.id,
              client_name: `${targetClient.firstName} ${targetClient.lastName}`,
              distributor_id: currentUser.id,
              message_type: 'recommendation',
              product_name: reco.name,
              message: `Recommandation de ${targetClient.firstName} : ${reco.name}${reco.contact ? ` (${reco.contact})` : ''}`,
              client_contact: reco.contact || null,
            });
            if (error) throw error;
          } catch (err) {
            pushToast(buildSupabaseErrorToast(
              err,
              `Impossible d'enregistrer le contact avec ${reco.name}. Réessayez ou notez-le manuellement.`
            ));
          }
        }
      }
    }

    // Générer le rapport d'évolution si >= 2 assessments.
    // Site 3 du durcissement audit L1 : on insère AVANT de supprimer les
    // anciens, pour garantir qu'on n'a jamais d'état "plus aucun rapport
    // valide" si l'insert échoue.
    try {
      const updatedClient = getClientById(targetClient.id);
      if (updatedClient && (updatedClient.assessments?.length ?? 0) >= 2 && currentUser) {
        const reportData = buildReportData(updatedClient, currentUser.name ?? 'Coach');
        if (reportData) {
          const sb = await getSupabaseClient();
          if (sb) {
            // 1. Insert NOUVEAU rapport d'abord
            const { data: inserted, error: insertError } = await sb
              .from('client_evolution_reports')
              .insert(reportData)
              .select('id, token')
              .single();

            if (insertError) throw insertError;

            // 2. Cleanup des anciens rapports, mais seulement après succès de l'insert.
            //    On garde explicitement le tout nouveau via son id.
            if (inserted) {
              const { error: deleteError } = await sb
                .from('client_evolution_reports')
                .delete()
                .eq('client_id', targetClient.id)
                .neq('id', inserted.id);

              if (deleteError) {
                // Non-fatal : le nouveau rapport existe bien, juste un reliquat
                pushToast({
                  tone: "warning",
                  title: "Rapport créé",
                  message: "Le nouveau rapport est disponible, mais les anciens n'ont pas pu être supprimés.",
                });
              }

              setReportUrl(`${window.location.origin}/rapport/${inserted.token}`);
              return; // Ne pas naviguer — afficher le modal
            }
          }
        }
      }
    } catch (err) {
      pushToast(buildSupabaseErrorToast(
        err,
        "Impossible de régénérer le rapport d'évolution. Les anciens rapports sont intacts."
      ));
    }

    navigate(`/clients/${targetClient.id}`);
  }

  // Durcissement import (2026-04-21) : on exige aussi first.bodyScan, sinon
  // les cartes Initial crash quand le bilan initial importé a un bodyScan null.
  if (!latest || !latest.bodyScan || !first || !first.bodyScan) {
    return (
      <Card>
        <p style={{ color: 'var(--ls-text)', fontSize: 14, marginBottom: 12 }}>Ce client n'a pas encore de bilan initial complet. Crée d'abord un bilan avec body scan avant de faire un suivi.</p>
        <button onClick={() => navigate(`/clients/${targetClient.id}`)} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--ls-gold)', color: '#0B0D11', border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>
          Retour à la fiche
        </button>
      </Card>
    );
  }

  /** Carte de réglages de l'étape 3 (type, dates, produits, note, synthèse). */
  function renderSettingsCard() {
    return (
      <Card className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ls-text-muted)]">Type de suivi</label>
          <input value={followUpType} onChange={(event) => setFollowUpType(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ls-text-muted)]">Date et heure du suivi</label>
          <input
            type="datetime-local"
            value={assessmentDate}
            onChange={(event) => setAssessmentDate(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ls-text-muted)]">Prochain rendez-vous</label>
          <input
            type="datetime-local"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </div>
        <FollowUpChoiceGroup
          label="Produits optionnels pris depuis le dernier point ?"
          value={optionalProductsToggle}
          options={["Oui", "Non"]}
          onChange={setOptionalProductsToggle}
        />
        {optionalProductsToggle === "Oui" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--ls-text-muted)]">Lesquels ?</label>
            <input
              value={optionalProductsUsed}
              onChange={(event) => setOptionalProductsUsed(event.target.value)}
              placeholder="Ex : aloe, boisson, booster..."
            />
          </div>
        ) : null}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--ls-text-muted)]">Note du suivi</label>
          <textarea
            rows={4}
            value={coachNote}
            onChange={(event) => setCoachNote(event.target.value)}
            placeholder="Ce que tu veux garder visible dans la fiche client."
          />
        </div>
        {/* Durcissement import (2026-04-21) : recommendations peut être
            null/undefined sur les clients importés via SQL brut. */}
        {(latest?.questionnaire?.recommendations?.length ?? 0) > 0 ? (
          <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
            <div>
              <p className="text-sm font-medium text-white">Recommandations contactées</p>
              <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                {latest?.questionnaire?.recommendations?.length ?? 0} contact
                {(latest?.questionnaire?.recommendations?.length ?? 0) > 1 ? "s" : ""} à reprendre pour ce dossier.
              </p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-white/15 bg-slate-950/30"
              checked={recommendationsContacted}
              onChange={(event) => setRecommendationsContacted(event.target.checked)}
            />
          </label>
        ) : null}
        <div className="rounded-[22px] bg-[var(--ls-surface2)] px-4 py-4">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--ls-text-hint)]">
            Synthèse automatique
          </p>
          <p className="mt-3 text-sm leading-6 text-[var(--ls-text)]">{followUpSummary}</p>
          {targetClient.objective === "weight-loss" ? (
            <p className="mt-2 text-sm text-[var(--ls-text-muted)]">{weightLossPace.label}</p>
          ) : null}
        </div>
      </Card>
    );
  }

  return (
    <div className="fu-wrap">
      <style>{FOLLOW_UP_STYLES}</style>

      {/* ── En-tête : qui + où on en est ─────────────────────────────────── */}
      <header className="fu-head">
        <div className="fu-head-row">
          <p className="fu-who">
            Suivi de <b>{targetClient.firstName} {targetClient.lastName}</b>
          </p>
          <span className="fu-stepchip">Étape {step + 1} / 3</span>
        </div>
        <div
          className="fu-bars"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={step + 1}
          aria-valuetext={`Étape ${step + 1} sur 3 : ${STEP_LABELS[step]}`}
        >
          {STEP_LABELS.map((label, index) => (
            <span key={label} className={`fu-seg${index <= step ? " is-on" : ""}`} />
          ))}
        </div>
        <div className="fu-steplabels" aria-hidden="true">
          {STEP_LABELS.map((label, index) => (
            <span key={label} className={index === step ? "is-current" : undefined}>
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* ══ ÉTAPE 1 · RESSENTI (facultatif) ═══════════════════════════════ */}
      {step === 0 ? (
        <section className="fu-step" aria-labelledby="fu-t0">
          <h1 id="fu-t0" className="fu-h1">Le ressenti du jour</h1>
          <p className="fu-sub">
            Facultatif. Note-le en 30 secondes si tu veux, sinon passe directement au body scan.
          </p>

          <button
            type="button"
            className="fu-ghostbtn"
            aria-expanded={ressentiOpen}
            aria-controls="fu-ressenti"
            onClick={() => setRessentiOpen((open) => !open)}
          >
            {ressentiOpen ? "− Masquer le ressenti" : "＋ Remplir le ressenti (facultatif)"}
          </button>

          {ressentiOpen ? (
            <Card className="mt-3 space-y-5" id="fu-ressenti">
            <div className="grid gap-6">
              <FollowUpChoiceGroup
                label="Niveau d’énergie depuis le dernier point ?"
                value={energyCheck}
                options={["Plus stable", "Correct", "En dents de scie", "Plus faible"]}
                onChange={setEnergyCheck}
              />
              <FollowUpChoiceGroup
                label="Côté faim, tu te sens comment ?"
                value={hungerCheck}
                options={["Mieux calée", "Plus régulière", "Encore des fringales", "Faim difficile à gérer"]}
                onChange={setHungerCheck}
              />
              <FollowUpChoiceGroup
                label="Tu as l’impression de mieux gérer les quantités ?"
                value={quantityCheck}
                options={["Oui clairement", "Un peu mieux", "Pas de vrai changement", "Toujours difficile"]}
                onChange={setQuantityCheck}
              />
              <FollowUpChoiceGroup
                label="Côté digestion, ça se passe comment ?"
                value={digestionCheck}
                options={["Bien", "Plutôt correct", "Quelques gênes", "Plus compliqué"]}
                onChange={setDigestionCheck}
              />
              <FollowUpChoiceGroup
                label="Tu as eu des ballonnements ou un inconfort digestif ?"
                value={bloatingCheck}
                options={["Non", "Un peu parfois", "Assez souvent", "Oui régulièrement"]}
                onChange={setBloatingCheck}
              />
              <FollowUpChoiceGroup
                label="La préparation des repas, ça a été comment ?"
                value={mealPrepCheck}
                options={["Facile à tenir", "Plutôt gérable", "Par moments compliqué", "Trop difficile à suivre"]}
                onChange={setMealPrepCheck}
              />
              <FollowUpChoiceGroup
                label="Tu trouves que tu gères mieux tes repas qu’au début ?"
                value={mealRoutineCheck}
                options={["Oui", "Un peu", "Pas encore", "C’est encore irrégulier"]}
                onChange={setMealRoutineCheck}
              />
              <FollowUpChoiceGroup
                label="L’hydratation sur la journée, ça a donné quoi ?"
                value={hydrationCheck}
                options={["Plus régulière", "Correcte", "À relancer", "Très irrégulière"]}
                onChange={setHydrationCheck}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FollowUpTextField
                  label="Ce qui a été le plus simple"
                  value={easyWin}
                  onChange={setEasyWin}
                  placeholder="Une habitude qui a bien pris, une sensation positive, un point encourageant…"
                />
                <FollowUpTextField
                  label="Ce qui bloque encore"
                  value={attentionPoint}
                  onChange={setAttentionPoint}
                  placeholder="Le point à surveiller, relancer ou simplifier…"
                />
              </div>
            </div>
            </Card>
          ) : null}
        </section>
      ) : null}

      {/* ══ ÉTAPE 2 · BODY SCAN (écran vu aussi par le client) ════════════ */}
      {step === 1 ? (
        <section className="fu-step" aria-labelledby="fu-t1">
          <h1 id="fu-t1" className="fu-h1">Nouvelles valeurs body scan</h1>
          <p className="fu-sub">
            Saisis les chiffres du jour — l&apos;écart avec le {formatDate(latest.date)} s&apos;affiche en direct.
          </p>

          <div className="fu-chips">
            <div className="fu-chip">
              <span className="fu-chip-l">Âge</span>
              <span className="fu-chip-v">{targetClient.age} ans</span>
            </div>
            <div className="fu-chip">
              <span className="fu-chip-l">Taille</span>
              <span className="fu-chip-v">{targetClient.height} cm</span>
            </div>
            <div className="fu-chip">
              <span className="fu-chip-l">Dernier point</span>
              <span className="fu-chip-v">{formatDate(latest.date)}</span>
            </div>
          </div>

          <Card className="fu-scan space-y-1">
            {METRIC_DEFS.map((metric) => (
              <MetricRow
                key={metric.key}
                label={metric.label}
                unit={metric.unit}
                value={bodyScan[metric.key]}
                previous={latest.bodyScan?.[metric.key] ?? 0}
                higherIsBetter={
                  metric.key === "weight"
                    ? targetClient.objective === "weight-loss"
                      ? false
                      : undefined
                    : metric.higherIsBetter
                }
                invalid={metric.key === "weight" && weightError}
                onChange={(value) =>
                  setBodyScan({ ...bodyScan, [metric.key]: Number(value) })
                }
              />
            ))}
            {weightError ? (
              <p className="fu-err" role="alert">
                Renseigne au moins le poids du jour pour continuer.
              </p>
            ) : null}
          </Card>

          <button
            type="button"
            className="fu-foldlink"
            aria-expanded={detailsOpen}
            aria-controls="fu-details"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            {detailsOpen ? "▾" : "▸"} Voir l&apos;analyse détaillée (masse grasse, muscle, âge métabolique)
          </button>

          {detailsOpen ? (
            <div id="fu-details" className="mt-3 space-y-4">
            <StartingPointWeightCard
              objective={targetClient.objective}
              startDate={first.date}
              startWeight={first.bodyScan.weight}
              latestDate={latest.date}
              latestWeight={latest.bodyScan.weight}
              currentDate={assessmentDate}
              currentWeight={bodyScan.weight}
            />

            <BodyFatInsightCard
              current={{ weight: bodyScan.weight, percent: bodyScan.bodyFat }}
              objective={targetClient.objective}
              sex={targetClient.sex}
              age={getEffectiveAge(targetClient)}
              previous={{ weight: latest.bodyScan.weight, percent: latest.bodyScan.bodyFat }}
              initial={{ weight: first.bodyScan.weight, percent: first.bodyScan.bodyFat }}
              history={[
                ...(targetClient.assessments ?? []).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  percent: assessment.bodyScan?.bodyFat ?? 0
                })),
                {
                  date: assessmentDate,
                  weight: bodyScan.weight,
                  percent: bodyScan.bodyFat,
                  label: "Aujourd'hui"
                }
              ]}
            />

            <MuscleMassInsightCard
              current={{ weight: bodyScan.weight, muscleMass: bodyScan.muscleMass }}
              previous={{ weight: latest.bodyScan.weight, muscleMass: latest.bodyScan.muscleMass }}
              initial={{ weight: first.bodyScan.weight, muscleMass: first.bodyScan.muscleMass }}
              history={[
                ...(targetClient.assessments ?? []).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  muscleMass: assessment.bodyScan?.muscleMass ?? 0
                })),
                {
                  date: assessmentDate,
                  weight: bodyScan.weight,
                  muscleMass: bodyScan.muscleMass,
                  label: "Aujourd'hui"
                }
              ]}
            />

            <HydrationVisceralInsightCard
              weight={bodyScan.weight}
              hydrationPercent={bodyScan.hydration}
              visceralFat={bodyScan.visceralFat}
              sex={targetClient.sex}
              history={[
                ...(targetClient.assessments ?? []).map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan?.weight ?? 0,
                  hydrationPercent: assessment.bodyScan?.hydration ?? 0,
                  visceralFat: assessment.bodyScan?.visceralFat ?? 0
                })),
                {
                  date: assessmentDate,
                  weight: bodyScan.weight,
                  hydrationPercent: bodyScan.hydration,
                  visceralFat: bodyScan.visceralFat,
                  label: "Aujourd'hui"
                }
              ]}
            />

            {(bodyScan.metabolicAge ?? 0) > 0 ? (
              <MetabolicAgeInsightCard
                current={bodyScan.metabolicAge}
                realAge={getEffectiveAge(targetClient)}
                history={[
                  ...(targetClient.assessments ?? []).map((assessment) => ({
                    date: assessment.date,
                    metabolicAge: assessment.bodyScan?.metabolicAge ?? 0
                  })),
                  {
                    date: assessmentDate,
                    metabolicAge: bodyScan.metabolicAge,
                    label: "Aujourd'hui"
                  }
                ]}
              />
            ) : null}

            {targetClient.objective === "weight-loss" ? (
              <WeightGoalInsightCard
                currentWeight={bodyScan.weight}
                targetWeight={latest.questionnaire.targetWeight}
                timeline={latest.questionnaire.desiredTimeline}
                history={[
                  ...(targetClient.assessments ?? []).map((assessment) => ({
                    date: assessment.date,
                    weight: assessment.bodyScan?.weight ?? 0
                  })),
                  {
                    date: assessmentDate,
                    weight: bodyScan.weight,
                    label: "Aujourd'hui"
                  }
                ]}
              />
            ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ══ ÉTAPE 3 · SUIVI & VALIDATION ═════════════════════════════════ */}
      {step === 2 ? (
        <section className="fu-step" aria-labelledby="fu-t2">
          <h1 id="fu-t2" className="fu-h1">Suivi &amp; validation</h1>
          <p className="fu-sub">Dernier réglage, puis tu valides. Le bouton est juste en bas.</p>

          {renderSettingsCard()}

          {/* Bloc commercial : le client regarde l'écran pendant le RDV, donc
              PV / commande / « à relancer » restent repliés et signalés.
              Placé APRÈS les réglages : c'est secondaire, ça ne doit pas
              ouvrir l'écran de validation. */}
          <Card className="fu-coach space-y-3">
            <p className="fu-coachtag">🔒 Visible par toi seulement</p>
            <button
              type="button"
              className="fu-foldlink"
              aria-expanded={pvOpen}
              aria-controls="fu-pv"
              onClick={() => setPvOpen((open) => !open)}
            >
              {pvOpen ? "▾" : "▸"} Commande, PV &amp; statut de relance
            </button>

            {pvOpen ? (
              <div id="fu-pv" className="space-y-5">
            {pvRecord ? (
              <>
                <div className="grid gap-3 md:grid-cols-2">
                  <CompactWeightPanel
                    label="Derniere commande"
                    value={formatDate(pvRecord.lastOrderDate)}
                  />
                  <CompactWeightPanel
                    label="Reste estime"
                    value={`${pvRecord.estimatedRemainingDays} jours`}
                  />
                  <CompactWeightPanel
                    label="PV cumules"
                    value={`${pvRecord.pvCumulative} PV`}
                  />
                  <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
                    <p className="text-[12px] font-medium text-[var(--ls-text-muted)]">Statut actuel</p>
                    <div className="mt-3">
                      <PvFollowUpStatusLabel status={pvRecord.status} />
                    </div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
                  <p className="text-[12px] font-medium text-[var(--ls-text-muted)]">Produits a suivre</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {pvRecord.activeProducts.map((product) => {
                      const meta = getPvProductStatusMeta(product.status);
                      return (
                        <span
                          key={product.id}
                          className="inline-flex min-h-[38px] items-center rounded-full border border-white/10 bg-[var(--ls-surface2)] px-4 py-2 text-[13px] font-medium text-slate-100"
                        >
                          {product.productName} - {product.estimatedRemainingDays} j - {meta.label}
                        </span>
                      );
                    })}
                  </div>
                </div>

                <Link
                  to={`/pv/clients?client=${targetClient.id}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[rgba(var(--ls-gold-rgb),0.16)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(var(--ls-gold-rgb),0.24)]"
                >
                  Ouvrir sa fiche point volume
                </Link>
              </>
            ) : (
              <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
                <p className="text-sm leading-6 text-[var(--ls-text-muted)]">
                  Aucun suivi PV n&apos;est encore visible pour ce dossier.
                </p>
              </div>
            )}
              </div>
            ) : null}
          </Card>
        </section>
      ) : null}

      {/* ══ BARRE D'ACTION — toujours visible, jamais à chercher en bas ══ */}
      <div className="fu-bar">
        {step === 0 ? (
          <Button variant="secondary" onClick={() => navigate(`/clients/${targetClient.id}`)}>
            Annuler
          </Button>
        ) : (
          <Button variant="secondary" onClick={goBack} disabled={saving}>
            ← Retour
          </Button>
        )}

        {step < 2 ? (
          <Button className="fu-bar-main" onClick={goNext}>
            Continuer →
          </Button>
        ) : (
          <Button className="fu-bar-main" onClick={() => void submitGuarded()} disabled={saving}>
            {saving ? "Enregistrement…" : "✓ Valider le suivi"}
          </Button>
        )}
      </div>

      {reportUrl && (
        <EvolutionReportModal
          reportUrl={reportUrl}
          clientName={`${targetClient.firstName} ${targetClient.lastName}`}
          onClose={() => {
            setReportUrl(null);
            navigate(`/clients/${targetClient.id}`);
          }}
        />
      )}
    </div>
  );
}

function PvFollowUpStatusLabel({
  status
}: {
  status: "ok" | "watch" | "restock" | "inconsistent" | "follow-up";
}) {
  const toneClass =
    status === "ok"
      ? "bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]"
      : status === "restock"
        ? "bg-[rgba(45,212,191,0.12)] text-[#2DD4BF]"
        : status === "inconsistent"
          ? "bg-rose-400/12 text-rose-100"
          : "bg-amber-400/12 text-amber-100";
  const label =
    status === "ok"
      ? "RAS"
      : status === "watch"
        ? "A surveiller"
        : status === "restock"
          ? "Reassort probable"
          : status === "inconsistent"
            ? "Incoherence conso"
            : "A relancer";

  return (
    <span className={`inline-flex rounded-full px-4 py-2 text-sm font-semibold ${toneClass}`}>
      {label}
    </span>
  );
}

/**
 * Une ligne de saisie du body scan : libellé + valeur précédente + champ +
 * écart calculé EN DIRECT. Avant, l'écran affichait les 8 champs, puis plus
 * bas une seconde grille d'écarts — deux fois la même information, et le
 * coach devait faire l'aller-retour. Ici tout tient sur une ligne.
 *
 * `higherIsBetter` : true = monter est bon (muscle), false = descendre est bon
 * (poids en perte de poids), undefined = neutre (on montre l'écart sans le
 * juger — l'écran est aussi vu par le client).
 */
function MetricRow({
  label,
  unit,
  value,
  previous,
  higherIsBetter,
  invalid = false,
  onChange
}: {
  label: string;
  unit: string;
  value: number;
  previous: number;
  higherIsBetter?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
}) {
  const hasValue = Number.isFinite(value) && value > 0;
  const hasPrevious = Number.isFinite(previous) && previous > 0;
  const diff = hasValue && hasPrevious ? Number((value - previous).toFixed(1)) : null;

  let tone = "is-flat";
  if (diff !== null && diff !== 0 && higherIsBetter !== undefined) {
    tone = (higherIsBetter ? diff > 0 : diff < 0) ? "is-good" : "is-warn";
  }

  const deltaLabel =
    diff === null ? "—" : diff === 0 ? "=" : `${diff > 0 ? "▲ +" : "▼ "}${diff}`;

  return (
    <div className="fu-mrow">
      <div className="fu-mlab">
        <span className="fu-mname">{label}</span>
        <span className="fu-mprev">
          {hasPrevious ? `avant : ${previous}${unit ? ` ${unit}` : ""}` : "premier relevé"}
        </span>
      </div>
      <div className={`fu-minput${invalid ? " is-invalid" : ""}`}>
        <DecimalMetricInput value={value} onChange={onChange} ariaLabel={`${label}${unit ? ` en ${unit}` : ""}`} />
        {unit ? <span className="fu-munit">{unit}</span> : null}
      </div>
      <span className={`fu-mdelta ${tone}`} aria-label={diff === null ? undefined : `écart ${diff}`}>
        {deltaLabel}
      </span>
    </div>
  );
}

function DecimalMetricInput({
  value,
  onChange,
  ariaLabel
}: {
  value: number;
  onChange: (value: string) => void;
  ariaLabel?: string;
}) {
  const [draft, setDraft] = useState(formatEditableMetric(value));

  useEffect(() => {
    setDraft(formatEditableMetric(value));
  }, [value]);

  return (
    <input
      type="text"
      inputMode="decimal"
      pattern="[0-9]*[.,]?[0-9]*"
      placeholder="—"
      aria-label={ariaLabel}
      value={draft}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(event) => {
        const nextValue = event.target.value.replace(/\s+/g, "");
        if (!/^\d*([.,]\d*)?$/.test(nextValue)) {
          return;
        }

        setDraft(nextValue);
        const normalized = nextValue.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          onChange("0");
          return;
        }

        onChange(normalized);
      }}
      onBlur={() => {
        const normalized = draft.replace(",", ".");
        if (normalized === "" || normalized === ".") {
          setDraft("");
          onChange("0");
          return;
        }

        const parsed = Number(normalized);
        if (Number.isNaN(parsed)) {
          setDraft(formatEditableMetric(value));
          return;
        }

        const formatted = formatEditableMetric(parsed);
        setDraft(formatted);
        onChange(formatted);
      }}
    />
  );
}

function FollowUpChoiceGroup({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="ls-field-label">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`ls-pill${isActive ? " ls-pill--selected" : ""}`}
              style={{ minHeight: 44 }}
              aria-pressed={isActive}
            >
              {isActive && (
                <svg className="ls-pill__check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FollowUpTextField({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <textarea
        rows={4}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function CompactWeightPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-[var(--ls-surface2)] px-5 py-4">
      <p className="text-[12px] font-medium text-[var(--ls-text-muted)]">{label}</p>
      <p className="mt-3 text-[2rem] font-semibold tracking-[-0.04em] text-white">{value}</p>
    </div>
  );
}

// Styles du parcours en 3 étapes. Tokens `--ls-*` uniquement (règle CLAUDE.md :
// jamais de couleur en dur dans l'app coach — le thème clair/sombre doit suivre).
const FOLLOW_UP_STYLES = `
/* La page occupe la hauteur dispo pour que la barre d'action tombe en bas même
   quand l'étape est courte (le bouton est toujours au même endroit). */
/* Colonne centrée : sans max-width, l'écran s'étirait sur toute la largeur du
   desktop (« trop zoomé », gros vides entre label et input). 680px = colonne
   confortable. Mobile/tablette (< 680px) : max-width sans effet → INCHANGÉ. */
.fu-wrap { padding-bottom: 8px; display:flex; flex-direction:column; gap:14px; min-height: calc(100dvh - 230px); width:100%; max-width:680px; margin-inline:auto; }

/* ── en-tête + jauge ── */
.fu-head { padding: 2px 2px 4px; }
.fu-head-row { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:8px; }
.fu-who { font-size:13.5px; color:var(--ls-text-muted); margin:0; }
.fu-who b { color:var(--ls-text); font-weight:700; }
.fu-stepchip { font-size:11.5px; font-weight:700; color:var(--ls-teal); background:color-mix(in srgb, var(--ls-teal) 14%, transparent); padding:4px 10px; border-radius:999px; white-space:nowrap; }
.fu-bars { display:flex; gap:6px; }
.fu-seg { flex:1; height:6px; border-radius:999px; background:var(--ls-border); transition:background .3s ease; }
.fu-seg.is-on { background:var(--ls-teal); }
.fu-steplabels { display:flex; justify-content:space-between; margin-top:7px; font-size:10.5px; font-weight:600; color:var(--ls-text-hint); }
.fu-steplabels .is-current { color:var(--ls-text); }

/* ── titres d'étape ── */
.fu-step { animation: fu-in .28s ease; }
@keyframes fu-in { from { opacity:0; transform:translateY(8px);} to { opacity:1; transform:none; } }
@media (prefers-reduced-motion: reduce) { .fu-step { animation:none; } }
.fu-h1 { font-size:25px; font-weight:800; letter-spacing:-.4px; color:var(--ls-text); margin:8px 0 3px; line-height:1.12; }
.fu-sub { font-size:13.5px; color:var(--ls-text-muted); margin:0 0 14px; line-height:1.5; }

/* ── bouton fantôme (ouvrir le ressenti) ── */
.fu-ghostbtn { width:100%; background:var(--ls-surface); border:1.5px dashed var(--ls-border2); border-radius:14px; padding:15px; font-size:14.5px; font-weight:700; color:var(--ls-teal); cursor:pointer; min-height:52px; }
.fu-ghostbtn:hover { border-color:var(--ls-teal); background:color-mix(in srgb, var(--ls-teal) 7%, var(--ls-surface)); }

/* ── chips de rappel (âge / taille / dernier point) ── */
.fu-chips { display:flex; gap:8px; margin-bottom:12px; }
.fu-chip { flex:1; background:var(--ls-surface); border:1px solid var(--ls-border); border-radius:12px; padding:9px 8px; text-align:center; min-width:0; }
.fu-chip-l { display:block; font-size:9.5px; font-weight:800; letter-spacing:.5px; text-transform:uppercase; color:var(--ls-teal); }
.fu-chip-v { display:block; font-size:14px; font-weight:800; color:var(--ls-text); margin-top:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ── lignes de saisie body scan ── */
.fu-scan { background:color-mix(in srgb, var(--ls-teal) 5%, var(--ls-surface)); }
.fu-mrow { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid color-mix(in srgb, var(--ls-border) 60%, transparent); }
.fu-mrow:last-of-type { border-bottom:0; }
.fu-mlab { flex:1; min-width:0; }
.fu-mname { display:block; font-size:13.5px; font-weight:600; color:var(--ls-text); }
.fu-mprev { display:block; font-size:11px; color:var(--ls-text-hint); margin-top:1px; }
.fu-minput { position:relative; width:116px; flex:0 0 auto; }
.fu-minput input { width:100%; padding-right:38px; font-weight:700; text-align:left; }
.fu-minput.is-invalid input { border-color:var(--ls-coral, #E0674F); }
.fu-munit { position:absolute; right:12px; top:50%; transform:translateY(-50%); font-size:11px; font-weight:600; color:var(--ls-text-hint); pointer-events:none; }
.fu-mdelta { width:62px; flex:0 0 auto; text-align:right; font-size:12.5px; font-weight:800; font-variant-numeric:tabular-nums; }
.fu-mdelta.is-good { color:var(--ls-teal); }
.fu-mdelta.is-warn { color:var(--ls-coral); }
.fu-mdelta.is-flat { color:var(--ls-text-hint); }
.fu-err { font-size:12.5px; font-weight:600; color:var(--ls-coral, #E0674F); margin:8px 0 0; }

/* ── plis (analyse détaillée / PV) ── */
.fu-foldlink { display:inline-flex; align-items:center; gap:6px; background:none; border:0; padding:8px 2px; font-size:12.5px; font-weight:700; color:var(--ls-teal); cursor:pointer; text-align:left; min-height:44px; }
.fu-coach { border-style:dashed; }
.fu-coachtag { font-size:10px; font-weight:800; letter-spacing:.6px; text-transform:uppercase; color:var(--ls-text-hint); margin:0; }

/* ── barre d'action collée en bas ── */
.fu-bar { position:sticky; bottom:0; z-index:20; margin-top:auto; display:flex; gap:10px; align-items:center; padding:10px 0 calc(10px + env(safe-area-inset-bottom)); background:linear-gradient(180deg, transparent, var(--ls-bg) 34%); }
.fu-bar > * { flex:0 0 auto; }
.fu-bar .fu-bar-main { flex:1 1 auto; }
/* la nav mobile est fixée en bas (<1024px) : on remonte la barre au-dessus */
@media (max-width: 1023px) { .fu-bar { bottom: calc(66px + env(safe-area-inset-bottom)); } }

/* Le FAB Noaly est fixé en bas à droite (NoalyFab.tsx : right 16px, z-index 60)
   et passait DEVANT le bouton — c'est ce qui masquait « Valider le suivi » sur
   l'ancienne page. Plutôt que de déplacer le FAB (fragile : la barre bouge
   selon la longueur de l'étape), on lui réserve sa place au bout de la barre. */
@media (max-width: 899px) { .fu-bar { padding-right: 68px; } }
`;

function formatEditableMetric(value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return "";
  }

  const asString = String(value);
  return asString.endsWith(".0") ? asString.slice(0, -2) : asString;
}

function StartingPointWeightCard({
  objective,
  startDate,
  startWeight,
  latestDate,
  latestWeight,
  currentDate,
  currentWeight
}: {
  objective: import("../types/domain").Objective;
  startDate: string;
  startWeight: number;
  latestDate: string;
  latestWeight: number;
  currentDate: string;
  currentWeight: number;
}) {
  const deltaFromStart = Number((currentWeight - startWeight).toFixed(1));
  const deltaFromLatest = Number((currentWeight - latestWeight).toFixed(1));
  const isWeightLoss = objective === "weight-loss";
  const mainTone =
    deltaFromStart === 0
      ? "text-[var(--ls-text)]"
      : isWeightLoss
        ? deltaFromStart < 0
          ? "text-[#2DD4BF]"
          : "text-amber-200"
        : deltaFromStart > 0
          ? "text-[#2DD4BF]"
          : "text-amber-200";
  const mainDeltaLabel =
    deltaFromStart === 0
      ? "Poids stable depuis le départ"
      : `${deltaFromStart > 0 ? "+" : ""}${deltaFromStart} kg depuis le départ`;
  const secondaryDeltaLabel =
    deltaFromLatest === 0
      ? "Stable depuis le dernier point"
      : `${deltaFromLatest > 0 ? "+" : ""}${deltaFromLatest} kg depuis le dernier point`;

  return (
    <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.28),rgba(15,23,42,0.5))]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="eyebrow-label">Repère de progression</p>
          <p className="mt-3 text-2xl text-white">Départ vs aujourd&apos;hui</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
            Ce bloc sert à montrer tout de suite le point de départ, le dernier relevé et la situation aujourd&apos;hui.
          </p>
        </div>
        <div className="rounded-full border border-white/10 bg-[var(--ls-surface2)] px-4 py-2 text-sm font-medium text-white">
          {currentWeight} kg aujourd&apos;hui
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <WeightMilestoneCard label="Départ" date={formatDate(startDate)} weight={startWeight} tone="blue" />
        <WeightMilestoneCard label="Dernier point" date={formatDate(latestDate)} weight={latestWeight} tone="slate" />
        <WeightMilestoneCard label="Aujourd'hui" date={formatDate(currentDate)} weight={currentWeight} tone="green" highlighted />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-[var(--ls-bg)]/80 p-5">
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 rounded-full bg-white/10">
            <div className="flex h-full items-center justify-between px-1">
              <span className="h-3 w-3 rounded-full bg-[var(--ls-gold)] shadow-[0_0_10px_rgba(var(--ls-gold-rgb),0.35)]" />
              <span className="h-3 w-3 rounded-full bg-slate-300 shadow-[0_0_10px_rgba(226,232,240,0.25)]" />
              <span className="h-3 w-3 rounded-full bg-[#2DD4BF] shadow-[0_0_10px_rgba(110,231,183,0.45)]" />
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className={`text-lg font-semibold ${mainTone}`}>{mainDeltaLabel}</p>
          <p className="text-sm text-[var(--ls-text-muted)]">{secondaryDeltaLabel}</p>
        </div>
      </div>
    </Card>
  );
}

function WeightMilestoneCard({
  label,
  date,
  weight,
  tone,
  highlighted = false
}: {
  label: string;
  date: string;
  weight: number;
  tone: "blue" | "slate" | "green";
  highlighted?: boolean;
}) {
  const toneClass =
    tone === "green"
      ? "bg-[rgba(45,212,191,0.07)] ring-1 ring-[rgba(45,212,191,0.12)]"
      : tone === "blue"
        ? "bg-[rgba(var(--ls-gold-rgb),0.07)] ring-1 ring-[rgba(var(--ls-gold-rgb),0.12)]"
        : "bg-[var(--ls-surface2)] ring-1 ring-white/6";

  return (
    <div
      className={`rounded-[24px] p-5 ${toneClass} ${
        highlighted ? "shadow-[0_0_30px_rgba(52,211,153,0.08)]" : ""
      }`}
    >
      <p className="text-[11px] font-medium text-[var(--ls-text-hint)]">{label}</p>
      <p className="mt-3 text-3xl text-white">{weight} kg</p>
      <p className="mt-2 text-sm text-[var(--ls-text-muted)]">{date}</p>
    </div>
  );
}
