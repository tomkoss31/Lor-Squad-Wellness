// =============================================================================
// Algo de scoring du bilan online V2 (chantier B, 2026-05-27).
//
// Pur (pas d'IO), déterministe, testable. Prend un sous-ensemble du
// FormState de BilanOnlinePage et retourne :
//   - 6 dimensions scorées 0-100 (alimentation, hydratation, sommeil,
//     mental, activité, social)
//   - score global = moyenne arithmétique
//   - top 3 priorités (les 3 dimensions les plus basses)
//   - verdict directionnel (bienveillant, orienté action)
//
// Philosophie : pas de culpabilisation. Verdict positif même bas score
// ("plein de marge de progression — on commence par où ça compte").
//
// Toute évolution de l'algo doit garder la signature stable car la page
// resultats consomme directement la shape du retour.
// =============================================================================

export type DimensionKey =
  | "food" | "water" | "sleep" | "mind" | "activity" | "social";

export interface DimensionScore {
  key: DimensionKey;
  emoji: string;
  label: string;
  score: number; // 0-100
}

export interface PriorityInsight {
  key: DimensionKey;
  emoji: string;
  title: string;
  insight: string; // 1 phrase d'observation
  advice: string;  // 1 phrase de direction concrete
}

export interface BilanResults {
  dimensions: DimensionScore[];
  globalScore: number; // 0-100, arrondi
  verdict: {
    headline: string;
    body: string;
    emoji: string;
    tone: "great" | "good" | "okay" | "todo";
  };
  priorities: PriorityInsight[]; // top 3
}

// Subset minimal du FormState consomme par l'algo. Tout est optionnel pour
// rester tolerant si une etape n'a pas ete remplie (ex: skip volontaire).
export interface ScoringInput {
  // Étape 4 — assiette & verre
  meals_balanced?: "yes" | "no" | "unsure" | "";
  water_per_day?: "1-3" | "4-6" | "7-10" | "10+" | "";
  coffee_per_day?: "0" | "1-2" | "3-4" | "5+" | "";
  soda_per_day?: "0" | "1" | "2-3" | "4+" | "";
  alcohol_per_week?: "0" | "1-3" | "4-7" | "8+" | "";
  // Étape 5 — sommeil & tete
  sleep_quality?: "bad" | "meh" | "ok" | "great" | "";
  sleep_hours?: "<6" | "6-7" | "7-8" | "8+" | "";
  stress_level?: number; // 1-10
  mental_load?: "light" | "ok" | "heavy" | "crushed" | "";
  // Étape 6 — job & cercle
  job_feeling?: "great" | "valued" | "routine" | "demotivated" | "lost" | "";
  social_circle?: "family" | "couple" | "friends" | "alone" | "";
  // Étape 7 — activite
  active_daily?: "yes" | "no" | "";
  sport_frequency?: "never" | "1x" | "2-3x" | "4+x" | "";
  daily_food_budget?: "2" | "4" | "8" | "10" | "15+" | "";
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, v));
}

// ── Scoring par dimension ──────────────────────────────────────────────────

function scoreFood(input: ScoringInput): number {
  let s = 50;
  switch (input.meals_balanced) {
    case "yes": s = 70; break;
    case "unsure": s = 45; break;
    case "no": s = 25; break;
  }
  switch (input.daily_food_budget) {
    case "15+": s += 15; break;
    case "10": s += 12; break;
    case "8": s += 8; break;
    case "4": s += 3; break;
    case "2": s -= 5; break;
  }
  switch (input.soda_per_day) {
    case "0": s += 12; break;
    case "1": s += 3; break;
    case "2-3": s -= 8; break;
    case "4+": s -= 18; break;
  }
  return Math.round(clamp(s));
}

function scoreWater(input: ScoringInput): number {
  let s = 0;
  switch (input.water_per_day) {
    case "1-3": s = 25; break;
    case "4-6": s = 55; break;
    case "7-10": s = 88; break;
    case "10+": s = 95; break;
    default: s = 40;
  }
  switch (input.alcohol_per_week) {
    case "0": s += 5; break;
    case "1-3": s -= 5; break;
    case "4-7": s -= 18; break;
    case "8+": s -= 30; break;
  }
  switch (input.coffee_per_day) {
    case "5+": s -= 12; break;
    case "3-4": s -= 3; break;
  }
  return Math.round(clamp(s));
}

function scoreSleep(input: ScoringInput): number {
  let s = 50;
  switch (input.sleep_quality) {
    case "great": s = 90; break;
    case "ok": s = 72; break;
    case "meh": s = 45; break;
    case "bad": s = 22; break;
  }
  switch (input.sleep_hours) {
    case "<6": s -= 18; break;
    case "6-7": s += 0; break;
    case "7-8": s += 10; break;
    case "8+": s += 5; break;
  }
  return Math.round(clamp(s));
}

function scoreMind(input: ScoringInput): number {
  // stress 1 (zen) → 100, stress 10 (à bout) → 10 ; lineaire entre les deux
  const stress = typeof input.stress_level === "number"
    ? clamp(input.stress_level, 1, 10) : 5;
  let s = 100 - ((stress - 1) * 10);
  switch (input.mental_load) {
    case "light": s += 8; break;
    case "ok": s += 0; break;
    case "heavy": s -= 15; break;
    case "crushed": s -= 25; break;
  }
  switch (input.job_feeling) {
    case "great": s += 10; break;
    case "valued": s += 5; break;
    case "routine": s += 0; break;
    case "demotivated": s -= 12; break;
    case "lost": s -= 18; break;
  }
  return Math.round(clamp(s));
}

function scoreActivity(input: ScoringInput): number {
  let s = 0;
  if (input.active_daily === "yes") s += 40;
  else if (input.active_daily === "no") s += 12;
  switch (input.sport_frequency) {
    case "never": s += 0; break;
    case "1x": s += 22; break;
    case "2-3x": s += 45; break;
    case "4+x": s += 58; break;
  }
  return Math.round(clamp(s));
}

function scoreSocial(input: ScoringInput): number {
  switch (input.social_circle) {
    case "family": return 82;
    case "couple": return 78;
    case "friends": return 72;
    case "alone": return 38;
    default: return 55;
  }
}

// ── Verdict + priorités ────────────────────────────────────────────────────

function dimensionMeta(key: DimensionKey): { emoji: string; label: string } {
  switch (key) {
    case "food": return { emoji: "🍽️", label: "Alimentation" };
    case "water": return { emoji: "💧", label: "Hydratation" };
    case "sleep": return { emoji: "😴", label: "Sommeil" };
    case "mind": return { emoji: "🧠", label: "Mental" };
    case "activity": return { emoji: "💪", label: "Activité" };
    case "social": return { emoji: "👥", label: "Entourage" };
  }
}

function priorityFor(dim: DimensionScore): PriorityInsight {
  const { key, score, emoji, label } = dim;
  // Insights + advices bienveillants, orientes action.
  if (key === "food") {
    if (score < 40) {
      return { key, emoji, title: `${label} : un vrai chantier`,
        insight: "Tes repas sont déséquilibrés et probablement trop sucrés.",
        advice: "On commence par caler 1 repas équilibré par jour — protéines, légumes, bons glucides." };
    }
    if (score < 65) {
      return { key, emoji, title: `${label} : à structurer`,
        insight: "Tu es entre deux eaux côté assiette.",
        advice: "Objectif simple : remplacer 1 soda par jour par de l'eau aromatisée." };
    }
    return { key, emoji, title: `${label} : bonne base`,
      insight: "Tu as déjà les bonnes intuitions.",
      advice: "On va affiner la portion protéines et le timing des collations." };
  }
  if (key === "water") {
    if (score < 40) {
      return { key, emoji, title: `${label} : urgence`,
        insight: "Tu bois clairement pas assez d'eau pour ton corps.",
        advice: "Cible 6 à 8 verres/jour. Un grand verre à chaque réveil + repas, c'est déjà 4." };
    }
    if (score < 65) {
      return { key, emoji, title: `${label} : à booster`,
        insight: "Tu bois, mais pas assez régulièrement.",
        advice: "Pose une gourde sur ton bureau, recharge-la 2 fois/jour, c'est gagné." };
    }
    return { key, emoji, title: `${label} : tu es bien`,
      insight: "Hydratation au top — rare et précieux.",
      advice: "On vérifiera que tu bois bien avant + après le sport, et c'est calé." };
  }
  if (key === "sleep") {
    if (score < 40) {
      return { key, emoji, title: `${label} : priorité absolue`,
        insight: "Tu dors mal ou pas assez. Tout le reste va être plus dur tant que c'est pas réglé.",
        advice: "On va définir un rituel coucher + couper les écrans 30 min avant, sur 2 semaines." };
    }
    if (score < 65) {
      return { key, emoji, title: `${label} : à stabiliser`,
        insight: "Ton sommeil est correct mais pas optimal.",
        advice: "Heure de coucher fixe sur 21 jours = bascule mesurable. On test." };
    }
    return { key, emoji, title: `${label} : excellent`,
      insight: "Tu récupères bien — c'est ta force.",
      advice: "On garde ce socle pour soutenir la perte de poids / la perf." };
  }
  if (key === "mind") {
    if (score < 40) {
      return { key, emoji, title: `${label} : sous tension`,
        insight: "Tu encaisses beaucoup, et ça pèse sur ta forme globale.",
        advice: "Étape 1 : 10 min de marche seule par jour, sans téléphone. Ça remet en place." };
    }
    if (score < 65) {
      return { key, emoji, title: `${label} : à alléger`,
        insight: "Niveau de stress moyen, charge mentale présente.",
        advice: "On va caler 1 micro-pause respiration le midi (3 min). Effet cumulé énorme." };
    }
    return { key, emoji, title: `${label} : solide`,
      insight: "Tu gères bien — ton mental est un atout.",
      advice: "On va surfer dessus pour installer les autres habitudes." };
  }
  if (key === "activity") {
    if (score < 40) {
      return { key, emoji, title: `${label} : à démarrer`,
        insight: "Ton corps a besoin de bouger plus, même sans salle de sport.",
        advice: "Démarrage doux : 20 min de marche/jour, 3× cette semaine. Pas plus." };
    }
    if (score < 65) {
      return { key, emoji, title: `${label} : à régulariser`,
        insight: "Tu bouges, mais pas assez régulièrement.",
        advice: "Fixe 2 créneaux fixes/sem dans ton agenda, peu importe la durée." };
    }
    return { key, emoji, title: `${label} : tu es actif`,
      insight: "Tu bouges déjà — gros plus.",
      advice: "On va optimiser la récup' et la nutrition autour du sport." };
  }
  // social
  if (score < 50) {
    return { key, emoji, title: `${label} : ton entourage compte`,
      insight: "Tu navigues plutôt seul(e) en ce moment — c'est plus dur de tenir.",
      advice: "Le suivi coach va devenir ton point d'ancrage. C'est exactement à ça qu'on sert." };
  }
  return { key, emoji, title: `${label} : tu es entouré(e)`,
    insight: "Tu as du soutien autour de toi, c'est précieux.",
    advice: "On va impliquer ton entourage dans les bonnes habitudes — effet boule de neige." };
}

function verdictFor(globalScore: number): BilanResults["verdict"] {
  if (globalScore >= 80) {
    return {
      headline: "Tu es sur une belle dynamique",
      body: "Ton hygiène de vie est déjà solide. Avec un coaching ciblé, tu peux passer un cap (perf, esthétique, performance pro).",
      emoji: "🌿",
      tone: "great",
    };
  }
  if (globalScore >= 60) {
    return {
      headline: "Bon socle, quelques leviers à activer",
      body: "Tu as déjà fait pas mal de bonnes choses. On va identifier 2-3 axes prioritaires et installer des routines durables.",
      emoji: "🎯",
      tone: "good",
    };
  }
  if (globalScore >= 40) {
    return {
      headline: "Du potentiel à débloquer",
      body: "Plusieurs zones méritent d'être structurées. La bonne nouvelle : c'est exactement à ça qu'on sert — on simplifie pour toi.",
      emoji: "💪",
      tone: "okay",
    };
  }
  return {
    headline: "Plein de marge — on commence par où ça compte",
    body: "On va prioriser les 2-3 chantiers qui changent tout le reste. Pas de tout-en-même-temps, pas de régime extrême : du concret, étape par étape.",
    emoji: "🚀",
    tone: "todo",
  };
}

// ── Entry point ────────────────────────────────────────────────────────────

export function computeBilanResults(input: ScoringInput): BilanResults {
  const rawDims: DimensionScore[] = [
    { key: "food", ...dimensionMeta("food"), score: scoreFood(input) },
    { key: "water", ...dimensionMeta("water"), score: scoreWater(input) },
    { key: "sleep", ...dimensionMeta("sleep"), score: scoreSleep(input) },
    { key: "mind", ...dimensionMeta("mind"), score: scoreMind(input) },
    { key: "activity", ...dimensionMeta("activity"), score: scoreActivity(input) },
    { key: "social", ...dimensionMeta("social"), score: scoreSocial(input) },
  ];

  const globalScore = Math.round(
    rawDims.reduce((sum, d) => sum + d.score, 0) / rawDims.length,
  );

  // Top 3 = 3 dimensions au score le plus bas (= les priorités à travailler).
  const sortedAsc = [...rawDims].sort((a, b) => a.score - b.score);
  const priorities = sortedAsc.slice(0, 3).map(priorityFor);

  return {
    dimensions: rawDims,
    globalScore,
    verdict: verdictFor(globalScore),
    priorities,
  };
}
