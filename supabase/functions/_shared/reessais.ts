// =============================================================================
// Relancer une LECTURE quand la base cale — jamais une écriture.
//
// LE CONSTAT (14/09/2026, incident Nano). Sur 24 h, chaque 504 tombait à
// l'heure exacte d'un robot planifié, sur la PREMIÈRE table qu'il lit :
// `follow_ups` à :05/:35 (rappels RDV), `prospect_leads` toutes les 10 min
// (créneau manquant), `formation_user_progress` à :25, `shop_orders` à :40,
// `bilan_orders` à :50. Les lectures suivantes du même passage, elles,
// passaient toujours. Le premier appel après un silence cale ~5 s — ce qui a
// dormi a été rangé dans le swap d'un serveur à 407 Mo de RAM — et PostgREST le
// coupe. Relancer tombe sur une base réveillée.
//
// ⚠️ SEULEMENT GET / HEAD. Un 504 sur un POST ou un PATCH peut arriver APRÈS
// l'enregistrement : le rejouer créerait un doublon (deux mails, deux lignes,
// deux notifications). Les RPC passent en POST : elles ne sont pas relancées.
//
// Budget : on ne relance plus au-delà de 9 s écoulées sur un même appel.
// pg_net n'attend que 15 s certains robots (`rdv-imminent-notifier`) ; une
// seule lecture ne doit pas consommer toute l'attente.
//
// Branché par `getServiceClient({ reessais: true })` (push.ts) ou par
// `createClient(url, key, { global: { fetch: fetchLecturesAvecReessais } })`.
// =============================================================================

const STATUTS_A_RELANCER = new Set([502, 503, 504]);
const ESSAIS_MAX = 3;
const BUDGET_MS = 9_000;

/** L'adresse sans ses filtres : ils peuvent contenir un email ou un nom. */
function adresseSansFiltres(input: string | URL | Request): string {
  const brut = input instanceof Request ? input.url : String(input);
  return brut.split("?")[0];
}

export async function fetchLecturesAvecReessais(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const methode = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  if (methode !== "GET" && methode !== "HEAD") return fetch(input, init);

  const debut = Date.now();
  for (let essai = 1; ; essai++) {
    const dernierEssai = essai >= ESSAIS_MAX;
    try {
      const reponse = await fetch(input, init);
      if (!STATUTS_A_RELANCER.has(reponse.status) || dernierEssai || Date.now() - debut > BUDGET_MS) {
        return reponse;
      }
      console.warn(`[reessais] ${reponse.status} sur ${adresseSansFiltres(input)} — essai ${essai + 1}`);
      // Libère la réponse abandonnée avant de relancer.
      await reponse.body?.cancel();
    } catch (err) {
      if (init?.signal?.aborted || dernierEssai || Date.now() - debut > BUDGET_MS) throw err;
      console.warn(`[reessais] réseau sur ${adresseSansFiltres(input)} — essai ${essai + 1}`);
    }
    await new Promise((ok) => setTimeout(ok, 700 * essai));
  }
}
