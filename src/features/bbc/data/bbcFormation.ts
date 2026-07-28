// =============================================================================
// bbcFormation — le contenu de la Formation BBC : l'échelle des 5 marches,
// les 9 modules (00→08) et le vocabulaire du club.
//
// Source : hub Notion « LIVE — Breakfast Budget Clubs » (Playbook officiel +
// Formations 00→08).
//
// ⚠️ TROIS RÈGLES D'ÉCRITURE, apprises d'une recette client (2026-07-28) :
//
//  1. LE CONTENU NE PRÉSUME JAMAIS DE LA MARCHE DU LECTEUR. Tout se rédige à la
//     3e personne (« le stagiaire… »), jamais « tu es ici / c'est ta marche
//     actuelle ». Avant, la marche 2 portait « tu es ici » DANS SA DONNÉE : le
//     propriétaire d'un club lisait donc qu'il était débutant, et aucune
//     détection de rôle n'aurait pu rattraper ça sans réécrire les phrases.
//     Le « tu es ici » est posé par la VUE, sur la marche réellement détectée.
//
//  2. AUCUNE VALEUR RÉGLABLE EN DUR. Jours et heures des rituels, barème des
//     cœurs : tout ça vit dans `clubs.settings` et s'édite dans Réglages. Écrit
//     en dur ici, le coach annonce mardi à ses membres pendant que les rappels
//     automatiques partent le mercredi — et il promet une remise que son club
//     n'applique pas. D'où `configPoints`, calculé à la lecture.
//
//  3. ON N'INVENTE PAS CE QU'ON N'A PAS. Un déroulé qui n'est pas encore
//     remonté du Notion se dit franchement dans `todo`, il ne se promet pas
//     dans un sous-titre. Un module qui annonce « les 11 étapes » sans les
//     lister est pire qu'un module qui dit « à figer ».
// =============================================================================

import type { ClubSettings } from "../../../types/domain";
import { BILAN10_STEPS } from "../BbcBilan10";
import { PRELAUNCH_TASKS, PRELAUNCH_WEEKS } from "./bbcPrelaunch";
import type { BbcRole } from "../useBbcRole";

// ── L'échelle des rôles ────────────────────────────────────────────────────

export interface BbcRoleRung {
  role: BbcRole;
  label: string;
  /** Le critère de la marche, à la 3e personne. Pas de « tu es ici ». */
  criteria: string;
  /** Ce qu'est cette marche, pour tout le monde. */
  description: string;
  /** Précision affichée UNIQUEMENT à un lecteur déjà plus haut sur l'échelle. */
  vuDenHaut?: string;
  /** Ce que fait quelqu'un de cette marche, tous les jours. Sert au module 08. */
  checklist: string[];
}

export const BBC_ROLES: BbcRoleRung[] = [
  {
    role: "membre",
    label: "Membre",
    criteria: "évaluation bien-être faite + un programme",
    description:
      "Le membre est client du club : il vient le matin, boit son shake, se pèse, il progresse. Son ticket d'entrée : l'évaluation bien-être (EBE) faite et un programme démarré. Pas de pression — juste ses résultats.",
    checklist: ["venir le matin", "se peser", "tenir son journal", "parler du club autour de lui"],
  },
  {
    role: "stagiaire",
    label: "Coach stagiaire",
    criteria: "3 cœurs dans le club",
    description:
      "Le stagiaire passe de l'autre côté du comptoir : il a amené 3 personnes qui ont démarré au club, donc il a prouvé qu'il sait faire venir du monde. Il coache au bar, envoie ses cobayes tous les jours et fait ses premières évaluations.",
    checklist: [
      "20 cobayes par jour",
      "tenir le bar",
      "faire ses évaluations d'entraînement",
      "amener ses 3 cœurs",
    ],
  },
  {
    role: "junior",
    label: "Junior partner",
    criteria: "entretien 1h30 · engagement 3 à 9 mois",
    description:
      "Le propriétaire du club choisit son junior partner : un entretien d'1h30 (le « pourquoi », les objectifs chiffrés à 90 jours), puis un engagement de 3 à 9 mois. Sa cible : 10 personnes en première ligne. C'est l'apprentissage pour faire tourner un club. Sans ouverture au bout de 9 mois, il redevient stagiaire.",
    vuDenHaut: "Côté propriétaire : c'est toi qui mènes cet entretien et qui poses la marche.",
    checklist: [
      "ses 10 en première ligne",
      "animer l'Atelier Cœurs",
      "suivre ses stagiaires",
      "préparer son pré-lancement",
    ],
  },
  {
    role: "proprietaire",
    label: "Propriétaire",
    criteria: "ouvre son club après 6 semaines de pré-lancement",
    description:
      "Le propriétaire ouvre son propre club. Obligatoire avant : les 6 semaines de pré-lancement, non négociables — 200 messages cobayes, 20 évaluations d'entraînement, viser 30 membres le jour de l'ouverture. C'est ce qui sépare un club qui vit d'un club qui ferme.",
    checklist: [
      "les rituels tiennent",
      "le bilan des 10 se fait",
      "la marge du bar est à jour",
      "le pré-lancement du suivant est lancé",
    ],
  },
  {
    role: "rollout",
    label: "Roll out",
    criteria: "son équipe duplique le modèle",
    description:
      "Le sommet : son équipe ouvre des clubs à son tour. Il ne fait plus le chiffre lui-même, il touche des royalties sur l'organisation. L'objectif du modèle : le Club 100 dupliqué encore et encore — 3 clubs ≈ 50 000 PV.",
    checklist: [
      "ses propriétaires ouvrent sans lui",
      "il protège la lignée",
      "il fait tourner le modèle, plus le club",
    ],
  },
];

export function getRoleRung(role: BbcRole | null): BbcRoleRung | undefined {
  return role ? BBC_ROLES.find((r) => r.role === role) : undefined;
}

// ── Les modules ────────────────────────────────────────────────────────────

export interface BbcFormationModule {
  n: string;
  title: string;
  /** La punchline de la fiche. */
  subtitle: string;
  /**
   * Le résumé de contenu affiché dans la LISTE. Il vit ici et pas dans la vue :
   * les deux textes existaient en double et avaient déjà divergé (la liste
   * promettait « les 11 étapes, 80/20 », la fiche ne contenait ni l'un ni
   * l'autre). Le lecteur cliquait sur une promesse et tombait sur autre chose.
   */
  listLabel: string;
  /** Marche minimale qui débloque le module — le verrou se lit à côté du
   *  contenu qu'il protège, plus dans un tableau parallèle de la vue. */
  minRole: BbcRole;
  summary: string;
  points: string[];
  /** Points dépendant de la config du club (cf. règle 2 de l'entête). */
  configPoints?: (s: ClubSettings) => string[];
  /** Ce qui manque encore, dit franchement (cf. règle 3 de l'entête). */
  todo?: string;
}

/** Jours + heure d'un rituel, tels que RÉGLÉS par le club. */
function cadence(s: ClubSettings, key: string, label: string): string {
  const cfg = s.calls?.[key];
  const jours = cfg?.days?.length ? cfg.days.join(" & ") : null;
  const heure = cfg?.time ? cfg.time.replace(":", "h") : null;
  if (!jours || !heure) {
    return "Cadence : les jours et l'heure se règlent dans Réglages → rituels. Ne les annonce pas de tête — ton club a peut-être choisi autre chose, et les rappels automatiques partiront sur SA valeur, pas sur la tienne.";
  }
  return `Cadence dans TON club : ${label} le ${jours} à ${heure}. Ça se change dans Réglages → rituels, et les rappels automatiques suivent.`;
}

const BILAN10 = BILAN10_STEPS.map((s, i) => `${i + 1}. ${s.label} — ${s.hint}`);

/** Une ligne par semaine, écrite depuis le parcours qu'on fait RÉELLEMENT
 *  cocher dans Pré-lancement : c'est la même chose, pas une 2e version. */
// (Pas de .toLowerCase() sur les libellés : ça écrasait « jour J » en « jour j ».)
const PRELANCEMENT = PRELAUNCH_WEEKS.map((w) => {
  const taches = PRELAUNCH_TASKS.filter((t) => t.week === w.week)
    .map((t) => `${t.title}${t.gate ? " (non négociable)" : ""}`)
    .join(" · ");
  return `${w.title.replace("Semaine ", "Sem ")} : ${taches}.`;
});

const PORTES = PRELAUNCH_TASKS.filter((t) => t.gate);

export const BBC_FORMATION_MODULES: BbcFormationModule[] = [
  {
    n: "00",
    title: "La machine à royalties",
    subtitle: "le modèle, en une image",
    listLabel: "le modèle, les 5 revenus, le Club 100",
    minRole: "membre",
    summary:
      "Le BBC, c'est un club de petit-déjeuner ouvert le matin qui devient une machine à royalties — pas un bar de vente. Ce qui fait la différence : l'Appel Ambassadeur et l'Atelier Cœurs.",
    points: [
      "5 sources de revenus : vente au détail · vente en gros · royalties · bonus mensuel · bonus annuel (Mark Hughes).",
      "Sourcé (Notion 00) : le Club 100 = 100 membres actifs · 3 superviseurs actifs (junior partners) · 9 coachs stagiaires · ~13 superviseurs ≈ 20 000 PV d'organisation. Et 40 % des membres viennent chaque jour.",
      "L'échelle : 1 club ≈ 13 sup ≈ 20 000 PV → la cible 50 000 PV, c'est 2 à 3 clubs, pas 30 distributeurs éparpillés.",
      "Plan de carrière, 5 marches : Membre → Coach stagiaire → Junior Partner → Propriétaire → Roll Out (~2 ans).",
      "Ordres de grandeur relevés sur les clubs existants, PAS des chiffres sourcés — à confirmer club par club : démarrage 2 500–3 000 € · 40–90 m² · 500–1 000 €/mois de charges. Ton vrai chiffre se calcule dans Rentabilité, qui te DEMANDE ton loyer et ton coût de portion au lieu de les deviner.",
    ],
  },
  {
    n: "01",
    title: "L'invitation",
    subtitle: "pas d'invitation = pas de business",
    listLabel: "marché chaud / froid, les ratios, le message cobaye",
    minRole: "membre",
    summary:
      "Ton identité : « je suis coach bien-être ». Ce à quoi tu invites : « une évaluation bien-être gratuite ». Reste simple, ne surcharge personne.",
    points: [
      "Ratios : temps complet = 1 h/jour = 20 contacts · temps choisi = 30 min = 10 contacts.",
      "La math : 3 nouveaux membres par semaine, c'est le rythme d'un coach à temps plein ; 5 par semaine, c'est le rythme qui fait décoller une organisation. (Côté Herbalife ça s'appelle World Team actif et GET : c'est l'échelle des RANGS Herbalife, à ne pas confondre avec les 5 marches du club.)",
      "Marché chaud : le message cobaye (la meilleure porte), les recommandations, la soirée dégustation, les réseaux.",
      "Marché froid : stands, boîtes à contact, badge, « 2 questions » en magasin.",
      "Mindset 90 jours : ce que tu fais maintenant apparaît dans 90 jours. Juillet/août/sept → résultats oct/nov/déc.",
    ],
  },
  {
    n: "02",
    title: "L'évaluation bien-être (EBE)",
    subtitle: "la porte d'entrée · 100 % des membres passent par là",
    listLabel: "la connexion, la règle des 80/20, l'échelle de 1 à 10",
    minRole: "membre",
    summary:
      "45 min (+ 15 de marge). La connexion est la partie la plus importante. Intention : s'ils viennent, ils s'inscrivent.",
    points: [
      "3 parties : le formulaire + la connexion · les chiffres de la balance à impédance (Tanita) · le déroulé du rendez-vous.",
      "La règle des 80/20 : il parle 80 % du temps, toi 20 %. Si tu parles plus que lui, tu as raté la connexion — et c'est elle qui décide de tout le reste.",
      "Les chiffres : rester simple. Trois suffisent (poids, masse grasse, masse musculaire) ; en sortir douze noie la personne au lieu de la convaincre.",
      "La question qui qualifie : « sur une échelle de 1 à 10, prêt(e) à changer ? » → 8 ou plus = on démarre tout de suite.",
      "Inclus dans l'adhésion : pesée quotidienne · petit-déj (aloé, thé, shake) · mini-coaching sur le journal.",
      "Demander les recos, dans la foulée : « tu peux nommer jusqu'à 5 personnes pour une évaluation offerte. Qui aimerais-tu nommer ? »",
      "Période de lancement : 4 à 5 visites par semaine les 2 premières semaines. « On n'est pas un club hebdomadaire. »",
    ],
    todo:
      "Le déroulé détaillé (« les 11 étapes » du Notion 02) n'est pas encore repris ici — à figer avec Thomas. En attendant, le déroulé opérationnel est celui du rendez-vous lui-même, dans l'ordre ci-dessus.",
  },
  {
    n: "03",
    title: "Le suivi et les résultats",
    subtitle: "ce qui fait rester les membres",
    listLabel: "pesée, journal, ardoise et tableau des scores",
    minRole: "membre",
    summary:
      "Chaque visite = pesée + petit-déj + mini-coaching sur le journal. C'est la régularité qui crée les résultats… et les histoires.",
    points: [
      "Le journal, c'est le cœur du suivi quotidien : le membre note ses repères de la journée, et toi tu en commentes UN seul au comptoir. 30 secondes, pas un cours.",
      "Les 2 premières semaines, 4 à 5 visites : c'est là que l'habitude se prend, ou ne se prend pas.",
      "Quand un membre décroche : il saute 3 matins → tu écris le 3ᵉ jour, pas le 10ᵉ.",
      "Objectifs + victoires hors balance : énergie, sommeil, vêtements — pas que le poids.",
      "Ardoise + tableau des scores : rendre la progression visible dans le club, pas seulement dans son téléphone.",
      "Partage réseaux (avant/après, ressenti, avec son accord) → ça ramène de nouvelles évaluations.",
    ],
    todo:
      "Les 4 valeurs exactes du journal restent à figer avec Thomas : le module annonçait « le journal nutritionnel (4 valeurs) » sans jamais les nommer, ce qui n'apprenait rien.",
  },
  {
    n: "04",
    title: "Le bilan des 10 visites",
    subtitle: "le rendez-vous charnière",
    listLabel: "les 9 étapes du rendez-vous de la 10ᵉ visite",
    minRole: "stagiaire",
    summary:
      "À la 10ᵉ visite, LE rendez-vous qui transforme un membre en partenaire. 9 étapes, dans l'ordre.",
    points: [
      "La check-list, dans l'ordre — c'est la MÊME que celle de l'écran « bilan des 10 », pas une variante :",
      ...BILAN10,
      "À la fin, tu l'inscris à l'Appel Ambassadeur depuis « Les appels ». Les 3 rappels partent tout seuls (midi le jour J · 30 min avant · 15 min avant, avec le lien Zoom du club) : tu n'as rien à programmer.",
      "Toi, tu reçois un rappel 30 min APRÈS l'appel : c'est la patate chaude, tu as 10 minutes pour écrire.",
      "Script d'invitation : « dans le cadre de tes prochaines étapes, je t'inscris à notre Appel Ambassadeur. Pas besoin de micro, tu écoutes. »",
      "Pas de panique s'il ne vient pas la 1ʳᵉ fois : on le remet dans la boucle au prochain entretien.",
    ],
  },
  {
    n: "05",
    title: "L'appel ambassadeur",
    subtitle: "ce qui décide si ton club est un bar ou une fabrique de royalties",
    listLabel: "les 4 options A/B/C/D et la patate chaude",
    minRole: "stagiaire",
    summary:
      "On présente 4 options, on laisse écouter, et on trie dans les 10 minutes qui suivent.",
    points: [
      "Les 4 options : A juste client · B remise + 2-3 recos → Quick Start · C petit revenu → Quick Start + 1:1 · D vrai projet → parcours coach stagiaire.",
      "La règle de la patate chaude : 10 min après l'appel, tu écris à la personne (+ le visuel A/B/C/D) tant qu'elle est dans l'énergie.",
      "Règle ambassadeur : il commande pour lui et sa famille — PERSONNE D'AUTRE.",
    ],
    configPoints: (s) => [cadence(s, "appel_ambassadeur", "l'Appel Ambassadeur")],
  },
  {
    n: "06",
    title: "L'atelier cœurs",
    subtitle: "aider un membre à trouver ses 2 cœurs",
    listLabel: "recommandations : relation + résultat = cœur",
    minRole: "stagiaire",
    summary:
      "Le moteur des recommandations. Avec l'Appel Ambassadeur, c'est ce qui fabrique les coachs.",
    points: [
      "La formule : relation + résultat = recommandation. S'il manque l'un des deux, il n'y a pas de cœur.",
      "On demande à chaque étape, jamais « ça t'intéresse ? » mais « qui connais-tu ? ».",
      "Attention au vocabulaire : le barème récompense LE MEMBRE, pas toi. Ton rôle à toi, c'est de valider le cœur quand la personne a démarré (onglet Cœurs).",
    ],
    configPoints: (s) => {
      const b = s.hearts_bareme ?? {};
      const paliers = Object.keys(b)
        .sort((a, z) => Number(a) - Number(z))
        .map((k) => `${k} cœurs = ${b[k]}`)
        .join(" · ");
      return [
        paliers
          ? `Le barème RÉGLÉ dans ton club : ${paliers}. (3 cœurs, c'est aussi ce qui rend un membre éligible coach stagiaire.) Ça se change dans Réglages → cœurs — ne promets pas un chiffre de mémoire.`
          : "Le barème des paliers se règle dans Réglages → cœurs. Tant qu'il n'est pas renseigné, ne promets aucun chiffre à un membre.",
        cadence(s, "atelier_coeurs", "l'Atelier Cœurs"),
      ];
    },
  },
  {
    n: "07",
    title: "Les 6 semaines de pré-lancement",
    subtitle: "le plan avant d'ouvrir ton club · non négociable",
    listLabel: "le plan des 6 semaines avant d'ouvrir",
    minRole: "junior",
    summary:
      "Objectif final : ouvrir avec 30 nouveaux membres et un agenda rempli d'évaluations.",
    points: [
      ...PRELANCEMENT,
      `Les ${PORTES.length} non négociables, celles qui décident si le club est prêt : ${PORTES.map((t) => t.title).join(" · ")}.`,
      "Le détail se coche semaine par semaine dans Pré-lancement. C'est le même parcours, pas une 2ᵉ version : si un chiffre diffère entre les deux écrans, c'est un bug, signale-le.",
    ],
  },
  {
    n: "08",
    title: "Check-lists par rôles",
    subtitle: "qui fait quoi quand l'équipe grandit",
    listLabel: "ce que fait chaque marche, tous les jours",
    minRole: "junior",
    summary:
      "Le quotidien de chaque marche, du membre au roll out. Et la règle qui protège tout le modèle.",
    points: [
      ...BBC_ROLES.map((r) => `${r.label} : ${r.checklist.join(" · ")}.`),
      "La réunion d'opportunité maison (le HOM) disparaît du modèle BBC → remplacée par l'Appel Ambassadeur + l'Atelier Cœurs.",
      "La règle qui gouverne tout : on ne modifie rien — mêmes prix, mêmes horaires, mêmes scripts, mêmes formulaires. Chaque « amélioration » perso casse la duplication.",
      "Top tip : protéger la lignée (qui a amené la personne au club) et communiquer entre coachs proches.",
    ],
    todo:
      "Les 5 check-lists ci-dessus sont une synthèse de ce que le Playbook dit ailleurs (cobayes, 10 en première ligne, rituels, pré-lancement) — à relire avec Thomas avant d'en faire une référence.",
  },
];

export function getFormationModule(n: string): BbcFormationModule | undefined {
  return BBC_FORMATION_MODULES.find((m) => m.n === n);
}

/**
 * Tous les points d'un module, config du club comprise.
 *
 * On appelle `configPoints` MÊME sans réglages (`{}`) : sans ça, un coach qui
 * n'a pas encore de club ne verrait plus du tout la ligne « cadence » ni la
 * ligne « barème » — le module perdrait son information au lieu de renvoyer
 * vers Réglages. Chaque `configPoints` sait dire « c'est réglé par ton club »
 * quand il n'a rien à lire.
 */
export function getModulePoints(m: BbcFormationModule, settings: ClubSettings | null): string[] {
  return m.configPoints ? [...m.points, ...m.configPoints(settings ?? {})] : m.points;
}

// ── Le vocabulaire du club ─────────────────────────────────────────────────
//
// Écrit pour un COACH : cet écran ne se lit que depuis l'environnement coach.
// Les paliers de cœurs récompensent LE MEMBRE — servir « ta remise de 25 % » à
// un coach, c'est lui parler avec les mots d'un membre.

export interface GlossaryEntry {
  t: string;
  d: string;
}

export function buildGlossary(settings: ClubSettings | null): GlossaryEntry[] {
  const bareme = settings?.hearts_bareme;
  const baremeTxt = bareme
    ? Object.keys(bareme)
        .sort((a, z) => Number(a) - Number(z))
        .map((k) => `${k} = ${bareme[k]}`)
        .join(" · ")
    : "réglé dans Réglages → cœurs";
  const jours = (key: string) => {
    const cfg = settings?.calls?.[key];
    return cfg?.days?.length && cfg.time
      ? `${cfg.days.join(" & ")} à ${cfg.time.replace(":", "h")}`
      : "jour et heure réglés par ton club";
  };

  return [
    {
      t: "cobaye",
      d: "une personne à qui tu envoies le message pour une évaluation offerte. 20 messages par jour, c'est le seul chiffre qui compte le premier mois d'un coach qui démarre.",
    },
    {
      t: "cœur",
      d: `1 personne qu'un MEMBRE fait venir et qui démarre au club. Le barème récompense le membre (${baremeTxt}). Ton rôle à toi : valider le cœur quand la personne a démarré, dans l'onglet Cœurs.`,
    },
    {
      t: "évaluation bien-être (EBE)",
      d: "la porte d'entrée : 100 % des membres passent par là. 45 min, 80 % d'écoute, on qualifie sur l'échelle de 1 à 10.",
    },
    {
      t: "bilan",
      d: "attention, piège : au club, « bilan » désigne le bilan des 10 visites — le rendez-vous charnière de la 10ᵉ visite, 9 étapes, où un membre devient partenaire. La porte d'entrée, elle, s'appelle l'évaluation (EBE), jamais « bilan ».",
    },
    {
      t: "membre",
      d: "quelqu'un du club. On ne dit pas « client » ici : « client » appartient au vocabulaire de l'app classique.",
    },
    {
      t: "appel ambassadeur",
      d: `le rituel qui trie : on y montre les remises, le remboursement par les recommandations, le complément de revenu. Tri A · B · C · D. ${jours("appel_ambassadeur")}.`,
    },
    {
      t: "atelier des cœurs",
      d: `on y aide un membre à trouver ses 2 cœurs. Avec l'appel, c'est ce qui fabrique les coachs. ${jours("atelier_coeurs")}.`,
    },
    {
      t: "coach stagiaire",
      d: "un coach en formation : il a 3 cœurs dans le club, il coache au bar et fait ses premières évaluations. C'est la 2ᵉ marche de l'échelle, à gauche.",
    },
    {
      t: "liste de 200 (COI)",
      d: "ta liste de 200 noms : tous ceux que tu connais, écrits sans trier. C'est la matière première du pré-lancement — sans elle, pas d'invitations.",
    },
    {
      t: "HOM",
      d: "la réunion d'opportunité maison du modèle classique. Elle DISPARAÎT en BBC : remplacée par l'Appel Ambassadeur et l'Atelier Cœurs.",
    },
    {
      t: "Tanita",
      d: "la balance à impédance qui donne les chiffres du corps pendant l'évaluation. Trois chiffres suffisent : poids, masse grasse, masse musculaire.",
    },
    {
      t: "World Team · GET",
      d: "des rangs HERBALIFE, pas des marches du club. Ils mesurent le volume de ton organisation ; l'échelle à gauche mesure ton rôle dans le modèle BBC. Deux échelles différentes, ne les mélange pas.",
    },
    {
      t: "PV · Club 100",
      d: "PV = les points de volume. Un club à maturité ≈ 20 000 PV. Le Club 100 = 100 membres actifs, le modèle à dupliquer.",
    },
  ];
}
