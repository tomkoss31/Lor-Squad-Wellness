// =============================================================================
// useBbcMode — état du mode BBC, hook PARALLÈLE (chantier BBC Lot 1, 2026-07-24).
//
// Volontairement autonome : ne passe PAS par AppContext (contrainte "ne pas
// toucher les 4 fichiers sacrés"). Lit directement `users.club_model` + les
// `clubs` du coach via Supabase. Silent-fail si la migration BBC n'est pas
// encore poussée → tout reste 'classic', zéro régression.
//
// Aperçu admin : un admin peut basculer Classic/BBC via localStorage sans
// rien changer en base (pour recette). Un coach affecté BBC (club_model='bbc')
// est en BBC en dur, sans switch.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../../services/supabaseClient";
import type { Club } from "../../types/domain";
import { lireMonProfil } from "../../services/monProfil";

const PREVIEW_KEY = "ls-bbc-preview"; // 'bbc' | 'classic' (admins uniquement)

export interface UseBbcModeResult {
  isBbc: boolean;
  clubModel: "classic" | "bbc";
  clubs: Club[];
  activeClub: Club | null;
  loading: boolean;
  /** Aperçu admin actif ('classic' | 'bbc' | null). null = suit club_model. */
  preview: "classic" | "bbc" | null;
  /** Admin only : pose/retire l'aperçu (localStorage), sans toucher la DB. */
  setPreview: (v: "classic" | "bbc" | null) => void;
  /** Admin/self : crée un club + passe le coach en BBC (RPC set_club_model). */
  createMyClub: (name: string, city: string) => Promise<boolean>;
  /** Renommer un club / corriger sa ville. La RLS `clubs_owner_manage` est en ALL,
   *  le propriétaire (ou un admin) peut donc éditer sans migration. */
  renameClub: (clubId: string, name: string, city: string) => Promise<boolean>;
}

function readPreview(): "classic" | "bbc" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(PREVIEW_KEY);
  return v === "bbc" || v === "classic" ? v : null;
}

// ─── Les instances du hook doivent se parler ────────────────────────────────
//
// ⚠️ CORRECTIF 13/08/2026 — Thomas depuis son iPhone : « le passage en mode BBC
// ne fonctionne pas du tout ».
//
// `useBbcMode` est monté DEUX FOIS : une fois par `AppLayout` (c'est lui qui
// décide de monter la coquille BBC) et une fois par `MobileDrawer` (c'est lui
// qui porte le bouton). `setPreview` n'écrivait que dans l'état React de
// l'appelant — donc le tiroir basculait, et AppLayout n'en savait rien.
//
// Mesuré au navigateur : après le tap, `localStorage` valait bien `bbc`, mais
// `.bbc-shell` restait absent. Un rechargement manuel, et tout marchait. Le
// bouton n'était donc pas casse : il était SANS EFFET tant qu'on ne rechargeait
// pas la page — ce que personne ne fait.
//
// Un mini bus d'abonnement suffit : pas de contexte a plumber, pas de
// dependance nouvelle, et toutes les instances presentes se mettent d'accord.
type Apercu = "classic" | "bbc" | null;
const abonnes = new Set<(v: Apercu) => void>();

function diffuserApercu(v: Apercu): void {
  for (const notifier of abonnes) notifier(v);
}

export function useBbcMode(
  userId: string | null | undefined,
  isAdmin = false,
): UseBbcModeResult {
  const [clubModel, setClubModel] = useState<"classic" | "bbc">("classic");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreviewState] = useState<"classic" | "bbc" | null>(readPreview);

  const setPreview = useCallback((v: "classic" | "bbc" | null) => {
    if (typeof window !== "undefined") {
      if (v) window.localStorage.setItem(PREVIEW_KEY, v);
      else window.localStorage.removeItem(PREVIEW_KEY);
    }
    // Prévient TOUTES les instances, celle-ci comprise — sinon le tiroir
    // bascule et la coquille reste en place.
    diffuserApercu(v);
  }, []);

  // Abonnement au bus + à l'onglet voisin (`storage` ne se déclenche que dans
  // les AUTRES onglets, d'où les deux).
  useEffect(() => {
    const surBus = (v: Apercu) => setPreviewState(v);
    abonnes.add(surBus);
    const surStockage = (e: StorageEvent) => {
      if (e.key === PREVIEW_KEY) setPreviewState(readPreview());
    };
    window.addEventListener("storage", surStockage);
    return () => {
      abonnes.delete(surBus);
      window.removeEventListener("storage", surStockage);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          setLoading(false);
          return;
        }
        // Ligne mutualisee : sept endroits lisaient la meme (audit 2026-08-12).
        const u = await lireMonProfil(userId);
        const cm = u?.club_model;
        if (!cancelled && (cm === "bbc" || cm === "classic")) setClubModel(cm);

        const { data: rows } = await sb
          .from("clubs")
          .select("*")
          .eq("owner_user_id", userId)
          .eq("active", true);
        if (!cancelled && Array.isArray(rows)) {
          setClubs(
            rows.map((r: Record<string, unknown>) => ({
              id: String(r.id),
              ownerUserId: String(r.owner_user_id),
              name: String(r.name ?? ""),
              city: (r.city as string | null) ?? null,
              slug: (r.slug as string | null) ?? null,
              active: Boolean(r.active),
              settings: (r.settings as Club["settings"]) ?? null,
              createdAt: (r.created_at as string | undefined) ?? undefined,
            })),
          );
        }
      } catch {
        // Silent-fail : migration pas encore poussée → reste classic.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const createMyClub = useCallback(
    async (name: string, city: string): Promise<boolean> => {
      if (!userId || !name.trim()) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { data, error } = await sb
          .from("clubs")
          .insert({ owner_user_id: userId, name: name.trim(), city: city.trim() || null })
          .select("id")
          .maybeSingle();
        if (error) return false;
        await sb.rpc("set_club_model", { p_user_id: userId, p_model: "bbc" });
        setClubModel("bbc");
        if (data) {
          setClubs((prev) => [
            ...prev,
            {
              id: String((data as { id: string }).id),
              ownerUserId: userId,
              name: name.trim(),
              city: city.trim() || null,
              slug: null,
              active: true,
              settings: null,
              createdAt: undefined,
            },
          ]);
        }
        return true;
      } catch {
        return false;
      }
    },
    [userId],
  );

  const renameClub = useCallback(
    async (clubId: string, name: string, city: string): Promise<boolean> => {
      if (!clubId || !name.trim()) return false;
      try {
        const sb = await getSupabaseClient();
        if (!sb) return false;
        const { error } = await sb
          .from("clubs")
          .update({ name: name.trim(), city: city.trim() || null })
          .eq("id", clubId);
        if (error) return false;
        setClubs((prev) =>
          prev.map((c) => (c.id === clubId ? { ...c, name: name.trim(), city: city.trim() || null } : c)),
        );
        return true;
      } catch {
        return false;
      }
    },
    [],
  );

  const effectivePreview = isAdmin ? preview : null;
  const isBbc =
    effectivePreview === "bbc" ||
    (effectivePreview !== "classic" && clubModel === "bbc");
  const activeClub = clubs[0] ?? null;

  return {
    isBbc,
    clubModel,
    clubs,
    activeClub,
    loading,
    preview: effectivePreview,
    setPreview,
    createMyClub,
    renameClub,
  };
}
