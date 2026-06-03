// =============================================================================
// opportunityPreEval — pré-évaluation personnalisée de fin de funnel
// « Opportunité gated » (/rejoindre/:slug → écran phase "done").
//
// Objectif : renvoyer au prospect SES PROPRES réponses sous forme d'atouts
// concrets ("vu que tu as répondu X, tu as déjà Y pour réussir"), avec un
// verdict adapté à son score. Le but est qu'il/elle comprenne que c'est
// jouable POUR LUI, sans survendre.
//
// ⚠️ COMPLIANCE : aucune promesse de gain. Les montants (side_amount) sont
// formulés comme des OBJECTIFS que l'on construit, jamais comme des revenus
// garantis. Pas de "tu gagneras", pas de chiffre présenté comme acquis.
//
// Toutes les connexions sont DÉRIVÉES des réponses (pas de hasard) — cf.
// opportunityLeadScore (barème) + opportunityFunnelLabels (libellés).
// =============================================================================

import type { OpportunityScore } from "./opportunityLeadScore";
import { FUNNEL_OPTION_LABEL } from "./opportunityFunnelLabels";

export interface PreEvalAsset {
  /** Emoji illustratif (aria-hidden côté rendu). */
  emoji: string;
  /** Titre court de l'atout. */
  label: string;
  /** Pourquoi c'est un atout (justification dérivée de la réponse). */
  why: string;
}

export interface PreEvaluation {
  emoji: string;
  headline: string;
  verdict: string;
  verdictTone: OpportunityScore["temperature"];
  /** Atouts dérivés des réponses (2 à 4, ordonnés par force du signal). */
  assets: PreEvalAsset[];
  /** Objectif reformulé (selon profil), null si non pertinent. */
  goal: string | null;
  /** Point d'honnêteté à travailler (au plus 1), null sinon. */
  watchout: string | null;
}

type Answers = Record<string, string>;

// ─── Atouts candidats, par ordre de priorité (on garde les 4 premiers) ───────
function collectAssets(a: Answers): PreEvalAsset[] {
  const out: PreEvalAsset[] = [];

  // 1. Motivation claire (signal fort)
  const whyNow = a.why_now;
  if (whyNow === "marre_job") {
    out.push({ emoji: "😮‍💨", label: "Une vraie motivation", why: "Tu veux sortir de ton job actuel — c'est un moteur puissant." });
  } else if (whyNow === "besoin_sous") {
    out.push({ emoji: "💰", label: "Un objectif concret", why: "Tu sais pourquoi tu le fais : des revenus en plus." });
  } else if (whyNow === "liberte") {
    out.push({ emoji: "🕊️", label: "Une envie de liberté", why: "Chercher du sens et de l'autonomie, c'est exactement l'état d'esprit qui marche ici." });
  }

  // 2. Temps disponible
  switch (a.hours) {
    case "10p":
      out.push({ emoji: "🔥", label: "Du temps devant toi", why: "10h ou + par semaine : de quoi avancer vite." });
      break;
    case "5_10":
      out.push({ emoji: "💪", label: "Un bon créneau", why: "5 à 10h par semaine, c'est suffisant pour démarrer sérieusement." });
      break;
    case "2_5":
      out.push({ emoji: "🙂", label: "Du temps pour lancer", why: "2 à 5h par semaine en parallèle, c'est un vrai début." });
      break;
    // lt2 → pas un atout, devient un watchout
  }

  // 3. Réseau connu
  if (a.network_knows === "plein") {
    out.push({ emoji: "🌟", label: "Un premier cercle tout trouvé", why: "Tu connais déjà plein de gens sensibles au bien-être." });
  } else if (a.network_knows === "quelques") {
    out.push({ emoji: "👍", label: "Des premiers contacts", why: "Tu connais déjà quelques personnes à qui en parler." });
  }

  // 4. Aime le contact
  if (a.network_love === "beaucoup") {
    out.push({ emoji: "🤗", label: "Tu aimes le contact", why: "Échanger avec les gens, c'est le cœur du métier." });
  }

  // 5. Affinité produit
  if (a.product_affinity === "passionne") {
    out.push({ emoji: "🔥", label: "Déjà passionné·e de bien-être", why: "Tu en parleras avec sincérité, ça se sent." });
  } else if (a.product_affinity === "jemymets" || a.product_affinity === "curieux") {
    out.push({ emoji: "🌱", label: "Une vraie curiosité bien-être", why: "L'envie est là — le reste, ça s'apprend." });
  }

  // 6. Prêt·e à se former (reconversion)
  if (a.career_train === "oui") {
    out.push({ emoji: "📚", label: "Prêt·e à te former", why: "L'accompagnement fait la différence, et tu es partant·e." });
  }

  // 7. Flexibilité (complément)
  if (a.side_flex === "oui" || a.side_flex === "un_peu") {
    out.push({ emoji: "🕒", label: "De la flexibilité", why: "Ton emploi du temps te laisse de la marge." });
  }

  // 8. Dispo rapide
  if (a.wants_visio === "semaine") {
    out.push({ emoji: "📞", label: "Dispo rapidement", why: "Tu veux échanger dès cette semaine — on adore." });
  }

  // Fallback : toujours au moins un atout (le premier pas)
  if (out.length === 0) {
    out.push({ emoji: "✨", label: "Tu es là", why: "Le premier pas, beaucoup ne le font jamais. Toi, si." });
  }

  return out.slice(0, 4);
}

// ─── Objectif reformulé (sans promesse de gain) ──────────────────────────────
function buildGoal(a: Answers, profile: OpportunityScore["profile"]): string | null {
  if (profile === "side_income") {
    const amount = a.side_amount ? FUNNEL_OPTION_LABEL.side_amount?.[a.side_amount]?.label : null;
    if (amount) {
      return `Ton objectif : un complément de ${amount.replace("/ mois", "par mois")}. C'est le type de palier qu'on construit pas à pas, ensemble.`;
    }
    return "Ton objectif : un complément de revenu à côté. On le construit pas à pas, ensemble.";
  }
  if (profile === "career_change") {
    if (a.career_delay === "pas_presse") {
      return "Ton horizon : à ton rythme, sans pression. Parfait pour bâtir quelque chose de solide.";
    }
    const delay = a.career_delay ? FUNNEL_OPTION_LABEL.career_delay?.[a.career_delay]?.label : null;
    if (delay) {
      return `Ton horizon : en vivre d'ici ${delay}. On regardera ensemble, honnêtement, ce qui est réaliste pour toi.`;
    }
    return "Ton horizon : en faire ton activité. On regardera ensemble, étape par étape.";
  }
  // curieux
  return "Pour l'instant : comprendre, à ton rythme. Zéro engagement, on t'explique tout.";
}

// ─── Point d'honnêteté (crédibilité), au plus 1 ──────────────────────────────
function buildWatchout(a: Answers): string | null {
  if (a.hours === "lt2") {
    return "Le seul bémol : tu as peu de temps au départ. Bonne nouvelle, on commence petit, sans bouleverser ton quotidien.";
  }
  if (a.network_knows === "pas") {
    return "Tu ne connais pas encore grand monde dans le bien-être ? Normal — on t'apprend exactement comment t'y prendre.";
  }
  if (a.product_affinity === "pasdutout") {
    return "Le bien-être, c'est pas encore ton truc ? Pas grave : la plupart ont tout appris en chemin.";
  }
  return null;
}

const HEADLINE: Record<OpportunityScore["temperature"], (name: string) => string> = {
  hot: (n) => `${n}, tout est réuni pour toi.`,
  warm: (n) => `${n}, c'est clairement jouable.`,
  cold: (n) => `${n}, ça commence bien.`,
};

const VERDICT: Record<OpportunityScore["temperature"], string> = {
  hot: "Vu tes réponses, tu coches les cases de celles et ceux qui s'épanouissent ici : la motivation, le temps, et l'envie d'échanger. Un coach va te rappeler en priorité.",
  warm: "Tes réponses montrent de vrais atouts. Avec un peu de régularité et le bon accompagnement, tu as de quoi en faire quelque chose de concret.",
  cold: "Tu explores, et c'est exactement comme ça que la plupart ont commencé. Pas besoin d'être un·e expert·e : on avance étape par étape, à ton rythme.",
};

const PROFILE_EMOJI: Record<string, string> = {
  career_change: "🚀",
  side_income: "💸",
  curious: "🔍",
};

/**
 * Construit la pré-évaluation personnalisée affichée en fin de funnel.
 * Déterministe : mêmes réponses → même rendu.
 */
export function buildPreEvaluation(
  answers: Answers,
  score: OpportunityScore,
  firstNameRaw: string,
): PreEvaluation {
  const firstName = (firstNameRaw || "").trim() || "toi";
  const tone = score.temperature;
  return {
    emoji: PROFILE_EMOJI[score.profile ?? ""] ?? "✨",
    headline: HEADLINE[tone](firstName),
    verdict: VERDICT[tone],
    verdictTone: tone,
    assets: collectAssets(answers),
    goal: buildGoal(answers, score.profile),
    watchout: buildWatchout(answers),
  };
}
