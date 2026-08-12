// =============================================================================
// useFileDuJour — les gens qui attendent une réponse de toi.
//
// LE CONSTAT (mesuré en base le 12/08/2026, pas déduit)
//
// La file du Plan du jour ne connaissait QUE les clients dormants. Sur le
// Co-pilote de Thomas ça donnait « 0 / 2 traité » : Clément, 111 jours sans
// commande, et un second dormant. Pendant ce temps, invisibles partout :
//
//   Florian .... a laissé son numéro sur le tunnel colis ......... 5 jours
//   un suivi ... calé par Thomas lui-même, jamais fait ........... 44 jours
//   et chez Mélanie : CINQ personnes venues du site du club en 48 h,
//   pas une seule rappelée.
//
// L'app proposait de réveiller quelqu'un qui n'a rien demandé, et taisait
// ceux qui avaient levé la main.
//
// ── L'ORDRE, ET POURQUOI CE N'EST PAS L'ANCIENNETÉ ─────────────────────────
//
// Trier sur les jours mettrait Clément (111 j) en tête. Or il n'attend rien :
// il a cessé de commander. Florian, lui, a laissé son numéro et espère un
// appel. D'où deux rangs avant l'ancienneté :
//
//   1. qui a levé la main sans obtenir de réponse   (leads, bilans en ligne)
//   2. ce que TU t'étais engagé à faire             (suivis en retard)
//   3. qui s'est éteint doucement                   (dormants — déjà en place)
//
// ── LES DEUX PIÈGES DE SCHÉMA ──────────────────────────────────────────────
//
// 1. `online_bilans` porte DEUX propriétaires, et ils divergent sur 4 lignes
//    sur 12. `coach_user_id` = le tunnel d'où vient la personne ;
//    `assigned_to_user_id` = à qui on l'a confiée. **C'est le second qui fait
//    foi** : Florian arrive par le tunnel de Mélanie mais a été attribué à
//    Thomas. Se tromper de colonne, c'est mettre le travail dans la file du
//    mauvais coach.
//
// 2. Thomas : « ils sont tous contactés mais j'ai aucun moyen de les sortir du
//    CRM ». Donc on ne ressort JAMAIS quelqu'un qu'il a déjà classé —
//    `status`/`lead_status` doivent valoir `new`. Une personne marquée perdue
//    l'est parce qu'il l'a décidé ; la lui remettre sous le nez chaque matin
//    serait exactement le bruit qu'on vient de retirer de l'app.
//
// ── COÛT ────────────────────────────────────────────────────────────────────
//
// DEUX requêtes, pas six : `useCrmLeads` en fait six (parrainages, réservations,
// archives, clients…) dont la file n'a que faire. Elles passent par le socle de
// fraîcheur — plusieurs montages du Co-pilote ne déclenchent qu'un aller.
// =============================================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import { FRAICHEUR, lireAvecFraicheur, oublier } from "../lib/cacheFraicheur";

/** Ce qu'un rang vaut dans l'ordre — plus petit passe devant. */
export const RANG = { mainLevee: 0, engagement: 1, dormant: 2 } as const;

export type MotifAttente = "lead" | "bilan-en-ligne" | "suivi-en-retard";

export interface Attente {
  cle: string;
  /** Prénom, ou « Quelqu'un » si la source ne l'a pas. */
  qui: string;
  /** L'étiquette courte de la ligne. */
  motifCourt: string;
  /** La raison, en clair, telle qu'on l'affiche sous le nom. */
  pourquoi: string;
  /** Jours d'attente — sert au tri ET à l'affichage. */
  jours: number;
  motif: MotifAttente;
  rang: number;
  telephone: string | null;
  /** Où l'ouvrir quand on tape la ligne. */
  chemin: string;
  /** Renseigné seulement pour le bloc « personne ne s'en occupe » (admin). */
  responsable?: string;
}

interface Resultat {
  /** Ce qui m'est attribué. */
  mesAttentes: Attente[];
  /** Admin seulement : ce qui attend chez quelqu'un d'autre. */
  attentesEquipe: Attente[];
  chargement: boolean;
  /** Force une relecture — après avoir traité quelqu'un, par exemple. */
  relire: () => void;
}

const JOUR_MS = 86_400_000;

function joursDepuis(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / JOUR_MS));
}

const prenom = (v: string | null | undefined) => (v ?? "").trim() || "Quelqu'un";

/** « site-club » → « site du club », pour que la ligne se lise à voix haute. */
const SOURCE_LISIBLE: Record<string, string> = {
  "site-club": "le site du club",
  colis: "le tunnel colis",
  "rejoindre-funnel": "la page « rejoindre »",
  welcome: "la page d'accueil",
};

interface LigneBrute {
  attente: Attente;
  proprietaire: string | null;
}

export function useFileDuJour(
  coachId: string | null | undefined,
  options?: { estAdmin?: boolean; nomParId?: Record<string, string> },
): Resultat {
  const estAdmin = options?.estAdmin ?? false;
  const nomParId = options?.nomParId;
  const [lignes, setLignes] = useState<LigneBrute[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(
    async (forcer = false) => {
      if (!coachId) {
        setLignes([]);
        setChargement(false);
        return;
      }
      setChargement(true);
      try {
        const brut = await lireAvecFraicheur<LigneBrute[]>(
          "file-du-jour",
          FRAICHEUR.MINUTE,
          async () => {
            const sb = await getSupabaseClient();
            if (!sb) return [];

            // Les deux seules lectures dont la file a besoin. Pas de filtre sur
            // le propriétaire : le RLS décide déjà de ce que ce coach peut voir,
            // et on partitionne ensuite « à moi » / « à l'équipe ».
            const [leads, bilans] = await Promise.all([
              sb
                .from("prospect_leads")
                .select("id, first_name, phone, created_at, source, assigned_to_user_id")
                .is("contacted_at", null)
                .eq("status", "new"),
              sb
                .from("online_bilans")
                .select("id, first_name, phone, completed_at, result_token, assigned_to_user_id")
                .is("contacted_at", null)
                .not("completed_at", "is", null)
                .is("converted_to_client_id", null)
                .eq("lead_status", "new"),
            ]);

            const sortie: LigneBrute[] = [];

            for (const brute of leads.data ?? []) {
              const r = brute as {
                id: string; first_name: string | null; phone: string | null;
                created_at: string; source: string | null; assigned_to_user_id: string | null;
              };
              const via = r.source ? SOURCE_LISIBLE[r.source] ?? r.source : null;
              sortie.push({
                proprietaire: r.assigned_to_user_id,
                attente: {
                  cle: `lead:${r.id}`,
                  qui: prenom(r.first_name),
                  motifCourt: "Jamais rappelé",
                  pourquoi: via
                    ? `A laissé son numéro sur ${via}`
                    : "A laissé son numéro",
                  jours: joursDepuis(r.created_at),
                  motif: "lead",
                  rang: RANG.mainLevee,
                  telephone: r.phone,
                  chemin: "/crm",
                },
              });
            }

            for (const brute of bilans.data ?? []) {
              const r = brute as {
                id: string; first_name: string | null; phone: string | null;
                completed_at: string; assigned_to_user_id: string | null;
              };
              sortie.push({
                proprietaire: r.assigned_to_user_id,
                attente: {
                  cle: `bilan:${r.id}`,
                  qui: prenom(r.first_name),
                  motifCourt: "Bilan en ligne",
                  pourquoi: "A rempli son bilan en entier, sans réponse",
                  jours: joursDepuis(r.completed_at),
                  motif: "bilan-en-ligne",
                  rang: RANG.mainLevee,
                  telephone: r.phone,
                  chemin: `/crm/leads/${r.id}`,
                },
              });
            }

            return sortie;
          },
          { forcer },
        );
        setLignes(brut);
      } catch (e) {
        // La file est un confort : si elle échoue, le Plan du jour garde ses
        // relances. On ne casse pas l'écran d'accueil pour ça.
        console.warn("[useFileDuJour] lecture impossible :", e);
        setLignes([]);
      } finally {
        setChargement(false);
      }
    },
    [coachId],
  );

  useEffect(() => {
    void charger();
  }, [charger]);

  const relire = useCallback(() => {
    oublier("file-du-jour");
    void charger(true);
  }, [charger]);

  const { mesAttentes, attentesEquipe } = useMemo(() => {
    const miennes: Attente[] = [];
    const equipe: Attente[] = [];
    for (const l of lignes) {
      if (l.proprietaire && l.proprietaire === coachId) {
        miennes.push(l.attente);
      } else if (estAdmin) {
        // Un admin doit voir que le club génère des contacts que personne
        // n'appelle — mais dans un bloc à part, avec le nom du responsable.
        // Ce n'est pas SON travail, c'est son information.
        equipe.push({
          ...l.attente,
          responsable: l.proprietaire ? nomParId?.[l.proprietaire] ?? "un coach" : "personne",
        });
      }
    }
    return {
      mesAttentes: miennes.sort(parRangPuisAnciennete),
      attentesEquipe: equipe.sort(parRangPuisAnciennete),
    };
  }, [lignes, coachId, estAdmin, nomParId]);

  return { mesAttentes, attentesEquipe, chargement, relire };
}

function parRangPuisAnciennete(a: Attente, b: Attente): number {
  return a.rang - b.rang || b.jours - a.jours;
}

/**
 * Fabrique les lignes « suivi en retard » à partir de ce qu'AppContext a DÉJÀ
 * chargé — inutile de redemander au serveur ce qui est en mémoire.
 */
export function suivisEnRetardVersAttentes(
  suivis: { id: string; clientId: string; clientName: string; dueDate: string }[],
): Attente[] {
  return suivis.map((s) => ({
    cle: `suivi:${s.id}`,
    qui: prenom(s.clientName),
    motifCourt: "Suivi en retard",
    pourquoi: "Un point que tu avais calé, jamais fait",
    jours: joursDepuis(s.dueDate),
    motif: "suivi-en-retard" as const,
    rang: RANG.engagement,
    telephone: null,
    chemin: `/clients/${s.clientId}?tab=actions`,
  }));
}

/** Tri final commun, exporté pour être testable seul. */
export function ordonner(attentes: Attente[]): Attente[] {
  return [...attentes].sort(parRangPuisAnciennete);
}
