// =============================================================================
// Le mot d'après-rendez-vous — UN seul chemin.
//
// POURQUOI CE FICHIER (revue d'avant-prod du 31/08) : « elle n'est pas venue »
// existait à DEUX endroits, et les deux ne faisaient pas la même chose.
//   · Agenda  → range le rendez-vous, remet la personne dans la file DEMAIN
//               sous le motif « appelé·e, pas de réponse », ET lui envoie un
//               mot pour reprendre un créneau.
//   · CRM     → range le rendez-vous, la remet dans la file dans DEUX JOURS
//               sous le motif « n'est pas venue au rendez-vous »… et ne lui
//               envoyait rien du tout.
// Selon l'écran depuis lequel le coach cliquait, la personne recevait un mail
// ou pas, et revenait à deux dates différentes. C'est la définition même du
// bug qu'on passe ce chantier à éliminer : un même fait, deux vérités.
//
// L'appel est BEST-EFFORT et silencieux : le geste du coach — marquer venue ou
// pas venue — a déjà réussi et compte pour lui. Un mail qui ne part pas ne doit
// pas faire croire que le rangement a raté.
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";

export type TypeMailApresRdv = "demarre" | "pas_venue";

export async function envoyerMailApresRdv(
  bookingId: string,
  type: TypeMailApresRdv,
): Promise<void> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb.functions.invoke("club-mail-apres-rdv", {
      body: { booking_id: bookingId, type },
    });
  } catch (e) {
    console.warn("[rdv] mail après rendez-vous non envoyé :", e);
  }
}
