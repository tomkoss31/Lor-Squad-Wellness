// =============================================================================
// jargon.ts — dictionnaire des mots « compliqués » de l'app, expliqués en
// UNE phrase simple (refonte langage 2026-06-22, demande Thomas).
//
// Sert au composant <JargonTip term="…" /> : une petite bulle ⓘ qu'on pose à
// côté des mots métier (PV, FLEX, EBE, VIP, paliers…) qu'on ne peut pas
// renommer (vocabulaire Herbalife / identité produit), mais qu'un débutant ne
// comprend pas.
//
// RÈGLE : le `tip` doit être lisible par un distri qui débute. Phrase courte,
// zéro autre jargon dedans, on explique le bénéfice concret. Si tu ajoutes un
// terme ici, garde le même ton. Le glossaire complet vit dans
// FormationGlossaryPage (/formation/glossaire) — ici on ne met que l'essentiel.
// =============================================================================

export interface JargonEntry {
  /** Le mot tel qu'il s'affiche (titre de la bulle + aria-label). */
  label: string;
  /** UNE phrase ultra-simple. C'est ce que lit l'utilisateur dans la bulle ⓘ. */
  tip: string;
}

export const JARGON = {
  pv: {
    label: "PV — Points de Volume",
    tip: "Le score Herbalife de tout ce que tu vends ce mois-ci. C'est lui qui fait monter ton rang : plus tu en fais régulièrement, plus tu avances.",
  },
  flex: {
    label: "FLEX",
    tip: "Ton rythme de la semaine : un petit objectif d'actions par jour (inviter, échanger, faire un bilan) pour avancer sans te cramer.",
  },
  ebe: {
    label: "EBE — le bilan",
    tip: "Le rendez-vous bilan avec un futur client : on écoute son objectif, on le mesure, on lui propose un programme adapté.",
  },
  vip: {
    label: "Club VIP",
    tip: "Un client privilégié : il rejoint le programme premium et profite d'un suivi rapproché et de tarifs avantageux.",
  },
  crm: {
    label: "CRM — ton carnet de contacts",
    tip: "Tous tes prospects au même endroit, du premier message jusqu'à la signature. Tu les classes pour ne perdre personne en route.",
  },
  rentabilite: {
    label: "Rentabilité",
    tip: "Ce qu'il te reste vraiment ce mois-ci : tes ventes et tes bonus d'équipe, une fois les coûts enlevés.",
  },
  prospect: {
    label: "Prospect",
    tip: "Une personne à qui tu pourrais proposer un bilan ou les produits. Un futur client, pas encore décidé.",
  },
  palier: {
    label: "Palier (rang Herbalife)",
    tip: "Un échelon Herbalife (Success Builder, Supervisor…). Plus tu fais de points régulièrement, plus tu montes et plus ta remise augmente.",
  },
  bodyscan: {
    label: "Body scan",
    tip: "La pesée complète sur la balance : poids, masse grasse, eau, muscle. Ça sert à montrer les progrès du client dans le temps.",
  },
  noaly: {
    label: "Noaly — ton assistant",
    tip: "Ton assistant intelligent : il rédige tes messages, résume un bilan et répond à tes questions sur l'app. La bulle ✨ en bas à droite.",
  },
  dormant: {
    label: "Clients inactifs",
    tip: "Des clients qui n'ont rien commandé depuis un moment. À relancer gentiment avant qu'ils décrochent pour de bon.",
  },
  conversion: {
    label: "Conversion",
    tip: "Le moment où un prospect devient client : il signe son programme. Le taux de conversion, c'est combien de prospects passent ce cap.",
  },
  suivi: {
    label: "Suivi",
    tip: "Garder le contact avec un client déjà inscrit : un message, une relance ou un rendez-vous pour qu'il continue et progresse.",
  },
  lead: {
    label: "Lead",
    tip: "Un contact entrant : quelqu'un qui a laissé ses coordonnées (bilan en ligne, recommandation, Club VIP…) et que tu peux recontacter.",
  },
} as const;

export type JargonKey = keyof typeof JARGON;

/** Helper sûr : renvoie l'entrée ou undefined (pas de throw si clé inconnue). */
export function getJargon(key: string): JargonEntry | undefined {
  return (JARGON as Record<string, JargonEntry>)[key];
}
