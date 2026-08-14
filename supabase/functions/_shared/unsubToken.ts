// =============================================================================
// _shared/unsubToken.ts — le lien de désinscription, signé.
//
// ── POURQUOI SIGNER ────────────────────────────────────────────────────────
//
// Le lien doit contenir l'adresse : la newsletter part à quatre publics
// différents (clients, distributeurs, leads colis, inscrits du site club) et
// le HTML est construit une seule fois pour tout le monde — il n'y a pas
// d'identifiant de ligne à mettre dedans avant l'envoi.
//
// Mais une adresse en clair dans une URL, c'est un bouton « désabonne
// n'importe qui » : il suffit de deviner une adresse. La signature rend le
// lien infalsifiable sans rien stocker et sans table supplémentaire.
//
// HMAC-SHA256 avec la clé de service comme secret — elle ne quitte jamais le
// serveur. Tronquée à 24 caractères : assez long pour être hors de portée,
// assez court pour un lien lisible dans un mail.
// =============================================================================

const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

/** base64 « url-safe » : un lien ne doit contenir ni `+`, ni `/`, ni `=`. */
function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function hmac(message: string): Promise<string> {
  const cle = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cle, new TextEncoder().encode(message));
  return b64url(new Uint8Array(sig)).slice(0, 24);
}

/** L'adresse est toujours normalisée avant signature : « Marie@X.FR » et
 *  « marie@x.fr » doivent donner le même lien, sinon un même humain se
 *  retrouve avec deux jetons et une désinscription qui ne prend pas. */
export function normaliserEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function signerEmail(email: string): Promise<string> {
  return hmac(normaliserEmail(email));
}

/**
 * Comparaison en temps constant.
 *
 * Une comparaison `===` sur une signature laisse fuir sa longueur commune :
 * en mesurant les temps de réponse, on peut reconstruire un jeton valide
 * caractère par caractère. Le coût de faire propre est nul, on fait propre.
 */
export async function verifierEmail(email: string, signature: string): Promise<boolean> {
  const attendue = await signerEmail(email);
  if (attendue.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < attendue.length; i++) {
    diff |= attendue.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

/** L'URL complète, prête à coller dans un mail. */
export async function lienDesinscription(email: string, baseUrl: string): Promise<string> {
  const sig = await signerEmail(email);
  const e = encodeURIComponent(normaliserEmail(email));
  return `${baseUrl}/functions/v1/newsletter-unsubscribe?e=${e}&s=${sig}`;
}
