// =============================================================================
// errorTips.ts — Source canonique des tips Lor'Squad Wellness (2026-04-30)
//
// Bibliothèque de ~60 tips concrets pour les coachs Herbalife, organisés en
// 8 catégories (nutrition, business PV, suivi client, prospection, social
// media, objections, mindset, hygiène de vie).
//
// Utilisé dans :
//   - ErrorBoundary (tip rotatif sur écran de crash)
//   - LoginPage (quote aléatoire sur le visuel d'accueil)
//   - CoachTipOfDayCard (widget Co-pilote, 1 tip/jour déterministe)
//   - (futur) Notifs push contextuelles selon signaux faibles
//
// Note FR : Beverage Mix n'existant pas en France, le tip 🍓 a été
// reformulé avec lait d'amande + glaçons.
// =============================================================================

export type TipCategory =
  | "nutrition"
  | "business"
  | "suivi"
  | "prospection"
  | "social"
  | "objections"
  | "mindset"
  | "hygiene";

export interface CoachTip {
  emoji: string;
  text: string;
  category: TipCategory;
}

export const ERROR_TIPS: CoachTip[] = [
  // ─── 🍴 Nutrition Herbalife ────────────────────────────────────────────────
  { emoji: "🍓", text: "Formula 1 fraise + lait d'amande + glaçons = smoothie d'été, parfait pour les clientes qui trouvent F1 fade.", category: "nutrition" },
  { emoji: "☕", text: "F1 cookie + Café latte protéiné = petit-déjeuner gourmand qui cale 4h.", category: "nutrition" },
  { emoji: "🥥", text: "F1 vanille + lait de coco + 1/2 banane congelée = milkshake premium.", category: "nutrition" },
  { emoji: "🍫", text: "PDM chocolat dans un yaourt 0% + amandes = collation 16h sans craquer.", category: "nutrition" },
  { emoji: "🌿", text: "Tisane Thermo Complete glacée + citron = boost matin sans café.", category: "nutrition" },
  { emoji: "🥄", text: "PPP avant le repas = coupe la faim et protège la masse musculaire.", category: "nutrition" },
  { emoji: "🥤", text: "Aloe + Thé en bouteille toute la journée = hydratation + drainage.", category: "nutrition" },

  // ─── 📊 Volume Points & business ──────────────────────────────────────────
  { emoji: "📈", text: "10 clients à 80 PV/mois = 800 PV récurrents. La base d'un mois solide.", category: "business" },
  { emoji: "🎯", text: "Fais le point sur tes PV le 25, pas le 30 à 23h59.", category: "business" },
  { emoji: "💡", text: "Un client en pause ≠ client perdu. Un message d'anniv = 70% de réactivation.", category: "business" },
  { emoji: "🔄", text: "Le réachat coûte 5x moins cher que la prospection. Ton dossier = ton or.", category: "business" },
  { emoji: "📞", text: "3 appels par jour = 60 par mois. Pas 30 d'un coup le dimanche soir.", category: "business" },
  { emoji: "🏆", text: "Producer Active mensuel = 1000 PV. Découpé sur 30 jours = 33 PV/jour. Plus simple.", category: "business" },
  { emoji: "💎", text: "1 client VIP à 200 PV = 5 clients à 40 PV. Mais le VIP demande 5x moins de suivi.", category: "business" },
  { emoji: "📦", text: "1 pack Premium = 150-200 PV en 1 vente. 4 packs/mois = 800 PV.", category: "business" },
  { emoji: "🔁", text: "Le 1er du mois, regarde tes 10 plus gros clients du mois dernier. Relance-les avant le 5.", category: "business" },
  { emoji: "📅", text: "Calendrier PV affiché sur ton frigo = projection en temps réel.", category: "business" },

  // ─── 🤝 Suivi & relation client ───────────────────────────────────────────
  { emoji: "🎂", text: "L'anniversaire client = la meilleure occasion de réactiver sans forcer.", category: "suivi" },
  { emoji: "📸", text: "Une photo 'avant' floue vaut mieux qu'aucune photo. Tes clients oublient leur point de départ.", category: "suivi" },
  { emoji: "⏰", text: "Le suivi J+3 fait 2x plus de différence que le J+30. C'est la 1ère semaine qui compte.", category: "suivi" },
  { emoji: "💬", text: "'Ça va ?' = mauvaise question. 'Comment s'est passé ton petit-déj ?' = vraie ouverture.", category: "suivi" },
  { emoji: "🎁", text: "Un sachet de Thé en bonus à la 2ème commande = effet wow x10 pour 2€.", category: "suivi" },
  { emoji: "📊", text: "Pèse ton client toutes les 2 semaines, pas chaque semaine. Les variations courtes démotivent.", category: "suivi" },
  { emoji: "💪", text: "La photo > la balance. Surtout pour les clients qui prennent du muscle.", category: "suivi" },
  { emoji: "📲", text: "Le suivi J+1 sauve 80% des clients qui auraient lâché. Le 1er petit-déj est le moment dur.", category: "suivi" },
  { emoji: "🎓", text: "Forme tes meilleurs clients à devenir distri. Tu duplicates sans prospecter.", category: "suivi" },
  { emoji: "🌟", text: "1 client satisfait = 3 nouveaux contacts s'il en parle. Donne-lui des raisons d'être fier.", category: "suivi" },

  // ─── 🎯 Prospection terrain ───────────────────────────────────────────────
  { emoji: "🚶", text: "5 contacts par jour pendant 30 jours = 150 prospects. Pas besoin de talent.", category: "prospection" },
  { emoji: "👋", text: "Ne dis pas 'tu connais Herbalife ?' Dis 'tu cherches à perdre du poids ?'.", category: "prospection" },
  { emoji: "🎁", text: "Ton meilleur client demain est le client d'aujourd'hui qui te recommandera.", category: "prospection" },
  { emoji: "📍", text: "Un nouveau quartier = 100 nouveaux prospects. Change de zone tous les 15 jours.", category: "prospection" },
  { emoji: "☕", text: "Un café avec un prospect = 3€ et rapporte 80 PV/mois pendant 2 ans. ROI imbattable.", category: "prospection" },
  { emoji: "👀", text: "Les gens en sportswear à 18h = ta cible chaude. Sortie de salle, motivation au max.", category: "prospection" },

  // ─── 📱 Réseaux sociaux ───────────────────────────────────────────────────
  { emoji: "📷", text: "1 post avant/après par semaine = ton meilleur outil de prospection.", category: "social" },
  { emoji: "🎬", text: "30 secondes de vidéo > 5 minutes. Les gens scrollent vite, va à l'essentiel.", category: "social" },
  { emoji: "💭", text: "Réponds aux commentaires en moins d'1h. L'algo te récompense.", category: "social" },
  { emoji: "⏱️", text: "Story Instagram à 7h et 19h = créneaux où tes prospects scrollent.", category: "social" },
  { emoji: "🚫", text: "Ne vends jamais en story. Raconte une transfo, pose une question, l'intérêt vient.", category: "social" },
  { emoji: "✍️", text: "Légende = accroche + émotion + question. Pas un roman.", category: "social" },

  // ─── 🛡️ Objections clients ────────────────────────────────────────────────
  { emoji: "💰", text: "'C'est cher' = 'Je ne vois pas la valeur.' Reformule en 2,30€/jour, moins qu'un café.", category: "objections" },
  { emoji: "🤔", text: "'Je vais réfléchir' = tu n'as pas répondu à sa vraie question. Demande laquelle.", category: "objections" },
  { emoji: "👁️", text: "'J'ai déjà essayé, ça n'a pas marché' = tu n'as pas eu de coach. Ça change tout.", category: "objections" },
  { emoji: "⏳", text: "'J'ai pas le temps de cuisiner' = parfait, le shake se fait en 30 secondes.", category: "objections" },
  { emoji: "🍕", text: "'J'aime trop manger' = tu mangeras quand même. 2 repas + 1 shake.", category: "objections" },
  { emoji: "💔", text: "'Mon conjoint va dire quoi' = invite-le aussi. C'est un cadeau pour le couple.", category: "objections" },
  { emoji: "🏋️", text: "'Je veux perdre que 3kg' = 3kg durables = changement d'habitude. Plus précieux que 20kg.", category: "objections" },

  // ─── 🧠 Mindset coach ─────────────────────────────────────────────────────
  { emoji: "🌱", text: "Tu es un coach, pas un médecin. Avis médical = renvoie vers le médecin.", category: "mindset" },
  { emoji: "🔋", text: "Coach épuisé = coach inutile. Bloque tes lundi matin pour TOI.", category: "mindset" },
  { emoji: "🗓️", text: "Ce qui n'est pas dans ton agenda n'existe pas. Pas de RDV = pas de PV.", category: "mindset" },
  { emoji: "☀️", text: "Le matin, fais ta routine AVANT d'ouvrir l'app. Action, pas réaction.", category: "mindset" },
  { emoji: "📵", text: "Bloque les notifs WhatsApp clients après 21h. Tu n'es pas médecin de garde.", category: "mindset" },
  { emoji: "✅", text: "3 priorités max par jour. Le reste, c'est du remplissage.", category: "mindset" },
  { emoji: "🧘", text: "2 minutes de respiration avant un RDV difficile = tu arrives centré.", category: "mindset" },
  { emoji: "📚", text: "10 pages d'un livre business chaque soir. 6 mois = 12 livres = autre niveau.", category: "mindset" },
  { emoji: "🔥", text: "La constance bat le talent. Tous les jours > parfaitement parfois.", category: "mindset" },

  // ─── 🍽️ Hygiène de vie & client ──────────────────────────────────────────
  { emoji: "💧", text: "2L d'eau par jour = règle d'or. -200g/jour les 3 premiers jours = de l'eau, pas du muscle.", category: "hygiene" },
  { emoji: "😴", text: "Mauvais sommeil = mauvais résultats. Avant de changer le plan, regarde si ton client dort 7h.", category: "hygiene" },
  { emoji: "🦶", text: "8000 pas par jour > 1h de salle 2x/semaine. Le mouvement quotidien gagne toujours.", category: "hygiene" },
  { emoji: "🥗", text: "Le client qui zappe son shake matin perd 50% des résultats. Insiste sur le rituel.", category: "hygiene" },
];

/**
 * Sélection aléatoire au mount (utilisé par ErrorBoundary + LoginPage).
 */
export function getRandomTip(): CoachTip {
  return ERROR_TIPS[Math.floor(Math.random() * ERROR_TIPS.length)];
}

/**
 * Tip déterministe pour un jour donné (utilisé par CoachTipOfDayCard pour
 * que tous les coachs voient le même tip un même jour, et que le tip ne
 * change pas en cours de journée).
 */
export function getTipOfDay(date: Date = new Date(), offset = 0): CoachTip {
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
  );
  const idx = (dayOfYear + offset) % ERROR_TIPS.length;
  return ERROR_TIPS[idx];
}

export const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  nutrition: "Nutrition",
  business: "Volume Points",
  suivi: "Suivi client",
  prospection: "Prospection",
  social: "Réseaux sociaux",
  objections: "Objections",
  mindset: "Mindset",
  hygiene: "Hygiène de vie",
};
