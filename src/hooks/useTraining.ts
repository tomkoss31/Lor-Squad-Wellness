// Chantier Centre de Formation V1 (2026-04-23).
// Hooks de fetch + mutation pour le Centre de formation.
//
// Pattern simple sans react-query : useState + useEffect + fonction de
// refresh exposée. Invalidation manuelle au mark completed.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { getSupabaseClient } from "../services/supabaseClient";
import type {
  TrainingCategory,
  TrainingCategoryStats,
  TrainingProgressRow,
  TrainingResource,
} from "../types/training";

interface TrainingData {
  categories: TrainingCategory[];
  resources: TrainingResource[];
  progress: TrainingProgressRow[];
}

interface TrainingState extends TrainingData {
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markCompleted: (resourceId: string) => Promise<void>;
  isCompleted: (resourceId: string) => boolean;
  globalStats: { total: number; completed: number; percent: number };
  byCategory: TrainingCategoryStats[];
  resourcesByCategoryId: Map<string, TrainingResource[]>;
}

export function useTraining(): TrainingState {
  const { currentUser } = useAppContext();
  const [data, setData] = useState<TrainingData>({
    categories: [],
    resources: [],
    progress: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = await getSupabaseClient();
      if (!sb) throw new Error("Service indisponible.");

      const [catsRes, resourcesRes, progressRes] = await Promise.all([
        sb
          .from("training_categories")
          .select("id, slug, title, description, icon_name, color_ramp, level, display_order")
          .order("display_order", { ascending: true }),
        sb
          .from("training_resources")
          .select(
            "id, category_id, slug, title, subtitle, resource_type, content_url, internal_route, duration_minutes, display_order, is_new",
          )
          .order("display_order", { ascending: true }),
        currentUser
          ? sb
              .from("training_progress")
              .select("resource_id, completed_at")
              .eq("user_id", currentUser.id)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (catsRes.error) throw new Error(catsRes.error.message);
      if (resourcesRes.error) throw new Error(resourcesRes.error.message);
      if (progressRes.error) throw new Error(progressRes.error.message);

      setData({
        categories: (catsRes.data as TrainingCategory[] | null) ?? [],
        resources: (resourcesRes.data as TrainingResource[] | null) ?? [],
        progress: (progressRes.data as TrainingProgressRow[] | null) ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec du chargement.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const completedIds = useMemo(() => {
    return new Set(data.progress.map((p) => p.resource_id));
  }, [data.progress]);

  const markCompleted = useCallback(
    async (resourceId: string) => {
      if (!currentUser) return;
      const sb = await getSupabaseClient();
      if (!sb) return;
      await sb
        .from("training_progress")
        .upsert(
          { user_id: currentUser.id, resource_id: resourceId },
          { onConflict: "user_id,resource_id" },
        );
      // Optimistic : on ajoute localement puis on re-fetch en background.
      setData((prev) =>
        prev.progress.some((p) => p.resource_id === resourceId)
          ? prev
          : {
              ...prev,
              progress: [
                ...prev.progress,
                { resource_id: resourceId, completed_at: new Date().toISOString() },
              ],
            },
      );
      // Silent refresh pour rattraper toute divergence serveur.
      void refresh();
    },
    [currentUser, refresh],
  );

  const isCompleted = useCallback(
    (resourceId: string) => completedIds.has(resourceId),
    [completedIds],
  );

  const resourcesByCategoryId = useMemo(() => {
    const map = new Map<string, TrainingResource[]>();
    for (const r of data.resources) {
      const list = map.get(r.category_id) ?? [];
      list.push(r);
      map.set(r.category_id, list);
    }
    return map;
  }, [data.resources]);

  const byCategory = useMemo<TrainingCategoryStats[]>(() => {
    return data.categories.map((cat) => {
      const resources = resourcesByCategoryId.get(cat.id) ?? [];
      const completed = resources.filter((r) => completedIds.has(r.id)).length;
      return {
        category: cat,
        total: resources.length,
        completed,
        hasNew: resources.some((r) => r.is_new),
      };
    });
  }, [data.categories, resourcesByCategoryId, completedIds]);

  const globalStats = useMemo(() => {
    const total = data.resources.length;
    const completed = data.progress.length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }, [data.resources.length, data.progress.length]);

  return {
    ...data,
    loading,
    error,
    refresh,
    markCompleted,
    isCompleted,
    globalStats,
    byCategory,
    resourcesByCategoryId,
  };
}
