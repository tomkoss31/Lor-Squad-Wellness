// Chantier Academy Phase 1 — vue admin progression (2026-04-26).
// Hook reserve aux admins : lit la progression Academy d un autre user via
// la RPC SECURITY DEFINER `get_user_tour_progress_admin` (migration
// 20260426150000_academy_admin_rpc.sql).
//
// La RPC fait elle-meme le check is_admin() — si un non-admin appelle, la
// requete echoue avec "access denied" et le hook expose `error`.

import { useEffect, useState } from "react";
import { getSupabaseClient } from "../../../services/supabaseClient";
import {
  ACADEMY_SECTIONS,
  ACADEMY_TOUR_KEY,
  type AcademySection,
} from "../sections";

export interface AcademyAdminViewData {
  loading: boolean;
  error: string | null;

  hasStarted: boolean;
  isCompleted: boolean;
  isSkipped: boolean;

  completedCount: number;
  totalCount: number;
  percentComplete: number;

  startedAt: Date | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  lastUpdatedAt: Date | null;
  lastAccessAt: Date | null;

  currentSection: AcademySection;
  daysStuckOnCurrent: number | null;
  isStuck: boolean;

  sectionsView: Array<{
    section: AcademySection;
    state: "done" | "current" | "todo";
  }>;
}

interface RpcRow {
  user_id: string;
  tour_key: string;
  last_step: number | null;
  started_at: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  updated_at: string | null;
  last_access_at: string | null;
}

const STUCK_THRESHOLD_DAYS = 7;

export function useAcademyAdminView(userId: string | null): AcademyAdminViewData {
  const [data, setData] = useState<AcademyAdminViewData>(() => buildEmptyView(true));

  useEffect(() => {
    if (!userId) {
      setData(buildEmptyView(false));
      return;
    }

    let cancelled = false;
    setData((d) => ({ ...d, loading: true, error: null }));

    void (async () => {
      try {
        const sb = await getSupabaseClient();
        if (!sb) {
          if (!cancelled) {
            setData({ ...buildEmptyView(false), error: "supabase_unavailable" });
          }
          return;
        }
        const { data: rows, error } = await sb.rpc("get_user_tour_progress_admin", {
          p_user_id: userId,
          p_tour_key: ACADEMY_TOUR_KEY,
        });

        if (cancelled) return;

        if (error) {
          console.warn("[useAcademyAdminView] RPC failed:", error.message);
          setData({ ...buildEmptyView(false), error: error.message });
          return;
        }

        const row =
          Array.isArray(rows) && rows.length > 0 ? (rows[0] as RpcRow) : null;
        setData(buildViewFromRow(row));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : "unknown error";
        console.warn("[useAcademyAdminView] exception:", message);
        setData({ ...buildEmptyView(false), error: message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return data;
}

function buildEmptyView(loading: boolean): AcademyAdminViewData {
  return {
    loading,
    error: null,
    hasStarted: false,
    isCompleted: false,
    isSkipped: false,
    completedCount: 0,
    totalCount: ACADEMY_SECTIONS.length,
    percentComplete: 0,
    startedAt: null,
    completedAt: null,
    skippedAt: null,
    lastUpdatedAt: null,
    lastAccessAt: null,
    currentSection: ACADEMY_SECTIONS[0],
    daysStuckOnCurrent: null,
    isStuck: false,
    sectionsView: ACADEMY_SECTIONS.map((s) => ({ section: s, state: "todo" as const })),
  };
}

function buildViewFromRow(row: RpcRow | null): AcademyAdminViewData {
  const totalCount = ACADEMY_SECTIONS.length;

  if (!row) {
    return buildEmptyView(false);
  }

  const isCompleted = !!row.completed_at;
  const isSkipped = !!row.skipped_at;
  const hasStarted = !!row.started_at && !isCompleted && !isSkipped;
  const lastStep = row.last_step ?? 0;
  const completedCount = isCompleted
    ? totalCount
    : Math.max(0, Math.min(lastStep, totalCount));
  const percentComplete = Math.round((completedCount / totalCount) * 100);
  const currentSectionIndex = isCompleted
    ? totalCount - 1
    : Math.min(Math.max(0, lastStep), totalCount - 1);
  const currentSection = ACADEMY_SECTIONS[currentSectionIndex];

  let daysStuckOnCurrent: number | null = null;
  let isStuck = false;
  if (hasStarted && row.updated_at) {
    const updated = new Date(row.updated_at);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    daysStuckOnCurrent = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    isStuck = daysStuckOnCurrent >= STUCK_THRESHOLD_DAYS;
  }

  const sectionsView = ACADEMY_SECTIONS.map((section, idx) => {
    const state: "done" | "current" | "todo" = isCompleted
      ? "done"
      : idx < completedCount
        ? "done"
        : idx === currentSectionIndex
          ? "current"
          : "todo";
    return { section, state };
  });

  return {
    loading: false,
    error: null,
    hasStarted,
    isCompleted,
    isSkipped,
    completedCount,
    totalCount,
    percentComplete,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    completedAt: row.completed_at ? new Date(row.completed_at) : null,
    skippedAt: row.skipped_at ? new Date(row.skipped_at) : null,
    lastUpdatedAt: row.updated_at ? new Date(row.updated_at) : null,
    lastAccessAt: row.last_access_at ? new Date(row.last_access_at) : null,
    currentSection,
    daysStuckOnCurrent,
    isStuck,
    sectionsView,
  };
}
