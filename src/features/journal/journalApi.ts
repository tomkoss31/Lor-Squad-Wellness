// =============================================================================
// Journal nutritionnel — les appels à la base (21/09/2026).
//
// La membre n'a pas de session : tout passe par les fonctions à jeton de la
// migration 20261215560000 (journal_jour, journal_ajouter…), qui vérifient le
// jeton, calculent les protéines et paient les défis. Chaque écriture renvoie
// la journée à jour : un seul aller-retour, pas d'état à réconcilier.
// La coach passe par SON RLS (journal_semaine_coach & co).
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";
import type { Activite, Aliment, Creneau, EtatJour, Humeur, SemaineCoach } from "./journalCalculs";

// ─── Le catalogue ─────────────────────────────────────────────────────────────
// ~115 aliments, publics, qui changent rarement : chargés une fois par session.
let catalogue: Aliment[] | null = null;
let chargement: Promise<Aliment[]> | null = null;
const CLE_CACHE = "ls-journal-aliments-v1";

export function chargerAliments(): Promise<Aliment[]> {
  if (catalogue) return Promise.resolve(catalogue);
  if (chargement) return chargement;
  chargement = (async () => {
    try {
      const brut = window.sessionStorage.getItem(CLE_CACHE);
      if (brut) {
        catalogue = JSON.parse(brut) as Aliment[];
        return catalogue;
      }
    } catch {
      /* stockage indisponible (navigation privée) : on lit la base */
    }
    const sb = await getSupabaseClient();
    if (!sb) throw new Error("Connexion indisponible. Réessaie dans un instant.");
    const { data, error } = await sb
      .from("journal_aliments")
      .select("cle, nom, famille, herbalife, prot_portion, prot_100g, portions, unite, indice, rangs")
      .eq("actif", true);
    if (error) throw new Error("Impossible de charger la liste des aliments.");
    catalogue = ((data ?? []) as Aliment[]).map((a) => ({
      ...a,
      prot_portion: a.prot_portion == null ? null : Number(a.prot_portion),
      prot_100g: a.prot_100g == null ? null : Number(a.prot_100g),
      rangs: a.rangs ?? {},
    }));
    try {
      window.sessionStorage.setItem(CLE_CACHE, JSON.stringify(catalogue));
    } catch {
      /* pas grave */
    }
    return catalogue;
  })().finally(() => {
    chargement = null;
  });
  return chargement;
}

// ─── Les erreurs, dites comme à une personne ─────────────────────────────────
function lisible(message: string): string {
  if (/jeton invalide/.test(message)) return "Ton lien n'est plus valide. Demande-en un nouveau à ta coach.";
  if (/jour hors du journal/.test(message)) return "Ce jour n'est plus modifiable : le journal se corrige sur 7 jours.";
  if (/quantite invalide/.test(message)) return "Quantité invalide : indique un poids entre 1 et 2 000 g.";
  if (/aliment inconnu/.test(message)) return "Cet aliment n'est plus dans la liste.";
  if (/estimation invalide|lignes invalides/.test(message)) return "Une ligne de Noaly n'est pas passée : retire-la ou choisis dans la liste.";
  if (/non autorise/.test(message)) return "Tu n'as pas accès au journal de cette personne.";
  if (/Failed to fetch|NetworkError|network/i.test(message)) return "Pas de réseau. Réessaie dans un instant.";
  return "Ça n'a pas marché. Réessaie dans un instant.";
}

async function appeler<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Connexion indisponible. Réessaie dans un instant.");
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    console.warn(`[journal] ${fn} :`, error.message);
    throw new Error(lisible(error.message));
  }
  return data as T;
}

// ─── Côté membre (jeton) ──────────────────────────────────────────────────────
export const journalMembre = {
  jour: (token: string, jour: string | null) =>
    appeler<EtatJour>("journal_jour", { p_token: token, p_jour: jour }),
  ajouter: (token: string, jour: string, creneau: Creneau, aliment: string, grammes: number | null, quantite = 1) =>
    appeler<EtatJour>("journal_ajouter", {
      p_token: token, p_jour: jour, p_creneau: creneau, p_aliment: aliment, p_grammes: grammes, p_quantite: quantite,
    }),
  modifier: (token: string, ligne: string, aliment: string | null, grammes: number | null, quantite: number | null) =>
    appeler<EtatJour>("journal_modifier", {
      p_token: token, p_ligne: ligne, p_aliment: aliment, p_grammes: grammes, p_quantite: quantite,
    }),
  retirer: (token: string, ligne: string) => appeler<EtatJour>("journal_retirer", { p_token: token, p_ligne: ligne }),
  /** Les lignes que Noaly a lues dans un repas écrit, relues par la membre (tout ou rien). */
  ajouterLot: (token: string, jour: string, creneau: Creneau, lignes: LigneProposee[]) =>
    appeler<EtatJour>("journal_ajouter_lot", {
      p_token: token, p_jour: jour, p_creneau: creneau,
      p_lignes: lignes.map((l) => (l.aliment
        ? { aliment: l.aliment, grammes: l.grammes, quantite: l.quantite }
        : { libelle: l.nom, grammes: l.grammes, prot_100g: l.prot_100g })),
    }),
  reprendreVeille: (token: string, jour: string, creneau: Creneau) =>
    appeler<EtatJour>("journal_reprendre_veille", { p_token: token, p_jour: jour, p_creneau: creneau }),
  eau: (token: string, jour: string, verres: number, boissonClub: boolean | null) =>
    appeler<EtatJour>("journal_eau", { p_token: token, p_jour: jour, p_verres: verres, p_boisson_club: boissonClub }),
  activite: (token: string, jour: string, activite: Activite | null) =>
    appeler<EtatJour>("journal_activite", { p_token: token, p_jour: jour, p_activite: activite }),
  humeur: (token: string, jour: string, humeur: Humeur | null) =>
    appeler<EtatJour>("journal_humeur", { p_token: token, p_jour: jour, p_humeur: humeur }),
};

// ─── Noaly (edge `journal-noaly`, Claude Sonnet 5) ────────────────────────────
/** Une ligne proposée : du catalogue (aliment) ou estimée par Noaly (aliment null). */
export interface LigneProposee {
  aliment: string | null;
  nom: string;
  grammes: number | null;
  quantite: number;
  prot_g: number;
  prot_100g: number | null;
  /** La quantité (ou la ligne entière) est estimée : la membre pourra corriger. */
  estime: boolean;
}
export interface PropositionNoaly {
  lignes: LigneProposee[];
  non_reconnus: string[];
}

async function appelerNoaly<T>(corps: Record<string, unknown>): Promise<T> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Connexion indisponible. Réessaie dans un instant.");
  const { data, error } = await sb.functions.invoke("journal-noaly", { body: corps });
  if (error) {
    let message = "Noaly ne répond pas pour le moment : choisis dans la liste.";
    try {
      const reponse = (error as { context?: Response }).context;
      const detail = reponse ? await reponse.json() : null;
      if (detail?.error === "cap_reached" && detail.message) message = detail.message;
    } catch {
      /* le message par défaut suffit */
    }
    throw new Error(message);
  }
  return data as T;
}

export const noaly = {
  /** « 150 g de poulet, des carottes et des pâtes » → des lignes à relire. Rien n'est écrit. */
  lireRepas: (token: string, creneau: Creneau, texte: string) =>
    appelerNoaly<PropositionNoaly>({ token, mode: "lire_repas", creneau, texte }),
  /** « Le mot de Noaly » : elle dit le plan calculé par l'app (gardé sur la journée côté serveur). */
  conseil: async (token: string, jour: string, plan: Array<{ creneau: Creneau; aliment: string; grammes: number | null }>) =>
    (await appelerNoaly<{ texte: string }>({ token, mode: "conseil", jour, plan })).texte,
};

// ─── Côté coach (son RLS) ─────────────────────────────────────────────────────
export const journalCoach = {
  semaine: (clientId: string) => appeler<SemaineCoach>("journal_semaine_coach", { p_client_id: clientId }),
  reglerCoef: (clientId: string, coef: number) =>
    appeler<SemaineCoach>("journal_regler_coef", { p_client_id: clientId, p_coef: coef }),
  envoyerRemarque: (clientId: string, texte: string, changements: string[]) =>
    appeler<SemaineCoach>("journal_envoyer_remarque", { p_client_id: clientId, p_texte: texte, p_changements: changements }),
};

/** Le passage de niveau prévient la coach (même edge que l'espace standard). */
export async function prevenirCoachNiveau(token: string, niveau: number): Promise<void> {
  try {
    const sb = await getSupabaseClient();
    if (sb) await sb.functions.invoke("client-app-level-up-notify", { body: { token, level: niveau } });
  } catch {
    /* jamais bloquant */
  }
}

/** Les autres écrans qui affichent l'XP (barre de l'Accueil) se rechargent. */
export function signalerXp(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("ls:client-xp:refresh"));
}
