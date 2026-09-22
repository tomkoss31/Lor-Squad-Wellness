// =============================================================================
// Caler ou déplacer un rendez-vous du club — l'écriture, et la notification.
//
// L'écriture passe par UNE fonction en base, `caler_rdv_club()`, qui revérifie
// le créneau au moment d'écrire (une liste affichée est une photo) et refuse
// un doublon par `creneau_pris`. Ici on traduit ses refus en phrases, et on
// prévient la coach dont on a touché l'agenda — c'est ce qui rend le partage
// tenable : sans ça, elle découvre le rendez-vous le matin même.
// =============================================================================

import { getSupabaseClient } from "../../../services/supabaseClient";

export interface DemandeRdv {
  coachId: string;
  /** ISO 8601. */
  debut: string;
  dureeMin: number;
  prenom: string;
  nom?: string | null;
  telephone?: string | null;
  email?: string | null;
  sourceDetail?: string | null;
  note?: string | null;
  /** Le rendez-vous qu'on déplace, s'il y a lieu. */
  rdvId?: string | null;
  /** Sa table : un rendez-vous de l'agenda, ou un suivi de cliente (18/09). */
  table?: "prospect" | "suivi";
}

export type ResultatRdv = { ok: true; id: string } | { ok: false; raison: "creneau_pris" | "refuse" | "reseau"; message: string };

const MESSAGES: Record<string, string> = {
  creneau_pris: "Ce créneau vient d'être pris — choisis-en un autre.",
  coach_hors_club: "Cette coach n'est pas dans ton club.",
  creneau_invalide: "Ce créneau n'est pas valable.",
  prenom_requis: "Il manque le prénom.",
  rendez_vous_introuvable: "Ce rendez-vous n'existe plus.",
  suivi_reste_avec_sa_coach: "Un suivi reste avec sa coach : choisis un créneau chez elle.",
};

function refus(message: string): ResultatRdv {
  const cle = Object.keys(MESSAGES).find((k) => message.includes(k));
  if (cle === "creneau_pris") return { ok: false, raison: "creneau_pris", message: MESSAGES[cle] };
  return { ok: false, raison: "refuse", message: cle ? MESSAGES[cle] : "Le rendez-vous n'a pas pu être enregistré." };
}

/**
 * La prochaine pesée d'une membre (22/09) : un SUIVI de SA fiche, chez SA coach
 * (`caler_suivi_membre`). Jamais un rendez-vous de prospect : à la venue, l'app
 * aurait proposé de lui créer une nouvelle fiche. Une cliente n'a qu'UN prochain
 * suivi : celui-ci remplace le précédent.
 */
export async function calerSuivi(d: { clientId: string; debut: string; dureeMin: number }): Promise<ResultatRdv> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, raison: "reseau", message: "Pas de connexion." };
    const { data, error } = await sb.rpc("caler_suivi_membre", { p_client: d.clientId, p_debut: d.debut, p_duree_min: d.dureeMin });
    if (error) return refus(error.message);
    return { ok: true, id: String(data) };
  } catch {
    return { ok: false, raison: "reseau", message: "Le rendez-vous n'a pas pu être enregistré. Réessaie." };
  }
}

export async function calerRdv(d: DemandeRdv): Promise<ResultatRdv> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, raison: "reseau", message: "Pas de connexion." };
    const { data, error } = await sb.rpc("caler_rdv_club", {
      p_coach: d.coachId,
      p_debut: d.debut,
      p_duree_min: d.dureeMin,
      p_prenom: d.prenom,
      p_nom: d.nom ?? null,
      p_telephone: d.telephone ?? null,
      p_email: d.email ?? null,
      p_source: "Autre",
      p_source_detail: d.sourceDetail ?? "Agenda du club",
      p_note: d.note ?? null,
      p_rdv_id: d.rdvId ?? null,
      p_table: d.table ?? "prospect",
    });
    if (error) return refus(error.message);
    return { ok: true, id: String(data) };
  } catch {
    return { ok: false, raison: "reseau", message: "Le rendez-vous n'a pas pu être enregistré. Réessaie." };
  }
}

/**
 * Prévient qui veut l'être (22/09, Thomas : « le client lead, lui, reçoit, mais le
 * choix est au coach ») : chacune selon SON réglage (`users.notif_agenda`, la
 * cloche de l'agenda) — la coach dont on a touché l'agenda (« les miens », le
 * défaut) et celles qui suivent « tout le club ». La base décide
 * (`agenda_a_prevenir`), jamais soi-même. Jamais bloquant : un push qui échoue ne
 * doit pas faire croire que le rendez-vous n'est pas pris. La personne qui a
 * rendez-vous a sa confirmation par ailleurs, quel que soit ce réglage.
 */
export async function prevenirCoach(coachId: string, moiId: string | null | undefined, titre: string, texte: string, chezPrenom?: string): Promise<void> {
  if (!coachId) return;
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    let destinataires: Array<{ user_id: string; est_son_agenda: boolean }>;
    const { data, error } = await sb.rpc("agenda_a_prevenir", { p_coach: coachId });
    if (error || !Array.isArray(data)) {
      // Repli : l'ancien comportement (sa coach seulement) plutôt que le silence.
      destinataires = coachId !== moiId ? [{ user_id: coachId, est_son_agenda: true }] : [];
    } else {
      destinataires = data as Array<{ user_id: string; est_son_agenda: boolean }>;
    }
    await Promise.all(
      destinataires.map((d) =>
        sb.functions.invoke("send-push", {
          body: {
            user_id: d.user_id,
            title: titre,
            body: d.est_son_agenda || !chezPrenom ? texte : `${texte} (agenda de ${chezPrenom})`,
            url: "/agenda",
            type: "agenda_club",
          },
        }),
      ),
    );
  } catch {
    // silent-fail
  }
}
