// =============================================================================
// bilanAddOns — « suivant tes réponses, on te conseille aussi… » (2026-07-17)
// =============================================================================
//
// Le prospect vient de répondre à 10 minutes de questions. Lui proposer un
// produit qui découle VISIBLEMENT de ce qu'il a dit vaut dix fois mieux qu'un
// catalogue : il reconnaît sa propre phrase dans la recommandation.
//
// RÈGLES DU JEU
//  · Un seul add-on à la fois (le premier qui matche, par ordre de priorité).
//    Deux, et ça redevient une liste de courses.
//  · Aucun match → on ne rend RIEN. Pas d'add-on par défaut, pas de section vide.
//  · `reason` cite ce QU'IL a répondu, jamais une généralité.
//
// ⚠️ ALLÉGATIONS SANTÉ — à lire avant de toucher aux textes
// Cette page VEND. Toute phrase écrite ici est une allégation portée par le
// coach, pas par le client. On s'en tient donc au registre européen des
// allégations autorisées (Règlement UE 1924/2006) :
//   · chrome → « contribue au maintien d'une glycémie normale »        ✅
//   · vit. C / niacine → « contribuent à réduire la fatigue »          ✅
//   · vit. B6 / riboflavine → « fonctionnement normal du système nerveux » ✅
//   · « aide à réduire la graisse viscérale » (étude Fiit-NS)          ❌ NON
//     L'étude existe (72 personnes, 16 semaines, −1,0 kg de masse grasse
//     abdominale) mais ce n'est pas une allégation autorisée : interdite à
//     l'écrit sur une page commerciale. Cet argument reste à l'ORAL, en RDV.
//     Décision Thomas du 2026-07-17 — ne pas réintroduire.
// =============================================================================

/** Sous-ensemble des réponses du bilan online utile aux règles. */
export interface AddOnAnswers {
  objectives?: string[];
  sleepHours?: string | null; // "<6" | "6-7" | "7-8" | "8+"
  sleepQuality?: string | null; // "bad" | "meh" | "ok" | "great"
  mealsBalanced?: string | null; // "yes" | "no" | "unsure"
}

export interface AddOnSuggestion {
  /** id catalogue PV — sert à retrouver prix + durée réelle. */
  productId: string;
  /** Ce qu'on met en gros. */
  title: string;
  /** La phrase qui renvoie à SA réponse. */
  reason: string;
  /** Ce que le produit fait — allégations autorisées uniquement. */
  benefit: string;
}

/**
 * Le premier add-on qui colle aux réponses, ou `null`.
 * L'ordre des règles EST la priorité : le sommeil d'abord (c'est le plus
 * douloureux et le plus visible dans les réponses), puis le métabolisme, puis
 * les fibres.
 */
export function pickAddOn(a: AddOnAnswers): AddOnSuggestion | null {
  const objectives = a.objectives ?? [];

  // 1. Sommeil — court, mauvais, ou objectif explicite.
  const shortNight = a.sleepHours === "<6" || a.sleepHours === "6-7";
  const poorNight = a.sleepQuality === "bad" || a.sleepQuality === "meh";
  if (shortNight || poorNight || objectives.includes("sleep")) {
    return {
      productId: "night-mode",
      title: "Night Mode",
      reason: shortNight
        ? "Tu m'as dit que tu dors moins de 7 h par nuit."
        : poorNight
          ? "Tu m'as dit que tes nuits ne sont pas réparatrices."
          : "Tu m'as dit que le sommeil fait partie de tes objectifs.",
      benefit:
        "Safran extrait à froid, vitamine B6 et riboflavine — qui contribuent au fonctionnement normal du système nerveux et à réduire la fatigue. Une dose une heure avant le coucher.",
    };
  }

  // 2. Métabolisme — objectif perte de poids.
  if (objectives.includes("weight_loss")) {
    return {
      productId: "phyto-brule-graisse",
      title: "Phyto Complete",
      reason: "Tu m'as dit que perdre du poids était ton objectif principal.",
      benefit:
        "Le chrome contribue au maintien d'une glycémie normale — c'est ce qui joue sur les coups de barre et l'envie de grignoter. La vitamine C et la niacine aident à réduire la fatigue.",
    };
  }

  // 3. Fibres — repas non équilibrés de son propre aveu.
  if (a.mealsBalanced === "no" || a.mealsBalanced === "unsure") {
    return {
      productId: "multifibres",
      title: "Boisson multifibres",
      reason: "Tu m'as dit que tes repas ne sont pas toujours équilibrés.",
      benefit:
        "Une dose par jour dans un grand verre d'eau. Six sources de fibres, là où presque personne n'atteint les apports conseillés.",
    };
  }

  return null;
}
