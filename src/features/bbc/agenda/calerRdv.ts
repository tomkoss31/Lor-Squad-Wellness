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
    if (error) {
      const cle = Object.keys(MESSAGES).find((k) => error.message.includes(k));
      if (cle === "creneau_pris") return { ok: false, raison: "creneau_pris", message: MESSAGES[cle] };
      return { ok: false, raison: "refuse", message: cle ? MESSAGES[cle] : "Le rendez-vous n'a pas pu être enregistré." };
    }
    return { ok: true, id: String(data) };
  } catch {
    return { ok: false, raison: "reseau", message: "Le rendez-vous n'a pas pu être enregistré. Réessaie." };
  }
}

/**
 * Prévient la coach dont on a touché l'agenda. Jamais soi-même, jamais
 * bloquant : un push qui échoue ne doit pas faire croire que le rendez-vous
 * n'est pas pris.
 */
export async function prevenirCoach(coachId: string, moiId: string | null | undefined, titre: string, texte: string): Promise<void> {
  if (!coachId || coachId === moiId) return;
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb.functions.invoke("send-push", {
      body: { user_id: coachId, title: titre, body: texte, url: "/agenda", type: "agenda_club" },
    });
  } catch {
    // silent-fail
  }
}
