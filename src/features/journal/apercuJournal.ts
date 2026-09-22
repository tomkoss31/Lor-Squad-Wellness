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
    sortie.push({
      clientId,
      jours,
      joursNotes: Math.max(0, Number(r.jours_notes) || 0),
      protMoy: r.prot_moy == null || !Number.isFinite(prot) ? null : Math.round(prot),
      derniere: typeof r.derniere === "string" ? r.derniere : null,
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
