// =============================================================================
// Formation pyramide — service Supabase (Phase B, 2026-11-01)
//
// Appels DB bas niveau pour le centre de Formation. Les hooks consomment
// ce service. Aucun composant UI ici.
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";
import type {
  FormationProgressRow,
  FormationProgressStatus,
  FormationValidationPath,
  FormationThreadKind,
  FormationThreadRow,
  FormationPendingReviewRow,
  FormationAdminRelayRow,
  SubmitModuleResult,
} from "./types-db";

/** Seuil de validation auto (100 % par defaut). */
export const AUTO_VALIDATION_SCORE = 100;

/** XP awards par evenement. */
export const FORMATION_XP = {
  moduleValidated: 10,
  quizPerfect: 50,
} as const;

// ─── LECTURES ──────────────────────────────────────────────────────────────

/** Recupere toutes les progressions du user courant (self-scoped via RLS). */
export async function fetchMyProgress(): Promise<FormationProgressRow[]> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  const { data, error } = await sb
    .from("formation_user_progress")
    .select("*")
    .eq("user_id", uid)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FormationProgressRow[];
}

/** Recupere la progression d un module precis (cree si absente). */
export async function fetchOrCreateModuleProgress(
  moduleId: string,
): Promise<FormationProgressRow> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  // Tente fetch
  const { data: existing, error: fetchErr } = await sb
    .from("formation_user_progress")
    .select("*")
    .eq("user_id", uid)
    .eq("module_id", moduleId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  if (existing) return existing as FormationProgressRow;

  // Insert si pas existante (idempotent via UNIQUE user_id + module_id)
  const { data: created, error: insertErr } = await sb
    .from("formation_user_progress")
    .insert({
      user_id: uid,
      module_id: moduleId,
      status: "in_progress" satisfies FormationProgressStatus,
    })
    .select("*")
    .single();
  if (insertErr) throw insertErr;
  return created as FormationProgressRow;
}

/** Recupere la file pending_review_sponsor du user courant (lignee descendante). */
export async function fetchPendingReviewQueue(): Promise<FormationPendingReviewRow[]> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data, error } = await sb.rpc("get_my_pending_formation_reviews");
  if (error) throw error;
  return (data ?? []) as FormationPendingReviewRow[];
}

/** Admin only : recupere la file pending_review_admin (relay 48h+). */
export async function fetchAdminRelayQueue(): Promise<FormationAdminRelayRow[]> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data, error } = await sb.rpc("get_admin_formation_relay_queue");
  if (error) throw error;
  return (data ?? []) as FormationAdminRelayRow[];
}

/** Recupere les messages thread d une progression (ordre chronologique). */
export async function fetchReviewThread(
  progressId: string,
): Promise<FormationThreadRow[]> {
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data, error } = await sb
    .from("formation_review_threads")
    .select("*")
    .eq("progress_id", progressId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FormationThreadRow[];
}

// ─── MUTATIONS ─────────────────────────────────────────────────────────────

/**
 * Marque un module comme commence (status='in_progress'). Idempotent.
 */
export async function startModule(moduleId: string): Promise<FormationProgressRow> {
  return fetchOrCreateModuleProgress(moduleId);
}

/**
 * Soumet un module pour validation.
 *  - Si quiz_score = 100 → auto-validated (validation_path='auto')
 *  - Sinon → pending_review_sponsor
 *
 * Retourne le statut final + XP attribue.
 */
export async function submitModule(params: {
  moduleId: string;
  quizScore: number;
  quizAnswers?: unknown[];
}): Promise<SubmitModuleResult> {
  const { moduleId, quizScore, quizAnswers = [] } = params;
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  // S assure que la row existe
  const existing = await fetchOrCreateModuleProgress(moduleId);

  const isPerfect = quizScore >= AUTO_VALIDATION_SCORE;
  const nowIso = new Date().toISOString();

  const update: Partial<FormationProgressRow> = {
    quiz_score: quizScore,
    quiz_answers: quizAnswers,
    submitted_at: nowIso,
    status: (isPerfect ? "validated" : "pending_review_sponsor") satisfies FormationProgressStatus,
  };
  if (isPerfect) {
    update.validation_path = "auto" satisfies FormationValidationPath;
    update.reviewed_by = uid;
    update.reviewed_at = nowIso;
  }

  const { error } = await sb
    .from("formation_user_progress")
    .update(update)
    .eq("id", existing.id);
  if (error) throw error;

  // Insert thread auto avec les reponses (kind=answer)
  const threadContent = isPerfect
    ? `Quiz validé à 100 % — module auto-validé 🎉`
    : `Quiz soumis (${quizScore}%) — en attente de revue sponsor`;
  await sb.from("formation_review_threads").insert({
    progress_id: existing.id,
    sender_id: uid,
    kind: "answer" satisfies FormationThreadKind,
    content: threadContent,
  });

  // XP : Phase B note l attribution attendue (l agregation reelle viendra
  // en Phase D quand on etendra get_user_xp pour inclure formation_xp).
  const xpAwarded =
    FORMATION_XP.moduleValidated + (isPerfect ? FORMATION_XP.quizPerfect : 0);

  return {
    status: update.status as FormationProgressStatus,
    validationPath: update.validation_path ?? null,
    autoValidated: isPerfect,
    xpAwarded: isPerfect ? xpAwarded : 0,
  };
}

/**
 * Sponsor ou admin valide un module. Bascule status='validated'.
 *  - validationPath = 'sponsor' (cas standard)
 *  - validationPath = 'admin_relay' si l etat actuel est pending_review_admin
 */
export async function validateModule(params: {
  progressId: string;
  feedback?: string;
}): Promise<void> {
  const { progressId, feedback } = params;
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  // Determine le validation_path en lisant le status actuel
  const { data: current, error: fetchErr } = await sb
    .from("formation_user_progress")
    .select("status")
    .eq("id", progressId)
    .single();
  if (fetchErr) throw fetchErr;

  const currentStatus = (current as { status: FormationProgressStatus }).status;
  const validationPath: FormationValidationPath =
    currentStatus === "pending_review_admin" ? "admin_relay" : "sponsor";

  const nowIso = new Date().toISOString();
  const { error } = await sb
    .from("formation_user_progress")
    .update({
      status: "validated" satisfies FormationProgressStatus,
      validation_path: validationPath,
      reviewed_by: uid,
      reviewed_at: nowIso,
      feedback: feedback ?? null,
    })
    .eq("id", progressId);
  if (error) throw error;

  await sb.from("formation_review_threads").insert({
    progress_id: progressId,
    sender_id: uid,
    kind: "validation_decision" satisfies FormationThreadKind,
    content: feedback?.trim() || "Module validé.",
  });
}

/**
 * Sponsor demande complement : status repasse a 'in_progress' et le distri
 * peut refaire. Le message est ajoute dans le thread (kind='question').
 */
export async function requestComplement(params: {
  progressId: string;
  message: string;
}): Promise<void> {
  const { progressId, message } = params;
  if (!message.trim()) throw new Error("Le message ne peut pas etre vide.");
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  const { error: updateErr } = await sb
    .from("formation_user_progress")
    .update({
      status: "in_progress" satisfies FormationProgressStatus,
      feedback: message.trim(),
    })
    .eq("id", progressId);
  if (updateErr) throw updateErr;

  await sb.from("formation_review_threads").insert({
    progress_id: progressId,
    sender_id: uid,
    kind: "question" satisfies FormationThreadKind,
    content: message.trim(),
  });
}

/**
 * Sponsor / admin rejette le module. Le distri peut le refaire (status
 * passe a 'rejected' qui debloque update self via RLS — confirmee).
 */
export async function rejectModule(params: {
  progressId: string;
  feedback: string;
}): Promise<void> {
  const { progressId, feedback } = params;
  if (!feedback.trim()) throw new Error("Un feedback est requis pour rejeter.");
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  const nowIso = new Date().toISOString();
  const { error } = await sb
    .from("formation_user_progress")
    .update({
      status: "rejected" satisfies FormationProgressStatus,
      reviewed_by: uid,
      reviewed_at: nowIso,
      feedback: feedback.trim(),
    })
    .eq("id", progressId);
  if (error) throw error;

  await sb.from("formation_review_threads").insert({
    progress_id: progressId,
    sender_id: uid,
    kind: "validation_decision" satisfies FormationThreadKind,
    content: feedback.trim(),
  });
}

/**
 * Ajoute un message generique dans le thread (discussion libre entre
 * distri et sponsor sans changer le status).
 */
export async function addThreadMessage(params: {
  progressId: string;
  content: string;
  kind?: FormationThreadKind;
}): Promise<FormationThreadRow> {
  const { progressId, content, kind = "feedback" } = params;
  if (!content.trim()) throw new Error("Le message ne peut pas etre vide.");
  const sb = await getSupabaseClient();
  if (!sb) throw new Error("Supabase indisponible");
  const { data: session } = await sb.auth.getUser();
  const uid = session?.user?.id;
  if (!uid) throw new Error("Non authentifie");

  const { data, error } = await sb
    .from("formation_review_threads")
    .insert({
      progress_id: progressId,
      sender_id: uid,
      kind,
      content: content.trim(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as FormationThreadRow;
}
