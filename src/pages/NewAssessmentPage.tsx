import { useState, type ReactNode } from "react";
import { StepRail } from "../components/assessment/StepRail";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BodyFatInsightCard } from "../components/body-scan/BodyFatInsightCard";
import { MuscleMassInsightCard } from "../components/body-scan/MuscleMassInsightCard";
import { BreakfastComparison } from "../components/education/BreakfastComparison";
import { HydrationInsightCard } from "../components/education/HydrationInsightCard";
import { HydrationRoutinePrimerCard } from "../components/education/HydrationRoutinePrimerCard";
import { MorningRoutineCard } from "../components/education/MorningRoutineCard";
import { PlateGuideCard } from "../components/education/PlateGuideCard";
import { ProgramBoosterCard } from "../components/programs/ProgramBoosterCard";
import { WeightGoalInsightCard } from "../components/education/WeightGoalInsightCard";
import { ProgramCard } from "../components/programs/ProgramCard";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { MetricTile } from "../components/ui/MetricTile";
import { PageHeading } from "../components/ui/PageHeading";
import { StatusBadge } from "../components/ui/StatusBadge";
import { useAppContext } from "../context/AppContext";
import {
  calculateProteinRange,
  calculateWaterNeed,
  estimateBodyFatKg,
  estimateHydrationKg,
  estimateRelativeMassPercent,
  estimateMuscleMassPercent,
  getWeightLossPaceInsight,
  getWeightLossPlan
} from "../lib/calculations";
import type { BiologicalSex, Objective } from "../types/domain";

type AssessmentForm = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  sex: BiologicalSex;
  age: number;
  height: number;
  city: string;
  healthStatus: string;
  healthNotes: string;
  allergies: string;
  transitStatus: string;
  pathologyContext: string;
  wakeUpTime: string;
  bedTime: string;
  sleepHours: number;
  sleepQuality: string;
  napFrequency: string;
  breakfastFrequency: string;
  breakfastTime: string;
  breakfastContent: string;
  breakfastSatiety: string;
  mealsPerDay: number;
  firstMealTime: string;
  regularMealTimes: string;
  lunchLocation: string;
  dinnerTiming: string;
  lunchExample: string;
  dinnerExample: string;
  vegetablesDaily: string;
  proteinEachMeal: string;
  sugaryProducts: string;
  snackingFrequency: string;
  snackingMoment: string;
  cravingsPreference: string;
  snackingTrigger: string;
  waterIntake: number;
  drinksCoffee: string;
  coffeePerDay: number;
  sweetDrinks: string;
  alcohol: string;
  physicalActivity: string;
  activityType: string;
  sessionsPerWeek: number;
  energyLevel: string;
  pastAttempts: string;
  hardestPart: string;
  mainBlocker: string;
  objectiveFocus: string;
  targetWeight: number;
  motivation: number;
  desiredTimeline: string;
  weight: number;
  bodyFat: number;
  muscleMass: number;
  hydration: number;
  boneMass: number;
  visceralFat: number;
  bmr: number;
  metabolicAge: number;
  objective: Objective;
  selectedProgramId: string;
  nextFollowUp: string;
  comment: string;
};

const initialForm: AssessmentForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  sex: "female",
  age: 0,
  height: 0,
  city: "",
  healthStatus: "",
  healthNotes: "",
  allergies: "",
  transitStatus: "",
  pathologyContext: "",
  wakeUpTime: "",
  bedTime: "",
  sleepHours: 0,
  sleepQuality: "",
  napFrequency: "",
  breakfastFrequency: "",
  breakfastTime: "",
  breakfastContent: "",
  breakfastSatiety: "",
  mealsPerDay: 0,
  firstMealTime: "",
  regularMealTimes: "",
  lunchLocation: "",
  dinnerTiming: "",
  lunchExample: "",
  dinnerExample: "",
  vegetablesDaily: "",
  proteinEachMeal: "",
  sugaryProducts: "",
  snackingFrequency: "",
  snackingMoment: "",
  cravingsPreference: "",
  snackingTrigger: "",
  waterIntake: 0,
  drinksCoffee: "",
  coffeePerDay: 0,
  sweetDrinks: "",
  alcohol: "",
  physicalActivity: "",
  activityType: "",
  sessionsPerWeek: 0,
  energyLevel: "",
  pastAttempts: "",
  hardestPart: "",
  mainBlocker: "",
  objectiveFocus: "",
  targetWeight: 0,
  motivation: 0,
  desiredTimeline: "",
  weight: 0,
  bodyFat: 0,
  muscleMass: 0,
  hydration: 0,
  boneMass: 0,
  visceralFat: 0,
  bmr: 0,
  metabolicAge: 0,
  objective: "weight-loss",
  selectedProgramId: "",
  nextFollowUp: "",
  comment: ""
};

const steps = [
  "Informations client",
  "Habitudes de vie et repas",
  "Qualite alimentaire et boissons",
  "Sante, objectif, activite et freins",
  "Composition des repas",
  "Body scan",
  "Hydratation",
  "Petit-dejeuner",
  "Routine matin",
  "Programme propose",
  "Hydratation & routine du matin",
  "Suite du suivi",
  "Resume du rendez-vous"
];

export function NewAssessmentPage() {
  const navigate = useNavigate();
  const { programs, currentUser, createClientWithInitialAssessment } = useAppContext();
  const [form, setForm] = useState(initialForm);
  const [currentStep, setCurrentStep] = useState(0);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: currentStep === 0 ? "auto" : "smooth"
    });
  }, [currentStep]);

  const currentPrograms = programs.filter((program) => program.category === form.objective);
  const mainPrograms = currentPrograms.filter((program) => program.kind !== "booster");
  const boosterPrograms = currentPrograms.filter((program) => program.kind === "booster");
  const selectedProgram =
    mainPrograms.find((program) => program.id === form.selectedProgramId) ?? mainPrograms[0];
  const waterNeed = calculateWaterNeed(form.weight);
  const proteinRange = calculateProteinRange(form.weight, form.objective);
  const waterGap = Math.max(Number((waterNeed - form.waterIntake).toFixed(1)), 0);
  const bodyFatKg = estimateBodyFatKg(form.weight, form.bodyFat);
  const musclePercent = estimateMuscleMassPercent(form.weight, form.muscleMass);
  const hydrationKg = estimateHydrationKg(form.weight, form.hydration);
  const bonePercent = estimateRelativeMassPercent(form.weight, form.boneMass);
  const weightLossPlan = getWeightLossPlan(form.weight, form.targetWeight, form.desiredTimeline);
  const weightLossPace = getWeightLossPaceInsight(weightLossPlan);
  const bodyScanAttention =
    form.hydration < 50
      ? "Hydratation a renforcer en priorite."
      : form.bodyFat > 28 && form.objective !== "sport"
        ? "La masse grasse sera un bon repere de progression."
        : form.muscleMass < 28 && form.objective === "sport"
          ? "La masse musculaire sera le point a suivre de pres."
          : "Le suivi pourra surtout s'appuyer sur la regularite du plan.";

  const prompts =
    currentStep === 1
      ? [
          "On commence par comprendre le rythme de vie avant de parler de programme.",
          "Le petit-dejeuner et l'organisation des repas donnent souvent la cle du rendez-vous.",
          "Chercher ce qui est tenable dans la vraie vie, pas la perfection."
        ]
      : currentStep === 2
        ? [
            "Faire decrire simplement le midi, le soir et les moments de grignotage.",
            "Repere utile: eau, cafe, boissons sucrees et alcool changent souvent la lecture.",
            "Ne pas multiplier les details, rester sur les habitudes qui reviennent."
          ]
        : currentStep === 3
          ? [
              "On affine ici avec les points sante utiles a connaitre sans casser le rythme du rendez-vous.",
              "Allergies, transit et contexte pathologique servent a poser un cadre simple et securisant.",
              "Ensuite, on relie l'activite et les freins a l'accompagnement."
            ]
          : currentStep === 4
            ? [
                "Avant le body scan, donner deja un repere concret sur la composition des repas.",
                "L'assiette doit aider le client a visualiser quoi mettre dans son quotidien.",
                "Rester simple: volume, proteines, glucides bien places."
              ]
          : currentStep === 6
            ? [
                "L'hydratation doit rester un repere simple, pas un discours trop technique.",
                "On relie le chiffre du jour a une routine concrete.",
                "Le visuel sert a faire comprendre plus vite que le texte."
              ]
          : currentStep === 7
            ? [
                "Le petit-dejeuner classique sert de point de comparaison simple.",
                "Le client doit voir en quelques secondes ce qui change vraiment.",
                "Le matin se travaille d'abord avec des reperes faciles a refaire."
              ]
          : currentStep === 8
            ? [
                "La routine matin doit paraitre simple, premium et facile a expliquer.",
                "On montre peu d'elements, mais bien choisis.",
                "Le visuel principal doit faire une grande partie du travail."
              ]
          : currentStep === 9
            ? [
                "Presenter le programme comme une reponse simple au besoin du client.",
                "Relier le choix du programme aux habitudes observees pendant le bilan.",
                "Rester dans une logique d'accompagnement, pas de pression."
              ]
          : currentStep === 10
            ? [
                "Cette page sert de synthese pedagogique avant le demarrage.",
                "On ancre les bases du matin et de l'hydratation dans l'esprit du client.",
                "Le but est de rassurer, pas d'ajouter une couche de complexite."
              ]
            : currentStep >= 11
              ? [
                  "Toujours finir avec une suite claire et un rendez-vous deja pose.",
                  "Le client doit repartir avec des reperes simples a retenir.",
                  "La conclusion doit rassurer et donner envie d'avancer."
                ]
              : [
                  "Faire simple, humain et progressif.",
                  "Relier chaque explication au quotidien du client.",
                  "Utiliser les chiffres comme des reperes et non comme une pression."
                ];

  const rightPanelPoints =
    currentStep === 0
      ? [
          `Objectif : ${form.objectiveFocus}`,
          `Sante : ${form.healthStatus}`,
          form.objective === "weight-loss"
            ? `Poids cible : ${form.targetWeight} kg`
            : `Delai : ${form.desiredTimeline}`
        ]
      : currentStep === 1
        ? [`Sommeil : ${form.sleepHours} h`, `Petit-dejeuner : ${form.breakfastFrequency}`, `Repas reguliers : ${form.regularMealTimes}`]
      : currentStep === 2
          ? [`Eau actuelle : ${form.waterIntake} L`, `Grignotage : ${form.snackingFrequency}`, `Cafe : ${form.drinksCoffee === "Oui" ? `${form.coffeePerDay} / jour` : "Non"}`]
          : currentStep === 3
              ? [
                  `Allergies : ${form.allergies}`,
                  `Transit : ${form.transitStatus}`,
                  `Contexte : ${form.pathologyContext}`,
                  `Blocage principal : ${form.mainBlocker}`
                ]
            : currentStep === 4
              ? [
                  form.objective === "sport"
                    ? "Assiette sport plus complete"
                    : "Assiette simple pour perdre du poids",
                  "Montrer d'abord les volumes puis les portions main",
                  "Le client doit repartir avec un repere facile a refaire"
                ]
              : currentStep === 5
                ? [`Poids de depart : ${form.weight} kg`, `Objectif eau : ${waterNeed} L / jour`, `Proteines conseillees : ${proteinRange}`, bodyScanAttention]
              : currentStep === 6
                ? [
                    "Valider ce que le client boit vraiment aujourd'hui.",
                    "Transformer l'objectif eau en routine simple sur la journee.",
                    "Garder un discours clair et peu charge."
                  ]
              : currentStep === 7
                    ? ["Comparer un matin improvise a un matin plus structure.", "Faire ressortir ce qui change vraiment.", "Le client doit se reconnaitre tout de suite."]
                : currentStep === 8
                      ? ["Montrer la routine comme un ensemble simple.", "Le visuel doit porter l'explication.", "Moins de texte, plus de lisibilite."]
                : currentStep === 9
                      ? [
                          `Programme : ${selectedProgram?.title ?? "A choisir"}`,
                          `Prix : ${selectedProgram?.price ?? "-"}`,
                          selectedProgram?.benefits[0] ?? "Faire ressortir le benefice principal"
                        ]
                : currentStep === 10
                        ? ["Ancrer les bases avant le demarrage.", "Hydratation et matin doivent paraitre evidents.", "Pas de surcharge autour du visuel."]
                        : currentStep === 11
                          ? [`Prochain suivi : ${form.nextFollowUp}`, "Fixer la suite avant de terminer le rendez-vous", "Le client repart avec un cap clair"]
                          : [`Programme retenu : ${selectedProgram?.title ?? "-"}`, `Hydratation cible : ${waterNeed} L`, `Proteines : ${proteinRange}`];
  const panelTitle =
    currentStep >= 9 ? "Cap du moment" : currentStep >= 5 ? "Lecture du bilan" : "Aide au rendez-vous";
  const panelIntro =
    currentStep >= 11
      ? "La fin du rendez-vous doit rester simple, claire et facile a reformuler."
      : currentStep >= 9
        ? "Ici, on garde seulement ce qui aide a presenter la proposition."
        : currentStep >= 5
          ? "Le panneau sert a relire vite les chiffres et la logique du bilan."
          : "Le panneau sert a garder le bon fil sans surcharger l'echange.";

  const plateTitle = form.objective === "sport" ? "Assiette sport / prise de masse" : "Assiette perte de poids";
  const plateSubtitle =
    form.objective === "sport"
      ? "Le client doit voir tout de suite comment construire une assiette plus complete pour soutenir l'energie, l'entrainement et la recuperation."
      : "Le client doit comprendre en un coup d'oeil comment remplir son assiette pour avoir plus de volume, plus de satiete et un cadre simple a suivre.";
  const plateSegments =
    form.objective === "sport"
      ? [
          { label: "Legumes", share: 33, note: "Base de volume et d'equilibre", accent: "green" as const },
          { label: "Proteines", share: 33, note: "Support musculaire et recuperation", accent: "red" as const },
          { label: "Glucides", share: 34, note: "Energie utile autour de l'activite", accent: "amber" as const }
        ]
      : [
          { label: "Legumes", share: 50, note: "Volume, fibres et satiete visuelle", accent: "green" as const },
          { label: "Proteines", share: 25, note: "Tenue et preservation musculaire", accent: "red" as const },
          { label: "Glucides", share: 25, note: "Qualite et portion simple a gerer", accent: "amber" as const }
        ];
  const platePortionGuides =
    form.objective === "sport"
      ? [
          { label: "Legumes", value: "1 a 2 poings" },
          { label: "Proteines", value: "1 a 1,5 paume" },
          { label: "Glucides", value: "1 a 2 poings" },
          { label: "Lipides", value: "1 pouce" }
        ]
      : [
          { label: "Legumes", value: "2 poings" },
          { label: "Proteines", value: "1 paume" },
          { label: "Glucides", value: "1 poing" },
          { label: "Lipides", value: "1 pouce" }
        ];
  const plateFoodExamples = [
    {
      label: "Proteines",
      accent: "red" as const,
      items: ["poulet", "oeufs", "poisson", "tofu"]
    },
    {
      label: "Glucides",
      accent: "amber" as const,
      items: ["riz", "pates", "pommes de terre", "flocons d'avoine"]
    },
    {
      label: "Lipides",
      accent: "blue" as const,
      items: ["avocat", "huile d'olive", "oleagineux"]
    }
  ];
  const plateLipidsNote =
    form.objective === "sport" ? "Bons lipides en complement regulier" : "Petite portion de bons lipides";

  function update<K extends keyof AssessmentForm>(key: K, value: AssessmentForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateObjectiveFocus(value: string) {
    update("objectiveFocus", value);
    update("objective", value === "Prise de masse" ? "sport" : "weight-loss");
    update("selectedProgramId", value === "Prise de masse" ? "p-sport-premium" : "p-premium");
  }

  function getDefaultNextFollowUp() {
    const baseDate = new Date();
    baseDate.setDate(baseDate.getDate() + 14);
    return baseDate.toISOString().slice(0, 10);
  }

  function buildQuestionnaire() {
    return {
      healthStatus: form.healthStatus,
      healthNotes: form.healthNotes,
      allergies: form.allergies,
      transitStatus: form.transitStatus,
      pathologyContext: form.pathologyContext,
      wakeUpTime: form.wakeUpTime,
      bedTime: form.bedTime,
      sleepHours: form.sleepHours,
      sleepQuality: form.sleepQuality,
      napFrequency: form.napFrequency,
      breakfastFrequency: form.breakfastFrequency,
      breakfastTime: form.breakfastTime,
      breakfastContent: form.breakfastContent,
      breakfastSatiety: form.breakfastSatiety,
      firstMealTime: form.firstMealTime,
      mealsPerDay: form.mealsPerDay,
      regularMealTimes: form.regularMealTimes,
      lunchLocation: form.lunchLocation,
      dinnerTiming: form.dinnerTiming,
      vegetablesDaily: form.vegetablesDaily,
      proteinEachMeal: form.proteinEachMeal,
      sugaryProducts: form.sugaryProducts,
      snackingFrequency: form.snackingFrequency,
      snackingMoment: form.snackingMoment,
      cravingsPreference: form.cravingsPreference,
      snackingTrigger: form.snackingTrigger,
      waterIntake: form.waterIntake,
      drinksCoffee: form.drinksCoffee,
      coffeePerDay: form.coffeePerDay,
      sweetDrinks: form.sweetDrinks,
      alcohol: form.alcohol,
      lunchExample: form.lunchExample,
      dinnerExample: form.dinnerExample,
      physicalActivity: form.physicalActivity,
      activityType: form.activityType,
      sessionsPerWeek: form.sessionsPerWeek,
      energyLevel: form.energyLevel,
      pastAttempts: form.pastAttempts,
      hardestPart: form.hardestPart,
      mainBlocker: form.mainBlocker,
      objectiveFocus: form.objectiveFocus,
      targetWeight: form.targetWeight > 0 ? form.targetWeight : undefined,
      motivation: form.motivation,
      desiredTimeline: form.desiredTimeline
    };
  }

  async function handleSaveAssessment() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setSaveError("Renseigne au minimum le prenom et le nom du client.");
      setCurrentStep(0);
      return;
    }

    if (!form.objectiveFocus.trim()) {
      setSaveError("Choisis d'abord l'objectif principal du client.");
      setCurrentStep(0);
      return;
    }

    if (!selectedProgram) {
      setSaveError("Choisis un programme avant d'enregistrer le bilan.");
      setCurrentStep(9);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextFollowUp = form.nextFollowUp || getDefaultNextFollowUp();
    const assessment = {
      id: `a-${Date.now()}`,
      date: today,
      type: "initial" as const,
      objective: form.objective,
      programId: selectedProgram.id,
      programTitle: selectedProgram.title,
      summary: `Premier bilan oriente ${form.objectiveFocus.toLowerCase()} avec mise en place du ${selectedProgram.title.toLowerCase()}.`,
      notes:
        form.comment.trim() ||
        "Le client repart avec un cadre simple, un programme clair et un prochain suivi deja pose.",
      nextFollowUp,
      bodyScan: {
        weight: form.weight,
        bodyFat: form.bodyFat,
        muscleMass: form.muscleMass,
        hydration: form.hydration,
        boneMass: form.boneMass,
        visceralFat: form.visceralFat,
        bmr: form.bmr,
        metabolicAge: form.metabolicAge
      },
      questionnaire: buildQuestionnaire(),
      pedagogicalFocus:
        form.objective === "sport"
          ? ["Hydratation", "Routine matin", "Assiette sport"]
          : ["Hydratation", "Routine matin", "Assiette perte de poids"]
    };

    try {
      const clientId = await createClientWithInitialAssessment({
        client: {
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          sex: form.sex,
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          age: form.age,
          height: form.height,
          job: "Non renseigne",
          city: form.city.trim() || undefined,
          distributorId: currentUser?.id ?? "u-local-admin",
          distributorName: currentUser?.name ?? "Lor'Squad Wellness",
          objective: form.objective
        },
        assessment,
        nextFollowUp,
        notes:
          form.comment.trim() ||
          "Nouveau client cree depuis le bilan initial. La suite est deja fixee."
      });

      setSaveError("");
      navigate(`/clients/${clientId}`);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Impossible d'enregistrer le bilan pour le moment."
      );
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="Nouveau bilan"
        title="Un bilan guide, plus complet mais facile a conduire en rendez-vous"
        description="Le questionnaire est regroupe en blocs utiles pour garder une conversation fluide, faire ressortir les habitudes cle et terminer avec une proposition claire."
      />
      <StepRail currentStep={currentStep} steps={steps} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_340px]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                Etape {currentStep + 1} / {steps.length}
              </p>
              <h2 className="mt-2 text-3xl md:text-4xl">{steps[currentStep]}</h2>
            </div>
            <StatusBadge
              label={form.objective === "sport" ? "Parcours sport" : "Parcours accompagnement"}
              tone={form.objective === "sport" ? "green" : "blue"}
            />
          </div>

          {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Prenom" value={form.firstName} onChange={(v) => update("firstName", v)} />
                  <Field label="Nom" value={form.lastName} onChange={(v) => update("lastName", v)} />
                  <Field label="Telephone" value={form.phone} onChange={(v) => update("phone", v)} />
                  <Field label="Email" value={form.email} onChange={(v) => update("email", v)} />
                  <ChoiceGroup
                    label="Sexe"
                    value={form.sex}
                    options={["female", "male"]}
                    onChange={(v) => update("sex", v as BiologicalSex)}
                    formatOption={(option) => (option === "male" ? "Homme" : "Femme")}
                  />
                  <Field label="Age" type="number" value={form.age} onChange={(v) => update("age", Number(v))} />
                  <Field label="Taille" type="number" value={form.height} onChange={(v) => update("height", Number(v))} />
                  <Field label="Ville" value={form.city} onChange={(v) => update("city", v)} />
                </div>

                <SectionBlock
                  title="Bloc 0 - Objectif et antecedents"
                  description="Poser le cap des le debut et noter tout point sante a respecter."
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceGroup
                      label="Objectif principal"
                      value={form.objectiveFocus}
                      options={["Perte de poids", "Prise de masse", "Energie", "Remise en forme"]}
                      onChange={updateObjectiveFocus}
                    />
                    <ChoiceGroup
                      label="Delai souhaite"
                      value={form.desiredTimeline}
                      options={["1 mois", "3 mois", "6 mois", "9 mois"]}
                      onChange={(v) => update("desiredTimeline", v)}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ChoiceGroup
                      label="Sante / traitement"
                      value={form.healthStatus}
                      options={["RAS", "Traitement en cours", "Pathologie connue", "Avis medical a respecter"]}
                      onChange={(v) => update("healthStatus", v)}
                    />
                    <AreaField
                      label="Antecedents / precision utile"
                      value={form.healthNotes}
                      onChange={(v) => update("healthNotes", v)}
                    />
                  </div>
                  {form.objective === "weight-loss" && (
                    <div className="space-y-4">
                      <Field
                        label="Poids cible (kg)"
                        type="number"
                        step="0.1"
                        value={form.targetWeight}
                        onChange={(v) => update("targetWeight", Number(v))}
                      />
                      <WeightGoalInsightCard
                        currentWeight={form.weight}
                        targetWeight={form.targetWeight}
                        timeline={form.desiredTimeline}
                      />
                    </div>
                  )}
                  <div className="space-y-3 rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-sm font-medium text-slate-300">Motivation</label>
                      <span className="text-sm font-semibold text-white">{form.motivation}/10</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={form.motivation}
                      onChange={(event) => update("motivation", Number(event.target.value))}
                    />
                  </div>
                </SectionBlock>
              </div>
            )}

          {currentStep === 1 && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 1 - Rythme de vie" description="Comprendre le rythme reel avant de parler alimentation.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Heure de lever" type="time" value={form.wakeUpTime} onChange={(v) => update("wakeUpTime", v)} />
                  <Field label="Heure de coucher" type="time" value={form.bedTime} onChange={(v) => update("bedTime", v)} />
                  <Field label="Heures de sommeil" type="number" step="0.5" value={form.sleepHours} onChange={(v) => update("sleepHours", Number(v))} />
                  <ChoiceGroup label="Qualite du sommeil" value={form.sleepQuality} options={["Tres bonne", "Bonne", "Moyenne", "Mauvaise"]} onChange={(v) => update("sleepQuality", v)} />
                </div>
                <ChoiceGroup label="Sieste en journee" value={form.napFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("napFrequency", v)} />
              </SectionBlock>

              <SectionBlock title="Bloc 2 - Petit-dejeuner" description="Faire ressortir si le matin soutient vraiment la journee.">
                <div className="grid gap-4 md:grid-cols-2">
                  <ChoiceGroup label="Petit-dejeuner tous les jours" value={form.breakfastFrequency} options={["Oui", "Non", "Parfois"]} onChange={(v) => update("breakfastFrequency", v)} />
                  <Field label="Heure du petit-dejeuner" type="time" value={form.breakfastTime} onChange={(v) => update("breakfastTime", v)} />
                  <AreaField label="Que consommes-tu le matin ?" value={form.breakfastContent} onChange={(v) => update("breakfastContent", v)} />
                  <ChoiceGroup label="Tient jusqu'au repas suivant" value={form.breakfastSatiety} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("breakfastSatiety", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 3 - Organisation des repas" description="Chercher la regularite sans entrer dans trop de detail.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Repas par jour" value={String(form.mealsPerDay)} options={["1", "2", "3", "4 ou plus"]} onChange={(v) => update("mealsPerDay", v === "4 ou plus" ? 4 : Number(v))} />
                  <Field label="Premier vrai repas" type="time" value={form.firstMealTime} onChange={(v) => update("firstMealTime", v)} />
                  <ChoiceGroup label="Heures regulieres" value={form.regularMealTimes} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("regularMealTimes", v)} />
                  <ChoiceGroup label="Midi" value={form.lunchLocation} options={["A la maison", "Au travail", "Au restaurant", "Sur le pouce"]} onChange={(v) => update("lunchLocation", v)} />
                </div>
                <ChoiceGroup label="Le soir" value={form.dinnerTiming} options={["Tot", "Normalement", "Tard"]} onChange={(v) => update("dinnerTiming", v)} />
              </SectionBlock>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <SectionBlock title="Bloc 4 - Qualite alimentaire" description="Faire decrire rapidement le midi et le soir puis evaluer les bases.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Repas type du midi" value={form.lunchExample} onChange={(v) => update("lunchExample", v)} />
                  <AreaField label="Repas type du soir" value={form.dinnerExample} onChange={(v) => update("dinnerExample", v)} />
                  <ChoiceGroup label="Legumes chaque jour" value={form.vegetablesDaily} options={["Oui", "Non", "Pas assez"]} onChange={(v) => update("vegetablesDaily", v)} />
                  <ChoiceGroup label="Proteines a chaque repas" value={form.proteinEachMeal} options={["Oui", "Non", "Pas toujours"]} onChange={(v) => update("proteinEachMeal", v)} />
                </div>
                <ChoiceGroup label="Produits sucres ou industriels" value={form.sugaryProducts} options={["Rarement", "Parfois", "Souvent", "Tres souvent"]} onChange={(v) => update("sugaryProducts", v)} />
              </SectionBlock>

              <SectionBlock title="Bloc 5 - Grignotage et fringales" description="Faire ressortir le vrai moment de craquage et la cause la plus frequente.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Grignotage" value={form.snackingFrequency} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("snackingFrequency", v)} />
                  <ChoiceGroup label="Moment" value={form.snackingMoment} options={["Matin", "Apres-midi", "Soir", "Nuit"]} onChange={(v) => update("snackingMoment", v)} />
                  <ChoiceGroup label="Attirance" value={form.cravingsPreference} options={["Sucre", "Sale", "Les deux"]} onChange={(v) => update("cravingsPreference", v)} />
                  <ChoiceGroup label="Cause frequente" value={form.snackingTrigger} options={["Faim", "Stress", "Habitude", "Fatigue", "Ennui", "Emotions"]} onChange={(v) => update("snackingTrigger", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 6 - Hydratation et boissons" description="Rester sur les volumes et les habitudes qui changent vraiment la lecture.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Eau par jour (L)" type="number" step="0.1" value={form.waterIntake} onChange={(v) => update("waterIntake", Number(v))} />
                  <ChoiceGroup label="Cafe" value={form.drinksCoffee} options={["Oui", "Non"]} onChange={(v) => update("drinksCoffee", v)} />
                  <Field label="Cafes par jour" type="number" value={form.coffeePerDay} onChange={(v) => update("coffeePerDay", Number(v))} />
                  <ChoiceGroup label="Boissons sucrees" value={form.sweetDrinks} options={["Jamais", "Parfois", "Souvent"]} onChange={(v) => update("sweetDrinks", v)} />
                </div>
                <ChoiceGroup label="Alcool" value={form.alcohol} options={["Jamais", "Occasionnellement", "Chaque semaine", "Souvent"]} onChange={(v) => update("alcohol", v)} />
              </SectionBlock>
            </div>
          )}

          {currentStep === 3 && (
              <div className="space-y-4">
              <SectionBlock title="Bloc 7 - Allergies, transit et contexte pathologique" description="Ajouter seulement les points sante utiles pour cadrer l'accompagnement.">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field
                    label="Allergies / intolerances"
                    value={form.allergies}
                    onChange={(v) => update("allergies", v)}
                  />
                  <ChoiceGroup
                    label="Niveau du transit"
                    value={form.transitStatus}
                    options={["Normal", "Lent", "Irregulier", "Sensible"]}
                    onChange={(v) => update("transitStatus", v)}
                  />
                  <AreaField
                    label="Contexte pathologique utile"
                    value={form.pathologyContext}
                    onChange={(v) => update("pathologyContext", v)}
                  />
                  <AreaField
                    label="Point sante a surveiller"
                    value={form.healthNotes}
                    onChange={(v) => update("healthNotes", v)}
                  />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 8 - Activite et forme" description="Chercher le niveau reel d'activite et d'energie.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <ChoiceGroup label="Activite physique" value={form.physicalActivity} options={["Oui", "Non"]} onChange={(v) => update("physicalActivity", v)} />
                  <Field label="Si oui, laquelle ?" value={form.activityType} onChange={(v) => update("activityType", v)} />
                  <Field label="Seances / semaine" type="number" value={form.sessionsPerWeek} onChange={(v) => update("sessionsPerWeek", Number(v))} />
                  <ChoiceGroup label="Niveau d'energie" value={form.energyLevel} options={["Tres bon", "Bon", "Moyen", "Faible"]} onChange={(v) => update("energyLevel", v)} />
                </div>
              </SectionBlock>

              <SectionBlock title="Bloc 9 - Historique et blocages" description="Faire apparaitre ce qui a deja ete tente et ce qui bloque aujourd'hui.">
                <div className="grid gap-4 md:grid-cols-2">
                  <AreaField label="Tentatives passees" value={form.pastAttempts} onChange={(v) => update("pastAttempts", v)} />
                  <AreaField label="Le plus difficile jusqu'ici" value={form.hardestPart} onChange={(v) => update("hardestPart", v)} />
                </div>
                <ChoiceGroup label="Blocage principal" value={form.mainBlocker} options={["Manque de temps", "Motivation", "Organisation", "Grignotage", "Fatigue", "Manque de reperes", "Autre"]} onChange={(v) => update("mainBlocker", v)} />
              </SectionBlock>
              </div>
            )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <PlateGuideCard
                title={plateTitle}
                mode={form.objective}
                subtitle={plateSubtitle}
                segments={plateSegments}
                portionGuides={platePortionGuides}
                foodExamples={plateFoodExamples}
                lipidsNote={plateLipidsNote}
              />

              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Aide terrain
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <ClosingLine text="On donne un repere visuel simple a refaire des le prochain repas." />
                  <ClosingLine text="Le but n'est pas de tout peser, mais de mieux composer l'assiette." />
                </div>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <SectionBlock title="Releve body scan" description="Le releve sert de point de depart pour le suivi. Les unites restent visibles pour une lecture simple en rendez-vous.">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Poids (kg)" type="number" value={form.weight} onChange={(v) => update("weight", Number(v))} />
                  <Field label="Masse grasse (%)" type="number" step="0.1" value={form.bodyFat} onChange={(v) => update("bodyFat", Number(v))} />
                  <Field label="Masse musculaire (kg)" type="number" step="0.1" value={form.muscleMass} onChange={(v) => update("muscleMass", Number(v))} />
                  <Field label="Hydratation (%)" type="number" step="0.1" value={form.hydration} onChange={(v) => update("hydration", Number(v))} />
                  <Field label="Masse osseuse (kg)" type="number" step="0.1" value={form.boneMass} onChange={(v) => update("boneMass", Number(v))} />
                  <Field label="Graisse viscerale" type="number" value={form.visceralFat} onChange={(v) => update("visceralFat", Number(v))} />
                  <Field label="BMR (kcal)" type="number" value={form.bmr} onChange={(v) => update("bmr", Number(v))} />
                  <Field label="Age metabolique (ans)" type="number" value={form.metabolicAge} onChange={(v) => update("metabolicAge", Number(v))} />
                </div>
              </SectionBlock>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <MetricTile label="Poids de depart" value={`${form.weight} kg`} hint="Reference du jour pour le suivi" accent="blue" />
                <MetricTile label="Objectif eau" value={`${waterNeed} L / jour`} hint={`Ecart actuel ${waterGap} L`} accent="green" />
                <MetricTile label="Proteines conseillees" value={proteinRange} hint={form.objective === "sport" ? "Selon objectif sport" : "Selon objectif accompagnement"} accent="red" />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <MetricTile label="Masse grasse estimee" value={`${bodyFatKg} kg`} hint={`${form.bodyFat} % du poids actuel`} accent="red" />
                <MetricTile label="Volume musculaire relatif" value={`${musclePercent} %`} hint={`${form.muscleMass} kg par rapport au poids du corps`} accent="green" />
                <MetricTile label="Masse osseuse relative" value={`${bonePercent} %`} hint={`${form.boneMass} kg par rapport au poids du corps`} accent="blue" />
              </div>

              <BodyFatInsightCard
                current={{ weight: form.weight, percent: form.bodyFat }}
                objective={form.objective}
                sex={form.sex}
              />

              <MuscleMassInsightCard
                current={{ weight: form.weight, muscleMass: form.muscleMass }}
              />

              <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Lecture coach</p>
                    <p className="mt-2 text-2xl text-white">Ce releve servira de reference pour les prochains suivis</p>
                  </div>
                  <StatusBadge label="Reference de depart" tone="blue" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <QuickReadCard label="Volume musculaire" value={`${musclePercent} %`} detail={`${form.muscleMass} kg par rapport au poids du corps`} />
                  <QuickReadCard label="Masse osseuse" value={`${bonePercent} %`} detail={`${form.boneMass} kg par rapport au poids du corps`} />
                  <QuickReadCard label="Point d'attention" value={bodyScanAttention} detail="Lecture simple a expliquer au client" />
                </div>
              </div>
            </div>
          )}

          {currentStep === 6 && (
            <HydrationInsightCard
              weight={form.weight}
              hydrationPercent={form.hydration}
              waterIntake={form.waterIntake}
              sex={form.sex}
              visceralFat={form.visceralFat}
            />
          )}

          {currentStep === 7 && (
            <BreakfastComparison />
          )}

          {currentStep === 8 && (
            <MorningRoutineCard />
          )}

          {currentStep === 9 && (
            <div className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {mainPrograms.map((program) => (
                  <ProgramCard key={program.id} program={program} selected={form.selectedProgramId === program.id} onSelect={() => update("selectedProgramId", program.id)} />
                ))}
              </div>
              {boosterPrograms.length ? (
                <div className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        Options pour booster les resultats
                      </p>
                      <p className="mt-2 text-2xl text-white">
                        Ajouter seulement ce qui sert vraiment le profil sport
                      </p>
                    </div>
                    <StatusBadge label="Options sport" tone="green" />
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {boosterPrograms.map((program) => (
                      <ProgramBoosterCard key={program.id} program={program} />
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {currentStep === 10 && <HydrationRoutinePrimerCard />}

          {currentStep === 11 && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <ChoiceGroup label="Decision client" value={form.comment.includes("partant") ? "Partant" : form.comment.includes("interesse") ? "A confirmer" : "A rassurer"} options={["Partant", "A rassurer", "A confirmer"]} onChange={(v) => update("comment", v === "Partant" ? "Client partant, rassure par la simplicite du plan." : v === "A confirmer" ? "Client interesse, souhaite valider rapidement." : "Client interesse mais a besoin d'etre rassure sur la mise en place.")} />
                <ChoiceGroup label="Type de suite" value="Rendez-vous fixe" options={["Rendez-vous fixe", "Message de rappel", "Relance douce"]} onChange={() => undefined} />
                <ChoiceGroup label="Message a laisser" value={form.comment.includes("cadre clair") ? "Cadre clair" : "Simple"} options={["Simple", "Progressif", "Cadre clair"]} onChange={(v) => update("comment", v === "Cadre clair" ? "Le client repart avec un cadre clair et un prochain pas precis." : v === "Progressif" ? "Le client repart avec un demarrage progressif et rassurant." : "Le client repart avec une solution simple a mettre en place.")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Prochain rendez-vous" type="date" value={form.nextFollowUp} onChange={(v) => update("nextFollowUp", v)} />
                <AreaField label="Commentaire de fin de rendez-vous" value={form.comment} onChange={(v) => update("comment", v)} />
              </div>
            </div>
          )}

          {currentStep === 12 && selectedProgram && (
            <div className="space-y-4">
              <Card className="space-y-5 bg-[linear-gradient(180deg,rgba(15,23,42,0.32),rgba(15,23,42,0.52))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Conclusion du rendez-vous</p>
                    <p className="mt-3 text-4xl text-white">Une proposition claire, un cap simple et une suite deja visible.</p>
                    <p className="mt-3 text-sm leading-7 text-slate-300">
                      Cette synthese aide a reformuler le plan, confirmer le programme et terminer
                      le rendez-vous avec une direction nette.
                    </p>
                  </div>
                  <StatusBadge label="Pret a presenter" tone="green" />
                </div>

                <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
                  <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Programme retenu</p>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-3xl text-white">{selectedProgram.title}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">{selectedProgram.summary}</p>
                      </div>
                      <span className="rounded-full border border-sky-300/20 bg-sky-400/10 px-4 py-2 text-lg font-semibold text-sky-200">
                        {selectedProgram.price}
                      </span>
                    </div>
                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      {selectedProgram.benefits.map((benefit) => (
                        <div
                          key={benefit}
                          className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-slate-200"
                        >
                          {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-2">
                      <SummaryHighlightCard label="Objectif" value={form.objectiveFocus} />
                      <SummaryHighlightCard label="Hydratation cible" value={`${waterNeed} L / jour`} />
                      {form.objective === "weight-loss" ? (
                        <SummaryHighlightCard
                          label="Kilos restants"
                          value={weightLossPlan.isAchieved ? "Objectif atteint" : `${weightLossPlan.remainingKg} kg`}
                        />
                      ) : (
                        <SummaryHighlightCard label="Motivation" value={`${form.motivation}/10`} />
                      )}
                      <SummaryHighlightCard
                        label={form.objective === "weight-loss" ? "Rythme moyen" : "Proteines"}
                        value={
                          form.objective === "weight-loss"
                            ? weightLossPlan.isAchieved
                              ? "0 g / jour"
                              : `${weightLossPlan.dailyGrams} g / jour`
                            : proteinRange
                        }
                      />
                    </div>

                    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Lecture finale</p>
                      <div className="mt-4 grid gap-3">
                        <SummaryRow label="Masse grasse" value={`${form.bodyFat} % - ${bodyFatKg} kg`} />
                        <SummaryRow label="Masse musculaire" value={`${form.muscleMass} kg - ${musclePercent} %`} />
                        <SummaryRow label="Masse hydrique estimee" value={`${form.hydration} % - ${hydrationKg} kg`} />
                        {form.objective === "weight-loss" && (
                          <SummaryRow label="Lecture du rythme" value={weightLossPace.label} />
                        )}
                        <SummaryRow label="Prochain suivi" value={form.nextFollowUp} />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="rounded-[24px] border border-emerald-400/20 bg-emerald-400/10 p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-emerald-100/80">Formulation conseillee</p>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <ClosingLine text="On part sur une routine simple, claire et coherente avec ton objectif." />
                  <ClosingLine text="Les reperes du jour servent a rendre le plan plus facile a suivre des maintenant." />
                  <ClosingLine text="On se revoit au prochain rendez-vous pour relire les premiers effets et ajuster si besoin." />
                </div>
              </div>

              <BodyFatInsightCard
                current={{ weight: form.weight, percent: form.bodyFat }}
                objective={form.objective}
                sex={form.sex}
              />

              <MuscleMassInsightCard
                current={{ weight: form.weight, muscleMass: form.muscleMass }}
              />
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <Button variant="ghost" onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))} disabled={currentStep === 0}>
              Etape precedente
            </Button>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => void handleSaveAssessment()}>
                Enregistrer le bilan
              </Button>
              <Button onClick={() => setCurrentStep((step) => Math.min(step + 1, steps.length - 1))} disabled={currentStep === steps.length - 1}>
                Etape suivante
              </Button>
            </div>
          </div>
          {saveError ? (
            <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {saveError}
            </div>
          ) : null}
        </Card>

        <div className="space-y-4 xl:sticky xl:top-5 xl:self-start">
          <Card className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-2xl text-white">{panelTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{panelIntro}</p>
              </div>
              <StatusBadge label="Aide terrain" tone="blue" />
            </div>
            <div className="grid gap-3">
              {rightPanelPoints.map((point, index) => (
                <FocusPanelItem key={point} text={point} highlighted={index === 0} />
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">A dire simplement</p>
            <div className="grid gap-2">
              {prompts.slice(0, 2).map((prompt) => (
                <div key={prompt} className="rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-slate-200">
                  {prompt}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Lecture express</p>
            <SummaryMini label="Objectif" value={form.objectiveFocus} />
            <SummaryMini label="Programme" value={selectedProgram?.title ?? "A choisir"} />
            <SummaryMini label="Hydratation" value={`${waterNeed} L`} />
            {form.objective === "weight-loss" ? <SummaryMini label="Rythme" value={weightLossPace.label} /> : <SummaryMini label="Motivation" value={`${form.motivation}/10`} />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  step
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <input type={type} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function AreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void; }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function ChoiceGroup({
  label,
  value,
  options,
  onChange,
  formatOption
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatOption?: (value: string) => string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-full px-4 py-2 text-sm font-medium transition ${value === option ? "bg-white text-slate-950" : "border border-white/10 bg-white/[0.03] text-slate-200"}`}>
            {formatOption ? formatOption(option) : option}
          </button>
        ))}
      </div>
    </div>
  );
}

function SectionBlock({ title, description, children }: { title: string; description: string; children: ReactNode; }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="space-y-1">
        <p className="text-lg font-semibold text-white">{title}</p>
        <p className="text-sm leading-6 text-slate-400">{description}</p>
      </div>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-slate-950/35 px-4 py-3"><span className="text-sm text-slate-400">{label}</span><span className="text-right text-sm font-semibold text-white">{value}</span></div>;
}

function SummaryMini({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3"><span className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</span><span className="text-sm font-semibold text-white">{value}</span></div>;
}

function FocusPanelItem({ text, highlighted = false }: { text: string; highlighted?: boolean }) {
  return (
    <div
      className={`rounded-[20px] border px-4 py-3 text-sm leading-6 ${
        highlighted
          ? "border-sky-300/20 bg-sky-400/10 text-white"
          : "border-white/10 bg-white/[0.03] text-slate-200"
      }`}
    >
      {text}
    </div>
  );
}

function ClosingLine({ text }: { text: string }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/25 px-4 py-3 text-sm leading-6 text-white">{text}</div>;
}

function SummaryHighlightCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-white/[0.03] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function QuickReadCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-lg font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-400">{detail}</p>
    </div>
  );
}

