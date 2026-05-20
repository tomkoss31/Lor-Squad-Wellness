// =============================================================================
// Prospects (lead pipeline pre-bilan) — extrait de supabaseService.ts
// (Phase 3.5 refacto barrel pattern).
// =============================================================================
//
// 4 fonctions CRUD prospects + 2 mappers internes (ProspectRow type +
// mapProspectFromDb + mapProspectToDbUpdates). Aucune dépendance vers les
// mappers principaux, juste requireSupabase.
// =============================================================================

import type { Prospect, ProspectFormInput, ProspectSource, ProspectStatus } from "../../types/domain";
import { requireSupabase, isMissingTableError } from "./_shared";

type ProspectRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  rdv_date: string;
  source: string;
  source_detail?: string | null;
  note?: string | null;
  distributor_id: string;
  status: string;
  converted_client_id?: string | null;
  cold_until?: string | null;
  cold_reason?: string | null;
  created_at: string;
  updated_at: string;
};

function mapProspectFromDb(row: ProspectRow): Prospect {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    rdvDate: row.rdv_date,
    source: row.source as ProspectSource,
    sourceDetail: row.source_detail ?? undefined,
    note: row.note ?? undefined,
    distributorId: row.distributor_id,
    status: row.status as ProspectStatus,
    convertedClientId: row.converted_client_id ?? undefined,
    coldUntil: row.cold_until ?? undefined,
    coldReason: row.cold_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProspectToDbUpdates(updates: Partial<Prospect>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (updates.firstName !== undefined) out.first_name = updates.firstName;
  if (updates.lastName !== undefined) out.last_name = updates.lastName;
  if (updates.phone !== undefined) out.phone = updates.phone ?? null;
  if (updates.email !== undefined) out.email = updates.email ?? null;
  if (updates.rdvDate !== undefined) out.rdv_date = updates.rdvDate;
  if (updates.source !== undefined) out.source = updates.source;
  if (updates.sourceDetail !== undefined) out.source_detail = updates.sourceDetail ?? null;
  if (updates.note !== undefined) out.note = updates.note ?? null;
  if (updates.distributorId !== undefined) out.distributor_id = updates.distributorId;
  if (updates.status !== undefined) out.status = updates.status;
  if (updates.convertedClientId !== undefined) out.converted_client_id = updates.convertedClientId ?? null;
  if (updates.coldUntil !== undefined) out.cold_until = updates.coldUntil ?? null;
  if (updates.coldReason !== undefined) out.cold_reason = updates.coldReason ?? null;
  // updated_at piloté côté SQL à chaque UPDATE : on force côté appli pour tracking UI
  out.updated_at = new Date().toISOString();
  return out;
}

export async function fetchSupabaseProspects(): Promise<Prospect[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("prospects")
    .select("*")
    .order("rdv_date", { ascending: true });

  if (error) {
    // Fallback : si la table n'existe pas encore (migration pas jouée)
    if (isMissingTableError(error, "prospects")) {
      console.warn("[fetchSupabaseProspects] table prospects absente — migration pas jouée ?");
      return [];
    }
    throw new Error(`Impossible de charger les prospects : ${error.message}`);
  }
  return (data ?? []).map((row) => mapProspectFromDb(row as ProspectRow));
}

export async function createSupabaseProspect(input: ProspectFormInput): Promise<Prospect> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("prospects")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      rdv_date: input.rdvDate,
      source: input.source,
      source_detail: input.sourceDetail ?? null,
      note: input.note ?? null,
      distributor_id: input.distributorId,
      status: "scheduled" as ProspectStatus,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Impossible de créer le prospect : ${error?.message ?? "réponse vide"}`);
  }
  return mapProspectFromDb(data as ProspectRow);
}

export async function updateSupabaseProspect(id: string, updates: Partial<Prospect>): Promise<Prospect> {
  const client = await requireSupabase();
  const dbUpdates = mapProspectToDbUpdates(updates);
  const { data, error } = await client
    .from("prospects")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Impossible de mettre à jour le prospect : ${error?.message ?? "réponse vide"}`);
  }
  return mapProspectFromDb(data as ProspectRow);
}

export async function deleteSupabaseProspect(id: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.from("prospects").delete().eq("id", id);
  if (error) {
    throw new Error(`Impossible de supprimer le prospect : ${error.message}`);
  }
}

// ─── Sync client_recaps (Chantier 2026-04-20) ────────────────────────────
// Le snapshot `client_recaps` (vu par le client sur /client/:token) n'est créé
// qu'une fois, à la création du client (NewAssessmentPage). Toutes les autres
// mutations (follow-up, body scan rapide, édition bilan, ajout produit,
// update coordonnées, réassignation coach) laissent le récap figé.
//
// `refreshClientRecap(clientId)` reconstruit un nouveau snapshot à partir de
// l'état courant : clients + dernier assessment + questionnaire.selectedProductIds.
// Les lectures côté client (ClientAppPage, RecapPage, ClientDetailPage)
// font toutes `order by created_at desc limit 1`, donc on INSERT sans delete.
//
// Usage : appeler APRÈS la mutation principale. Les erreurs sont remontées
// au caller pour affichage toast, mais l'appelant doit catch sans bloquer
// le flux principal (l'action utilisateur a déjà réussi).
