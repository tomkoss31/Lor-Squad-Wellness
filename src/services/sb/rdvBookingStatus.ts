// =============================================================================
// rdvBookingStatus — LE seul endroit qui change le statut d'une demande de RDV.
//
// Pourquoi ce fichier existe : trois écrans faisaient la même chose,
// séparément, avec un `update({ status })` nu —
//   • useCoachRdvBookings.ts   (CRM du coach)
//   • useClubDiscoveryBookings.ts (RDV découverte du club)
//   • services/sb/club-bookings.ts (admin club)
// Résultat : quand le coach acceptait, la personne ne recevait RIEN. Elle avait
// lu « on a bien reçu ta demande » à la réservation, et n'apprenait jamais que
// c'était validé.
//
// Ajouter l'email dans les trois aurait garanti qu'un quatrième écran, un jour,
// l'oublie. Tout passe donc ici.
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";

export type RdvBookingStatus = "requested" | "confirmed" | "canceled";

/**
 * Change le statut d'une demande de RDV, et prévient la personne quand le
 * rendez-vous vient d'être accepté.
 *
 * L'email est « best-effort » et volontairement non attendu : si Resend est
 * lent ou en panne, le coach ne doit pas rester bloqué sur un bouton. Le
 * rendez-vous est déjà confirmé en base, c'est ce qui compte.
 *
 * Rien n'est envoyé à l'annulation : décision Thomas du 2026-08-11 — dans ce
 * cas on décroche son téléphone, un mail automatique serait froid.
 */
export async function setRdvBookingStatus(
  id: string,
  status: RdvBookingStatus,
): Promise<{ error: unknown | null }> {
  const sb = await getSupabaseClient();
  if (!sb) return { error: new Error("supabase_indisponible") };

  const { error } = await sb.from("rdv_bookings").update({ status }).eq("id", id);
  if (error) return { error };

  if (status === "confirmed") {
    void sb.functions
      .invoke("rdv-accepted-notify", { body: { booking_id: id } })
      .catch(() => {
        // L'edge se protège déjà (double envoi, contact sans email). Un échec
        // réseau ici ne doit pas remonter jusqu'au coach.
      });
  }

  return { error: null };
}
