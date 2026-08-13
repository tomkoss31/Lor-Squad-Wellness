// =============================================================================
// audience — la mesure côté site public.
//
// Trois règles, dans l'ordre d'importance :
//
// 1. **Ça ne doit jamais gêner le visiteur.** Aucune erreur remontée, aucun
//    await bloquant, aucun rendu retardé. Une mesure ratée est sans
//    conséquence ; une page qui rame à cause d'elle est un échec.
// 2. **Ça ne doit jamais assommer la base.** On accumule et on envoie par
//    paquets — pas une requête par page vue. La prod est sur une machine à
//    0,5 Go qui est déjà tombée une fois (2026-07-29).
// 3. **Aucune donnée personnelle.** Pas de cookie, pas d'IP, pas
//    d'identifiant persistant. Le marqueur de session vit dans
//    `sessionStorage` et meurt avec l'onglet : il sert UNIQUEMENT à ne pas
//    compter deux fois la même visite. C'est ce qui dispense d'un bandeau
//    cookies — ne pas le remplacer par du localStorage.
// =============================================================================

/** ⚠️ COPIE de la liste de `supabase/functions/audience-collect/index.ts`.
 *  Une edge Deno ne peut pas importer le front. Le test
 *  `src/lib/__tests__/audience.test.ts` lit les DEUX fichiers et casse si
 *  elles divergent — sans lui, une page ajoutée d'un seul côté serait
 *  silencieusement comptée en « /autre » pour toujours. */
export const CHEMINS = [
  "/", "/welcome", "/decouvrir", "/colis",
  "/club", "/club/le-club", "/club/le-rituel", "/club/comment-ca-se-passe",
  "/club/resultats", "/club/nous", "/club/rejoindre", "/club/rejoindre/rdv",
  "/club/rejoindre/rdv/:coach",
  "/bilan-online", "/bilan-online/formulaire", "/bilan-online/resultats",
  "/bilan-online/merci",
  "/bilan-online/:coach", "/bilan-online/:coach/formulaire",
  "/bilan-online/:coach/resultats", "/bilan-online/:coach/merci",
  "/resultat-bilan/:token", "/qualif/:token",
  "/rdv", "/rdv/:coach", "/rdv/gerer/:token",
  "/reserver", "/reserver/:club",
  "/rejoindre", "/rejoindre/questionnaire",
  "/rejoindre/:coach", "/rejoindre/:coach/questionnaire",
  "/rdv-rejoindre-l-equipe",
  "/coach/:coach", "/vip/:coach",
  "/boutique/:coach", "/boutique/:coach/affiliation",
  "/boutique/:coach/produit/:produit", "/boutique/:coach/infos",
  "/news/:slug",
  "/legal/mentions", "/legal/confidentialite", "/legal/cgv",
] as const;

/** Le chemin rangé sous son motif, ou `null` si la page n'est pas publique.
 *  `null` veut dire « on ne mesure pas » : l'app coach n'est pas concernée. */
export function motifDe(chemin: string): string | null {
  const propre = (chemin || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const parts = propre.split("/").filter(Boolean);
  for (const motif of CHEMINS) {
    const mp = motif.split("/").filter(Boolean);
    if (mp.length !== parts.length) continue;
    if (mp.every((seg, i) => seg.startsWith(":") || seg === parts[i])) return motif;
  }
  return null;
}

/** Le slug de coach porté par l'URL, s'il y en a un. Sert à attribuer le
 *  trafic au bon distributeur — la résolution slug → coach se fait côté
 *  serveur, jamais ici. */
export function coachDe(chemin: string): string | null {
  const motif = motifDe(chemin);
  if (!motif) return null;
  const mp = motif.split("/").filter(Boolean);
  const i = mp.indexOf(":coach");
  if (i === -1) return null;
  return chemin.split("?")[0].split("/").filter(Boolean)[i] ?? null;
}

type Evenement =
  | { type: "page"; cle: string; vues: number; visites: number; sorties: number; duree_ms: number; duree_n: number }
  | { type: "clic"; cle: string; n: number }
  | { tunnel: string; etape: string; rang: number; n: number };

const CLE_SESSION = "ls-audience-session";
const DELAI_ENVOI = 15_000;

let file: Evenement[] = [];
let minuteur: ReturnType<typeof setTimeout> | null = null;
let coachCourant: string | null = null;
let pageCourante: string | null = null;
let debutPage = 0;

function estActif(): boolean {
  if (typeof window === "undefined") return false;
  // Respecter un refus explicite de pistage, même pour une mesure anonyme.
  if (navigator.doNotTrack === "1") return false;
  // Ne pas polluer les chiffres avec le dev local.
  return !/^(localhost|127\.|0\.0\.0\.0)/.test(window.location.hostname);
}

/** Les pages déjà vues DANS CET ONGLET. Meurt à sa fermeture. */
function dejaVue(cle: string): boolean {
  try {
    const brut = sessionStorage.getItem(CLE_SESSION);
    const vues: string[] = brut ? JSON.parse(brut) : [];
    if (vues.includes(cle)) return true;
    vues.push(cle);
    sessionStorage.setItem(CLE_SESSION, JSON.stringify(vues.slice(-40)));
    return false;
  } catch {
    // sessionStorage refusé (navigation privée stricte) : on compte la vue,
    // on renonce à l'unicité. Mieux vaut un chiffre approché que rien.
    return false;
  }
}

function envoyer(sync = false): void {
  if (file.length === 0) return;
  const paquet = { events: file.slice(0, 40), coach: coachCourant };
  file = [];
  if (minuteur) { clearTimeout(minuteur); minuteur = null; }

  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/audience-collect`;
  const corps = JSON.stringify(paquet);

  // À la fermeture de l'onglet, `fetch` est tué avant de partir : seul
  // `sendBeacon` survit. C'est lui qui rapporte la durée de la dernière page.
  if (sync && typeof navigator.sendBeacon === "function") {
    try {
      navigator.sendBeacon(url, new Blob([corps], { type: "application/json" }));
      return;
    } catch { /* on retombe sur fetch */ }
  }

  void fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "" },
    body: corps,
    keepalive: true,
  }).catch(() => {
    // Silence volontaire : le visiteur lit une page, il n'a pas à voir
    // qu'une mesure a échoué.
  });
}

function programmer(): void {
  if (minuteur) return;
  minuteur = setTimeout(() => envoyer(false), DELAI_ENVOI);
}

/** Clôt la page en cours en lui attribuant son temps de lecture. */
function cloturer(sortie: boolean): void {
  if (!pageCourante || !debutPage) return;
  const duree = Date.now() - debutPage;
  const precedent = file.find((e) => "type" in e && e.type === "page" && e.cle === pageCourante);
  if (precedent && "duree_ms" in precedent) {
    precedent.duree_ms += duree;
    precedent.duree_n += 1;
    if (sortie) precedent.sorties += 1;
  }
  debutPage = 0;
}

/** Une page vue. Appelée par le routeur, jamais par une page en particulier. */
export function noterPage(chemin: string): void {
  if (!estActif()) return;
  const cle = motifDe(chemin);
  if (!cle) return; // page non publique : on ne mesure rien

  cloturer(false);
  coachCourant = coachDe(chemin) ?? coachCourant;
  pageCourante = cle;
  debutPage = Date.now();

  file.push({
    type: "page", cle, vues: 1,
    visites: dejaVue(cle) ? 0 : 1,
    sorties: 0, duree_ms: 0, duree_n: 0,
  });
  programmer();
}

/** Un bouton nommé. Le nom doit être stable dans le temps — c'est une clé,
 *  pas un libellé : le renommer casse l'historique. */
export function noterClic(nom: string): void {
  if (!estActif()) return;
  file.push({ type: "clic", cle: nom, n: 1 });
  programmer();
}

/** Une étape de tunnel atteinte — la matière du « où ça décroche ». */
export function noterEtape(tunnel: string, etape: string, rang: number): void {
  if (!estActif()) return;
  file.push({ tunnel, etape, rang, n: 1 });
  programmer();
}

let branche = false;

/** Branché une seule fois, au montage du routeur. */
export function demarrerAudience(): void {
  if (branche || !estActif()) return;
  branche = true;

  // `pagehide` plutôt que `beforeunload` : c'est le seul que Safari iOS
  // déclenche réellement, et l'essentiel du trafic public est mobile.
  window.addEventListener("pagehide", () => { cloturer(true); envoyer(true); });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { cloturer(false); envoyer(true); }
    else if (pageCourante) debutPage = Date.now();
  });
}
