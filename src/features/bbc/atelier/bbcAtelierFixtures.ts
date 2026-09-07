// =============================================================================
// Fixtures de l'atelier visuel BBC — DÉVELOPPEMENT UNIQUEMENT.
//
// POURQUOI CE FICHIER EXISTE
// Les écrans BBC vivent derrière l'authentification Supabase : personne (ni un
// humain sans compte, ni un agent, ni une vérification automatisée) ne peut les
// REGARDER. Résultat vécu : un bascule Classic/BBC invisible sous 1280 px et
// une grille de Formation sans repli mobile sont partis en prod, avec un build
// vert dans les deux cas. Un build vert ne dit rien de ce qu'on voit.
//
// Ces données ne sont JAMAIS écrites : elles ne servent qu'à alimenter les
// props des composants BBC dans l'atelier. Aucun contournement d'auth, aucun
// accès base — les hooks BBC continuent d'interroger Supabase et de tomber en
// silence, exactement comme dans l'app réelle.
//
// ⚠️ Ne rien importer d'ici en dehors de `src/features/bbc/atelier/` : le
// dossier entier est censé disparaître du bundle de production (cf. la garde
// `import.meta.env.DEV` sur la route dans App.tsx).
// =============================================================================

import type { ComponentProps } from "react";
import type { VisitMember } from "../useBbcVisits";
import type { BbcMember } from "../useBbcMembers";
import type { Club } from "../../../types/domain";
import type { BbcClientApp } from "../BbcClientApp";

/** Les props de l'app membre ne sont pas exportées : on les reprend depuis le
 *  composant lui-même, pour qu'une fixture fausse casse le build plutôt que de
 *  faire mentir l'atelier. */
type MemberProps = ComponentProps<typeof BbcClientApp>;

/** Identifiant bidon. Les hooks l'utiliseront pour interroger Supabase, qui ne
 *  renverra rien (RLS) — c'est voulu : on veut voir les VRAIS états vides. */
export const ATELIER_USER_ID = "00000000-0000-4000-8000-000000000001";
export const ATELIER_COACH_NAME = "Thomas Kossmann";

/** Le club principal de l'atelier. Tous les réglages sont remplis pour que les
 *  écrans qui lisent `club.settings` (Réglages, Scripts, Liens, Lexique, les
 *  rituels du Cockpit, La semaine) aient de la matière à afficher. */
export const ATELIER_CLUB: Club = {
  id: "atelier-club-verdun",
  ownerUserId: ATELIER_USER_ID,
  name: "Le Comptoir Verdun",
  city: "Verdun",
  slug: "comptoir-verdun",
  active: true,
  createdAt: "2026-03-02T07:00:00.000Z",
  settings: {
    // Volontairement PAS « 7h-11h » (la valeur de repli) : si un écran affiche
    // quand même 7h-11h, c'est qu'il ne lit pas les réglages du club.
    open_hours: "6h45-11h",
    calls: {
      appel_ambassadeur: { days: ["lundi", "jeudi"], time: "20:00" },
      atelier_coeurs: { days: ["mardi", "samedi"], time: "20:30" },
      coach_academy: { days: ["mercredi"], time: "19:00" },
    },
    hearts_bareme: {
      "2": "25 % de remise à vie",
      "3": "10 visites offertes",
      "5": "30 visites offertes",
    },
    cards: {
      "10": { price: 80, days: 30 },
      "30": { price: 185, days: 90 },
    },
    links: {
      zoom_appel: "https://zoom.us/j/000000001",
      zoom_atelier: "https://zoom.us/j/000000002",
      google_review: "https://g.page/r/atelier-bbc/review",
    },
    // Les doses de la recette (`RECETTE_CLUB`) : c'est ce qui donne un coût de
    // revient non nul dans l'onglet Rentabilité.
    carte: {
      "4466": { doses: 21, prix: null, valide: true },
      "2600": { doses: 42, prix: null, valide: true },
      "178K": { doses: 30, prix: null, valide: true },
      "0006": { doses: 47, prix: null, valide: true },
    },
    palier_remise: 50,
  },
};

/** Deuxième et troisième clubs — l'écran « Mes clubs » lit `clubs` en PROP,
 *  donc lui affichera de vraies cartes (et pas un état vide). */
export const ATELIER_CLUBS: Club[] = [
  ATELIER_CLUB,
  {
    id: "atelier-club-etain",
    ownerUserId: ATELIER_USER_ID,
    name: "BBC Étain",
    city: "Étain",
    slug: "bbc-etain",
    active: true,
    createdAt: "2026-05-18T07:00:00.000Z",
    settings: { ...ATELIER_CLUB.settings, open_hours: "7h-10h30" },
  },
  {
    id: "atelier-club-thionville",
    ownerUserId: ATELIER_USER_ID,
    name: "BBC Thionville — ouverture",
    city: "Thionville",
    slug: "bbc-thionville",
    active: false,
    createdAt: "2026-07-11T07:00:00.000Z",
    settings: { ...ATELIER_CLUB.settings, open_hours: "7h-11h" },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// L'app MEMBRE (BbcClientApp) prend TOUTES ses données en props : c'est le seul
// écran BBC qu'on peut remplir entièrement de bout en bout. On décrit donc
// plusieurs personas, un par stade de carte — c'est là que se cachent les
// défauts d'affichage (dénominateur, carte expirée, membre du premier jour).
// ─────────────────────────────────────────────────────────────────────────────

export interface AtelierMemberPersona {
  key: string;
  /** Ce que le persona sert à vérifier, affiché dans la barre de l'atelier. */
  label: string;
  props: MemberProps;
}

const CLUB_SETTINGS_MEMBRE = {
  hearts_bareme: ATELIER_CLUB.settings?.hearts_bareme,
  open_hours: ATELIER_CLUB.settings?.open_hours,
  club_name: ATELIER_CLUB.name,
};

/** Dates relatives à aujourd'hui : un atelier figé sur des dates de 2026 finit
 *  par afficher « il y a 8 mois » et masque les vrais soucis de formatage. */
function dansNJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(9, 30, 0, 0);
  return d.toISOString();
}
function ilYAnJours(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

export const ATELIER_MEMBERS: AtelierMemberPersona[] = [
  {
    key: "neuve",
    label: "Carte neuve (1/10) — 2e visite",
    props: {
      clientName: "Sarah Benali",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-sarah",
      visitsCount: 1,
      weightDeltaKg: null,
      currentWeight: 74.2,
      nextRdvDate: dansNJours(3),
      nextRdvType: "Bilan de départ",
      heartsCount: 0,
      coachAdvice: "Ton objectif du mois : venir 3 matins par semaine, sans exception. Le reste suit tout seul.",
      card: { type: 10, used: 1, remaining: 9, expires_at: dansNJours(29), expired: false },
      entrySeen: true,
      metrics: [{ date: ilYAnJours(2), weight: 74.2, bodyFat: 33.1, muscleMass: 45.9, hydration: 48.2 }],
      measurements: [{ measured_at: ilYAnJours(2), waist_cm: 92, hips_cm: 105, thigh_cm: 61, arm_cm: 31 }],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
  {
    key: "presque",
    label: "Carte presque pleine (8/10)",
    props: {
      clientName: "Karim Diallo",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-karim",
      visitsCount: 8,
      weightDeltaKg: -3.4,
      currentWeight: 88.6,
      nextRdvDate: dansNJours(1),
      nextRdvType: "Suivi hebdo",
      heartsCount: 2,
      coachAdvice: "Bravo pour les 8 matins. Il t'en reste 2 : on cale ton bilan de fin de carte dès maintenant.",
      card: { type: 10, used: 8, remaining: 2, expires_at: dansNJours(9), expired: false },
      entrySeen: true,
      metrics: [
        { date: ilYAnJours(30), weight: 92.0, bodyFat: 28.4, muscleMass: 62.1, hydration: 51.0 },
        { date: ilYAnJours(16), weight: 90.3, bodyFat: 27.2, muscleMass: 62.4, hydration: 52.1 },
        { date: ilYAnJours(2), weight: 88.6, bodyFat: 26.1, muscleMass: 62.8, hydration: 53.0 },
      ],
      // Ses 8 passages, dans la plage de ses pesées (19/08). Deux tombent
      // volontairement dans le MÊME segment et deux autres près d'un relevé :
      // c'est ce qui vérifie l'interpolation, un espacement régulier ne
      // prouverait rien.
      visitDates: [
        ilYAnJours(27), ilYAnJours(24), ilYAnJours(20), ilYAnJours(17),
        ilYAnJours(13), ilYAnJours(10), ilYAnJours(6), ilYAnJours(3),
      ],
      measurements: [
        { measured_at: ilYAnJours(30), waist_cm: 104, hips_cm: 110, thigh_cm: 64, arm_cm: 36 },
        { measured_at: ilYAnJours(2), waist_cm: 99, hips_cm: 107, thigh_cm: 62, arm_cm: 36 },
      ],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
  {
    key: "pleine",
    label: "Carte PLEINE (10/10) — bilan à faire",
    props: {
      clientName: "Mélanie Roux",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-melanie",
      visitsCount: 23,
      weightDeltaKg: -6.8,
      currentWeight: 63.4,
      nextRdvDate: null,
      nextRdvType: null,
      heartsCount: 4,
      coachAdvice: "Carte finie. On fait le point sur ta transformation avant de repartir sur une carte 30.",
      card: { type: 10, used: 10, remaining: 0, expires_at: dansNJours(4), expired: false },
      entrySeen: true,
      metrics: [
        { date: ilYAnJours(84), weight: 70.2, bodyFat: 34.0, muscleMass: 43.2, hydration: 47.5 },
        { date: ilYAnJours(56), weight: 67.8, bodyFat: 32.1, muscleMass: 43.8, hydration: 49.0 },
        { date: ilYAnJours(28), weight: 65.1, bodyFat: 30.3, muscleMass: 44.1, hydration: 50.4 },
        { date: ilYAnJours(3), weight: 63.4, bodyFat: 28.9, muscleMass: 44.4, hydration: 51.6 },
      ],
      measurements: [
        { measured_at: ilYAnJours(84), waist_cm: 88, hips_cm: 102, thigh_cm: 59, arm_cm: 29 },
        { measured_at: ilYAnJours(3), waist_cm: 79, hips_cm: 96, thigh_cm: 55, arm_cm: 28 },
      ],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
  {
    key: "expiree",
    label: "Carte EXPIRÉE (6/10, périmée)",
    props: {
      clientName: "Gabriel Lemoine",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-gabriel",
      visitsCount: 6,
      weightDeltaKg: -1.1,
      currentWeight: 81.0,
      nextRdvDate: null,
      nextRdvType: null,
      heartsCount: 1,
      coachAdvice: "Ta carte a expiré avec 4 matins non utilisés. On en reprend une ensemble ?",
      card: { type: 10, used: 6, remaining: 4, expires_at: ilYAnJours(5), expired: true },
      entrySeen: true,
      metrics: [
        { date: ilYAnJours(70), weight: 82.1, bodyFat: 25.5, muscleMass: 58.0, hydration: 52.0 },
        { date: ilYAnJours(40), weight: 81.0, bodyFat: 25.1, muscleMass: 58.2, hydration: 52.4 },
      ],
      measurements: [{ measured_at: ilYAnJours(40), waist_cm: 96, hips_cm: 104, thigh_cm: 60, arm_cm: 34 }],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
  {
    key: "sans-carte",
    label: "Premier jour — aucune carte",
    props: {
      clientName: "Inès Fauvel",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-ines",
      visitsCount: 0,
      weightDeltaKg: null,
      currentWeight: null,
      nextRdvDate: dansNJours(2),
      nextRdvType: "Premier passage",
      heartsCount: 0,
      coachAdvice: null,
      card: null,
      entrySeen: true,
      metrics: [],
      measurements: [],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
  {
    key: "entree",
    label: "Écran d'entrée (première ouverture)",
    props: {
      clientName: "Sarah Benali",
      coachName: ATELIER_COACH_NAME,
      token: "atelier-token-sarah",
      visitsCount: 0,
      card: null,
      // `entrySeen: false` = le seul chemin qui déclenche `BbcMemberEntry`.
      entrySeen: false,
      metrics: [],
      measurements: [],
      clubSettings: CLUB_SETTINGS_MEMBRE,
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Le bilan des 10 visites — chantier saisie EBE (2026-08-14).
//
// `BbcBilan10Scan` prend TOUT en props : c'est donc, comme l'app membre, un
// écran entièrement remplissable dans l'atelier. Les valeurs ci-dessous sont
// EXACTEMENT celles de la maquette validée par Thomas, pour que l'atelier et la
// maquette soient comparables ligne à ligne.
//
// Le cas est choisi : la membre perd du poids et du gras en gardant ses kilos
// de muscle. En kg son muscle est stable (+0,1), en pourcentage il monte
// (+3,7 points). C'est la démonstration de l'inverseur « % | kg » — un écran
// qui l'illustre mal ne prouve rien.
// ─────────────────────────────────────────────────────────────────────────────

/** Le body scan du premier bilan : le point de départ du membre. */
export const ATELIER_SCAN_DEPART: Record<string, number | null> = {
  weight: 74.5,
  bodyFat: 34.2,
  muscleMass: 44.1,
  hydration: 47.8,
  visceralFat: 8,
  metabolicAge: 46,
  bmr: 1420,
  boneMass: 2.4,
};

/** La date de ce point de départ, telle qu'elle est dite au coach. */
export const ATELIER_SCAN_DEPART_DATE = "2026-07-08";

/** La 2e pesée déjà saisie — sert à regarder l'écran DANS son état rempli. */
export const ATELIER_SCAN_AUJOURDHUI: Record<string, number | null> = {
  weight: 70.3,
  bodyFat: 31.1,
  muscleMass: 44.2,
  hydration: 50.1,
  visceralFat: 7,
  metabolicAge: 43,
  bmr: 1395,
  boneMass: 2.5,
};

// -----------------------------------------------------------------------------
// « Les visites » — le pointage du matin (07/09)
// -----------------------------------------------------------------------------
//
// Cet écran allait chercher ses membres lui-même : hors session il rendait une
// page vide, donc l'audit visuel du 07/09 n'a rien pu en mesurer. C'est
// pourtant l'écran qu'on ouvre TOUS LES MATINS au comptoir — exactement celui
// où les régressions passent inaperçues.
//
// La liste ci-dessous couvre les cas qui changent la mise en page, pas une
// jolie moyenne :
//   · un prénom long avec un nom composé (c'est lui qui coupe les tuiles) ;
//   · une carte neuve, une presque finie, une TERMINÉE (bilan à faire) ;
//   · une carte PÉRIMÉE, qui a son propre affichage ;
//   · quelqu'un sans carte du tout ;
//   · quelqu'un déjà pointé aujourd'hui, seul cas où « annuler » apparaît.
export const ATELIER_VISITES: VisitMember[] = [
  {
    id: "atelier-v1",
    name: "Marie-Charlotte Vandenberghe",
    visits: 3,
    visitedToday: true,
    card: { cardId: "c1", type: 10, used: 3, remaining: 7, expiresAt: dansNJours(27), expired: false },
  },
  {
    id: "atelier-v2",
    name: "Sarah Benali",
    visits: 1,
    visitedToday: false,
    card: { cardId: "c2", type: 10, used: 1, remaining: 9, expiresAt: dansNJours(29), expired: false },
  },
  {
    id: "atelier-v3",
    name: "Nadia Cherif",
    visits: 9,
    visitedToday: false,
    card: { cardId: "c3", type: 10, used: 9, remaining: 1, expiresAt: dansNJours(4), expired: false },
  },
  {
    id: "atelier-v4",
    name: "Lucie Petit",
    visits: 10,
    visitedToday: false,
    card: { cardId: "c4", type: 10, used: 10, remaining: 0, expiresAt: dansNJours(11), expired: false },
  },
  {
    id: "atelier-v5",
    name: "Karim Bensaïd",
    visits: 22,
    visitedToday: false,
    card: { cardId: "c5", type: 30, used: 22, remaining: 8, expiresAt: ilYAnJours(3), expired: true },
  },
  {
    id: "atelier-v6",
    name: "Élodie Roux",
    visits: 0,
    visitedToday: false,
    card: null,
  },
];

/**
 * « Mes membres » — le pipeline du club.
 *
 * Cet écran ne prenait AUCUNE prop : tout venait de `useBbcMembers(userId)`,
 * donc l'atelier n'en montrait qu'une page blanche. C'est pourtant la liste
 * la plus consultée du mode BBC.
 *
 * Les huit personnes couvrent ce qui change l'affichage :
 *   • une cobaye pas encore démarrée, et une démarrée du jour ;
 *   • un nom long ET un prénom composé, pour voir où ça coupe ;
 *   • des cœurs acquis et des cœurs EN ATTENTE (le liseré d'alerte) ;
 *   • une carte finie (bilan des 10 à faire) et une carte périmée ;
 *   • quelqu'un sans carte et sans visite — l'état « inscrit, jamais venu » ;
 *   • deux propriétaires différents, sinon le filtre « club / moi » n'a
 *     rien à filtrer et son bug ne se voit pas.
 */
export const ATELIER_MEMBRES: BbcMember[] = [
  {
    id: "atelier-m1",
    name: "Marie-Charlotte Vandenberghe",
    phone: "06 12 34 56 78",
    email: "mc.vandenberghe@example.com",
    objective: "weight-loss",
    program: "Programme Équilibre",
    lifecycleStatus: "active",
    started: true,
    startDate: ilYAnJours(24),
    nextFollowUp: dansNJours(2),
    visits: 12,
    hearts: 3,
    pendingHearts: 1,
    visitedToday: true,
    card: { type: 10, used: 3, remaining: 7, expired: false },
    ownerId: ATELIER_USER_ID,
    ownerName: "Thomas",
  },
  {
    id: "atelier-m2",
    name: "Lucie Petit",
    phone: "06 22 33 44 55",
    objective: "weight-loss",
    program: "Programme Découverte",
    lifecycleStatus: "active",
    started: true,
    startDate: ilYAnJours(40),
    nextFollowUp: ilYAnJours(3),
    visits: 10,
    hearts: 0,
    pendingHearts: 0,
    visitedToday: false,
    card: { type: 10, used: 10, remaining: 0, expired: false },
    ownerId: ATELIER_USER_ID,
    ownerName: "Thomas",
  },
  {
    id: "atelier-m3",
    name: "Karim Bensaïd",
    phone: "06 44 55 66 77",
    objective: "sport",
    program: "Programme Sport",
    lifecycleStatus: "active",
    started: true,
    startDate: ilYAnJours(95),
    nextFollowUp: null,
    visits: 22,
    hearts: 5,
    pendingHearts: 0,
    visitedToday: false,
    card: { type: 30, used: 22, remaining: 8, expired: true },
    ownerId: "00000000-0000-4000-8000-0000000000ff",
    ownerName: "Mélanie",
  },
  {
    id: "atelier-m4",
    name: "Audrey Lemoine",
    phone: "06 77 88 99 00",
    objective: "weight-loss",
    lifecycleStatus: "prospect",
    started: false,
    startDate: null,
    nextFollowUp: dansNJours(1),
    visits: 2,
    hearts: 0,
    pendingHearts: 2,
    visitedToday: true,
    card: { type: 10, used: 2, remaining: 8, expired: false },
    ownerId: ATELIER_USER_ID,
    ownerName: "Thomas",
  },
  {
    id: "atelier-m5",
    name: "Élodie Roux",
    lifecycleStatus: "prospect",
    started: false,
    startDate: null,
    nextFollowUp: null,
    visits: 0,
    hearts: 0,
    pendingHearts: 0,
    visitedToday: false,
    card: null,
    ownerId: "00000000-0000-4000-8000-0000000000ff",
    ownerName: "Mélanie",
  },
  {
    id: "atelier-m6",
    name: "Jean-Baptiste Le Gall",
    phone: "06 10 20 30 40",
    email: "jb.legall@example.com",
    objective: "sport",
    program: "Programme Sport",
    lifecycleStatus: "active",
    started: true,
    startDate: ilYAnJours(6),
    nextFollowUp: dansNJours(7),
    visits: 5,
    hearts: 1,
    pendingHearts: 0,
    visitedToday: true,
    card: { type: 10, used: 5, remaining: 5, expired: false },
    ownerId: ATELIER_USER_ID,
    ownerName: "Thomas",
  },
];

/**
 * « Messages » — la messagerie du club.
 *
 * Même angle mort : l'écran allait chercher ses fils lui-même, donc l'atelier
 * n'affichait que l'état vide. On ne pouvait vérifier ni la lisibilité d'une
 * bulle, ni ce que devient un message long, ni le non-lu.
 *
 * Trois fils : un non-lu récent, un fil où le coach a répondu en dernier, et
 * un message très long pour voir comment la bulle se comporte.
 */
export const ATELIER_MESSAGES: {
  membres: Array<{ id: string; name: string }>;
  messages: Array<{
    id: string;
    clientId: string;
    clientName: string;
    message: string | null;
    productName: string | null;
    sender: string;
    read: boolean;
    createdAt: string;
  }>;
} = {
  membres: [
    { id: "atelier-m1", name: "Marie-Charlotte Vandenberghe" },
    { id: "atelier-m2", name: "Lucie Petit" },
    { id: "atelier-m6", name: "Jean-Baptiste Le Gall" },
  ],
  messages: [
    {
      id: "msg-1",
      clientId: "atelier-m1",
      clientName: "Marie-Charlotte Vandenberghe",
      message: "Bonjour Thomas, je ne pourrai pas venir demain matin, je decale a jeudi si c'est possible ?",
      productName: null,
      sender: "client",
      read: false,
      createdAt: ilYAnJours(0),
    },
    {
      id: "msg-2",
      clientId: "atelier-m2",
      clientName: "Lucie Petit",
      message: "J'ai fait la pesee ce matin, 2,1 kg en moins depuis le depart. Je suis contente !",
      productName: null,
      sender: "client",
      read: true,
      createdAt: ilYAnJours(1),
    },
    {
      id: "msg-3",
      clientId: "atelier-m2",
      clientName: "Lucie Petit",
      message: "Bravo Lucie, c'est regulier et c'est ca qui compte. On refait le point vendredi.",
      productName: null,
      sender: "coach",
      read: true,
      createdAt: ilYAnJours(1),
    },
    {
      id: "msg-4",
      clientId: "atelier-m6",
      clientName: "Jean-Baptiste Le Gall",
      message:
        "Bonjour, j'ai une question sur les collations : je m'entraine a 19h et je rentre vers 21h, du coup je ne sais pas s'il faut que je prenne quelque chose avant la seance ou si j'attends le repas du soir. Et est-ce que je garde le shake du matin comme d'habitude les jours ou je fais du sport le soir ? Merci d'avance.",
      productName: null,
      sender: "client",
      read: false,
      createdAt: ilYAnJours(2),
    },
    {
      id: "msg-5",
      clientId: "atelier-m1",
      clientName: "Marie-Charlotte Vandenberghe",
      message: null,
      productName: "Formula 1 Vanille",
      sender: "client",
      read: false,
      createdAt: ilYAnJours(3),
    },
  ],
};
