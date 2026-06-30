// =============================================================================
// rdv-confirm-client — email de CONFIRMATION envoyé au CLIENT de suivi quand
// un RDV (follow_up planifié) vient d'être créé.
//
// Déclenché par un trigger Postgres AFTER INSERT sur follow_ups (pg_net), donc
// 1 appel par nouveau RDV (pas de re-confirm sur reschedule). Anti-doublon
// inutile : le trigger fire exactement 1× par ligne.
//
// Garde-fous (l'edge skippe silencieusement, jamais d'erreur bloquante) :
//   • follow_up introuvable / status ≠ scheduled / due_date passée → skip
//   • client sans email → skip (pas de SMS ici)
//
// Deploy : supabase functions deploy rdv-confirm-client
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getServiceClient, corsHeaders, jsonResponse } from "../_shared/push.ts";
import { rdvEmailHtml } from "../_shared/rdvEmail.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const FROM_DEFAULT = "La Base 360 <rdv@labase360.fr>";
const REPLY_TO_DEFAULT = "contact@labase360.fr";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parisDateLabel(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(iso));
}
function parisHourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_DEFAULT, to: [to], subject, reply_to: REPLY_TO_DEFAULT, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let body: { follow_up_id?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }
  const followUpId = (body.follow_up_id ?? "").trim();
  if (!followUpId) return jsonResponse({ ok: false, error: "missing_follow_up_id" }, 400);

  const sb = getServiceClient();

  try {
    const { data: fu } = await sb
      .from("follow_ups")
      .select("id, client_id, due_date, status")
      .eq("id", followUpId)
      .single();
    if (!fu || !fu.client_id || !fu.due_date) return jsonResponse({ ok: true, skipped: "no_rdv" });
    // On confirme tout RDV à venir SAUF s'il est terminé / annulé / inactif.
    if (["completed", "dismissed", "inactive"].includes(String(fu.status))) {
      return jsonResponse({ ok: true, skipped: `status_${fu.status}` });
    }
    if (new Date(fu.due_date as string).getTime() <= Date.now()) return jsonResponse({ ok: true, skipped: "past" });

    const { data: client } = await sb
      .from("clients")
      .select("id, first_name, last_name, email, distributor_id")
      .eq("id", fu.client_id as string)
      .single();
    const to = String((client?.email as string) ?? "").trim();
    if (!to || !EMAIL_RE.test(to)) return jsonResponse({ ok: true, skipped: "no_email" });

    let coachName = "ton coach La Base";
    let location = "ton club La Base";
    if (client?.distributor_id) {
      const { data: coach } = await sb
        .from("users")
        .select("name, rdv_location, city")
        .eq("id", client.distributor_id as string)
        .single();
      coachName = String((coach?.name as string) ?? "").trim() || coachName;
      location = String((coach?.rdv_location as string) || (coach?.city as string) || "").trim() || location;
    }

    const html = rdvEmailHtml({
      kind: "confirm",
      firstName: String((client?.first_name as string) ?? "").trim(),
      coachName,
      dateLabel: parisDateLabel(fu.due_date as string),
      hour: parisHourLabel(fu.due_date as string),
      location,
    });
    const ok = await sendViaResend(to, "✅ Ton prochain rendez-vous est confirmé", html);
    if (ok) {
      await sb.from("client_rdv_reminders_sent").upsert(
        { follow_up_id: followUpId, kind: "confirm_email" },
        { onConflict: "follow_up_id,kind", ignoreDuplicates: true },
      );
    }
    return jsonResponse({ ok: true, sent: ok });
  } catch (err) {
    return jsonResponse({ ok: false, error: err instanceof Error ? err.message : "unknown" }, 500);
  }
});
