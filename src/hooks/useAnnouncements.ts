// =============================================================================
// useAnnouncements — fetch + mark as read (2026-05-04)
//
// Charge les annonces visibles pour l'utilisateur courant + ses reads, expose
// le compteur unread, et permet de marquer une annonce comme lue (dismiss).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import type { AppAnnouncement } from "../types/announcement";

// ── Une seule lecture pour tous les montages (2026-08-11) ───────────────────
//
// Ce hook est monté TROIS fois au démarrage : la cloche (AnnouncementBell), le
// popup (AnnouncementSpotlight) et la page Nouveautés. Chacun lançait ses 2
// requêtes → 6 appels pour afficher exactement la même liste.
//
// Mesuré sur le Co-pilote en prod : 47 requêtes REST au démarrage, dont 26
// parties à la MÊME milliseconde. Elles ne sont pas lentes une par une — elles
// s'étranglent mutuellement, et chacune finit à 9 secondes. Chaque doublon
// retiré desserre l'étau pour toutes les autres.
//
// Même mécanique que useCrmBadge : cache court, requête en vol partagée,
// diffusion à tous les abonnés. L'API du hook ne change pas.
const CACHE_MS = 60_000;
interface Instantane { annonces: AppAnnouncement[]; lus: Set<string>; at: number }
const cache = new Map<string, Instantane>();
const enVol = new Map<string, Promise<Instantane>>();
const abonnes = new Map<string, Set<(i: Instantane) => void>>();

interface UseAnnouncementsResult {
  announcements: AppAnnouncement[];
  readIds: Set<string>;
  unreadCount: number;
  /** Marque une annonce comme lue (idempotent). */
  markRead: (announcementId: string) => Promise<void>;
  /** Marque toutes les annonces visibles comme lues. */
  markAllRead: () => Promise<void>;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useAnnouncements(userId: string | null): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<AppAnnouncement[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const appliquer = useCallback((i: Instantane) => {
    setAnnouncements(i.annonces);
    setReadIds(i.lus);
    setLoading(false);
  }, []);

  const fetchAll = useCallback(async (forcer = false) => {
    if (!userId) {
      setAnnouncements([]);
      setReadIds(new Set());
      setLoading(false);
      return;
    }
    const connu = cache.get(userId);
    if (!forcer && connu && Date.now() - connu.at < CACHE_MS) { appliquer(connu); return; }

    const dejaEnRoute = enVol.get(userId);
    if (dejaEnRoute) { appliquer(await dejaEnRoute); return; }

    const travail: Promise<Instantane> = (async () => {
      const sb = await getSupabaseClient();
      if (!sb) return cache.get(userId) ?? { annonces: [], lus: new Set<string>(), at: Date.now() };
      const [annRes, readRes] = await Promise.all([
        sb
          .from("app_announcements")
          .select("*")
          .order("published_at", { ascending: false })
          .limit(50),
        sb.from("user_announcement_reads").select("announcement_id").eq("user_id", userId),
      ]);
      return {
        annonces: (annRes.data ?? []) as AppAnnouncement[],
        lus: new Set((readRes.data ?? []).map((r: { announcement_id: string }) => r.announcement_id)),
        at: Date.now(),
      };
    })();

    enVol.set(userId, travail);
    try {
      const i = await travail;
      cache.set(userId, i);
      abonnes.get(userId)?.forEach((f) => f(i));
      appliquer(i);
    } finally {
      enVol.delete(userId);
    }
  }, [userId, appliquer]);

  useEffect(() => {
    if (!userId) { void fetchAll(); return; }
    let set = abonnes.get(userId);
    if (!set) { set = new Set(); abonnes.set(userId, set); }
    set.add(appliquer);
    void fetchAll();
    return () => {
      set?.delete(appliquer);
      if (set && set.size === 0) abonnes.delete(userId);
    };
  }, [fetchAll, userId, appliquer]);

  const markRead = useCallback(
    async (announcementId: string) => {
      if (!userId) return;
      // Optimistic
      setReadIds((prev) => {
        if (prev.has(announcementId)) return prev;
        const next = new Set(prev);
        next.add(announcementId);
        return next;
      });
      const sb = await getSupabaseClient();
      if (!sb) return;
      // upsert idempotent
      await sb
        .from("user_announcement_reads")
        .upsert(
          { user_id: userId, announcement_id: announcementId },
          { onConflict: "user_id,announcement_id" },
        );
    },
    [userId],
  );

  const markAllRead = useCallback(async () => {
    if (!userId || announcements.length === 0) return;
    const unread = announcements.filter((a) => !readIds.has(a.id));
    if (unread.length === 0) return;
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const a of unread) next.add(a.id);
      return next;
    });
    const sb = await getSupabaseClient();
    if (!sb) return;
    await sb
      .from("user_announcement_reads")
      .upsert(
        unread.map((a) => ({ user_id: userId, announcement_id: a.id })),
        { onConflict: "user_id,announcement_id" },
      );
  }, [userId, announcements, readIds]);

  const unreadCount = announcements.filter((a) => !readIds.has(a.id)).length;

  return {
    announcements,
    readIds,
    unreadCount,
    markRead,
    markAllRead,
    loading,
    refetch: fetchAll,
  };
}
