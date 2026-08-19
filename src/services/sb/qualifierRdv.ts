// =============================================================================
// qualifierRdv — ce qui se passe APRÈS qu'une personne du club a démarré.
//
// Chantier « qualifier depuis l'agenda » (Thomas, 19/08). Sa fiche vient d'être
// créée (membre du club ou suivi classique) ; il reste à ranger derrière :
//
//   • son rendez-vous quitte l'agenda      → status = 'honored'
//   • son lead quitte la liste du CRM      → status = 'converted'
//
// ── POURQUOI « honored » ET PAS « canceled » ──────────────────────────────
// Parce qu'elle EST venue. Marquer annulé aurait fait trois dégâts : le taux de
// présence du club serait devenu faux, le créneau serait reparti à la vente
// (`get_club_discovery_availability` ne compte pas les annulés), et on aurait
// perdu la seule trace de sa présence. D'où le quatrième état, ajouté le 19/08.
//
// ── POURQUOI « converted » ET PAS UNE SUPPRESSION ─────────────────────────
// Décision Thomas du 19/08 : on garde d'où elle vient, comment elle a connu le
// club et qui l'a convertie. C'est ce qui alimente les statistiques
// d'attribution — les effacer reviendrait à ne plus jamais savoir ce qui
// fonctionne.
//
// ── LES DEUX ÉCRITURES SONT INDÉPENDANTES, ET C'EST VOULU ─────────────────
// Si le lead ne se retrouve pas (une réservation sans email, un lead effacé à
// la main), le rendez-vous doit QUAND MÊME sortir de l'agenda. On renvoie donc
// le détail de ce qui a marché plutôt qu'un booléen : l'appelant peut le dire
// honnêtement, au lieu d'afficher « c'est réglé » sur un rangement à moitié
// fait.
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";

export interface ResultatQualification {
  rdvRange: boolean;
  leadRange: boolean;
  /** Le message d'erreur du rendez-vous, seul échec qui mérite d'être montré. */
  erreurRdv: string | null;
}

/**
 * @param bookingId  le rendez-vous qui vient d'être honoré
 * @param contact    son email, pour retrouver le lead correspondant. C'est la
 *                   seule clé commune : il n'y a pas de lead_id sur
 *                   rdv_bookings.
 */
export async function marquerRdvQualifie(
  bookingId: string,
  contact: string | null | undefined,
): Promise<ResultatQualification> {
  const sb = await getSupabaseClient();
  if (!sb) return { rdvRange: false, leadRange: false, erreurRdv: "Service indisponible." };

  // 1. Le rendez-vous. `.select("id")` n'est pas décoratif : un UPDATE refusé
  // par la RLS ne renvoie PAS d'erreur, il renvoie zéro ligne. Sans ça on
  // annoncerait un succès qui n'a pas eu lieu (piège déjà payé le 16/08).
  const { data: touche, error: eRdv } = await sb
    .from("rdv_bookings")
    .update({ status: "honored" })
    .eq("id", bookingId)
    .select("id");

  const rdvRange = !eRdv && Array.isArray(touche) && touche.length > 0;
  const erreurRdv = eRdv
    ? eRdv.message
    : rdvRange
      ? null
      : "Le rendez-vous n'a pas pu être rangé (droits insuffisants ?).";

  // 2. Le lead. Deux égalités plutôt qu'une comparaison insensible à la casse :
  // un motif SQL obligerait à échapper les jokers, et le tiret bas est un
  // caractère valide dans une adresse.
  let leadRange = false;
  const mail = (contact ?? "").trim();
  if (mail.includes("@")) {
    for (const forme of [...new Set([mail, mail.toLowerCase()])]) {
      const { data: leads } = await sb
        .from("prospect_leads")
        .update({ status: "converted" })
        .eq("email", forme)
        .neq("status", "converted")
        .select("id");
      if (Array.isArray(leads) && leads.length > 0) leadRange = true;
    }
  }

  return { rdvRange, leadRange, erreurRdv };
}
