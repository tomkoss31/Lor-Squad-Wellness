// =============================================================================
// admin-delete-external-distributor (2026-05-22)
//
// Supprime un distri externe : auth.users → cascade public.users + cascade
// pv_monthly_breakdown. Admin only. Refuse si le user n'est pas externe.
//
// Sécurité supplémentaire :
//   - Refuse si le user a des enfants (sponsor_id pointant vers lui) →
//     forcer Thomas à réassigner d'abord pour éviter d'orphelinier l'arbre.
//   - Refuse si des clients ont herbalife_uplink_user_id pointant vers lui.
// =============================================================================

import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, extractIp, logAdminAction } from "./_shared/admin-guard";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "Méthode non autorisée." });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const authHeader = String(req.headers.authorization ?? "");
  const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ ok: false, error: "Variables Supabase manquantes." });
    return;
  }
  if (!accessToken) {
    res.status(401).json({ ok: false, error: "Session admin manquante." });
    return;
  }

  const ip = extractIp(req);
  // Delete plus restrictif : 5 / minute (action destructive)
  const rl = checkRateLimit(`delete-ext:${ip}`, 5, 60_000);
  if (!rl.ok) {
    res.status(429).json({ ok: false, error: `Trop de suppressions. Réessaie dans ${rl.retryAfter}s.` });
    return;
  }

  const payload = req.body ?? {};
  const userId = String(payload.userId ?? "").trim();
  if (!userId) {
    res.status(400).json({ ok: false, error: "userId requis." });
    return;
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user: requester },
    error: authError,
  } = await admin.auth.getUser(accessToken);
  if (authError || !requester?.id) {
    res.status(401).json({ ok: false, error: "Session admin invalide." });
    return;
  }

  const { data: profile } = await admin
    .from("users")
    .select("role, active")
    .eq("id", requester.id)
    .single<{ role: string; active: boolean }>();

  if (!profile || profile.role !== "admin" || !profile.active) {
    res.status(403).json({ ok: false, error: "Admin actif requis pour supprimer un externe." });
    return;
  }

  // Vérifie que la cible est externe
  const { data: target, error: targetError } = await admin
    .from("users")
    .select("id, name, is_external")
    .eq("id", userId)
    .single<{ id: string; name: string; is_external: boolean }>();
  if (targetError || !target) {
    res.status(404).json({ ok: false, error: "Distri externe introuvable." });
    return;
  }
  if (!target.is_external) {
    res.status(400).json({ ok: false, error: "Suppression réservée aux distri externes." });
    return;
  }

  // Vérifie qu'il n'a pas d'enfants (autres externes le pointant comme sponsor)
  const { count: childrenCount } = await admin
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("sponsor_id", userId);
  if ((childrenCount ?? 0) > 0) {
    res.status(409).json({
      ok: false,
      error: `Impossible de supprimer ${target.name} : ${childrenCount} distri pointent vers lui comme sponsor. Réassigne-les d'abord.`,
    });
    return;
  }

  // Vérifie qu'aucun client n'utilise ce user comme uplink HL
  const { count: clientsUplinkCount } = await admin
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("herbalife_uplink_user_id", userId);
  if ((clientsUplinkCount ?? 0) > 0) {
    res.status(409).json({
      ok: false,
      error: `Impossible de supprimer ${target.name} : ${clientsUplinkCount} client(s) l'utilisent comme uplink HL. Change l'uplink sur ces fiches d'abord.`,
    });
    return;
  }

  // Delete auth.users → cascade public.users + pv_monthly_breakdown
  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    res.status(400).json({ ok: false, error: deleteError.message });
    return;
  }

  await logAdminAction(admin, {
    actorUserId: requester.id,
    action: "external_distributor_deleted",
    targetId: userId,
    targetLabel: target.name,
    payload: null,
    ip,
  });

  res.status(200).json({ ok: true });
}
