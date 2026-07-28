// =============================================================================
// useBbcRole — à quelle marche de l'échelle BBC en est celui qui lit l'écran.
//
// POURQUOI CE HOOK EXISTE. La Formation annonçait « TU ES Coach stagiaire » en
// dur, à tout le monde — donc aussi au propriétaire du club, à qui l'écran
// expliquait ensuite que son club restait à ouvrir. Un écran qui se trompe sur
// son lecteur perd la confiance du lecteur sur TOUT le reste, contenu compris.
//
// ⚠️ NE PAS brancher `usePilotageLevel` ici, même si le patron se ressemble
// beaucoup. Ses 5 niveaux (nouveau / actif / ambassadeur / leader / dort)
// décrivent l'ACTIVITÉ d'un distributeur classique, pas les 5 marches du
// Playbook BBC (Membre → Stagiaire → Junior → Propriétaire → Roll out).
// Afficher « Ambassadeur » sur une échelle où cette marche n'existe pas serait
// un deuxième mensonge par-dessus le premier. On réutilise le PATRON — override
// d'abord, dérivation de faits ensuite, silent-fail — jamais la RPC.
//
// ORDRE DE DÉRIVATION : on descend du HAUT de l'échelle vers le bas, jamais
// l'inverse. Un fait FORT (je possède un club actif) doit écraser un fait faible
// ou pas encore saisi. Concrètement : `client_referrals` est vide en base alors
// que le club de Thomas tourne — l'absence de donnée n'est pas une preuve
// d'absence de progression. Dérivée « en montant » (3 cœurs → stagiaire,
// pré-lancement → propriétaire), l'échelle le rétrograderait en Membre, c'est-
// à-dire PIRE que le « Coach stagiaire » en dur qu'on corrige.
//
// FAIL-OPEN : pas de session, RLS qui refuse, migration pas encore poussée →
// `role = null`. La vue n'affiche alors AUCUN badge de marche et ne verrouille
// RIEN. Le pire cas doit être « on ne sait pas », jamais « c'est fermé ».
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { ClubSettings } from "../../types/domain";
import { isHeart } from "./useBbcHearts";

export type BbcRole = "membre" | "stagiaire" | "junior" | "proprietaire" | "rollout";

/** Du bas vers le haut de l'échelle. Sert au tri ET à la comparaison de marches. */
export const BBC_ROLE_ORDER: BbcRole[] = ["membre", "stagiaire", "junior", "proprietaire", "rollout"];

/** Position sur l'échelle (0 = Membre). -1 si inconnue. */
export function bbcRoleRank(role: BbcRole | null): number {
  return role ? BBC_ROLE_ORDER.indexOf(role) : -1;
}

/** Nombre de cœurs qui débloque la marche « coach stagiaire » (Playbook). */
export const STAGIAIRE_HEARTS = 3;

export interface UseBbcRoleResult {
  /** null = on ne sait pas (et on n'invente pas). */
  role: BbcRole | null;
  /** D'où vient la marche affichée — sert à l'expliquer au lecteur. */
  source: "override" | "club" | "equipe" | "prelancement" | "coeurs" | null;
  loading: boolean;
  isAdmin: boolean;
  clubsOwned: number;
  hearts: number;
  /**
   * RÈGLE ABSOLUE : un admin, un propriétaire de club, ou un lecteur dont on
   * n'a pas pu établir la marche ⇒ AUCUN module verrouillé. Évaluée avant tout
   * calcul de marche. Un module de formation lu trop tôt ne casse rien ; un
   * module fermé à tort humilie.
   */
  fullAccess: boolean;
  /**
   * Réglages du club actif. La Formation est montée sans aucune prop
   * (`<BbcFormation />` dans BbcApp) : elle n'a pas d'autre chemin pour
   * connaître les jours de rituels et le barème des cœurs de son club, et ces
   * valeurs ne doivent JAMAIS être figées dans le texte des modules. Le club
   * est déjà chargé ici pour la dérivation — on renvoie ses réglages plutôt que
   * de refaire un aller-retour.
   */
  clubSettings: ClubSettings | null;
  userId: string | null;
  refetch: () => Promise<void>;
}

interface Faits {
  isAdmin: boolean;
  clubsOwned: number;
  clubSettings: ClubSettings | null;
  hearts: number;
  prelaunchDone: number;
  /** Filleul direct qui possède lui-même un club actif = le modèle se duplique. */
  filleulAvecClub: boolean;
  override: BbcRole | null;
  /** false = on n'a rien pu lire du tout → on ne conclut rien. */
  lu: boolean;
}

const VIDE: Faits = {
  isAdmin: false,
  clubsOwned: 0,
  clubSettings: null,
  hearts: 0,
  prelaunchDone: 0,
  filleulAvecClub: false,
  override: null,
  lu: false,
};

function estUneMarche(v: unknown): v is BbcRole {
  return typeof v === "string" && (BBC_ROLE_ORDER as string[]).includes(v);
}

/**
 * La dérivation, isolée pour rester lisible et testable de tête.
 * Premier match gagnant, du haut vers le bas.
 *
 * « Membre » n'est JAMAIS dérivé : cet écran ne se lit que depuis
 * l'environnement coach, et surtout un lecteur sans aucun signal n'est pas un
 * membre — c'est un lecteur sur qui on ne sait rien. On renvoie null, la vue
 * reste neutre et tout reste ouvert.
 */
function deriver(f: Faits): { role: BbcRole | null; source: UseBbcRoleResult["source"] } {
  if (f.override) return { role: f.override, source: "override" };
  if (!f.lu) return { role: null, source: null };
  if (f.filleulAvecClub) return { role: "rollout", source: "equipe" };
  if (f.clubsOwned > 0) return { role: "proprietaire", source: "club" };
  // « Junior partner » se décide par un entretien d'1h30 et un engagement de 3
  // à 9 mois : rien de tout ça ne laisse de trace en base. Le seul proxy
  // honnête, c'est « son pré-lancement est lancé » — le reste passe par
  // l'override, posé par le propriétaire du club.
  if (f.prelaunchDone > 0) return { role: "junior", source: "prelancement" };
  if (f.hearts >= STAGIAIRE_HEARTS) return { role: "stagiaire", source: "coeurs" };
  return { role: null, source: null };
}

/**
 * @param userId    optionnel : la Formation est montée sans props, le hook
 *                  résout donc lui-même la session. Le paramètre existe pour
 *                  que BbcApp puisse passer l'identité plus tard sans casser
 *                  l'appel existant (chantier parallèle sur BbcApp.tsx).
 * @param isAdmin   idem — sinon relu depuis `users.role`.
 */
export function useBbcRole(userId?: string | null, isAdmin?: boolean): UseBbcRoleResult {
  const [uid, setUid] = useState<string | null>(userId ?? null);
  const [faits, setFaits] = useState<Faits>(VIDE);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const f: Faits = { ...VIDE, isAdmin: isAdmin ?? false };
    try {
      const sb = await getSupabaseClient();
      if (!sb) return;

      let me = userId ?? null;
      if (!me) {
        const { data: auth } = await sb.auth.getUser();
        me = auth?.user?.id ?? null;
      }
      setUid(me);
      if (!me) return;

      // 1. Ma ligne users. L'override est lu à part : si la migration n'est pas
      //    poussée, une colonne inconnue ferait échouer TOUT le select, donc
      //    aussi la lecture du rôle admin — et on perdrait le fail-open.
      const { data: u } = await sb.from("users").select("role").eq("id", me).maybeSingle();
      const roleTxt = (u as { role?: string } | null)?.role;
      if (roleTxt) {
        f.isAdmin = isAdmin ?? roleTxt === "admin";
        f.lu = true;
      }
      const { data: ov } = await sb.from("users").select("bbc_role_override").eq("id", me).maybeSingle();
      const ovTxt = (ov as { bbc_role_override?: string | null } | null)?.bbc_role_override;
      if (estUneMarche(ovTxt)) f.override = ovTxt;

      // 2. Les faits, en parallèle. Chacun peut échouer sans emporter les autres
      //    (RLS, table absente) : on dégrade vers le bas, jamais vers l'erreur.
      const [clubs, refs, prelaunch, filleuls] = await Promise.all([
        sb.from("clubs").select("id, settings").eq("owner_user_id", me).eq("active", true),
        sb.from("client_referrals").select("status"),
        sb.from("bbc_prelaunch_progress").select("done_at").eq("user_id", me),
        sb.from("users").select("id").eq("parent_user_id", me),
      ]);

      if (Array.isArray(clubs.data)) {
        f.lu = true;
        f.clubsOwned = clubs.data.length;
        const s = (clubs.data[0] as { settings?: ClubSettings } | undefined)?.settings;
        f.clubSettings = s ?? null;
      }
      if (Array.isArray(refs.data)) {
        // isHeart() de useBbcHearts, JAMAIS un test réécrit : le statut porte
        // deux vocabulaires ('started' côté BBC, 'converted' côté CRM) et
        // rejouer la comparaison à la main, c'est refaire le bug documenté
        // en tête de useBbcHearts.
        f.hearts = (refs.data as Array<{ status?: string }>).filter((r) => isHeart(String(r.status ?? ""))).length;
      }
      if (Array.isArray(prelaunch.data)) {
        f.prelaunchDone = (prelaunch.data as Array<{ done_at?: string | null }>).filter((r) => Boolean(r.done_at)).length;
      }

      // 3. Roll out : un filleul direct qui possède SON club actif.
      //    ⚠️ La policy `clubs_owner_manage` limite la lecture au propriétaire
      //    ou à un admin : un coach non-admin ne verra jamais les clubs de sa
      //    downline, donc pour lui « roll out » ne se dérive pas et se pose par
      //    override. Il reste affiché « Propriétaire » — une marche en dessous,
      //    jamais au-dessus : on ne promeut pas au hasard.
      const ids = Array.isArray(filleuls.data)
        ? (filleuls.data as Array<{ id?: string }>).map((r) => String(r.id)).filter(Boolean)
        : [];
      if (ids.length > 0) {
        const { data: clubsDownline } = await sb
          .from("clubs")
          .select("id")
          .in("owner_user_id", ids)
          .eq("active", true);
        f.filleulAvecClub = Array.isArray(clubsDownline) && clubsDownline.length > 0;
      }
    } catch {
      // silent-fail : on garde ce qu'on a pu lire, la vue reste ouverte.
    } finally {
      setFaits(f);
      setLoading(false);
    }
  }, [userId, isAdmin]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const { role, source } = deriver(faits);

  return {
    role,
    source,
    loading,
    isAdmin: faits.isAdmin,
    clubsOwned: faits.clubsOwned,
    hearts: faits.hearts,
    // `role === null` inclus VOLONTAIREMENT : tant qu'on ne sait pas (chargement
    // en cours, RLS, migration absente), rien n'est verrouillé.
    fullAccess: faits.isAdmin || faits.clubsOwned > 0 || role === null,
    clubSettings: faits.clubSettings,
    userId: uid,
    refetch,
  };
}
