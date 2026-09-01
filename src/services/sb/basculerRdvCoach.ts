// =============================================================================
// « Ce rendez-vous est pour moi » — la bascule d'un coach à l'autre.
//
// POURQUOI (Thomas, 01/09) : « les leads BBC arrivent pour Mélanie, il faut
// qu'on les bascule manuellement ». C'est exact — le tunnel du club attribue
// chaque réservation au coach par défaut (`discovery.default_coach_user_id`,
// aujourd'hui Mélanie). Mesuré ce jour-là : 9 des 11 rendez-vous à venir.
//
// Le geste existait déjà, mais à l'envers et deux écrans plus loin : ouvrir le
// CRM, trouver la fiche du lead, changer son propriétaire — et le rendez-vous
// suit (mécanique du 19/08). On fait ici le chemin inverse, depuis la semaine.
//
// ⚠️ ON ÉCRIT DES DEUX CÔTÉS, ET C'EST LE POINT ENTIER DE CE FICHIER.
// Ne déplacer que le rendez-vous laisserait la fiche du lead chez l'autre : à
// la première réattribution dans le CRM, le rendez-vous repartirait d'où il
// vient, sans que personne comprenne pourquoi. Deux vérités pour un même fait,
// c'est le défaut qu'on passe la journée à retirer de cette app. Un geste, une
// vérité : le rendez-vous ET la fiche changent de main ensemble.
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";
import { clesDoublon } from "../../features/crm/cleDoublon";

/** Les tables du CRM qui portent un propriétaire assignable. */
const TABLES_LEAD = ["prospect_leads", "online_bilans"] as const;

export interface ResultatBascule {
  /** Message à montrer si ça a échoué. `null` = c'est passé. */
  erreur: string | null;
  /** La fiche du lead a-t-elle suivi ? Faux = rendez-vous déplacé seul. */
  ficheSuivie: boolean;
}

/**
 * Donne ce rendez-vous à un autre coach.
 *
 * Rend une erreur SEULEMENT si le rendez-vous lui-même n'a pas bougé : c'est le
 * geste que le coach vient de demander. Si la fiche ne suit pas (aucun lead
 * correspondant, droits refusés), on le signale par `ficheSuivie: false` plutôt
 * que d'annuler un déplacement qui, lui, a réussi.
 */
export async function basculerRdvVersCoach(params: {
  bookingId: string;
  /** Le contact de la réservation — seule clé commune avec le CRM. */
  contact: string | null;
  versCoachId: string;
}): Promise<ResultatBascule> {
  const { bookingId, contact, versCoachId } = params;
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { erreur: "Service indisponible.", ficheSuivie: false };

    // ── 1. Le rendez-vous ───────────────────────────────────────────────
    // `.select("id")` obligatoire : un UPDATE refusé par la RLS ne renvoie
    // AUCUNE erreur, il renvoie zéro ligne. Sans ça, l'écran annoncerait un
    // succès qui n'a pas eu lieu — piège déjà payé trois fois dans ce projet.
    const { data: bouge, error } = await sb
      .from("rdv_bookings")
      .update({ coach_user_id: versCoachId })
      .eq("id", bookingId)
      .select("id");
    if (error) return { erreur: error.message, ficheSuivie: false };
    if (!bouge || bouge.length === 0) {
      return {
        erreur: "Ce rendez-vous n'a pas pu être déplacé — recharge la page et réessaie.",
        ficheSuivie: false,
      };
    }

    // ── 2. La fiche du lead suit ────────────────────────────────────────
    // Best-effort : le geste principal est déjà passé. On rapproche par la clé
    // du CRM, qui normalise l'adresse ET le numéro — comparer les chaînes
    // brutes ratait une réservation sur vingt (une majuscule dans un email).
    const cles = clesDoublon({ contact });
    if (cles.length === 0) return { erreur: null, ficheSuivie: false };

    let suivie = false;
    for (const table of TABLES_LEAD) {
      const { data: lignes } = await sb
        .from(table)
        .select("id, phone, email")
        .limit(1000);
      const ids = ((lignes ?? []) as Array<{ id: string; phone: string | null; email: string | null }>)
        .filter((l) => clesDoublon(l).some((k) => cles.includes(k)))
        .map((l) => l.id);
      if (ids.length === 0) continue;

      const { data: majs, error: eLead } = await sb
        .from(table)
        .update({ assigned_to_user_id: versCoachId })
        .in("id", ids)
        .select("id");
      if (eLead) {
        console.warn(`[bascule] fiche ${table} non suivie : ${eLead.message}`);
        continue;
      }
      if (Array.isArray(majs) && majs.length > 0) suivie = true;
    }

    return { erreur: null, ficheSuivie: suivie };
  } catch (e) {
    return {
      erreur: e instanceof Error ? e.message : "Bascule impossible.",
      ficheSuivie: false,
    };
  }
}
