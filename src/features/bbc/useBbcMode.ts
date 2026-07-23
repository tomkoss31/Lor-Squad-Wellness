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
}

function readPreview(): "classic" | "bbc" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(PREVIEW_KEY);
  return v === "bbc" || v === "classic" ? v : null;
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
    setPreviewState(v);
    if (typeof window === "undefined") return;
    if (v) window.localStorage.setItem(PREVIEW_KEY, v);
    else window.localStorage.removeItem(PREVIEW_KEY);
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
        const { data: u } = await sb
          .from("users")
          .select("club_model")
          .eq("id", userId)
          .maybeSingle();
        const cm = (u as { club_model?: string } | null)?.club_model;
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

  const effectivePreview = isAdmin ? preview : null;
  const isBbc =
    effectivePreview === "bbc" ||
    (effectivePreview !== "classic" && clubModel === "bbc");
  const activeClub = clubs[0] ?? null;

  return { isBbc, clubModel, clubs, activeClub, loading, preview: effectivePreview, setPreview };
}
