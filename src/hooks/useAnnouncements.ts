// =============================================================================
// useAnnouncements — fetch + mark as read (2026-05-04)
//
// Charge les annonces visibles pour l'utilisateur courant + ses reads, expose
// le compteur unread, et permet de marquer une annonce comme lue (dismiss).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { getSupabaseClient } from "../services/supabaseClient";
import type { AppAnnouncement } from "../types/announcement";

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

  const fetchAll = useCallback(async () => {
    if (!userId) {
      setAnnouncements([]);
      setReadIds(new Set());
      setLoading(false);
      return;
    }
    const sb = await getSupabaseClient();
    if (!sb) {
      setLoading(false);
      return;
    }
    const [annRes, readRes] = await Promise.all([
      sb
        .from("app_announcements")
        .select("*")
        .order("published_at", { ascending: false })
        .limit(50),
      sb.from("user_announcement_reads").select("announcement_id").eq("user_id", userId),
    ]);
    if (annRes.data) setAnnouncements(annRes.data as AppAnnouncement[]);
    if (readRes.data) {
      setReadIds(new Set(readRes.data.map((r: { announcement_id: string }) => r.announcement_id)));
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

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
