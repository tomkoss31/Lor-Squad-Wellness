import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { BodyScanDeltaGrid } from "../components/body-scan/BodyScanDeltaGrid";
import { HydrationVisceralInsightCard } from "../components/body-scan/HydrationVisceralInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { PageHeading } from "../components/ui/PageHeading";
import { EvolutionReportModal } from "../components/assessment/EvolutionReportModal";
import { buildReportData } from "../lib/evolutionReport";
import { getSupabaseClient } from "../services/supabaseClient";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import { buildPvTrackingRecords, getPvProductStatusMeta } from "../data/mockPvModule";
import {
  formatDate,
  getAssessmentDelta,
  getFirstAssessment,
  getLatestAssessment,
  getPreviousAssessment,
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
  const client = clientId ? getClientById(clientId) : undefined;

  if (!client) {
    return (
      <Card>
        <p className="text-white">Client introuvable ou accès indisponible.</p>
      </Card>
    );
  }

  const targetClient = client;
  const latest = getLatestAssessment(targetClient);
  const previous = getPreviousAssessment(targetClient);
  const first = getFirstAssessment(targetClient);

  const defaultScan: BodyScanMetrics = latest?.bodyScan ?? { weight: 0, bodyFat: 0, muscleMass: 0, hydration: 0, boneMass: 0, visceralFat: 0, bmr: 0, metabolicAge: 0 };
  const [bodyScan, setBodyScan] = useState<BodyScanMetrics>({ ...defaultScan });
  const [assessmentDate, setAssessmentDate] = useState(
    normalizeDateTimeLocalInputValue(new Date().toISOString())
  );
  const [dueDate, setDueDate] = useState(
    normalizeDateTimeLocalInputValue(targetClient.nextFollowUp)
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

  useEffect(() => {
    const draft = readFollowUpDraft(targetClient.id);
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
    }

    setDraftReady(true);
  }, [targetClient.id]);

  useEffect(() => {
    if (!draftReady) {
      return;
    }

    persistFollowUpDraft({
      clientId: targetClient.id,
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
    targetClient.id
  ]);

  const delta = getAssessmentDelta(bodyScan, latest?.bodyScan ?? defaultScan);
  const pvRecord = useMemo(
    () => buildPvTrackingRecords([targetClient], pvTransactions, pvClientProducts)[0] ?? null,
    [pvClientProducts, pvTransactions, targetClient]
  );
  const weightLossPlan = getWeightLossPlan(
    bodyScan.weight,
    latest?.questionnaire?.targetWeight,
    latest?.questionnaire?.desiredTimeline
  );
  const weightLossPace = getWeightLossPaceInsight(weightLossPlan);
  const weightDeltaFromStart = Number((bodyScan.weight - (first?.bodyScan?.weight ?? bodyScan.weight)).toFixed(1));
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

  async function handleSubmit() {
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

    clearFollowUpDraft(targetClient.id);

    // Envoyer les recos dans la messagerie si cochées comme contactées
    if (recommendationsContacted && latest?.questionnaire?.recommendations?.length) {
      try {
        const sb = await getSupabaseClient();
        if (sb && currentUser) {
          for (const reco of latest.questionnaire.recommendations) {
            if (reco.name.trim()) {
              await sb.from('client_messages').insert({
                client_id: targetClient.id,
                client_name: `${targetClient.firstName} ${targetClient.lastName}`,
                distributor_id: currentUser.id,
                message_type: 'recommendation',
                product_name: reco.name,
                message: `Recommandation de ${targetClient.firstName} : ${reco.name}${reco.contact ? ` (${reco.contact})` : ''}`,
                client_contact: reco.contact || null,
              });
            }
          }
        }
      } catch { /* silently continue */ }
    }

    // Générer le rapport d'évolution si >= 2 assessments
    try {
      const updatedClient = getClientById(targetClient.id);
      if (updatedClient && (updatedClient.assessments?.length ?? 0) >= 2 && currentUser) {
        const reportData = buildReportData(updatedClient, currentUser.name ?? 'Coach');
        if (reportData) {
          const sb = await getSupabaseClient();
          if (sb) {
            await sb.from('client_evolution_reports').delete().eq('client_id', targetClient.id);
            const { data: inserted } = await sb
              .from('client_evolution_reports')
              .insert(reportData)
              .select('token')
              .single();
            if (inserted) {
              setReportUrl(`${window.location.origin}/rapport/${inserted.token}`);
              return; // Ne pas naviguer — afficher le modal
            }
          }
        }
      }
    } catch { /* silently continue */ }

    navigate(`/clients/${targetClient.id}`);
  }

  if (!latest || !latest.bodyScan) {
    return (
      <Card>
        <p style={{ color: 'var(--ls-text)', fontSize: 14, marginBottom: 12 }}>Ce client n'a pas encore de bilan initial complet. Crée d'abord un bilan avec body scan avant de faire un suivi.</p>
        <button onClick={() => navigate(`/clients/${targetClient.id}`)} style={{ padding: '10px 18px', borderRadius: 10, background: 'var(--ls-gold)', color: '#0B0D11', border: 'none', cursor: 'pointer', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: 13 }}>
          Retour à la fiche
        </button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Nouveau suivi"
        title={`Suivi de ${targetClient.firstName} ${targetClient.lastName}`}
        description="On ouvre d'abord un check-in concret sur le quotidien, puis on passe à la balance."
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <Card className="space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Check-in bien-être & nutrition</p>
                <p className="mt-3 text-3xl text-white">Avant la balance</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
                  Avant la balance, on fait un point rapide sur l&apos;énergie, la faim, la digestion et la gestion des repas depuis le dernier rendez-vous.
                </p>
              </div>
              <StatusBadge label="Suivi" tone="blue" />
            </div>

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

          <Card className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[var(--ls-text-muted)]">
                  Dernier bilan {formatDate(latest.date)}
                  {previous && ` - précédent ${formatDate(previous.date)}`}
                </p>
                <p className="mt-2 text-3xl text-white">{targetClient.currentProgram}</p>
              </div>
              <StatusBadge label="Suivi terrain" tone="green" />
            </div>

            <div className="rounded-[24px] border border-[rgba(45,212,191,0.2)] bg-[rgba(45,212,191,0.06)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow-label text-[#2DD4BF]/70">Nouveau relevé</p>
                  <p className="mt-3 text-2xl text-white">Nouvelles valeurs body scan</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
                    Saisir les chiffres du jour puis relire les écarts.
                  </p>
                </div>
                <StatusBadge label="Saisie rapide" tone="green" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2DD4BF]/70">
                    Age
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{targetClient.age} ans</p>
                  <p className="mt-2 text-sm text-[var(--ls-text-muted)]">Visible au moment de la balance</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2DD4BF]/70">
                    Taille
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{targetClient.height} cm</p>
                  <p className="mt-2 text-sm text-[var(--ls-text-muted)]">Sans revenir sur la fiche client</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2DD4BF]/70">
                    Dernier point
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{formatDate(latest.date)}</p>
                  <p className="mt-2 text-sm text-[var(--ls-text-muted)]">Repère rapide avant la saisie</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricField
                  label="Poids (kg)"
                  value={bodyScan.weight}
                  onChange={(value) => setBodyScan({ ...bodyScan, weight: Number(value) })}
                />
                <MetricField
                  label="Masse grasse (%)"
                  value={bodyScan.bodyFat}
                  onChange={(value) => setBodyScan({ ...bodyScan, bodyFat: Number(value) })}
                />
                <MetricField
                  label="Masse musculaire (kg)"
                  value={bodyScan.muscleMass}
                  onChange={(value) => setBodyScan({ ...bodyScan, muscleMass: Number(value) })}
                />
                <MetricField
                  label="Hydratation (%)"
                  value={bodyScan.hydration}
                  onChange={(value) => setBodyScan({ ...bodyScan, hydration: Number(value) })}
                />
                <MetricField
                  label="Masse osseuse (kg)"
                  value={bodyScan.boneMass}
                  onChange={(value) => setBodyScan({ ...bodyScan, boneMass: Number(value) })}
                />
                <MetricField
                  label="Graisse viscérale"
                  value={bodyScan.visceralFat}
                  onChange={(value) => setBodyScan({ ...bodyScan, visceralFat: Number(value) })}
                />
                <MetricField
                  label="BMR (kcal)"
                  value={bodyScan.bmr}
                  onChange={(value) => setBodyScan({ ...bodyScan, bmr: Number(value) })}
                />
                <MetricField
                  label="Âge métabolique (ans)"
                  value={bodyScan.metabolicAge}
                  onChange={(value) => setBodyScan({ ...bodyScan, metabolicAge: Number(value) })}
                />
              </div>
            </div>

            <BodyScanDeltaGrid latest={bodyScan} delta={delta} />

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
              previous={{ weight: latest.bodyScan.weight, percent: latest.bodyScan.bodyFat }}
              initial={{ weight: first.bodyScan.weight, percent: first.bodyScan.bodyFat }}
              history={[
                ...targetClient.assessments.map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan.weight,
                  percent: assessment.bodyScan.bodyFat
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
                ...targetClient.assessments.map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan.weight,
                  muscleMass: assessment.bodyScan.muscleMass
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
                ...targetClient.assessments.map((assessment) => ({
                  date: assessment.date,
                  weight: assessment.bodyScan.weight,
                  hydrationPercent: assessment.bodyScan.hydration,
                  visceralFat: assessment.bodyScan.visceralFat
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

            {targetClient.objective === "weight-loss" ? (
              <WeightGoalInsightCard
                currentWeight={bodyScan.weight}
                targetWeight={latest.questionnaire.targetWeight}
                timeline={latest.questionnaire.desiredTimeline}
                history={[
                  ...targetClient.assessments.map((assessment) => ({
                    date: assessment.date,
                    weight: assessment.bodyScan.weight
                  })),
                  {
                    date: assessmentDate,
                    weight: bodyScan.weight,
                    label: "Aujourd'hui"
                  }
                ]}
              />
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(16,24,38,0.78),rgba(12,18,30,0.92))] shadow-[0_10px_30px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow-label">Suivi</p>
                <p className="mt-3 text-2xl text-white">Repères du suivi</p>
              </div>
              <StatusBadge label="Poids" tone="blue" />
            </div>

            <div className="grid gap-4">
              <CompactWeightPanel label="Poids de départ" value={`${first.bodyScan.weight} kg`} />
              <CompactWeightPanel label="Dernier relevé" value={`${latest.bodyScan.weight} kg`} />
              <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
                <p className="text-[12px] font-medium text-[var(--ls-text-muted)]">Écart depuis départ</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[2rem] font-semibold tracking-[-0.04em] text-white">
                    {weightDeltaFromStart > 0 ? "+" : ""}
                    {weightDeltaFromStart} kg
                  </p>
                  <StatusBadge
                    label={weightDeltaFromStart <= 0 ? "Lecture positive" : "À recadrer"}
                    tone={weightDeltaFromStart <= 0 ? "green" : "amber"}
                  />
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-5 py-4">
                <p className="text-[12px] font-medium text-[var(--ls-text-muted)]">À repérer avant la balance</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Énergie", "Faim", "Digestion", "Régularité repas"].map((item) => (
                    <span
                      key={item}
                      className="inline-flex min-h-[38px] items-center rounded-full border border-white/10 bg-[var(--ls-surface2)] px-4 py-2 text-[13px] font-medium text-[var(--ls-text)]"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow-label">Point volume</p>
                <p className="mt-3 text-2xl text-white">Commande et reste estime</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ls-text-muted)]">
                  Un coup d&apos;oeil pour voir ou en est la commande avant de relancer le prochain pas.
                </p>
              </div>
              {pvRecord ? <StatusBadge label="PV" tone="blue" /> : null}
            </div>

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
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[rgba(201,168,76,0.16)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[rgba(201,168,76,0.24)]"
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
          </Card>

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
            {latest.questionnaire.recommendations.length ? (
              <label className="flex items-center justify-between gap-3 rounded-[22px] border border-white/10 bg-[var(--ls-surface2)] px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-white">Recommandations contactées</p>
                  <p className="mt-1 text-sm text-[var(--ls-text-muted)]">
                    {latest.questionnaire.recommendations.length} contact
                    {latest.questionnaire.recommendations.length > 1 ? "s" : ""} à reprendre pour ce dossier.
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
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => navigate(`/clients/${targetClient.id}`)}>
                Annuler
              </Button>
              <Button onClick={() => void handleSubmit()}>Valider le suivi</Button>
            </div>
          </Card>
        </div>
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

function MetricField({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--ls-text-muted)]">{label}</label>
      <DecimalMetricInput value={value} onChange={onChange} />
    </div>
  );
}

function DecimalMetricInput({
  value,
  onChange
}: {
  value: number;
  onChange: (value: string) => void;
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
      <p className="text-sm font-medium text-[var(--ls-text)]">{label}</p>
      <div className="flex flex-wrap gap-3">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-5 py-2.5 text-[14px] font-semibold transition duration-200 ${
                isActive
                  ? "border-white/20 bg-[#C9A84C] text-[#0B0D11] shadow-[0_8px_24px_rgba(201,168,76,0.22)]"
                  : "border-white/10 bg-[var(--ls-surface2)] text-[#C8D2E1] hover:-translate-y-[1px] hover:border-white/14 hover:bg-[var(--ls-surface2)] hover:shadow-[0_10px_22px_rgba(0,0,0,0.14)]"
              }`}
            >
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
  objective: "weight-loss" | "sport";
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
              <span className="h-3 w-3 rounded-full bg-[#C9A84C] shadow-[0_0_10px_rgba(201,168,76,0.35)]" />
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
        ? "bg-[rgba(201,168,76,0.07)] ring-1 ring-[rgba(201,168,76,0.12)]"
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
