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
//
// ── POURQUOI PAS `sb.functions.invoke` (correctif du 15/09) ────────────────
// Le mail « démarre » ne partait JAMAIS. En base, ZÉRO trace du `demarre` sur
// les rendez-vous honorés depuis le 19/08, alors que le `pas_venue` partait.
// Cause : l'appel se fait juste APRÈS la création de la fiche cliente, au
// moment où l'écran se démonte (la feuille membre / la modale se ferme) ou
// navigue (« Ouvrir la fiche », ou le CRM qui bascule sur la conversion). Un
// `fetch` ordinaire lancé en « fire-and-forget » est ALORS annulé par le
// navigateur — Safari le tue entre le préflight et le POST. Les journaux edge
// le montraient exactement : `OPTIONS 200`, puis rien. (Chrome, plus tolérant,
// laissait parfois passer le `pas_venue` — d'où l'asymétrie observée.)
//
// La correction tient en un mot : `keepalive: true`. Le navigateur s'engage
// alors à finir la requête même si la page se démonte, navigue ou se ferme.
// On appelle donc l'edge en direct (pas via `invoke`, qui ne l'expose pas), au
// même endroit et avec les mêmes en-têtes que supabase-js. La fonction est en
// `verify_jwt = false` (auth vérifiée dans la fonction) : la clé anon suffit,
// pas besoin d'attendre la session — ce qui garde l'appel non bloquant.
// =============================================================================

import { getSupabaseClient, resolveSupabaseConfig } from "../supabaseClient";

export type TypeMailApresRdv = "demarre" | "pas_venue";

async function poster(payload: Record<string, unknown>): Promise<void> {
  try {
    const config = await resolveSupabaseConfig();
    if (!config) return;

    // La session si elle est DÉJÀ en cache — on ne l'attend pas : la clé anon
    // suffit (verify_jwt = false). C'est ce qui rend l'appel instantané, donc
    // envoyé avant tout démontage d'écran.
    const sb = await getSupabaseClient();
    let jeton = config.supabaseAnonKey;
    if (sb) {
      const { data } = await sb.auth.getSession();
      if (data.session?.access_token) jeton = data.session.access_token;
    }

    await fetch(`${config.supabaseUrl}/functions/v1/club-mail-apres-rdv`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: config.supabaseAnonKey,
        Authorization: `Bearer ${jeton}`,
      },
      body: JSON.stringify(payload),
      // La seule chose qui compte ici : survivre à la navigation qui suit.
      keepalive: true,
    });
  } catch (e) {
    console.warn("[rdv] mail après rendez-vous non envoyé :", e);
  }
}

/** RDV réservé en ligne (`rdv_bookings`). */
export async function envoyerMailApresRdv(bookingId: string, type: TypeMailApresRdv): Promise<void> {
  await poster({ booking_id: bookingId, type });
}

/** Même mot, pour un RDV calé depuis le CRM (`prospects`, 17/09). */
export async function envoyerMailApresRdvProspect(prospectId: string, type: TypeMailApresRdv): Promise<void> {
  await poster({ prospect_id: prospectId, type });
}
