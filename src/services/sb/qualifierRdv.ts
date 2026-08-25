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
import { clesDoublon } from "../../features/crm/cleDoublon";

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

  // 2. Le lead.
  //
  // ⚠️ 25/08 — deux trous ici, remontés par Thomas (« corrige aussi les bilans
  // online ») :
  //
  //   a) on ne cherchait QUE dans `prospect_leads`. Une personne venue par le
  //      bilan en ligne n'était donc JAMAIS refermée : son rendez-vous quittait
  //      l'agenda, mais elle restait dans la liste du CRM à relancer alors
  //      qu'elle avait déjà démarré.
  //   b) on ne comparait que l'email, par égalité exacte. On passe par la clé
  //      unique du CRM (`cleDoublon`), qui gère l'adresse ET le numéro
  //      normalisés — même correctif que l'attribution des RDV le même jour.
  //
  // ⚠️⚠️ LES DEUX TABLES N'ONT NI LA MÊME COLONNE NI LE MÊME VOCABULAIRE :
  //   · `prospect_leads.status`     accepte « converted », PAS « qualified »
  //   · `online_bilans.lead_status` accepte « qualified », PAS « converted »
  // Un statut hors liste fait rejeter TOUT l'update, en silence, et la personne
  // disparaît de la file. Pour un bilan, « converti » ne se dit donc pas dans
  // le statut : il se lit sur `converted_to_client_id` (cf. `mapBilanStatus`,
  // hooks/useCrmLeads.ts) — c'est CE champ qui le sort de la liste.
  let leadRange = false;
  const clesContact = clesDoublon({ contact: contact ?? null });

  if (clesContact.length > 0) {
    // La fiche cliente vient d'être créée : on la retrouve par les mêmes clés,
    // pour pouvoir RELIER le bilan à son client (sans ce lien, le bilan reste
    // « en cours » quoi qu'on écrive dans son statut).
    const { data: clients } = await sb.from("clients").select("id, phone, email").limit(1000);
    const client = ((clients ?? []) as Array<{ id: string; phone: string | null; email: string | null }>)
      .find((c) => clesDoublon(c).some((k) => clesContact.includes(k)));

    // ── prospect_leads : « converted » est son mot ────────────────────────
    const { data: pl } = await sb.from("prospect_leads").select("id, phone, email").limit(1000);
    const idsPl = ((pl ?? []) as Array<{ id: string; phone: string | null; email: string | null }>)
      .filter((l) => clesDoublon(l).some((k) => clesContact.includes(k)))
      .map((l) => l.id);
    if (idsPl.length > 0) {
      const { data: maj } = await sb
        .from("prospect_leads")
        .update({ status: "converted" })
        .in("id", idsPl)
        .neq("status", "converted")
        .select("id");
      if (Array.isArray(maj) && maj.length > 0) leadRange = true;
    }

    // ── online_bilans : le lien vers le client, PAS un statut « converted » ─
    const { data: ob } = await sb.from("online_bilans").select("id, phone, email").limit(1000);
    const idsOb = ((ob ?? []) as Array<{ id: string; phone: string | null; email: string | null }>)
      .filter((l) => clesDoublon(l).some((k) => clesContact.includes(k)))
      .map((l) => l.id);
    if (idsOb.length > 0 && client) {
      const { data: maj } = await sb
        .from("online_bilans")
        .update({ converted_to_client_id: client.id, converted_at: new Date().toISOString() })
        .in("id", idsOb)
        .is("converted_to_client_id", null)
        .select("id");
      if (Array.isArray(maj) && maj.length > 0) leadRange = true;
    }
  }

  return { rdvRange, leadRange, erreurRdv };
}
