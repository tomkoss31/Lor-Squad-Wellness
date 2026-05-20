// =============================================================================
// Follow-up protocol logs — extrait de supabaseService.ts
// (Phase 3.5 refacto barrel pattern).
// =============================================================================
//
// 4 fonctions CRUD logs protocole F1/F21 + 1 mapper interne. Importe
// mapFollowUp depuis supabaseService.ts (chemin parent : barrel pattern,
// fn déjà publique côté re-export final).
//
// Note : mapFollowUp est utilisé pour les FollowUp embarqués dans les
// logs (les rares cas où un log référence un follow-up complet).
// =============================================================================

import type { FollowUpProtocolLog, FollowUpProtocolStepId } from "../../types/domain";
import { requireSupabase, isMissingTableError } from "./_shared";

type FollowUpProtocolLogRow = {
  id: string;
  client_id: string;
  coach_id: string;
  step_id: FollowUpProtocolStepId;
  sent_at: string;
  notes?: string | null;
};

function mapFollowUpProtocolLog(row: FollowUpProtocolLogRow): FollowUpProtocolLog {
  return {
    id: row.id,
    clientId: row.client_id,
    coachId: row.coach_id,
    stepId: row.step_id,
    sentAt: row.sent_at,
    notes: row.notes ?? undefined,
  };
}

export async function fetchSupabaseFollowUpProtocolLogs(
  clientId: string
): Promise<FollowUpProtocolLog[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .select("*")
    .eq("client_id", clientId)
    .order("sent_at", { ascending: true });
  if (error) {
    // Migration pas encore exécutée → tolérant (UI affichera 0/5).
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      return [];
    }
    throw new Error(`Impossible de lire le protocole de suivi : ${error.message}`);
  }
  return (data as FollowUpProtocolLogRow[]).map(mapFollowUpProtocolLog);
}

/**
 * Chantier Protocole dans Agenda + Dashboard (2026-04-20)
 * Fetch global des logs protocole — utilisé par Dashboard widget et Agenda
 * onglet Suivis. Tolère l'absence de la migration comme la version par-client.
 * Le filtrage sur le coach courant se fait côté client pour des raisons de
 * compatibilité RLS (can_access_owner couvre la scope admin / référent).
 */
export async function fetchAllSupabaseFollowUpProtocolLogs(): Promise<FollowUpProtocolLog[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      return [];
    }
    throw new Error(`Impossible de lire les logs protocole : ${error.message}`);
  }
  return (data as FollowUpProtocolLogRow[]).map(mapFollowUpProtocolLog);
}

export async function logSupabaseFollowUpProtocolStep(params: {
  clientId: string;
  coachId: string;
  stepId: FollowUpProtocolStepId;
  notes?: string;
}): Promise<FollowUpProtocolLog> {
  const { clientId, coachId, stepId, notes } = params;
  const client = await requireSupabase();

  // UPSERT via la contrainte unique (client_id, step_id) — si l'user ré-envoie
  // le message, on rafraîchit sent_at au lieu de dupliquer.
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        step_id: stepId,
        sent_at: new Date().toISOString(),
        notes: notes ?? null,
      },
      { onConflict: "client_id,step_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      throw new Error(
        "La table follow_up_protocol_log n'existe pas encore. Exécute la migration supabase/migrations/20260420160000_follow_up_protocol_log.sql."
      );
    }
    throw new Error(`Impossible d'enregistrer l'envoi : ${error.message}`);
  }

  return mapFollowUpProtocolLog(data as FollowUpProtocolLogRow);
}

export async function deleteSupabaseFollowUpProtocolLog(logId: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.from("follow_up_protocol_log").delete().eq("id", logId);
  if (error) {
    throw new Error(`Impossible d'annuler l'envoi : ${error.message}`);
  }
}
