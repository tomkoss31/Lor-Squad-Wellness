// =============================================================================
// cacheFraicheur — « cette donnée, elle vaut combien de temps ? »
//
// Le socle de la logique d'ouverture (chantier lenteur, 2026-08-12).
//
// LE CONSTAT QUI A MENÉ ICI
//
// Mesuré sur la prod : 45 requêtes à l'ouverture du Co-pilote, dont la moitié
// pour des compteurs et des pastilles. Et surtout, mesuré côté usage :
//
//   Rentabilité (saisies PV) ...... dernière écriture il y a 48 jours
//   Rappels coach ................. il y a 37 jours, 2 lignes en tout
//   Check-list du jour ............ il y a 50 jours, 9 cochages
//
// Ces données sont rechargées à CHAQUE ouverture, plusieurs fois par jour, par
// plusieurs coachs. Le PV du mois ne bouge pas entre 9 h et 9 h 05. Les
// anniversaires du jour, encore moins.
//
// POURQUOI UN CACHE EN MÉMOIRE NE SUFFIT PAS
//
// Les deux mutualisations déjà faites (useCrmBadge, useAnnouncements) gardent
// leur cache dans une Map de module : il disparaît au rechargement de la page.
// « Une fois par jour » deviendrait donc « une fois par rechargement » — ce qui
// ne change rien pour quelqu'un qui rouvre son onglet dix fois dans la journée.
//
// D'où la persistance optionnelle : au-delà d'une heure de fraîcheur, on écrit
// dans le localStorage, et la donnée survit au F5 comme à la fermeture.
//
// CE QUE ÇA NE FAIT PAS
//
// Ce n'est pas un cache de requêtes SQL — c'est un cache de RÉSULTATS, par clé
// métier. Le rythme se décide par la nature de la donnée, pas par la table :
// « mes clients » se relit toujours, « mes anniversaires du jour » une fois par
// jour, « qui s'est connecté » une fois par semaine.
// =============================================================================

/** Les rythmes, nommés par ce qu'ils veulent dire — pas par leur durée. */
export const FRAICHEUR = {
  /** Ce qui bouge quand le coach agit : clients, suivis, messages, leads. */
  TOUJOURS: 0,
  /** Compteurs et pastilles : justes à la minute près, ça suffit. */
  MINUTE: 60_000,
  /** Ce qui change dans la journée sans urgence. */
  HEURE: 60 * 60_000,
  /** PV du mois, clients dormants — décision Thomas du 2026-08-12. */
  JOUR: 24 * 60 * 60_000,
  /** Suivi de connexion : « j'y passe très rarement » (Thomas). */
  SEMAINE: 7 * 24 * 60 * 60_000,
} as const;

/**
 * « Une fois par jour » n'est pas « toutes les 24 heures ».
 *
 * Un cache de 24 h glissantes chargé à 23 h resterait valable jusqu'au
 * lendemain 23 h : les anniversaires du jour et le PV du mois seraient ceux de
 * la veille pendant toute la journée. En datant la clé, elle change d'elle-même
 * au passage de minuit — et le 1er du mois, le PV repart forcément de zéro.
 */
export function cleDuJour(base: string, d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${base}@${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Pas d'équivalent hebdomadaire : le seul candidat était le suivi de connexion,
// et il est réglé plus franchement — il ne part plus du tout au démarrage, et
// son panneau ne se charge qu'en l'ouvrant (Paramètres → Profil). Un cache
// d'une semaine sur un écran qu'on ouvre exprès afficherait des chiffres morts.

interface Entree<T> { valeur: T; at: number }

const memoire = new Map<string, Entree<unknown>>();
const enVol = new Map<string, Promise<unknown>>();
const abonnes = new Map<string, Set<(v: unknown) => void>>();

const PREFIXE = "ls-cache-";
/** En dessous d'une heure, persister coûte plus que ça ne rapporte. */
const SEUIL_PERSISTANCE = FRAICHEUR.HEURE;

function lirePersiste<T>(cle: string): Entree<T> | null {
  try {
    const brut = localStorage.getItem(PREFIXE + cle);
    if (!brut) return null;
    const e = JSON.parse(brut) as Entree<T>;
    return typeof e?.at === "number" ? e : null;
  } catch {
    return null; // quota, mode privé, JSON abîmé — on recharge, c'est tout
  }
}

function ecrirePersiste<T>(cle: string, e: Entree<T>): void {
  try {
    localStorage.setItem(PREFIXE + cle, JSON.stringify(e));
  } catch {
    /* quota plein : le cache mémoire prend le relais pour cette session */
  }
}

function frais(e: Entree<unknown> | null | undefined, fraicheurMs: number): boolean {
  return !!e && fraicheurMs > 0 && Date.now() - e.at < fraicheurMs;
}

/**
 * Les clés datées (`cleDuJour`) ne sont jamais relues une fois la journée
 * passée : sans ce balayage, le navigateur en accumulerait une par jour et par
 * donnée, indéfiniment, jusqu'à saturer son quota. On passe une fois au
 * démarrage et on jette tout ce qui a plus de deux semaines — au-delà, même la
 * fraîcheur la plus longue (SEMAINE) est périmée.
 */
let balayageFait = false;
function balayerLesVieilleries(): void {
  if (balayageFait) return;
  balayageFait = true;
  try {
    const limite = Date.now() - 2 * FRAICHEUR.SEMAINE;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith(PREFIXE)) continue;
      try {
        const e = JSON.parse(localStorage.getItem(k) ?? "") as Entree<unknown>;
        if (typeof e?.at !== "number" || e.at < limite) localStorage.removeItem(k);
      } catch {
        localStorage.removeItem(k); // illisible = inutile
      }
    }
  } catch { /* mode privé, quota : sans conséquence */ }
}

/**
 * Lit une donnée en respectant son rythme.
 *
 * - encore fraîche → renvoyée sans toucher au réseau ;
 * - déjà en cours de chargement → on attend LA MÊME requête, on n'en lance pas
 *   une seconde (c'est ce qui règle les hooks montés plusieurs fois) ;
 * - sinon → on charge, on mémorise, on prévient les abonnés.
 *
 * @param cle          identifiant métier, stable. Inclure l'id utilisateur
 *                     quand la donnée en dépend, sinon deux comptes se
 *                     partageraient le même cache.
 * @param fraicheurMs  une valeur de FRAICHEUR.
 * @param charger      la vraie lecture, appelée seulement si nécessaire.
 */
export async function lireAvecFraicheur<T>(
  cle: string,
  fraicheurMs: number,
  charger: () => Promise<T>,
  options?: { forcer?: boolean },
): Promise<T> {
  balayerLesVieilleries();

  if (!options?.forcer) {
    const enMemoire = memoire.get(cle) as Entree<T> | undefined;
    if (frais(enMemoire, fraicheurMs)) return enMemoire!.valeur;

    if (fraicheurMs >= SEUIL_PERSISTANCE) {
      const persiste = lirePersiste<T>(cle);
      if (frais(persiste, fraicheurMs)) {
        memoire.set(cle, persiste as Entree<unknown>);
        return persiste!.valeur;
      }
    }

    const dejaEnRoute = enVol.get(cle) as Promise<T> | undefined;
    if (dejaEnRoute) return dejaEnRoute;
  }

  const travail = (async () => {
    const valeur = await charger();
    const e: Entree<T> = { valeur, at: Date.now() };
    memoire.set(cle, e as Entree<unknown>);
    if (fraicheurMs >= SEUIL_PERSISTANCE) ecrirePersiste(cle, e);
    abonnes.get(cle)?.forEach((f) => f(valeur));
    return valeur;
  })();

  enVol.set(cle, travail as Promise<unknown>);
  try {
    return await travail;
  } finally {
    enVol.delete(cle);
  }
}

/** S'abonner aux rafraîchissements d'une clé. Renvoie de quoi se désabonner. */
export function suivre<T>(cle: string, f: (v: T) => void): () => void {
  let set = abonnes.get(cle);
  if (!set) { set = new Set(); abonnes.set(cle, set); }
  set.add(f as (v: unknown) => void);
  return () => {
    set!.delete(f as (v: unknown) => void);
    if (set!.size === 0) abonnes.delete(cle);
  };
}

/** Oublier une clé — après une écriture qui rend le cache faux. */
export function oublier(cle: string): void {
  memoire.delete(cle);
  try { localStorage.removeItem(PREFIXE + cle); } catch { /* ignore */ }
}

/**
 * Vider tout le cache. À appeler à la DÉCONNEXION : sans ça, le suivant qui se
 * connecte sur le même navigateur verrait les données du précédent tant
 * qu'elles sont fraîches.
 */
export function viderTout(): void {
  memoire.clear();
  enVol.clear();
  try {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIXE)) localStorage.removeItem(k);
    }
  } catch { /* ignore */ }
}
