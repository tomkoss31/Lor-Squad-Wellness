// =============================================================================
// admin-guard — chantier #12 polish 2026-05-22
//
// Helper partagé pour les endpoints API admin (Vercel serverless).
// Centralise :
//   1. Rate-limit in-memory par IP (5 actions / minute par défaut)
//   2. Audit log via RPC log_admin_action (service_role)
//   3. Extraction d'IP fiable depuis req.headers
//
// Note : le rate-limit in-memory reset au cold-start Vercel (lambdas
// éphémères). Pas un firewall complet mais protège contre bursts
// élémentaires (script naïf).
// =============================================================================

const RATE_BUCKET = new Map<string, number[]>();
const DEFAULT_WINDOW_MS = 60 * 1000; // 1 min
const DEFAULT_MAX = 10;

export function checkRateLimit(
  key: string,
  max: number = DEFAULT_MAX,
  windowMs: number = DEFAULT_WINDOW_MS,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const history = (RATE_BUCKET.get(key) ?? []).filter((t) => now - t < windowMs);
  if (history.length >= max) {
    const oldest = history[0];
    return { ok: false, retryAfter: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  history.push(now);
  RATE_BUCKET.set(key, history);
  return { ok: true };
}

export function extractIp(req: any): string {
  const fwd = String(req.headers["x-forwarded-for"] ?? "");
  if (fwd) return fwd.split(",")[0].trim();
  const real = String(req.headers["x-real-ip"] ?? "");
  if (real) return real;
  return "unknown";
}

/**
 * Log une action admin dans admin_audit_log via RPC service_role.
 * Best-effort : si l'audit échoue, on ne fait pas échouer l'action.
 */
export async function logAdminAction(
  supabaseClient: any,
  params: {
    actorUserId: string;
    action: string;
    targetId?: string | null;
    targetLabel?: string | null;
    payload?: Record<string, unknown> | null;
    ip?: string | null;
  },
): Promise<void> {
  try {
    await supabaseClient.rpc("log_admin_action", {
      p_actor_user_id: params.actorUserId,
      p_action: params.action,
      p_target_id: params.targetId ?? null,
      p_target_label: params.targetLabel ?? null,
      p_payload: params.payload ?? null,
      p_ip: params.ip ?? null,
    });
  } catch (err) {
    console.warn("[admin-audit] log_admin_action failed:", err);
  }
}
