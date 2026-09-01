// =============================================================================
// « Cette personne vient d'ouvrir l'app » — le signal qui manquait.
//
// LE BUG (01/09/2026) : `users.last_access_at` n'était écrit qu'à la connexion
// par MOT DE PASSE. Or l'app est une PWA à session persistante — on ne repasse
// plus jamais par ce formulaire une fois connecté. La colonne gelait donc à la
// date de la dernière saisie de mot de passe : jusqu'à 62 jours de retard, et
// `null` pour quelqu'un qui faisait 3 bilans en un mois.
//
// ⚠️ POURQUOI C'ÉTAIT GRAVE. C'est la colonne qu'on lit pour répondre à « qui
// utilise encore l'app ? » — donc celle sur laquelle on décide de supprimer une
// fonctionnalité. Un chiffre mort fait supprimer des choses vivantes.
//
// ── DEUX GARDE-FOUS, ET LE SEUL QUI COMPTE EST CÔTÉ BASE ───────────────────
//   · ici : un souvenir dans le navigateur, qui évite l'aller-retour réseau.
//     Confort seulement — il saute en navigation privée, il est propre à chaque
//     appareil, et on ne lui fait donc AUCUNE confiance.
//   · en base : `touch_last_access()` n'écrit qu'une fois par heure. C'est LUI
//     qui garantit qu'on n'inonde pas la table `users`, lue par tout le monde.
//
// Silencieux par construction : mesurer une visite ne doit jamais gêner
// quelqu'un qui travaille. Un échec se voit dans la console, nulle part ailleurs.
// =============================================================================

import { getSupabaseClient } from "../supabaseClient";

const CLE = "ls-dernier-acces-marque";

/** Six heures : bien plus court qu'une journée de travail (on veut la marque
 *  même si quelqu'un ouvre l'app le matin puis le soir), bien plus long qu'une
 *  navigation (on ne veut pas un appel par page). */
export const FENETRE_MS = 6 * 60 * 60 * 1000;

/**
 * Faut-il redemander au serveur ? Fonction pure — c'est elle qu'on teste.
 *
 * `dernier` est ce que le navigateur a retenu. Illisible, absent ou farfelu
 * (horloge reculée, valeur bidouillée) → on appelle : une écriture de trop ne
 * coûte rien, une mesure manquée fausse une décision.
 */
export function doitMarquer(dernier: string | null, maintenant: number): boolean {
  if (!dernier) return true;
  const t = Number(dernier);
  if (!Number.isFinite(t)) return true;
  if (t > maintenant) return true; // horloge incohérente : on ne se fie pas à elle
  return maintenant - t >= FENETRE_MS;
}

/** Marque le passage. Ne rend jamais d'erreur : l'appelant n'a rien à en faire. */
export async function marquerDernierAcces(): Promise<void> {
  try {
    let memoire: string | null = null;
    try {
      memoire = window.localStorage.getItem(CLE);
    } catch {
      // Stockage refusé (navigation privée, quota) : on appellera, c'est tout.
    }
    if (!doitMarquer(memoire, Date.now())) return;

    const sb = await getSupabaseClient();
    if (!sb) return;
    const { error } = await sb.rpc("touch_last_access");
    if (error) {
      console.warn("[acces] dernier accès non marqué :", error.message);
      return;
    }
    try {
      window.localStorage.setItem(CLE, String(Date.now()));
    } catch {
      // Sans mémoire, on refera l'appel à la prochaine ouverture. La base, elle,
      // n'écrira qu'une fois par heure de toute façon.
    }
  } catch (e) {
    console.warn("[acces] dernier accès non marqué :", e);
  }
}
