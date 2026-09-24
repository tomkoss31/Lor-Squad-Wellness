// =============================================================================
// Co-pilote › Journal — la logique pure de l'aperçu (22/09/2026, maquette
// validée par Thomas : « c'est pas mal comme ça, on essaie, on verra »).
//
// La base rend celles qui tiennent leur journal (`journal_apercu_coach`, les 7
// derniers jours) ; la liste complète est celle de « Dossiers clients »
// (`visibleClients`). Ici on assemble les deux : EN TÊTE celles qui notent
// vraiment, dessous les clientes en suivi qui ne notent pas encore. Sans
// recherche, le bas de liste se limite aux clientes actives ; avec une
// recherche, tout le monde est trouvable (une cliente en pause aussi).
// Pur et testé : aucun appel, aucune date lue.
// =============================================================================

import { isClientProgramStarted } from "../../lib/calculations";
import type { Client, LifecycleStatus } from "../../types/domain";

/** Une case de la semaine : 1 = elle a noté · 2 = pré-rempli du club seul · 0 = rien. */
export type CaseJour = 0 | 1 | 2;

export interface ApercuJournal {
  clientId: string;
  /** 7 cases, de J-6 à aujourd'hui. */
  jours: CaseJour[];
  joursNotes: number;
  /** Protéines moyennes (g) des jours où elle a noté. */
  protMoy: number | null;
  /** AAAA-MM-JJ : le dernier jour où elle a noté. */
  derniere: string | null;
  /** Protéines (g) et eau (L) de chaque jour, de J-6 à aujourd'hui (24/09). */
  protJours: number[];
  eauJours: number[];
  /** Ses objectifs (null sans bilan pesé pour les protéines). */
  objProt: number | null;
  objEau: number | null;
}

// ─── Les couleurs (maquette ForqHsP3stVu45NSEvPnZZ, 24/09) ───────────────────
// teal = atteint (≥ 90 %) · ambre = à moitié (50-90 %) · corail = décroche (< 50 %,
// ou rien depuis 3 jours). La journée EN COURS n'est jamais corail : elle n'est pas finie.
export type Ton = "ok" | "mid" | "bas";
/** Une ligne de la liste : « neutre » = elle note, mais sans bilan pesé on ne sait pas juger ses protéines. */
export type TonLigne = Ton | "neutre";
export type EtatBarre = "ok" | "mid" | "bas" | "encours" | "note" | "club" | "vide";

export function tonDe(pct: number): Ton {
  return pct >= 90 ? "ok" : pct >= 50 ? "mid" : "bas";
}

/** La couleur d'une barre du jour `i` (0 = J-6, 6 = aujourd'hui). */
export function etatBarre(a: ApercuJournal, i: number): EtatBarre {
  const c = a.jours[i];
  if (c === 0) return "vide";
  if (c === 2) return "club";
  if (a.objProt == null || a.objProt <= 0) return "note";
  const pct = ((a.protJours[i] ?? 0) / a.objProt) * 100;
  const t = tonDe(pct);
  return t === "ok" ? "ok" : i === 6 ? "encours" : t;
}

export interface ResumeApercu {
  /** Protéines moyennes (g) des jours finis où elle a noté — le même chiffre que son récap (recapCoach). */
  protMoy: number | null;
  /** La même moyenne en % de l'objectif (null sans objectif). */
  protPct: number | null;
  ton: TonLigne;
  /** Eau moyenne (L) des jours finis où elle en a noté, et combien de jours à l'objectif sur les 7. */
  eauMoy: number | null;
  eauJoursOk: number;
  /** Jours pleins sans rien depuis le dernier noté. */
  silence: number;
}

function joursEntre(a: string, b: string): number {
  const [y1, m1, d1] = a.split("-").map(Number);
  const [y2, m2, d2] = b.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

export function resumeApercu(a: ApercuJournal, jourIso: string): ResumeApercu {
  // Les jours FINIS où elle a noté (case 1 : le pré-rempli du club seul ne compte
  // pas) ; aujourd'hui seulement s'il n'y a rien d'autre — une journée en cours
  // ferait chuter la moyenne. La même règle que son récap (recapCoach).
  const jours = (v: number[]) => {
    const finis = [0, 1, 2, 3, 4, 5].filter((i) => a.jours[i] === 1 && (v[i] ?? 0) > 0);
    return finis.length ? finis : a.jours[6] === 1 && (v[6] ?? 0) > 0 ? [6] : [];
  };
  const moyenne = (v: number[]) => {
    const js = jours(v);
    return js.length ? js.reduce((s, i) => s + (v[i] ?? 0), 0) / js.length : null;
  };
  const moy = moyenne(a.protJours);
  const eau = moyenne(a.eauJours);
  const protPct = moy != null && a.objProt ? Math.round((moy / a.objProt) * 100) : null;
  const eauJoursOk = a.objEau ? a.eauJours.filter((e) => e >= a.objEau! - 0.05).length : 0;
  const silence = a.derniere ? Math.max(0, joursEntre(a.derniere, jourIso)) : 7;
  const ton: TonLigne = silence >= 3 ? "bas" : protPct == null ? "neutre" : tonDe(protPct);
  return {
    protMoy: moy == null ? null : Math.round(moy),
    protPct,
    ton,
    eauMoy: eau == null ? null : Math.round(eau * 10) / 10,
    eauJoursOk,
    silence,
  };
}

/** La bande du haut : combien le tiennent, et la part des jours à l'objectif (jours finis seulement). */
export function chiffresApercu(apercus: ApercuJournal[]): { tiennent: number; protPct: number | null; eauPct: number | null } {
  let pJ = 0, pOk = 0, eJ = 0, eOk = 0;
  for (const a of apercus) {
    if (a.joursNotes <= 0) continue;
    for (let i = 0; i < 6; i++) {
      if (a.jours[i] !== 1) continue;
      if (a.objProt && (a.protJours[i] ?? 0) > 0) { pJ++; if ((a.protJours[i] / a.objProt) * 100 >= 90) pOk++; }
      if (a.objEau && (a.eauJours[i] ?? 0) > 0) { eJ++; if (a.eauJours[i] >= a.objEau - 0.05) eOk++; }
    }
  }
  return {
    tiennent: apercus.filter((a) => a.joursNotes > 0).length,
    protPct: pJ ? Math.round((pOk / pJ) * 100) : null,
    eauPct: eJ ? Math.round((eOk / eJ) * 100) : null,
  };
}

export interface LigneApercu {
  client: Client;
  apercu: ApercuJournal | null;
}

/** Ce que rend la base → des lignes sûres (une ligne abîmée est écartée, jamais un plantage). */
export function normaliserApercu(brut: unknown): ApercuJournal[] {
  if (!Array.isArray(brut)) return [];
  const sortie: ApercuJournal[] = [];
  for (const r of brut as Array<Record<string, unknown>>) {
    const clientId = typeof r?.client_id === "string" ? r.client_id : null;
    if (!clientId) continue;
    const cases = Array.isArray(r.jours) ? (r.jours as unknown[]) : [];
    const jours = Array.from({ length: 7 }, (_, i) => {
      const v = Number(cases[i]);
      return (v === 1 || v === 2 ? v : 0) as CaseJour;
    });
    const prot = Number(r.prot_moy);
    const sept = (v: unknown) => {
      const t = Array.isArray(v) ? (v as unknown[]) : [];
      return Array.from({ length: 7 }, (_, i) => {
        const n = Number(t[i]);
        return Number.isFinite(n) && n > 0 ? n : 0;
      });
    };
    const objP = Number(r.obj_prot);
    const objE = Number(r.obj_eau);
    sortie.push({
      clientId,
      jours,
      joursNotes: Math.max(0, Number(r.jours_notes) || 0),
      protMoy: r.prot_moy == null || !Number.isFinite(prot) ? null : Math.round(prot),
      derniere: typeof r.derniere === "string" ? r.derniere : null,
      protJours: sept(r.prot_jours),
      eauJours: sept(r.eau_jours),
      objProt: r.obj_prot != null && Number.isFinite(objP) && objP > 0 ? objP : null,
      objEau: r.obj_eau != null && Number.isFinite(objE) && objE > 0 ? objE : null,
    });
  }
  return sortie;
}

/** Le jour de Paris d'un instant, en AAAA-MM-JJ : la même borne que la base (`now() at time zone 'Europe/Paris'`). */
export function jourParis(ms: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ms);
  const v = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${v("year")}-${v("month")}-${v("day")}`;
}

const LETTRES = ["D", "L", "M", "M", "J", "V", "S"];
const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/** Les 7 cases de J-6 à `jourIso` : la lettre (sur la case vide) et le nom (pour la lecture d'écran). */
export function joursDeLaSemaine(jourIso: string): Array<{ lettre: string; nom: string }> {
  const [a, m, j] = jourIso.split("-").map(Number);
  const base = Date.UTC(a || 1970, (m || 1) - 1, j || 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base - (6 - i) * 86_400_000).getUTCDay();
    return { lettre: LETTRES[d], nom: NOMS_JOURS[d] };
  });
}

export function nomClient(c: Pick<Client, "firstName" | "lastName">): string {
  return `${(c.firstName ?? "").trim()} ${(c.lastName ?? "").trim()}`.trim() || "—";
}

/** Pour chercher « helene » et trouver « Hélène ». */
export function pourRecherche(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Le statut qu'affiche « Dossiers clients » (même règle, ClientsPage). */
function statutEffectif(c: Client): LifecycleStatus {
  return c.lifecycleStatus ?? (isClientProgramStarted(c) ? "active" : "not_started");
}

const parNom = (a: LigneApercu, b: LigneApercu) =>
  nomClient(a.client).localeCompare(nomClient(b.client), "fr", { sensitivity: "base" });

export function repartirApercu(
  clients: Client[],
  apercus: ApercuJournal[],
  recherche: string,
): { tiennent: LigneApercu[]; autres: LigneApercu[] } {
  const q = pourRecherche(recherche);
  const parClient = new Map(apercus.map((a) => [a.clientId, a]));
  const tiennent: LigneApercu[] = [];
  const autres: LigneApercu[] = [];
  for (const client of clients) {
    if (q && !pourRecherche(nomClient(client)).includes(q)) continue;
    const apercu = parClient.get(client.id) ?? null;
    if (apercu && apercu.joursNotes > 0) {
      tiennent.push({ client, apercu });
    } else if (q || statutEffectif(client) === "active") {
      autres.push({ client, apercu: null });
    }
  }
  tiennent.sort(
    (a, b) =>
      (b.apercu?.joursNotes ?? 0) - (a.apercu?.joursNotes ?? 0) ||
      (b.apercu?.derniere ?? "").localeCompare(a.apercu?.derniere ?? "") ||
      parNom(a, b),
  );
  autres.sort(parNom);
  return { tiennent, autres };
}
