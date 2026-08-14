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

export type MotifAttente = "lead" | "bilan-en-ligne" | "suivi-en-retard" | "relance";

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
  /** Ce qui s'est passé au dernier contact — choisit le message de 2e tentative. */
  derniereReponse?: string | null;
}

/** Un encaissement reçu — la seule victoire que l'app ait à annoncer. */
export interface PaiementRecu {
  id: string;
  nom: string;
  montantEur: number;
  payeLe: string;
  telephone: string | null;
}

interface Resultat {
  /** Ce qui m'est attribué. */
  mesAttentes: Attente[];
  /** Admin seulement : ce qui attend chez quelqu'un d'autre. */
  attentesEquipe: Attente[];
  /** Encaissements récents, à saluer. */
  paiements: PaiementRecu[];
  chargement: boolean;
  /** Force une relecture — après avoir traité quelqu'un, par exemple. */
  relire: () => void;
}

/** Au-delà, ce n'est plus « viens de payer » — on ne remercie pas la veille. */
const FENETRE_PAIEMENT_JOURS = 2;

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

/** Ce qu'on lit sous le nom quand la personne revient : ce qui s'était passé.
 *  Volontairement dupliqué depuis `features/crm/qualification` — ce hook est
 *  bas niveau et ne doit pas dépendre d'un module d'écran. */
const RESUME_REPONSE: Record<string, string> = {
  pas_de_reponse: "Appelé·e, pas de réponse",
  rappellera: "Devait rappeler",
  ne_sait_pas: "Hésitait encore",
  pas_maintenant: "Ce n'était pas le moment",
};

interface LigneBrute {
  attente: Attente;
  proprietaire: string | null;
}

interface Lecture {
  lignes: LigneBrute[];
  paiements: PaiementRecu[];
}

export function useFileDuJour(
  coachId: string | null | undefined,
  options?: { estAdmin?: boolean; nomParId?: Record<string, string> },
): Resultat {
  const estAdmin = options?.estAdmin ?? false;
  const nomParId = options?.nomParId;
  const [lecture, setLecture] = useState<Lecture>({ lignes: [], paiements: [] });
  const [chargement, setChargement] = useState(true);
  const lignes = lecture.lignes;

  const charger = useCallback(
    async (forcer = false) => {
      if (!coachId) {
        setLecture({ lignes: [], paiements: [] });
        setChargement(false);
        return;
      }
      setChargement(true);
      try {
        const brut = await lireAvecFraicheur<Lecture>(
          `file-du-jour:${coachId}`,
          FRAICHEUR.MINUTE,
          async () => {
            const sb = await getSupabaseClient();
            if (!sb) return { lignes: [], paiements: [] };

            const depuis = new Date(Date.now() - FENETRE_PAIEMENT_JOURS * JOUR_MS).toISOString();
            const nowIso = new Date().toISOString();

            // TROIS selects, UN SEUL aller-retour. On ne rajoute pas de cascade
            // au démarrage : c'est exactement ce qu'on a passé la matinée à
            // retirer. Pas de filtre propriétaire sur les deux premiers — le
            // RLS décide, et on partitionne ensuite « à moi » / « à l'équipe ».
            const [leads, bilans, encaissements] = await Promise.all([
              // Deux populations, une seule requête chacune :
              //   · jamais contactés  (status = new)
              //   · relance DUE       (une échéance posée par la qualification)
              // Sans la seconde, tout ce qu'on qualifie « rappeler demain » ne
              // remonterait jamais — c'est précisément le trou d'origine.
              sb
                .from("prospect_leads")
                .select("id, first_name, phone, created_at, source, assigned_to_user_id, referrer_user_id, relance_due_at, relance_done_at, derniere_reponse, status")
                .or(`and(contacted_at.is.null,status.eq.new),and(relance_due_at.lte.${nowIso},relance_done_at.is.null)`),
              sb
                .from("online_bilans")
                .select("id, first_name, phone, completed_at, result_token, assigned_to_user_id, relance_due_at, relance_done_at, derniere_reponse, lead_status")
                .not("completed_at", "is", null)
                .is("converted_to_client_id", null)
                .or(`and(contacted_at.is.null,lead_status.eq.new),and(relance_due_at.lte.${nowIso},relance_done_at.is.null)`),
              // ⚠️ `.eq(coach_user_id)` OBLIGATOIRE : la policy bilan_orders a
              // une branche admin, sans quoi Thomas et Mélanie verraient les
              // encaissements de toute l'équipe comme les leurs.
              sb
                .from("bilan_orders")
                .select("id, prospect_first_name, amount_cents, paid_at, buyer_phone")
                .eq("coach_user_id", coachId)
                .eq("status", "paid")
                .gte("paid_at", depuis)
                .order("paid_at", { ascending: false })
                .limit(5),
            ]);

            const sortie: LigneBrute[] = [];

            for (const brute of leads.data ?? []) {
              const r = brute as {
                id: string; first_name: string | null; phone: string | null;
                created_at: string; source: string | null;
                assigned_to_user_id: string | null; referrer_user_id: string | null;
                relance_due_at: string | null; relance_done_at: string | null;
                derniere_reponse: string | null;
              };
              const via = r.source ? SOURCE_LISIBLE[r.source] ?? r.source : null;
              // Une échéance ouverte et arrivée à terme = c'est une RELANCE :
              // on a déjà parlé à cette personne, le message et le libellé
              // doivent le dire.
              const estRelance = Boolean(r.relance_due_at) && !r.relance_done_at;
              sortie.push({
                // ⚠️ `submit-prospect-lead` n'écrit JAMAIS `assigned_to_user_id` :
                // seulement `referrer_user_id`. Un lead venu d'un tunnel public
                // serait donc orphelin — invisible chez son coach, et rangé
                // « chez ton équipe · responsable : personne » chez l'admin.
                // Le CRM (useCrmLeads:578) et le cron de relance résolvent tous
                // deux par ce repli ; la file s'en écartait.
                proprietaire: r.assigned_to_user_id ?? r.referrer_user_id,
                attente: {
                  cle: `lead:${r.id}`,
                  qui: prenom(r.first_name),
                  motifCourt: estRelance ? "À rappeler" : "Jamais rappelé",
                  pourquoi: estRelance
                    ? `${RESUME_REPONSE[r.derniere_reponse ?? ""] ?? "Tu avais dit de le/la rappeler"} — c'est aujourd'hui`
                    : via
                      ? `A laissé son numéro sur ${via}`
                      : "A laissé son numéro",
                  // ⚠️ L'ancienneté se compte depuis que LA PERSONNE est
                  // arrivée, jamais depuis l'échéance qu'on s'est fixée. Sinon
                  // une relance due ce matin vaut « 0 jour » et passe derrière
                  // tout le monde — donc elle ne remonte jamais, ce qui vide
                  // le mécanisme de son sens (vu à l'écran le 13/08).
                  jours: joursDepuis(r.created_at),
                  motif: estRelance ? "relance" : "lead",
                  derniereReponse: r.derniere_reponse ?? null,
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
                relance_due_at: string | null; relance_done_at: string | null;
                derniere_reponse: string | null;
              };
              const estRelance = Boolean(r.relance_due_at) && !r.relance_done_at;
              sortie.push({
                proprietaire: r.assigned_to_user_id,
                attente: {
                  cle: `bilan:${r.id}`,
                  qui: prenom(r.first_name),
                  motifCourt: estRelance ? "À rappeler" : "Bilan en ligne",
                  pourquoi: estRelance
                    ? `${RESUME_REPONSE[r.derniere_reponse ?? ""] ?? "Tu avais dit de le/la rappeler"} — c'est aujourd'hui`
                    : "A rempli son bilan en entier, sans réponse",
                  jours: joursDepuis(r.completed_at),
                  motif: estRelance ? "relance" : "bilan-en-ligne",
                  derniereReponse: r.derniere_reponse ?? null,
                  rang: RANG.mainLevee,
                  telephone: r.phone,
                  chemin: `/crm/leads/${r.id}`,
                },
              });
            }

            // ⚠️ `amount_cents` est en CENTIMES. Les edges existantes formatent
            // en `.toFixed(0)` et perdent les centimes — on ne recopie pas.
            const paiements: PaiementRecu[] = (encaissements.data ?? []).map((brute) => {
              const r = brute as {
                id: string; prospect_first_name: string | null;
                amount_cents: number | null; paid_at: string; buyer_phone: string | null;
              };
              return {
                id: r.id,
                nom: prenom(r.prospect_first_name),
                montantEur: (r.amount_cents ?? 0) / 100,
                payeLe: r.paid_at,
                telephone: r.buyer_phone,
              };
            });

            return { lignes: sortie, paiements };
          },
          { forcer },
        );
        setLecture(brut);
      } catch (e) {
        // La file est un confort : si elle échoue, le Plan du jour garde ses
        // relances. On ne casse pas l'écran d'accueil pour ça.
        console.warn("[useFileDuJour] lecture impossible :", e);
        setLecture({ lignes: [], paiements: [] });
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
    if (coachId) oublier(`file-du-jour:${coachId}`);
    void charger(true);
  }, [charger, coachId]);

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

  return { mesAttentes, attentesEquipe, paiements: lecture.paiements, chargement, relire };
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
