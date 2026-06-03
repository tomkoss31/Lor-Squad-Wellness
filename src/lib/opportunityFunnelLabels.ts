// =============================================================================
// opportunityFunnelLabels — libellés lisibles des réponses du funnel
// « Opportunité gated » (/rejoindre/:slug → RejoindreQuestionnairePage).
//
// Les réponses brutes sont stockées dans `prospect_leads.metadata.answers`
// sous forme de codes (`career_change`, `6m`, `sens`…). Ce module traduit
// ces codes en texte lisible pour l'onglet admin Leads (LeadsTab).
//
// ⚠️ Source de vérité des questions = `STEPS` dans RejoindreQuestionnairePage.
// Si tu ajoutes / renommes une question ou une option là-bas, mets aussi à
// jour les maps ci-dessous (pas d'import direct pour ne pas tirer toute la
// page dans le bundle Paramètres).
// =============================================================================

/** Libellé court (admin) de chaque question, dans l'ordre d'affichage logique. */
export const FUNNEL_QUESTION_LABEL: Record<string, string> = {
  source: "Comment il/elle nous a connus",
  profile: "Ce qui l'attire le plus",
  occupation: "Situation actuelle",
  network_love: "Aime échanger avec les gens",
  network_knows: "Connaît des gens bien-être",
  product_affinity: "Rapport au bien-être / nutrition",
  why_now: "Pourquoi maintenant",
  // Branche curieux
  curious_focus: "Ce qui l'intrigue",
  curious_ready: "Où il/elle en est",
  // Branche complément
  side_amount: "Complément mensuel visé",
  side_flex: "Flexibilité de l'activité actuelle",
  // Branche reconversion
  career_why: "Envie de changer car",
  career_delay: "Délai pour en vivre",
  career_train: "Prêt·e à se former",
  // Clôture
  hours: "Heures dispo / semaine",
  wants_visio: "Dispo pour une visio 20 min",
};

/** Ordre d'affichage des questions « choix » dans la modale de détail. */
export const FUNNEL_QUESTION_ORDER: string[] = [
  "source",
  "profile",
  "why_now",
  "occupation",
  "hours",
  "wants_visio",
  "network_love",
  "network_knows",
  "product_affinity",
  // branches (n'apparaissent que si remplies)
  "curious_focus",
  "curious_ready",
  "side_amount",
  "side_flex",
  "career_why",
  "career_delay",
  "career_train",
];

/** Valeur → { emoji, label } pour chaque question à choix. */
export const FUNNEL_OPTION_LABEL: Record<string, Record<string, { emoji: string; label: string }>> = {
  source: {
    coach: { emoji: "🧑‍🏫", label: "Un coach m'a parlé" },
    instagram: { emoji: "📸", label: "Instagram" },
    facebook: { emoji: "📘", label: "Facebook" },
    tiktok: { emoji: "🎵", label: "TikTok" },
    bouche: { emoji: "💬", label: "Bouche-à-oreille" },
    shakebar: { emoji: "🥤", label: "Le shake bar / club" },
    autre: { emoji: "✨", label: "Autre" },
  },
  profile: {
    curious: { emoji: "🔍", label: "Curieux·se, veut comprendre" },
    side_income: { emoji: "💸", label: "Complément de revenu" },
    career_change: { emoji: "🚀", label: "Vraie reconversion" },
  },
  occupation: {
    salarie: { emoji: "💼", label: "Salarié·e" },
    independant: { emoji: "🧑‍💻", label: "Indépendant·e" },
    sans_emploi: { emoji: "🔄", label: "Sans emploi" },
    parent: { emoji: "🏡", label: "Parent au foyer" },
    etudiant: { emoji: "🎓", label: "Étudiant·e" },
    retraite: { emoji: "🌅", label: "Retraité·e" },
  },
  network_love: {
    beaucoup: { emoji: "🤗", label: "Oui, adore ça" },
    depend: { emoji: "🙂", label: "Ça dépend" },
    peu: { emoji: "😌", label: "Plutôt réservé·e" },
  },
  network_knows: {
    plein: { emoji: "🌟", label: "Plein !" },
    quelques: { emoji: "👍", label: "Quelques-uns" },
    pas: { emoji: "🤔", label: "Pas vraiment" },
  },
  product_affinity: {
    passionne: { emoji: "🔥", label: "Passionné·e" },
    jemymets: { emoji: "🌱", label: "S'y met" },
    curieux: { emoji: "👀", label: "Curieux·se" },
    pasdutout: { emoji: "🤷", label: "Pas du tout (encore)" },
  },
  why_now: {
    marre_job: { emoji: "😮‍💨", label: "Marre de son job" },
    besoin_sous: { emoji: "💰", label: "Besoin de revenus" },
    liberte: { emoji: "🕊️", label: "Envie de liberté / sens" },
    teste: { emoji: "🧪", label: "Teste, verra bien" },
    autre: { emoji: "✨", label: "Autre chose" },
  },
  curious_focus: {
    produits: { emoji: "🧴", label: "Les produits" },
    business: { emoji: "📈", label: "Le business / les revenus" },
    communaute: { emoji: "👥", label: "La communauté" },
  },
  curious_ready: {
    info: { emoji: "📚", label: "Veut juste s'informer" },
    tester: { emoji: "✅", label: "Prêt·e à tester" },
  },
  side_amount: {
    "200": { emoji: "🙂", label: "~200 € / mois" },
    "500": { emoji: "😃", label: "~500 € / mois" },
    "1000": { emoji: "🤩", label: "~1000 € / mois" },
    plus: { emoji: "🚀", label: "Plus encore" },
  },
  side_flex: {
    oui: { emoji: "🕒", label: "Oui, gère son temps" },
    un_peu: { emoji: "🌙", label: "Un peu, soir / week-end" },
    peu: { emoji: "⏳", label: "Pas beaucoup" },
  },
  career_why: {
    sens: { emoji: "🎯", label: "Donner du sens" },
    argent: { emoji: "💶", label: "Gagner mieux sa vie" },
    liberte: { emoji: "🦅", label: "Être libre / son propre patron" },
    burnout: { emoji: "🆘", label: "N'en peut plus de l'actuel" },
  },
  career_delay: {
    "3m": { emoji: "⚡", label: "3 mois" },
    "6m": { emoji: "📆", label: "6 mois" },
    "12m": { emoji: "🗓️", label: "1 an" },
    pas_presse: { emoji: "🐢", label: "Pas pressé·e" },
  },
  career_train: {
    oui: { emoji: "💪", label: "Oui, à fond" },
    voir: { emoji: "🤝", label: "Si c'est bien encadré" },
  },
  hours: {
    lt2: { emoji: "🌱", label: "Moins de 2h" },
    "2_5": { emoji: "🙂", label: "2 à 5h" },
    "5_10": { emoji: "💪", label: "5 à 10h" },
    "10p": { emoji: "🔥", label: "10h et +" },
  },
  wants_visio: {
    semaine: { emoji: "📞", label: "Oui, cette semaine" },
    plus_tard: { emoji: "🗓️", label: "Plus tard" },
    pas_encore: { emoji: "✋", label: "Pas encore" },
  },
};

export interface FunnelAnswerRow {
  id: string;
  question: string;
  emoji: string;
  answer: string;
}

/**
 * Transforme la map de réponses brutes en lignes lisibles (question + réponse),
 * dans l'ordre logique. Ignore les champs d'identité (déjà affichés ailleurs)
 * et les réponses vides / branches non parcourues.
 */
export function buildFunnelSummary(answers: Record<string, string> | null | undefined): FunnelAnswerRow[] {
  if (!answers) return [];
  const rows: FunnelAnswerRow[] = [];
  for (const id of FUNNEL_QUESTION_ORDER) {
    const raw = answers[id];
    if (raw == null || raw === "") continue;
    const opt = FUNNEL_OPTION_LABEL[id]?.[raw];
    rows.push({
      id,
      question: FUNNEL_QUESTION_LABEL[id] ?? id,
      emoji: opt?.emoji ?? "•",
      answer: opt?.label ?? raw, // fallback : valeur brute si non mappée
    });
  }
  return rows;
}
