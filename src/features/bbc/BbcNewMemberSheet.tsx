// =============================================================================
// BbcNewMemberSheet — la feuille « Évaluation Bien-Être » du mode BBC.
// Chantier BBC saisie EBE (2026-08-14). Maquette validée par Thomas :
// scratchpad/bbc-saisie-ebe.html, écrans 1 → 3.
//
// ── CE QUE C'EST ─────────────────────────────────────────────────────────────
// Le coach a une fiche PAPIER déjà remplie devant lui, au comptoir, pendant le
// rendez-vous. Cet écran la RECOPIE — il ne mène pas l'entretien. D'où le parti
// pris de rendement : 4 champs clavier en tout (prénom, nom, téléphone, email),
// plus les 3 cœurs. Tout le reste est en taps — chips, segments, steppers —
// dans l'ORDRE EXACT du papier, sur un seul écran qui descend, 6 blocs.
//
// ── POURQUOI UNE FEUILLE ET PAS UNE VUE ──────────────────────────────────────
// Le mode BBC n'a aucune URL interne : `AppLayout` monte `BbcApp` à la place de
// toute l'app et la navigation est un état React. Il n'y a donc pas de route à
// créer. On suit le patron déjà en place (BbcCardSheet, BbcBilan10) : une
// feuille en `position: fixed`, ouverte depuis la liste des membres.
//
// ⚠️ Le panneau porte `className="bbc-mode"` : les jetons `--ls-bbc-*` sont
// définis sur cette classe, et une feuille `fixed` doit la re-déclarer pour que
// les variables résolvent.
//
// ── UNITÉS DU BODY SCAN (la règle qui casse tout si on l'oublie) ─────────────
// La balance ne rend pas ses deux mesures phares dans la même unité, et l'app
// stocke EXACTEMENT ce que la balance affiche :
//   • bodyFat    → un POURCENTAGE
//   • muscleMass → des KILOS
// 679 bilans sont écrits ainsi. Cet écran SAISIT et ÉCRIT du natif, point.
// Aucune conversion ici : l'inverseur « % | kg » appartient au volet comparatif
// du bilan des 10, où l'on compare deux relevés — pas à une saisie.
//
// ── L'ORDRE D'ÉCRITURE (et pourquoi il n'est pas celui du bon sens) ──────────
//   1. la fiche + le bilan initial   (createClientWithInitialAssessment)
//   2. membre BBC + rattachement club (setClientEbeBbc)
//   3. l'accès à l'app (client_app_accounts)  ← AVANT les cœurs, obligatoire
//   4. les 3 cœurs (client_referrals, status 'new')
//   5. la carte de fidélité (RPC bbc_assign_card), seulement si « oui »
//
// L'étape 3 passe avant l'étape 4 à cause du RLS, pas par goût : la SEULE
// policy d'INSERT de `client_referrals` est `referral_via_valid_app_account`,
// dont le WITH CHECK appelle `client_app_account_is_valid(from_client_id,
// coach_id)`. Sans ligne `client_app_accounts` non expirée liant le membre au
// coach, les 3 cœurs sont refusés — silencieusement du point de vue de l'UI.
// C'est aussi cet accès qui porte le jeton du QR (`bbc_scan_visit` lit
// `client_app_accounts.token`) : sans lui, le membre ne peut pas être scanné
// à sa première visite.
//
// ── CE QU'ON NE FAIT PAS AUTOMATIQUEMENT ────────────────────────────────────
// • On n'ENVOIE rien au membre. Deux mails prématurés ont déjà été retirés du
//   parcours ; le lien existe, il part quand le coach le décide.
// • On ne devine aucun programme produits (`currentProgram` reste vide, donc
//   aucun seed `pv_client_products` — cf. supabaseService).
// =============================================================================

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type HTMLAttributes,
  type MutableRefObject,
  type ReactNode,
  type SetStateAction,
} from "react";
import { useAppContext } from "../../context/AppContext";
import { getSupabaseClient } from "../../services/supabaseClient";
import { setClientEbeBbc } from "./clientEbeBbc";
import { buildEmptyQuestionnaire } from "../../lib/leadConversion";
import type {
  AssessmentQuestionnaire,
  AssessmentRecord,
  BiologicalSex,
  BodyScanMetrics,
  Club,
  Objective,
  RecommendationLead,
} from "../../types/domain";

// -----------------------------------------------------------------------------
// Référentiels — aucun seuil réinventé
// -----------------------------------------------------------------------------

/**
 * Plages « saines » du body scan, reprises À L'IDENTIQUE de l'étape body scan
 * du bilan (`src/pages/NewAssessmentPage.tsx`, standards Tanita adultes,
 * sex-aware). Elles y sont déclarées en ligne, donc non importables — les
 * valeurs sont recopiées telles quelles, sans en inventer une seule.
 * `healthyMin/Max` = zone optimale, `scaleMax` = butée visuelle de la barre.
 */
interface Plage {
  healthyMin: number;
  healthyMax: number;
  scaleMax: number;
}

type ScanKey = keyof BodyScanMetrics;

interface MesureScan {
  key: ScanKey;
  label: string;
  icone: string;
  /** L'unité NATIVE, celle qui part en base. Jamais convertie ici. */
  unite: string;
  couleur: string;
  plage: Plage;
}

function mesuresScan(sexe: BiologicalSex, age: number): MesureScan[] {
  const h = sexe === "male";
  const ageMeta: Plage =
    age > 0
      ? { healthyMin: Math.max(15, age - 8), healthyMax: age, scaleMax: age + 25 }
      : { healthyMin: 20, healthyMax: 40, scaleMax: 70 };
  return [
    { key: "weight", label: "Poids", icone: "⚖️", unite: "kg", couleur: "var(--ls-bbc-teal)", plage: { healthyMin: 50, healthyMax: 90, scaleMax: 130 } },
    { key: "bodyFat", label: "Masse grasse", icone: "🔥", unite: "%", couleur: "var(--ls-bbc-coral)", plage: h ? { healthyMin: 8, healthyMax: 20, scaleMax: 40 } : { healthyMin: 18, healthyMax: 28, scaleMax: 45 } },
    { key: "muscleMass", label: "Masse musculaire", icone: "💪", unite: "kg", couleur: "var(--ls-bbc-teal)", plage: h ? { healthyMin: 35, healthyMax: 60, scaleMax: 80 } : { healthyMin: 25, healthyMax: 45, scaleMax: 65 } },
    { key: "hydration", label: "Hydratation", icone: "💧", unite: "%", couleur: "var(--ls-bbc-violet)", plage: h ? { healthyMin: 55, healthyMax: 65, scaleMax: 75 } : { healthyMin: 50, healthyMax: 60, scaleMax: 70 } },
    { key: "boneMass", label: "Masse osseuse", icone: "🦴", unite: "kg", couleur: "var(--ls-bbc-sage)", plage: h ? { healthyMin: 2.8, healthyMax: 3.8, scaleMax: 5 } : { healthyMin: 2.0, healthyMax: 2.8, scaleMax: 4 } },
    { key: "visceralFat", label: "Graisse visc.", icone: "🫀", unite: "", couleur: "var(--ls-bbc-coral)", plage: { healthyMin: 1, healthyMax: 9, scaleMax: 30 } },
    { key: "bmr", label: "BMR", icone: "⚡", unite: "kcal", couleur: "var(--ls-bbc-teal)", plage: { healthyMin: 1200, healthyMax: 2200, scaleMax: 3000 } },
    { key: "metabolicAge", label: "Âge métabolique", icone: "🧬", unite: "ans", couleur: "var(--ls-bbc-violet)", plage: ageMeta },
  ];
}

/**
 * Les 6 objectifs du papier. Le PREMIER coché (dans l'ordre de cette liste)
 * pilote `objective`, qui est MONO en base et sous contrainte CHECK. Les autres
 * sont conservés tels quels dans `questionnaire.objectiveFocus`, qui est multi
 * depuis 2026-07-16. « Augmenter son énergie » n'a volontairement aucun
 * équivalent : ce n'est pas un aiguillage de programme.
 */
const OBJECTIFS: Array<{ label: string; objective: Objective | null }> = [
  { label: "Perte de poids", objective: "weight-loss" },
  { label: "Augmenter son énergie", objective: null },
  { label: "Performances sportives", objective: "sport" },
  { label: "Éliminer la masse grasse", objective: "cutting" },
  { label: "Prendre du muscle", objective: "mass-gain" },
  { label: "Forme & bien-être", objective: "fitness" },
];

const HEURES_LEVER = ["05:00", "06:00", "06:30", "07:00", "08:00"];
const HEURES_COUCHER = ["21:00", "22:00", "23:00", "00:00"];
const HEURES_PETIT_DEJ = ["06:30", "07:00", "08:00", "plus tard"];
const CONTENU_PETIT_DEJ = ["Café seul", "Rien", "Tartines", "Céréales", "Salé", "Fruit"];
const AUTRES_BOISSONS = ["Jus", "Sodas", "Énergisantes", "Café ×3+", "Aucune"];
const MOMENTS_GRIGNOTAGE = ["Matin", "Après-midi", "Soir", "Nuit"];
const PORTIONS = ["0–1", "2–3", "4–5", "5 +"];
const MOMENTS_ENERGIE = ["Réveil", "Matinée", "Après déjeuner", "Fin de journée"];
const SEANCES = [0, 1, 2, 3, 4];
const FREQUENCES = ["Jamais", "Parfois", "Souvent"];
/** Vocabulaire de l'app pour `alcohol` (cf. bilan) — libellé court à l'écran. */
const ALCOOL: Array<{ label: string; valeur: string }> = [
  { label: "Jamais", valeur: "Jamais" },
  { label: "Occasionnel", valeur: "Occasionnellement" },
  { label: "Chaque semaine", valeur: "Chaque semaine" },
  { label: "Souvent", valeur: "Souvent" },
];
const CHALLENGES = ["Grignotage", "Manque de temps", "Organisation", "Motivation", "Fatigue"];

// -----------------------------------------------------------------------------
// Le brouillon — tout l'écran tient dans cet objet, donc dans le localStorage
// -----------------------------------------------------------------------------

interface Coeur {
  nom: string;
  contact: string;
}

interface Brouillon {
  prenom: string;
  nom: string;
  tel: string;
  email: string;
  age: number;
  taille: number;
  sexe: BiologicalSex;
  objectifs: string[];
  coeurs: Coeur[];
  lever: string;
  coucher: string;
  petitDej: string;
  petitDejHeure: string;
  petitDejContenu: string[];
  petitDejLibre: string;
  eau: number;
  boissons: string[];
  grignotage: string;
  grignotageMoments: string[];
  portions: string;
  energieBasse: string;
  seances: number;
  tropLeSoir: string;
  alcool: string;
  budget: number;
  challenges: string[];
  challengeLibre: string;
  scan: Record<string, string>;
  carte: "10" | "30" | "0";
  cartePrix: string;
  /** Jour de démarrage, en local, format AAAA-MM-JJ. */
  demarrage: string;
  /** Jours avant le prochain RDV. J+7 par défaut (la fiche en exige un). */
  rdvDansJours: number;
}

const CLE_BROUILLON = "bbc-nouveau-membre-brouillon";

function jourLocal(decalageJours = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + decalageJours);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const jj = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${jj}`;
}

/**
 * Une vraie date de calendrier, au format `AAAA-MM-JJ` (le 31 février n'en est
 * pas une).
 *
 * ⚠️ Un `<input type="date">` vidé — ou en cours de saisie au clavier — expose
 * `value === ""`. Concaténé tel quel, `new Date("T12:00:00")` est une Invalid
 * Date : `setDate` et `setHours` propagent NaN sans broncher, et c'est
 * `toISOString()` qui finit par jeter « Invalid time value ». Le coach lisait
 * alors « La fiche n'a pas pu être créée… Invalid time value » suivi d'une
 * invitation à vérifier une fiche partielle qui n'existait pas — sans que le
 * champ fautif soit jamais nommé.
 */
function estJourValide(jour: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return false;
  return !Number.isNaN(new Date(`${jour}T12:00:00`).getTime());
}

function brouillonVide(): Brouillon {
  return {
    prenom: "",
    nom: "",
    tel: "",
    email: "",
    age: 40,
    taille: 168,
    sexe: "female",
    objectifs: [],
    coeurs: [
      { nom: "", contact: "" },
      { nom: "", contact: "" },
      { nom: "", contact: "" },
    ],
    lever: "",
    coucher: "",
    petitDej: "",
    petitDejHeure: "",
    petitDejContenu: [],
    petitDejLibre: "",
    eau: 1,
    boissons: [],
    grignotage: "",
    grignotageMoments: [],
    portions: "",
    energieBasse: "",
    seances: 0,
    tropLeSoir: "",
    alcool: "",
    budget: 12,
    challenges: [],
    challengeLibre: "",
    scan: {},
    carte: "10",
    cartePrix: "",
    demarrage: jourLocal(0),
    rdvDansJours: 7,
  };
}

function lireBrouillon(): Brouillon | null {
  try {
    const brut = window.localStorage.getItem(CLE_BROUILLON);
    if (!brut) return null;
    const lu = JSON.parse(brut) as Partial<Brouillon>;
    // Fusion sur le vide : un brouillon écrit par une version antérieure de
    // l'écran ne doit pas faire planter le rendu sur un champ absent.
    const base = brouillonVide();
    const fusion: Brouillon = { ...base, ...lu };
    fusion.coeurs = [0, 1, 2].map((i) => ({
      nom: lu.coeurs?.[i]?.nom ?? "",
      contact: lu.coeurs?.[i]?.contact ?? "",
    }));
    fusion.scan = { ...(lu.scan ?? {}) };
    // Un brouillon peut porter une date vidée : elle a été écrite à chaque
    // frappe, `""` compris, et elle écraserait le défaut à la fusion.
    if (!estJourValide(fusion.demarrage)) fusion.demarrage = jourLocal(0);
    return fusion;
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------
// Petits utilitaires
// -----------------------------------------------------------------------------

/** Un nombre saisi à la française (« 74,5 ») → number. `null` si vide/invalide. */
function nombre(saisie: string | undefined): number | null {
  if (!saisie) return null;
  const n = Number(String(saisie).replace(",", ".").trim());
  return Number.isFinite(n) ? n : null;
}

function minutes(heure: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(heure);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Heures de sommeil entre le coucher et le lever, minuit traversé compris. */
function heuresDeSommeil(lever: string, coucher: string): number {
  const l = minutes(lever);
  const c = minutes(coucher);
  if (l === null || c === null) return 0;
  const diff = (l - c + 24 * 60) % (24 * 60);
  return Math.round((diff / 60) * 10) / 10;
}

function libelleHeure(h: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(h);
  if (!m) return h;
  const heures = Number(m[1]);
  return m[2] === "00" ? `${heures} h` : `${heures} h ${m[2]}`;
}

/** Le message d'une erreur Supabase, sans jamais rendre « [object Object] ». */
function messageErreur(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    const o = e as { message?: unknown; details?: unknown; hint?: unknown };
    const parts = [o.message, o.details, o.hint].filter((p): p is string => typeof p === "string" && p.length > 0);
    if (parts.length) return parts.join(" — ");
  }
  return "erreur inconnue";
}

// -----------------------------------------------------------------------------
// Les 5 étapes d'écriture
// -----------------------------------------------------------------------------

type EtapeId = "fiche" | "membre" | "acces" | "coeurs" | "carte";
type Statut = "attente" | "encours" | "ok" | "echec" | "ignore";

const ETAPES: Array<{ id: EtapeId; icone: string; titre: string; detail: string }> = [
  { id: "fiche", icone: "👤", titre: "La fiche client", detail: "Statut actif, démarrage posé. Les 14 réponses sont dans le bilan initial — le body scan en est le point de départ." },
  { id: "membre", icone: "☕", titre: "Membre BBC + club", detail: "Le drapeau membre et le rattachement au club vont toujours ensemble." },
  { id: "acces", icone: "📱", titre: "Son accès à l'app + son QR", detail: "Créé maintenant pour que le QR existe dès la première visite. Rien n'est envoyé." },
  { id: "coeurs", icone: "❤️", titre: "Les cœurs « à valider »", detail: "Ils apparaissent tout de suite dans l'onglet Cœurs. Un cœur ne compte que quand tu confirmes." },
  { id: "carte", icone: "🎟️", titre: "La carte de fidélité", detail: "Le pointage et le bilan se déclenchent dessus, jamais sur le cumul à vie." },
];

const MANUELS: Array<{ icone: string; titre: string; detail: string }> = [
  { icone: "✉️", titre: "Envoyer le lien de l'app", detail: "Deux mails prématurés au client ont déjà été retirés du parcours. On n'écrit à personne sans un geste explicite." },
  { icone: "🥤", titre: "Le programme et les produits", detail: "Le papier ne dit rien du ticket. On ne devine pas un programme : il se pose au comptoir, dans la fiche." },
];

// -----------------------------------------------------------------------------
// Composant
// -----------------------------------------------------------------------------

interface BbcNewMemberSheetProps {
  /** Le coach connecté — c'est lui qui possède la fiche (RLS + RPC carte). */
  userId?: string;
  coachName?: string;
  /** Le club actif : donne prix et durée de la carte, jamais en dur. */
  club?: Club | null;
  onClose: () => void;
  /** Appelé une fois la fiche créée, pour que les listes se rafraîchissent. */
  onCreated?: (clientId: string) => void;
}

export function BbcNewMemberSheet({ userId, coachName, club, onClose, onCreated }: BbcNewMemberSheetProps) {
  const { createClientWithInitialAssessment, currentUser } = useAppContext();

  const [f, setF] = useState<Brouillon>(() => lireBrouillon() ?? brouillonVide());
  const [busy, setBusy] = useState(false);
  const [termine, setTermine] = useState(false);
  const [confirmFermeture, setConfirmFermeture] = useState(false);
  const [etats, setEtats] = useState<Record<EtapeId, Statut>>({
    fiche: "attente",
    membre: "attente",
    acces: "attente",
    coeurs: "attente",
    carte: "attente",
  });
  const [erreurs, setErreurs] = useState<Partial<Record<EtapeId, string>>>({});

  // Ce qui a DÉJÀ été écrit — indispensable pour qu'une reprise ne double rien.
  const clientIdRef = useRef<string | null>(null);
  const coeursEcritsRef = useRef<boolean[]>([false, false, false]);
  const panneauRef = useRef<HTMLDivElement | null>(null);
  const focusAvantRef = useRef<Element | null>(null);

  const modifie = useMemo(
    () => f.prenom.trim() !== "" || f.nom.trim() !== "" || f.tel.trim() !== "" || Object.keys(f.scan).length > 0 || f.objectifs.length > 0,
    [f],
  );

  function maj(patch: Partial<Brouillon>) {
    setF((prec) => ({ ...prec, ...patch }));
  }

  // ── Brouillon : on écrit à chaque frappe, on efface au succès ────────────
  useEffect(() => {
    if (termine) return;
    try {
      window.localStorage.setItem(CLE_BROUILLON, JSON.stringify(f));
    } catch {
      // Mode privé Safari / quota plein : le brouillon est un confort, pas une
      // condition. On ne casse jamais la saisie pour ça.
    }
  }, [f, termine]);

  // ── Fermeture : jamais de travail perdu par un clic à côté ───────────────
  const demanderFermeture = useCallback(() => {
    if (termine || !modifie) {
      onClose();
      return;
    }
    setConfirmFermeture(true);
  }, [termine, modifie, onClose]);

  // ── A11y : Échap, focus à l'ouverture, focus rendu à la fermeture ────────
  useEffect(() => {
    focusAvantRef.current = document.activeElement;
    panneauRef.current?.focus();
    const precedent = document.body.style.overflow;
    // Le patron BBC existant ne verrouille pas le fond : sur un formulaire
    // long, avec le clavier virtuel, le fond défile sous la feuille.
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = precedent;
      const cible = focusAvantRef.current;
      if (cible instanceof HTMLElement) cible.focus();
    };
  }, []);

  useEffect(() => {
    function surTouche(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        demanderFermeture();
      }
    }
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [demanderFermeture]);

  // ── Dérivés ──────────────────────────────────────────────────────────────
  const mesures = useMemo(() => mesuresScan(f.sexe, f.age), [f.sexe, f.age]);
  const scanComplet = mesures.every((m) => (nombre(f.scan[m.key]) ?? 0) > 0);
  const sommeil = heuresDeSommeil(f.lever, f.coucher);
  const coeursRemplis = f.coeurs.filter((c) => c.nom.trim().length > 0);

  const objectifPrincipal: Objective = useMemo(() => {
    for (const o of OBJECTIFS) {
      if (f.objectifs.includes(o.label) && o.objective) return o.objective;
    }
    return "weight-loss";
  }, [f.objectifs]);

  const blocsFaits = useMemo(() => {
    let n = 0;
    if (f.prenom.trim() && f.nom.trim() && f.tel.trim()) n += 1;
    if (f.objectifs.length > 0) n += 1;
    if (coeursRemplis.length > 0) n += 1;
    // Bloc 4 : les 14 questions. On le compte dès qu'une réponse est posée —
    // le papier peut être partiellement rempli, on ne bloque pas là-dessus.
    if (f.lever || f.coucher || f.petitDej || f.portions || f.alcool) n += 1;
    if (scanComplet) n += 1;
    if (f.carte) n += 1;
    return n;
  }, [f, coeursRemplis.length, scanComplet]);

  // Ce qui manque encore, nommé. Le CTA ne se contente pas d'être gris : il dit
  // quel champ le bloque — la date en fait partie, elle peut être vidée d'un
  // geste sur le sélecteur natif.
  const demarrageValide = estJourValide(f.demarrage);
  const manque =
    !f.prenom.trim() || !f.nom.trim()
      ? "Il manque le prénom et le nom."
      : !demarrageValide
        ? "Il manque la date de démarrage (bloc 6) — tape « Aujourd'hui » ou choisis un jour."
        : null;

  const peutValider = manque === null && !busy;

  // ── Construction des objets envoyés en base ──────────────────────────────

  function construireQuestionnaire(): AssessmentQuestionnaire {
    const recommandations: RecommendationLead[] = coeursRemplis.map((c) => ({
      name: c.nom.trim(),
      contact: c.contact.trim(),
    }));
    return buildEmptyQuestionnaire({
      wakeUpTime: f.lever,
      bedTime: f.coucher,
      sleepHours: sommeil,
      // ⚠️ `assessmentRecommendations` (fichier sacré) teste littéralement
      // « Oui » / « Non » sur ce champ : le vocabulaire ne s'improvise pas.
      breakfastFrequency: f.petitDej,
      breakfastTime: f.petitDejHeure,
      breakfastContent: [...f.petitDejContenu, f.petitDejLibre.trim()].filter(Boolean).join(", "),
      waterIntake: f.eau,
      // Le papier demande « autres boissons » (multi) ; `sweetDrinks` est le
      // seul champ boissons hors eau/café. Personne ne branche dessus (vérifié)
      // — il n'est affiché qu'en texte libre sur la fiche.
      sweetDrinks: f.boissons.join(", "),
      snackingFrequency: f.grignotage,
      snackingMoment: f.grignotageMoments,
      vegetablesDaily: f.portions ? `${f.portions} portions/jour` : "",
      lowEnergyMoment: f.energieBasse,
      sessionsPerWeek: f.seances,
      physicalActivity: f.seances > 0 ? "Oui" : "Non",
      // `dinnerTiming` (« Le soir ») est le seul champ de la soirée. Le papier y
      // pose une QUANTITÉ, pas une heure : on écrit la phrase entière pour que
      // la fiche reste lisible et qu'on ne fasse pas passer « Parfois » pour un
      // horaire de dîner.
      dinnerTiming: f.tropLeSoir ? `Trop manger le soir : ${f.tropLeSoir.toLowerCase()}` : "",
      alcohol: f.alcool,
      dailyFoodSpendEur: f.budget,
      mainBlocker: f.challenges,
      hardestPart: f.challengeLibre.trim(),
      objectiveFocus: f.objectifs,
      // Les 3 noms vivent AUSSI ici, comme dans le bilan classique — mais ils
      // ne s'y arrêtent plus : l'étape « cœurs » en fait de vraies recos.
      recommendations: recommandations,
      recommendationsContacted: false,
    });
  }

  function construireBodyScan(): BodyScanMetrics {
    // Valeurs NATIVES, telles que lues sur la balance : bodyFat en %,
    // muscleMass en kg. Aucune conversion — cf. l'en-tête du fichier.
    const v = (k: ScanKey) => nombre(f.scan[k]) ?? 0;
    return {
      weight: v("weight"),
      bodyFat: v("bodyFat"),
      muscleMass: v("muscleMass"),
      hydration: v("hydration"),
      boneMass: v("boneMass"),
      visceralFat: v("visceralFat"),
      bmr: v("bmr"),
      metabolicAge: v("metabolicAge"),
    };
  }

  // ── Les 5 écritures ──────────────────────────────────────────────────────

  function poser(id: EtapeId, statut: Statut, message?: string) {
    setEtats((prec) => ({ ...prec, [id]: statut }));
    setErreurs((prec) => ({ ...prec, [id]: message }));
  }

  /** Joue une étape en isolant son échec : la suite continue quand même. */
  async function etape(id: EtapeId, travail: () => Promise<void>): Promise<boolean> {
    poser(id, "encours");
    try {
      await travail();
      poser(id, "ok");
      return true;
    } catch (e) {
      poser(id, "echec", messageErreur(e));
      return false;
    }
  }

  /**
   * 1. la fiche + le bilan initial. Son échec arrête la chaîne SI rien n'a été
   * écrit : sans identifiant client, aucune des quatre étapes suivantes n'a de
   * cible. Le formulaire est alors conservé intégralement.
   *
   * ⚠️ Le service enchaîne trois écritures (clients → assessments →
   * follow_ups) SANS transaction : un échec sur la deuxième ou la troisième
   * laisse une fiche partielle en base. `executer()` va donc la CHERCHER avant
   * de rendre la main (cf. `retrouverFicheOrpheline`) — c'est ce qui empêche
   * un second tap de créer une deuxième fois la même personne.
   */
  async function creerLaFiche(): Promise<string> {
    const distributorId = currentUser?.id ?? userId ?? "";
    if (!distributorId) throw new Error("Coach inconnu — reconnecte-toi.");
    // Ceinture et bretelles : `peutValider` bloque déjà le bouton, mais une
    // date invalide ne doit JAMAIS atteindre `toISOString()` — elle y jetterait
    // un « Invalid time value » qui ne nomme aucun champ.
    if (!estJourValide(f.demarrage)) {
      throw new Error("Date de démarrage vide ou invalide (bloc 6) — tape « Aujourd'hui » ou choisis un jour.");
    }

    // Le jour de démarrage à midi : `assessments.date` est une colonne `date`,
    // et midi met à l'abri d'un décalage de fuseau qui changerait le jour.
    const debut = new Date(`${f.demarrage}T12:00:00`);
    const rdv = new Date(debut.getTime());
    rdv.setDate(rdv.getDate() + f.rdvDansJours);
    rdv.setHours(10, 0, 0, 0);

    const label = OBJECTIFS.find((o) => o.objective === objectifPrincipal)?.label ?? "Perte de poids";
    const resume = `Évaluation bien-être saisie au club (objectif : ${label.toLowerCase()}).`;

    const assessment: AssessmentRecord = {
      // `assessments.id` est une clé primaire TEXTE générée côté front. Deux
      // fiches saisies dans la même milliseconde (la saisie en rafale est
      // prévue) violeraient la clé : d'où le suffixe aléatoire.
      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: debut.toISOString(),
      type: "initial",
      objective: objectifPrincipal,
      programTitle: "",
      summary: resume,
      notes: resume,
      bodyScan: construireBodyScan(),
      questionnaire: construireQuestionnaire(),
      pedagogicalFocus: ["Hydratation", "Petit-déjeuner", "Assiette équilibrée"],
      coachNotesInitial: null,
    };

    return await createClientWithInitialAssessment({
      client: {
        firstName: f.prenom.trim(),
        lastName: f.nom.trim(),
        sex: f.sexe,
        phone: f.tel.trim(),
        email: f.email.trim().toLowerCase(),
        age: f.age,
        birthDate: null,
        height: f.taille,
        job: "Non renseigné",
        city: club?.city || undefined,
        // Le coach CONNECTÉ, toujours : `bbc_assign_card` exige
        // `clients.distributor_id = auth.uid()`, et `setClientEbeBbc` résout le
        // club par `clubs.owner_user_id = auth.uid()`. Poser un autre distri
        // ici rendrait les étapes 2 et 5 impossibles.
        distributorId,
        distributorName: currentUser?.name ?? coachName ?? "La Base 360",
        objective: objectifPrincipal,
      },
      assessment,
      clientStatus: "active",
      // Volontairement vide : on ne devine pas un programme (et un programme
      // vide évite tout seed `pv_client_products` fantôme).
      currentProgram: "",
      started: true,
      nextFollowUp: rdv.toISOString(),
      followUpType: "Premier suivi",
      followUpStatus: "scheduled",
      notes: `Évaluation bien-être du club, saisie le ${new Date().toLocaleDateString("fr-FR")}. Programme et produits à poser au comptoir.`,
      afterAssessmentAction: "started",
    });
  }

  /**
   * Après un échec de l'étape 1 : la ligne `clients` a-t-elle quand même été
   * écrite ? Le service enchaîne clients → assessments → follow_ups SANS
   * transaction, donc oui, ça arrive (coupure au comptoir, 5xx PostgREST).
   *
   * Sans cette relecture, l'identifiant n'était posé qu'au succès complet : un
   * second tap recréait la personne, et RIEN dans le mode BBC ne pouvait
   * montrer la première — « Mes membres » ne lit que les fiches marquées
   * `ebe_bbc`, or c'est l'étape 2 qui pose ce drapeau et elle n'a pas tourné.
   * Le conseil « vérifie dans Mes membres » désignait donc une liste
   * structurellement incapable d'afficher l'orpheline.
   *
   * On ne retient qu'une fiche du MÊME coach, au MÊME nom, créée à l'instant —
   * jamais une homonyme d'il y a trois mois.
   */
  async function retrouverFicheOrpheline(): Promise<string | null> {
    try {
      const sb = await getSupabaseClient();
      const distributorId = currentUser?.id ?? userId ?? "";
      if (!sb || !distributorId) return null;
      const depuis = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data } = await sb
        .from("clients")
        .select("id")
        .eq("distributor_id", distributorId)
        .eq("first_name", f.prenom.trim())
        .eq("last_name", f.nom.trim())
        .gte("created_at", depuis)
        .order("created_at", { ascending: false })
        .limit(1);
      const ligne = (data ?? [])[0] as { id: string } | undefined;
      return ligne ? String(ligne.id) : null;
    } catch {
      // Une relecture ratée ne doit pas masquer l'erreur d'origine.
      return null;
    }
  }

  /** Le brouillon a fait son travail : on ne le laisse pas ressurgir ailleurs. */
  function oublierBrouillon() {
    try {
      window.localStorage.removeItem(CLE_BROUILLON);
    } catch {
      // sans conséquence : le brouillon sera écrasé à la prochaine saisie
    }
  }

  /** 3. l'accès à l'app — porte le jeton du QR, et débloque les cœurs. */
  async function creerLAcces(clientId: string): Promise<void> {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const coachId = currentUser?.id ?? userId ?? "";
    if (!coachId) throw new Error("Coach inconnu");

    // `client_app_accounts.client_id` porte un index UNIQUE : on relit avant
    // d'écrire, sinon une reprise après échec partiel casserait sur un doublon.
    const { data: deja } = await sb
      .from("client_app_accounts")
      .select("token")
      .eq("client_id", clientId)
      .maybeSingle();
    if ((deja as { token?: string } | null)?.token) return;

    // ⚠️ `client_id` et `coach_id` sont en TEXT alors que `clients.id` et
    // `users.id` sont en UUID : la policy compare sans cast.
    const { error } = await sb.from("client_app_accounts").insert({
      client_id: clientId,
      coach_id: coachId,
      coach_name: currentUser?.name ?? coachName ?? "La Base 360",
      client_first_name: f.prenom.trim(),
      client_last_name: f.nom.trim(),
    });
    if (error) throw error;
  }

  /** 4. les 3 cœurs. Une ligne vide n'est pas insérée. */
  async function creerLesCoeurs(clientId: string): Promise<void> {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const coachId = currentUser?.id ?? userId ?? "";
    const nomComplet = `${f.prenom.trim()} ${f.nom.trim()}`.trim();

    let dernier: unknown = null;
    for (let i = 0; i < f.coeurs.length; i += 1) {
      const c = f.coeurs[i];
      if (!c.nom.trim() || coeursEcritsRef.current[i]) continue;
      const { error } = await sb.from("client_referrals").insert({
        from_client_id: clientId,
        from_client_name: nomComplet,
        coach_id: coachId,
        referred_name: c.nom.trim(),
        // NOT NULL sans défaut : une chaîne vide, jamais null.
        referred_contact: c.contact.trim(),
        // « à valider » : un cœur ne compte que quand le coach confirme.
        status: "new",
      });
      if (error) dernier = error;
      else coeursEcritsRef.current[i] = true;
    }
    if (dernier) throw dernier;
  }

  /** 5. la carte, seulement si le papier dit « fidélité : oui ». */
  async function creerLaCarte(clientId: string): Promise<void> {
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Supabase indisponible");
    const type = Number(f.carte) as 10 | 30;
    const prix = nombre(f.cartePrix);
    const jours = club?.settings?.cards?.[f.carte]?.days ?? null;
    const { error } = await sb.rpc("bbc_assign_card", {
      p_client_id: clientId,
      p_type: type,
      p_price: prix,
      p_days: jours,
    });
    if (error) throw error;
  }

  /** Enchaîne les étapes restantes. Rejouable tel quel pour une reprise. */
  async function executer() {
    if (busy) return;
    setBusy(true);

    let id = clientIdRef.current;
    if (!id) {
      poser("fiche", "encours");
      try {
        id = await creerLaFiche();
        clientIdRef.current = id;
        poser("fiche", "ok");
      } catch (e) {
        // La fiche a-t-elle quand même été écrite avant l'échec ? Si oui, on
        // l'ADOPTE et on continue dessus : elle ne sera pas créée deux fois, et
        // l'étape 2 la rend enfin visible dans « Mes membres ».
        const orpheline = await retrouverFicheOrpheline();
        if (!orpheline) {
          // Rien n'existe : on garde TOUT le formulaire, on ne va pas plus loin.
          poser("fiche", "echec", messageErreur(e));
          setBusy(false);
          return;
        }
        id = orpheline;
        clientIdRef.current = orpheline;
        poser(
          "fiche",
          "echec",
          `${messageErreur(e)} — la fiche, elle, a bien été créée : on continue dessus, elle ne sera pas créée deux fois. Son bilan initial est incomplet, à reprendre depuis l'app coach.`,
        );
      }
      oublierBrouillon();
      setTermine(true);
    }

    if (!id) {
      // Inatteignable (le catch ci-dessus sort), mais on ne fabrique jamais un
      // identifiant de complaisance pour faire plaisir au typage.
      setBusy(false);
      return;
    }

    const clientId = id;
    if (etats.membre !== "ok") {
      await etape("membre", async () => {
        await setClientEbeBbc(clientId, true);
      });
    }

    const accesOk = etats.acces === "ok" ? true : await etape("acces", () => creerLAcces(clientId));

    if (coeursRemplis.length === 0) {
      poser("coeurs", "ignore");
    } else if (etats.coeurs !== "ok") {
      if (!accesOk) {
        // Ce n'est pas une supposition : la seule policy d'INSERT de
        // `client_referrals` exige un accès valide. Inutile de tenter.
        poser("coeurs", "echec", "l'accès à l'app doit exister d'abord (c'est lui qui autorise l'écriture des cœurs)");
      } else {
        await etape("coeurs", () => creerLesCoeurs(clientId));
      }
    }

    if (f.carte === "0") poser("carte", "ignore");
    else if (etats.carte !== "ok") await etape("carte", () => creerLaCarte(clientId));

    setBusy(false);
    // Prévenir le parent SEULEMENT ici : appelé plus tôt, il rafraîchirait la
    // liste avant que `ebe_bbc` soit posé — le nouveau membre n'y serait pas.
    onCreated?.(clientId);
  }

  // La fiche n'est PAS rejouable dès qu'un identifiant existe : la recréer
  // ferait un doublon. On ne propose de réessayer que ce qui peut aboutir.
  const restantes = ETAPES.filter(
    (e) => etats[e.id] === "echec" && !(e.id === "fiche" && clientIdRef.current),
  );

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    // Le voile est décoratif : on ne réagit qu'au clic qui le vise LUI, ce qui
    // évite le `stopPropagation` du panneau — celui du patron existant faisait
    // du panneau une zone cliquable fantôme aux yeux des lecteurs d'écran.
    // L'équivalent clavier de ce clic, c'est Échap (branché plus haut).
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) demanderFermeture();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,.65)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        ref={panneauRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={termine ? "Membre créé" : "Nouvelle évaluation bien-être"}
        className="bbc-mode"
        style={{
          width: "100%",
          maxWidth: 560,
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--ls-bbc-s1)",
          border: "1px solid var(--ls-bbc-line2)",
          borderRadius: "24px 24px 0 0",
          color: "var(--ls-bbc-text)",
          fontFamily: "var(--ls-bbc-font-body)",
          outline: "none",
        }}
      >
        {/* ── Barre haute figée ─────────────────────────────────────────── */}
        <div style={{ flex: "none", padding: "16px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={demanderFermeture}
              aria-label="Fermer"
              // 44 × 44 : fermer une saisie en cours ne doit pas se rater, mais
              // ne doit pas non plus se toucher par accident — d'où la cible
              // pleine et la confirmation derrière (`demanderFermeture`).
              style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: "pointer", fontSize: 15 }}
            >
              ✕
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)" }}>
                évaluation bien-être
              </div>
              <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 19, lineHeight: 1.1, marginTop: 3 }}>
                {termine ? `${f.prenom || "Le membre"} fait partie du club` : "Nouveau membre"}
              </div>
            </div>
            {!termine ? (
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-hint)", flex: "none" }}>{blocsFaits} / 6</span>
            ) : null}
          </div>
          {!termine ? (
            <div style={{ height: 5, borderRadius: 3, background: "var(--ls-bbc-s2)", overflow: "hidden", marginTop: 11 }}>
              <div style={{ width: `${Math.max(2, (blocsFaits / 6) * 100)}%`, height: "100%", background: "var(--ls-bbc-lime)", borderRadius: 3, transition: "width .3s" }} />
            </div>
          ) : null}
        </div>

        {/* ── Zone qui descend ──────────────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          {termine ? (
            <Recapitulatif etats={etats} erreurs={erreurs} carte={f.carte} nbCoeurs={coeursRemplis.length} />
          ) : (
            <>
              {/* ── 1. Informations personnelles ────────────────────────── */}
              <Bloc n={1} titre="Informations personnelles" sous="4 champs au clavier. Les seuls de tout l'écran.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <Champ label="Prénom" requis>
                    <Texte value={f.prenom} onChange={(v) => maj({ prenom: v })} placeholder="Marie" autoComplete="off" aria-label="Prénom du membre" />
                  </Champ>
                  <Champ label="Nom" requis>
                    <Texte value={f.nom} onChange={(v) => maj({ nom: v })} placeholder="Delaunay" autoComplete="off" aria-label="Nom du membre" />
                  </Champ>
                </div>
                <Champ label="Téléphone">
                  <Texte value={f.tel} onChange={(v) => maj({ tel: v })} placeholder="06 12 34 56 78" type="tel" inputMode="tel" aria-label="Téléphone du membre" />
                </Champ>
                <Champ label="Email">
                  <Texte value={f.email} onChange={(v) => maj({ email: v })} placeholder="marie.d@exemple.fr" type="email" inputMode="email" aria-label="Email du membre" />
                  <div style={{ fontSize: 10.5, color: "var(--ls-bbc-amber)", marginTop: 6, lineHeight: 1.45 }}>
                    ⚠️ Sans email : pas de rappel de RDV la veille à 18 h, et pas de connexion par mot de passe. Le QR et les notifications marchent quand même.
                  </div>
                </Champ>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginBottom: 13 }}>
                  <Champ label="Âge">
                    <Stepper value={f.age} unite="ans" pas={1} min={14} max={100} onChange={(v) => maj({ age: v })} />
                  </Champ>
                  <Champ label="Taille">
                    <Stepper value={f.taille} unite="cm" pas={1} min={120} max={220} onChange={(v) => maj({ taille: v })} />
                  </Champ>
                </div>
                <Champ label="Sexe" aide="cale les plages du scan">
                  <Chips
                    mono
                    teal
                    options={[
                      { label: "Femme", valeur: "female" },
                      { label: "Homme", valeur: "male" },
                    ]}
                    valeurs={[f.sexe]}
                    onToggle={(v) => maj({ sexe: v as BiologicalSex })}
                  />
                </Champ>
              </Bloc>

              {/* ── 2. Objectifs ────────────────────────────────────────── */}
              <Bloc n={2} titre="Objectifs physiques et bien-être" sous="Plusieurs possibles — comme sur le papier. 1 tap chacun.">
                <Chips
                  options={OBJECTIFS.map((o) => ({ label: o.label, valeur: o.label }))}
                  valeurs={f.objectifs}
                  onToggle={(v) =>
                    maj({ objectifs: f.objectifs.includes(v) ? f.objectifs.filter((x) => x !== v) : [...f.objectifs, v] })
                  }
                />
                <Note>
                  Le premier coché pilote le <b>programme et l'assiette</b> ; les autres sont conservés tels quels.
                  {f.objectifs.length ? (
                    <>
                      {" "}
                      Ici :{" "}
                      <b style={{ color: "var(--ls-bbc-lime-text)" }}>
                        {OBJECTIFS.find((o) => o.objective === objectifPrincipal)?.label ?? "Perte de poids"}
                      </b>
                      .
                    </>
                  ) : null}
                </Note>
              </Bloc>

              {/* ── 3. Les 3 cœurs ──────────────────────────────────────── */}
              <Bloc n={3} titre="Partagez notre évaluation gratuite" sous="3 personnes = les 3 premiers cœurs, créés dès la validation.">
                {f.coeurs.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 9 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        width: 34,
                        height: 34,
                        flex: "none",
                        borderRadius: 999,
                        background: "color-mix(in srgb, var(--ls-bbc-lime) 10%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 28%, transparent)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--ls-bbc-lime-text)",
                        fontSize: 14,
                      }}
                    >
                      ♥
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Texte value={c.nom} onChange={(v) => majCoeur(setF, i, { nom: v })} placeholder={`Prénom ${i + 1}`} autoComplete="off" aria-label={`Prénom du cœur ${i + 1}`} />
                    </div>
                    <div style={{ width: 124, flex: "none" }}>
                      <Texte value={c.contact} onChange={(v) => majCoeur(setF, i, { contact: v })} placeholder="Tél." type="tel" inputMode="tel" aria-label={`Contact du cœur ${i + 1}`} />
                    </div>
                  </div>
                ))}
                <Note>
                  <b>Le trou qu'on bouche.</b> Aujourd'hui ces noms n'existent que dans le questionnaire : ils
                  n'apparaissent jamais dans l'onglet Cœurs. Ici, chaque ligne remplie crée aussi une reco « à valider ».
                </Note>
              </Bloc>

              {/* ── 4. Analyse nutritionnelle & forme ───────────────────── */}
              <Bloc n={4} titre="Analyse nutritionnelle & forme" sous="Les 14 questions du papier — 12 en taps, 2 en texte facultatif.">
                <Champ label="1 · Heure de lever">
                  <Chips mono teal options={HEURES_LEVER.map((h) => ({ label: libelleHeure(h), valeur: h }))} valeurs={[f.lever]} onToggle={(v) => maj({ lever: v === f.lever ? "" : v })} />
                </Champ>

                <Champ label="2 · Heure de coucher">
                  <Chips mono teal options={HEURES_COUCHER.map((h) => ({ label: h === "00:00" ? "minuit +" : libelleHeure(h), valeur: h }))} valeurs={[f.coucher]} onToggle={(v) => maj({ coucher: v === f.coucher ? "" : v })} />
                  {sommeil > 0 ? (
                    <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, color: "var(--ls-bbc-lime-text)", marginTop: 8 }}>
                      → {sommeil.toFixed(1).replace(".", ",")} h de sommeil {sommeil >= 7 && sommeil <= 9 ? "· optimal" : "· à surveiller"}
                    </div>
                  ) : null}
                </Champ>

                <Champ label="3 · Petit-déjeuner tous les matins">
                  <Chips mono options={["Oui", "Non", "Parfois"].map((v) => ({ label: v, valeur: v }))} valeurs={[f.petitDej]} onToggle={(v) => maj({ petitDej: v === f.petitDej ? "" : v })} />
                  <div style={{ height: 8 }} />
                  <Champ label="…à quelle heure">
                    <Chips mono teal options={HEURES_PETIT_DEJ.map((h) => ({ label: h === "plus tard" ? "plus tard" : libelleHeure(h), valeur: h }))} valeurs={[f.petitDejHeure]} onToggle={(v) => maj({ petitDejHeure: v === f.petitDejHeure ? "" : v })} />
                  </Champ>
                </Champ>

                <Champ label="4 · Que mange-t-il / elle au petit-déjeuner">
                  <Chips
                    options={CONTENU_PETIT_DEJ.map((v) => ({ label: v, valeur: v }))}
                    valeurs={f.petitDejContenu}
                    onToggle={(v) => maj({ petitDejContenu: bascule(f.petitDejContenu, v) })}
                  />
                  <div style={{ height: 8 }} />
                  <Texte value={f.petitDejLibre} onChange={(v) => maj({ petitDejLibre: v })} placeholder="…ou en toutes lettres (facultatif)" aria-label="Petit-déjeuner en toutes lettres" />
                </Champ>

                <Champ label="5 · Eau par jour">
                  <Stepper value={f.eau} unite="litre" pas={0.1} min={0} max={8} decimales={1} onChange={(v) => maj({ eau: v })} />
                </Champ>

                <Champ label="6 · Autres boissons" aide="plusieurs possibles">
                  <Chips options={AUTRES_BOISSONS.map((v) => ({ label: v, valeur: v }))} valeurs={f.boissons} onToggle={(v) => maj({ boissons: bascule(f.boissons, v) })} />
                </Champ>

                <Champ label="7 · Grignotage entre les repas">
                  <Chips mono options={FREQUENCES.map((v) => ({ label: v, valeur: v }))} valeurs={[f.grignotage]} onToggle={(v) => maj({ grignotage: v === f.grignotage ? "" : v })} />
                  <div style={{ height: 8 }} />
                  <Champ label="…quand">
                    <Chips teal options={MOMENTS_GRIGNOTAGE.map((v) => ({ label: v, valeur: v }))} valeurs={f.grignotageMoments} onToggle={(v) => maj({ grignotageMoments: bascule(f.grignotageMoments, v) })} />
                  </Champ>
                </Champ>

                <Champ label="8 · Portions de fruits & légumes par jour">
                  <Chips mono options={PORTIONS.map((v) => ({ label: v, valeur: v }))} valeurs={[f.portions]} onToggle={(v) => maj({ portions: v === f.portions ? "" : v })} />
                </Champ>

                <Champ label="9 · Moment de la journée avec le moins d'énergie">
                  <Chips mono teal options={MOMENTS_ENERGIE.map((v) => ({ label: v, valeur: v }))} valeurs={[f.energieBasse]} onToggle={(v) => maj({ energieBasse: v === f.energieBasse ? "" : v })} />
                </Champ>

                <Champ label="10 · Exercice par semaine">
                  <Chips mono options={SEANCES.map((n) => ({ label: n === 4 ? "4 +" : String(n), valeur: String(n) }))} valeurs={[String(f.seances)]} onToggle={(v) => maj({ seances: Number(v) })} />
                </Champ>

                <Champ label="11 · Tendance à trop manger le soir">
                  <Chips mono options={FREQUENCES.map((v) => ({ label: v, valeur: v }))} valeurs={[f.tropLeSoir]} onToggle={(v) => maj({ tropLeSoir: v === f.tropLeSoir ? "" : v })} />
                </Champ>

                <Champ label="12 · Alcool par semaine">
                  <Chips mono options={ALCOOL} valeurs={[f.alcool]} onToggle={(v) => maj({ alcool: v === f.alcool ? "" : v })} />
                </Champ>

                <Champ label="13 · Dépense en nourriture par jour">
                  <Stepper value={f.budget} unite="€ / jour" pas={1} min={0} max={100} onChange={(v) => maj({ budget: v })} />
                  <div style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 6, lineHeight: 1.45 }}>
                    Sert le calcul « ton petit-déj coûte moins cher que ce que tu dépenses déjà ».
                  </div>
                </Champ>

                <Champ label="14 · Plus grand challenge avec la nourriture" aide="la seule vraie phrase">
                  <Chips options={CHALLENGES.map((v) => ({ label: v, valeur: v }))} valeurs={f.challenges} onToggle={(v) => maj({ challenges: bascule(f.challenges, v) })} />
                  <div style={{ height: 8 }} />
                  <Zone value={f.challengeLibre} onChange={(v) => maj({ challengeLibre: v })} placeholder="Ses mots à elle, s'ils valent le coup (facultatif)" />
                </Champ>
              </Bloc>

              {/* ── 5. Body scan ────────────────────────────────────────── */}
              <Bloc n={5} titre="Body scan" sousTitreAide="pas sur le papier" sous="Les 8 chiffres de la balance. C'est ce point de départ que la courbe du membre affichera à vie.">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 12px",
                    borderRadius: 11,
                    background: "color-mix(in srgb, var(--ls-bbc-teal) 8%, transparent)",
                    borderLeft: "3px solid var(--ls-bbc-teal)",
                    marginBottom: 12,
                  }}
                >
                  <span aria-hidden="true">⚖️</span>
                  <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10.5, color: "var(--ls-bbc-muted)", textTransform: "uppercase" }}>
                    {f.sexe === "male" ? "homme" : "femme"} · {f.age} ans · {f.taille} cm — les plages suivent
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                  {mesures.map((m) => (
                    <CarteMesure
                      key={m.key}
                      mesure={m}
                      saisie={f.scan[m.key] ?? ""}
                      onChange={(v) => setF((prec) => ({ ...prec, scan: { ...prec.scan, [m.key]: v } }))}
                    />
                  ))}
                </div>

                {scanComplet ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: "12px 14px",
                      borderRadius: 13,
                      background: "color-mix(in srgb, var(--ls-bbc-lime) 9%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--ls-bbc-lime) 32%, transparent)",
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--ls-bbc-lime-text)" }}>Scan complet · 8 / 8 🎉</div>
                    <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 3 }}>Le point de départ est posé.</div>
                  </div>
                ) : null}
              </Bloc>

              {/* ── 6. Programme de fidélité ────────────────────────────── */}
              <Bloc n={6} titre="Programme de fidélité" sous="Le « OUI / NON » du papier, c'est la carte de visites." dernier>
                <Chips
                  mono
                  options={[
                    { label: `Carte 10 visites`, valeur: "10" },
                    { label: `Carte 30 visites`, valeur: "30" },
                    { label: "Pas encore", valeur: "0" },
                  ]}
                  valeurs={[f.carte]}
                  onToggle={(v) => maj({ carte: v as Brouillon["carte"] })}
                />

                {f.carte !== "0" ? (
                  <>
                    <div style={{ height: 12 }} />
                    <Champ label="Prix payé" aide="facultatif">
                      <Texte
                        value={f.cartePrix}
                        onChange={(v) => maj({ cartePrix: v })}
                        placeholder={prixParDefaut(club, f.carte)}
                        inputMode="decimal"
                        aria-label="Prix payé pour la carte"
                      />
                      <div style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", marginTop: 6 }}>
                        Durée reprise des réglages du club ({f.carte} visites → {club?.settings?.cards?.[f.carte]?.days ?? (f.carte === "10" ? 30 : 90)} jours).
                      </div>
                    </Champ>
                  </>
                ) : null}

                <Champ label="Date de démarrage">
                  <Chips
                    mono
                    options={[
                      { label: "Aujourd'hui", valeur: jourLocal(0) },
                      { label: "Demain", valeur: jourLocal(1) },
                    ]}
                    valeurs={[f.demarrage]}
                    onToggle={(v) => maj({ demarrage: v })}
                  />
                  <div style={{ height: 8 }} />
                  {/* On laisse le champ se vider pendant la saisie — le
                      corriger sous les doigts déplacerait le curseur. C'est la
                      validation qui refuse, en nommant le champ. */}
                  <input
                    type="date"
                    value={f.demarrage}
                    onChange={(e) => maj({ demarrage: e.target.value })}
                    aria-label="Autre date de démarrage"
                    aria-invalid={!demarrageValide || undefined}
                    style={champStyle}
                  />
                  {!demarrageValide ? (
                    <div role="status" style={{ fontSize: 10.5, color: "var(--ls-bbc-amber)", marginTop: 6, lineHeight: 1.45 }}>
                      Date vide ou incomplète : tape « Aujourd'hui » ou choisis un jour.
                    </div>
                  ) : null}
                </Champ>

                <Champ label="Prochain rendez-vous" aide="la fiche en exige un — modifiable en un tap">
                  <Chips
                    mono
                    teal
                    options={[
                      { label: "J+3", valeur: "3" },
                      { label: "J+7", valeur: "7" },
                      { label: "J+14", valeur: "14" },
                    ]}
                    valeurs={[String(f.rdvDansJours)]}
                    onToggle={(v) => maj({ rdvDansJours: Number(v) })}
                  />
                </Champ>
              </Bloc>
            </>
          )}
        </div>

        {/* ── Barre de validation figée ─────────────────────────────────── */}
        <div style={{ flex: "none", padding: "12px 18px calc(16px + env(safe-area-inset-bottom))", borderTop: "1px solid var(--ls-bbc-line)" }}>
          {confirmFermeture ? (
            <div style={{ marginBottom: 10, padding: "11px 13px", borderRadius: 12, background: "color-mix(in srgb, var(--ls-bbc-amber) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-bbc-amber) 34%, transparent)" }}>
              <div style={{ fontSize: 12.5, color: "var(--ls-bbc-text)", lineHeight: 1.45 }}>
                Fermer maintenant ? La saisie reste enregistrée en brouillon sur cet appareil.
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={onClose} style={{ ...boutonFantomeStyle, flex: 1 }}>
                  Fermer
                </button>
                <button type="button" onClick={() => setConfirmFermeture(false)} style={{ ...boutonFantomeStyle, flex: 1, borderColor: "var(--ls-bbc-lime)", color: "var(--ls-bbc-lime-text)" }}>
                  Continuer la saisie
                </button>
              </div>
            </div>
          ) : null}

          {!termine ? (
            <>
              {etats.fiche === "echec" ? (
                // On n'envoie plus le coach vérifier dans « Mes membres » : cette
                // liste ne montre QUE les fiches déjà marquées `ebe_bbc`, donc
                // jamais une orpheline de l'étape 1. C'est le code qui va la
                // chercher (`retrouverFicheOrpheline`) — si on arrive ici, c'est
                // qu'il n'en a pas trouvé.
                <div style={{ marginBottom: 10, fontSize: 12, color: "var(--ls-bbc-coral)", lineHeight: 1.45 }}>
                  La fiche n'a pas pu être créée — ta saisie est intacte. {erreurs.fiche}
                  <br />
                  <span style={{ color: "var(--ls-bbc-muted)" }}>
                    Aucune fiche partielle n'a été retrouvée à ce nom : tu peux réessayer.
                  </span>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void executer()}
                disabled={!peutValider}
                style={{
                  width: "100%",
                  minHeight: 52,
                  border: 0,
                  borderRadius: 14,
                  background: "var(--ls-bbc-lime)",
                  color: "var(--ls-bbc-lime-ink)",
                  fontFamily: "var(--ls-bbc-font-body)",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: peutValider ? "pointer" : "not-allowed",
                  opacity: peutValider ? 1 : 0.5,
                }}
              >
                {busy ? "enregistrement…" : "Créer la fiche membre →"}
              </button>
              <p style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 8, lineHeight: 1.45 }}>
                {busy || !manque ? "Rien n'est envoyé au membre à cette étape." : manque}
              </p>
            </>
          ) : (
            <>
              {restantes.length ? (
                <button
                  type="button"
                  onClick={() => void executer()}
                  disabled={busy}
                  style={{
                    width: "100%",
                    minHeight: 52,
                    // Ambre TEINTÉ, pas ambre plein : un aplat d'ambre avec
                    // l'encre du club tombe sous le seuil lisible en thème
                    // clair. Le contour suffit à dire « attention ».
                    border: "1px solid var(--ls-bbc-amber)",
                    borderRadius: 14,
                    background: "color-mix(in srgb, var(--ls-bbc-amber) 18%, transparent)",
                    color: "var(--ls-bbc-text)",
                    fontFamily: "var(--ls-bbc-font-body)",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: busy ? "wait" : "pointer",
                    opacity: busy ? 0.6 : 1,
                    marginBottom: 9,
                  }}
                >
                  {busy ? "nouvelle tentative…" : `Réessayer ce qui a échoué (${restantes.length})`}
                </button>
              ) : null}
              <button type="button" onClick={() => reinitialiser(setF, setEtats, setErreurs, setTermine, clientIdRef, coeursEcritsRef)} style={{ ...boutonFantomeStyle, marginBottom: 9 }}>
                Saisir la 2ᵉ fiche papier
              </button>
              <button type="button" onClick={onClose} style={boutonFantomeStyle}>
                Fermer
              </button>
              <p style={{ fontSize: 10.5, color: "var(--ls-bbc-hint)", textAlign: "center", marginTop: 8, lineHeight: 1.45 }}>
                Le lien de l'app existe : envoie-le depuis la fiche du membre quand tu le décides.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Helpers de mutation hors composant (gardent le JSX lisible)
// -----------------------------------------------------------------------------

function bascule(liste: string[], valeur: string): string[] {
  return liste.includes(valeur) ? liste.filter((x) => x !== valeur) : [...liste, valeur];
}

function majCoeur(
  setF: Dispatch<SetStateAction<Brouillon>>,
  index: number,
  patch: Partial<Coeur>,
) {
  setF((prec) => ({
    ...prec,
    coeurs: prec.coeurs.map((c, i) => (i === index ? { ...c, ...patch } : c)),
  }));
}

/** « Saisir la 2ᵉ fiche » : le bloc 1 se rouvre vide, la carte reste réglée. */
function reinitialiser(
  setF: Dispatch<SetStateAction<Brouillon>>,
  setEtats: Dispatch<SetStateAction<Record<EtapeId, Statut>>>,
  setErreurs: Dispatch<SetStateAction<Partial<Record<EtapeId, string>>>>,
  setTermine: Dispatch<SetStateAction<boolean>>,
  clientIdRef: MutableRefObject<string | null>,
  coeursEcritsRef: MutableRefObject<boolean[]>,
) {
  setF((prec) => ({ ...brouillonVide(), carte: prec.carte, cartePrix: prec.cartePrix, rdvDansJours: prec.rdvDansJours }));
  setEtats({ fiche: "attente", membre: "attente", acces: "attente", coeurs: "attente", carte: "attente" });
  setErreurs({});
  clientIdRef.current = null;
  coeursEcritsRef.current = [false, false, false];
  setTermine(false);
}

function prixParDefaut(club: Club | null | undefined, type: string): string {
  const p = club?.settings?.cards?.[type]?.price;
  return p != null ? `ex. ${p}` : "ex. 80";
}

// -----------------------------------------------------------------------------
// Écran 3 — ce qui s'est réellement créé
// -----------------------------------------------------------------------------

function Recapitulatif({
  etats,
  erreurs,
  carte,
  nbCoeurs,
}: {
  etats: Record<EtapeId, Statut>;
  erreurs: Partial<Record<EtapeId, string>>;
  carte: string;
  nbCoeurs: number;
}) {
  return (
    <div style={{ padding: "18px 18px 6px" }}>
      <div style={{ textAlign: "center", padding: "4px 0 16px" }}>
        <div style={{ width: 66, height: 66, borderRadius: 999, background: "var(--ls-bbc-lime)", margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ls-bbc-lime-ink)", fontSize: 30, fontWeight: 800 }} aria-hidden="true">
          ✓
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)", marginTop: 12 }}>
          membre créé
        </div>
      </div>

      <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: "6px 16px 12px", marginBottom: 14 }}>
        {ETAPES.map((e) => {
          const st = etats[e.id];
          const detail =
            e.id === "coeurs" && st === "ignore"
              ? "Aucun nom saisi — rien à créer."
              : e.id === "carte" && st === "ignore"
                ? "« Pas encore » : aucune carte attribuée."
                : e.id === "carte"
                  ? `${carte} visites. ${e.detail}`
                  : e.id === "coeurs"
                    ? `${nbCoeurs} reco${nbCoeurs > 1 ? "s" : ""} « à valider ». ${e.detail}`
                    : e.detail;
          return <LigneEtape key={e.id} icone={e.icone} titre={e.titre} detail={detail} statut={st} erreur={erreurs[e.id]} />;
        })}
      </div>

      <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 18, padding: "6px 16px 12px", marginBottom: 6 }}>
        <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ls-bbc-amber)", padding: "12px 0 2px" }}>
          à toi de décider
        </div>
        {MANUELS.map((m) => (
          <LigneEtape key={m.titre} icone={m.icone} titre={m.titre} detail={m.detail} statut="ignore" manuel />
        ))}
        <LigneEtape
          icone="📅"
          titre="Le prochain rendez-vous"
          detail="Posé pour que la fiche soit valide, modifiable en un tap depuis l'agenda."
          statut="ok"
          manuel
        />
      </div>
    </div>
  );
}

function LigneEtape({
  icone,
  titre,
  detail,
  statut,
  erreur,
  manuel,
}: {
  icone: string;
  titre: string;
  detail: string;
  statut: Statut;
  erreur?: string;
  manuel?: boolean;
}) {
  const tag =
    manuel
      ? { texte: "manuel", couleur: "var(--ls-bbc-amber)" }
      : statut === "ok"
        ? { texte: "créé", couleur: "var(--ls-bbc-lime-text)" }
        : statut === "echec"
          ? { texte: "échec", couleur: "var(--ls-bbc-coral)" }
          : statut === "encours"
            ? { texte: "…", couleur: "var(--ls-bbc-teal)" }
            : statut === "ignore"
              ? { texte: "non", couleur: "var(--ls-bbc-hint)" }
              : { texte: "attente", couleur: "var(--ls-bbc-hint)" };

  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "12px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
      <span
        aria-hidden="true"
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          background: `color-mix(in srgb, ${tag.couleur} 14%, transparent)`,
        }}
      >
        {icone}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{titre}</div>
        <div style={{ fontSize: 11, color: "var(--ls-bbc-muted)", marginTop: 3, lineHeight: 1.45 }}>{detail}</div>
        {erreur ? (
          <div style={{ fontSize: 11, color: "var(--ls-bbc-coral)", marginTop: 5, lineHeight: 1.45 }}>{erreur}</div>
        ) : null}
      </div>
      <span
        style={{
          fontFamily: "var(--ls-bbc-font-mono)",
          fontSize: 9,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          padding: "3px 7px",
          borderRadius: 6,
          flex: "none",
          color: tag.couleur,
          background: `color-mix(in srgb, ${tag.couleur} 14%, transparent)`,
        }}
      >
        {tag.texte}
      </span>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Primitives d'UI — toutes en jetons --ls-bbc-*, aucun hex
// -----------------------------------------------------------------------------

const champStyle: CSSProperties = {
  width: "100%",
  minHeight: 48,
  borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)",
  background: "var(--ls-bbc-s2)",
  color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)",
  // 16 px minimum : en dessous, iOS zoome à la mise au point du champ.
  fontSize: 16,
  padding: "12px 14px",
  outline: "none",
};

const boutonFantomeStyle: CSSProperties = {
  width: "100%",
  minHeight: 46,
  borderRadius: 12,
  border: "1px solid var(--ls-bbc-line2)",
  background: "transparent",
  color: "var(--ls-bbc-muted)",
  fontFamily: "var(--ls-bbc-font-body)",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

function Bloc({
  n,
  titre,
  sous,
  sousTitreAide,
  dernier,
  children,
}: {
  n: number;
  titre: string;
  sous: string;
  sousTitreAide?: string;
  dernier?: boolean;
  children: ReactNode;
}) {
  return (
    <section style={{ padding: "18px 18px 6px", borderBottom: dernier ? "0" : "1px solid var(--ls-bbc-line)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, marginBottom: 14 }}>
        <span
          aria-hidden="true"
          style={{
            width: 26,
            height: 26,
            flex: "none",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--ls-bbc-font-mono)",
            fontSize: 11,
            fontWeight: 800,
            background: "var(--ls-bbc-s2)",
            border: "1px solid var(--ls-bbc-line2)",
            color: "var(--ls-bbc-lime-text)",
          }}
        >
          {n}
        </span>
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.2, margin: 0 }}>
            {titre}
            {sousTitreAide ? (
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ls-bbc-hint)" }}> — {sousTitreAide}</span>
            ) : null}
          </h3>
          <div style={{ fontSize: 11.5, color: "var(--ls-bbc-hint)", marginTop: 3, lineHeight: 1.45 }}>{sous}</div>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * Un champ = un libellé + son contrôle. `role="group"` + `aria-labelledby`
 * plutôt qu'un `<label for>` : la moitié des contrôles de cet écran sont des
 * paquets de boutons (chips, steppers) qu'un `<label>` ne saurait pas nommer.
 */
function Champ({ label, aide, requis, children }: { label: string; aide?: string; requis?: boolean; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id} style={{ marginBottom: 13 }}>
      <span id={id} style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--ls-bbc-muted)", marginBottom: 6 }}>
        {label}
        {requis ? <b style={{ color: "var(--ls-bbc-lime-text)", fontWeight: 800 }}> *</b> : null}
        {aide ? <span style={{ fontWeight: 400, color: "var(--ls-bbc-hint)" }}> — {aide}</span> : null}
      </span>
      {children}
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontSize: 11.5, color: "var(--ls-bbc-muted)", lineHeight: 1.5, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 12, padding: "11px 13px", marginBottom: 14 }}>
      {children}
    </div>
  );
}

function Texte({
  value,
  onChange,
  placeholder,
  type,
  inputMode,
  autoComplete,
  ...reste
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      {...reste}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type ?? "text"}
      inputMode={inputMode}
      autoComplete={autoComplete}
      style={champStyle}
    />
  );
}

function Zone({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      style={{ ...champStyle, minHeight: 70, resize: "vertical", lineHeight: 1.5 }}
    />
  );
}

function Chips({
  options,
  valeurs,
  onToggle,
  mono,
  teal,
}: {
  options: Array<{ label: string; valeur: string }>;
  valeurs: string[];
  onToggle: (valeur: string) => void;
  /** Exclusif : un seul choix possible. Sinon multi. */
  mono?: boolean;
  /** Accent teal (les réponses factuelles) plutôt que lime (les décisions). */
  teal?: boolean;
}) {
  const accent = teal ? "var(--ls-bbc-teal)" : "var(--ls-bbc-lime)";
  return (
    // `aria-pressed` sur des boutons, jamais `radiogroup` : ces chips se
    // dé-sélectionnent d'un second tap, ce qu'un vrai radio ne fait pas.
    // `data-mono` reprend le marqueur de la maquette : il dit « exclusif »,
    // l'exclusivité elle-même vivant dans le `onToggle` de l'appelant.
    <div data-mono={mono ? "" : undefined} style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
      {options.map((o) => {
        const on = valeurs.includes(o.valeur);
        return (
          <button
            key={o.valeur}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(o.valeur)}
            style={{
              // 44 px : le seuil sous lequel un doigt rate la cible. Le coach
              // tape debout, une tablette dans l'autre main — mesuré à 42 px
              // dans l'atelier le 2026-08-14, remonté.
              minHeight: 44,
              // Un plancher en largeur aussi : les chips à un seul caractère
              // (« 0 », « 1 »… de la question sur le sport) tombaient à 33 px,
              // trop étroit pour un pouce. Le contenu tient de toute façon.
              minWidth: 44,
              padding: "11px 13px",
              borderRadius: 11,
              cursor: "pointer",
              fontFamily: "var(--ls-bbc-font-body)",
              fontSize: 13,
              fontWeight: on ? 800 : 600,
              border: `1px solid ${on ? accent : "var(--ls-bbc-line2)"}`,
              background: on ? accent : "var(--ls-bbc-s2)",
              // Sur fond lime ou teal, l'encre sombre du club : jamais le lime
              // en couleur de texte (2,18:1 sur blanc en thème clair).
              color: on ? "var(--ls-bbc-lime-ink)" : "var(--ls-bbc-muted)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({
  value,
  unite,
  pas,
  min,
  max,
  decimales = 0,
  onChange,
}: {
  value: number;
  unite: string;
  pas: number;
  min: number;
  max: number;
  decimales?: number;
  onChange: (v: number) => void;
}) {
  function pousser(sens: -1 | 1) {
    const brut = value + sens * pas;
    const borne = Math.min(max, Math.max(min, brut));
    onChange(Number(borne.toFixed(decimales)));
  }
  const bouton: CSSProperties = {
    width: 46,
    height: 46,
    flex: "none",
    borderRadius: 12,
    border: "1px solid var(--ls-bbc-line2)",
    background: "var(--ls-bbc-s2)",
    color: "var(--ls-bbc-lime-text)",
    fontSize: 20,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "var(--ls-bbc-font-mono)",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button type="button" onClick={() => pousser(-1)} aria-label={`Diminuer (${unite})`} style={bouton}>
        −
      </button>
      <span
        role="spinbutton"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-label={unite}
        style={{ flex: 1, height: 46, borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line2)", display: "flex", alignItems: "baseline", justifyContent: "center", gap: 5, fontFamily: "var(--ls-bbc-font-mono)", fontWeight: 800, fontSize: 19 }}
      >
        {value.toFixed(decimales).replace(".", ",")}
        <small style={{ fontSize: 11, fontWeight: 600, color: "var(--ls-bbc-hint)" }}>{unite}</small>
      </span>
      <button type="button" onClick={() => pousser(1)} aria-label={`Augmenter (${unite})`} style={bouton}>
        ＋
      </button>
    </div>
  );
}

/**
 * Une case du body scan : la valeur NATIVE, sa barre relative à `scaleMax` et
 * la zone Tanita lue en direct. `inputMode="decimal"` + 16 px minimum, sinon
 * iOS zoome et le coach perd sa place dans la grille.
 */
function CarteMesure({ mesure, saisie, onChange }: { mesure: MesureScan; saisie: string; onChange: (v: string) => void }) {
  const v = nombre(saisie);
  const valeur = v ?? 0;
  const dansLaPlage = valeur > 0 && valeur >= mesure.plage.healthyMin && valeur <= mesure.plage.healthyMax;
  const couleur = valeur <= 0 ? "var(--ls-bbc-hint)" : dansLaPlage ? "var(--ls-bbc-lime)" : mesure.couleur;
  const remplissage = Math.min(100, Math.max(0, (valeur / mesure.plage.scaleMax) * 100));
  const zone =
    valeur <= 0
      ? "à saisir"
      : `${dansLaPlage ? "dans la plage" : valeur < mesure.plage.healthyMin ? "sous la plage" : "au-dessus"} ${mesure.plage.healthyMin}–${mesure.plage.healthyMax}`;

  return (
    <div style={{ background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderTop: `2px solid ${mesure.couleur}`, borderRadius: 13, padding: "11px 12px 9px" }}>
      <div style={{ fontSize: 10.5, color: "var(--ls-bbc-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
        <span aria-hidden="true">{mesure.icone}</span>
        {mesure.label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
        <input
          value={saisie}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          aria-label={`${mesure.label}${mesure.unite ? ` en ${mesure.unite}` : ""}`}
          placeholder="—"
          style={{
            width: "100%",
            minWidth: 0,
            background: "transparent",
            border: 0,
            outline: "none",
            color: "var(--ls-bbc-text)",
            fontFamily: "var(--ls-bbc-font-mono)",
            fontWeight: 800,
            fontSize: 22,
            padding: "4px 0 2px",
          }}
        />
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, color: "var(--ls-bbc-hint)", flex: "none" }}>{mesure.unite}</span>
      </div>
      <div style={{ height: 4, borderRadius: 3, background: "var(--ls-bbc-s3)", overflow: "hidden", marginTop: 6 }}>
        <div style={{ width: `${remplissage}%`, height: "100%", borderRadius: 3, background: couleur, transition: "width .25s, background .25s" }} />
      </div>
      <div style={{ fontSize: 9.5, fontFamily: "var(--ls-bbc-font-mono)", marginTop: 5, display: "flex", alignItems: "center", gap: 5, color: couleur === "var(--ls-bbc-lime)" ? "var(--ls-bbc-lime-text)" : couleur }}>
        <span aria-hidden="true" style={{ width: 6, height: 6, borderRadius: 999, flex: "none", background: couleur }} />
        {zone}
      </div>
    </div>
  );
}

export default BbcNewMemberSheet;
