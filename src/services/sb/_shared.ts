// shared helpers re-exported from supabaseService.ts pour les domain files
// (Phase 3.5 brainstorm Égypte 2026-05 — refacto barrel pattern).

import { getSupabaseClient } from "../supabaseClient";

export async function requireSupabase() {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }
  return supabase;
}

export function isMissingColumnError(
  error: { message?: string } | null | undefined,
  column: string,
) {
  return Boolean(error?.message?.toLowerCase().includes(column.toLowerCase()));
}

export function isMissingTableError(
  error: { message?: string } | null | undefined,
  table: string,
) {
  return Boolean(error?.message?.toLowerCase().includes(table.toLowerCase()));
}
