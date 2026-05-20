// =============================================================================
// Manual PV entries — extrait de supabaseService.ts (Phase 3.5 refacto)
// =============================================================================
//
// 3 fonctions pour gérer les saisies manuelles PV (entries cross-mois) :
// upsert, delete, load. Aucune dépendance vers les mappers principaux,
// juste requireSupabase.
// =============================================================================

import { requireSupabase } from "./_shared";

export async function upsertManualPvEntry(params: {
  id: string | null;
  name: string;
  parentName: string | null;
  depth: 1 | 2 | 3;
  ownTierPct: number;
  intermediateTiers: number[];
  month: string;
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  pv25IsVip?: boolean;
  pv35IsVip?: boolean;
}): Promise<string> {
  const client = await requireSupabase();
  const { data, error } = await client.rpc("upsert_manual_pv_entry", {
    p_id: params.id,
    p_name: params.name,
    p_parent_name: params.parentName,
    p_depth: params.depth,
    p_own_tier_pct: params.ownTierPct,
    p_intermediate_tiers: params.intermediateTiers,
    p_month: params.month,
    p_pv_15: params.pv15,
    p_pv_25: params.pv25,
    p_pv_35: params.pv35,
    p_pv_42: params.pv42,
    p_pv_royalty: params.pvRoyalty,
    p_pv_25_is_vip: params.pv25IsVip ?? false,
    p_pv_35_is_vip: params.pv35IsVip ?? false,
  });
  if (error) {
    throw new Error(`Impossible d'enregistrer l'entree : ${error.message}`);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lor-squad:pv-breakdown-updated"));
  }
  return data as string;
}

export async function deleteManualPvEntry(id: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("delete_manual_pv_entry", { p_id: id });
  if (error) {
    throw new Error(`Impossible de supprimer l'entree : ${error.message}`);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lor-squad:pv-breakdown-updated"));
  }
}

export async function loadManualPvEntries(
  viewerUserId: string | string[],
  month: string,
): Promise<Array<{
  id: string;
  viewerUserId: string;
  name: string;
  parentName: string | null;
  depth: 1 | 2 | 3;
  ownTierPct: number;
  intermediateTiers: number[];
  month: string;
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  pv25IsVip: boolean;
  pv35IsVip: boolean;
  declaredAt: string | null;
}>> {
  const client = await requireSupabase();
  // Bugfix 2026-05-20 : accepte string OU string[] pour gérer l'agrégation
  // couple Thomas+Mélanie (entries des 2 partenaires fusionnées).
  const viewerIds = Array.isArray(viewerUserId) ? viewerUserId : [viewerUserId];
  const { data, error } = await client
    .from("manual_pv_entries")
    .select("id, viewer_user_id, name, parent_name, depth, own_tier_pct, intermediate_tiers, month, pv_15, pv_25, pv_35, pv_42, pv_royalty, pv_25_is_vip, pv_35_is_vip, declared_at")
    .in("viewer_user_id", viewerIds)
    .eq("month", month);
  if (error || !data) return [];
  return data.map((r: {
    id: string; viewer_user_id: string; name: string; parent_name: string | null;
    depth: number; own_tier_pct: number; intermediate_tiers: number[] | null; month: string;
    pv_15: number | null; pv_25: number | null; pv_35: number | null;
    pv_42: number | null; pv_royalty: number | null;
    pv_25_is_vip: boolean | null; pv_35_is_vip: boolean | null;
    declared_at: string | null;
  }) => ({
    id: r.id,
    viewerUserId: r.viewer_user_id,
    name: r.name,
    parentName: r.parent_name,
    depth: r.depth as 1 | 2 | 3,
    ownTierPct: Number(r.own_tier_pct),
    intermediateTiers: (r.intermediate_tiers ?? []).map(Number),
    month: r.month,
    pv15: Number(r.pv_15 ?? 0),
    pv25: Number(r.pv_25 ?? 0),
    pv35: Number(r.pv_35 ?? 0),
    pv42: Number(r.pv_42 ?? 0),
    pvRoyalty: Number(r.pv_royalty ?? 0),
    pv25IsVip: !!r.pv_25_is_vip,
    pv35IsVip: !!r.pv_35_is_vip,
    declaredAt: r.declared_at,
  }));
}

/**
 * Met a jour le rang Herbalife d'un user (admin only). Stamp rank_set_at.
 */
