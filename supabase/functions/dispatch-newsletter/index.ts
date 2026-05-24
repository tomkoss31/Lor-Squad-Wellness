// Chantier #8 étape 8.5 (2026-05-23) — Distribution newsletter.
// Edge Function : envoie une newsletter à tous les destinataires (ou test).
//
// Input  : { newsletter_id: string, mode: 'test' | 'send' }
//   - test : envoie 1 seul email à l'admin appelant (currentUser.email)
//            ne change pas le status, ne crée pas de recipients
//   - send : envoie à TOUS les destinataires selon audience
//            insert newsletter_recipients + update newsletter.status='sent'
//
// Output : { success: true, sent_count, message_id (test) }
//          ou { success: false, error }
//
// Auth   : admin only (JWT + role check).
//
// Deploy : supabase functions deploy dispatch-newsletter

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { compileNewsletterHtml, type NewsletterSection } from "../_shared/newsletter-html.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const FROM = "La Base 360 News <newsletter@labase360.fr>";
const REPLY_TO = "newsletter@labase360.fr";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface ResendResult {
  ok: true;
  message_id: string;
}
interface ResendErr {
  ok: false;
  error: string;
}

async function sendOneEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<ResendResult | ResendErr> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: REPLY_TO,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: body?.message ?? `Resend HTTP ${res.status}` };
  }
  return { ok: true, message_id: body?.id ?? "unknown" };
}

// Throttle simple : Resend free tier = 100 emails / 10 sec.
// On envoie par batches de 10 avec pause 1s pour rester safe (~600/min).
async function sendBatch(
  recipients: Array<{ id: string; email: string; recipient_type: "client" | "distri" }>,
  subject: string,
  html: string,
): Promise<
  Array<{ id: string; email: string; recipient_type: "client" | "distri"; ok: boolean; message_id?: string; error?: string }>
> {
  const BATCH_SIZE = 10;
  const results: Array<{
    id: string;
    email: string;
    recipient_type: "client" | "distri";
    ok: boolean;
    message_id?: string;
    error?: string;
  }> = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (r) => {
        const res = await sendOneEmail({ to: r.email, subject, html });
        if (res.ok) return { ...r, ok: true, message_id: res.message_id };
        return { ...r, ok: false, error: res.error };
      }),
    );
    results.push(...batchResults);
    // Pause entre batches sauf le dernier
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return results;
}

async function requireAdminWithProfile(req: Request): Promise<
  | { ok: true; user_id: string; email: string }
  | { ok: false; reason: string }
> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, reason: "missing_jwt" };

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: userRes, error: userErr } = await sb.auth.getUser(token);
  if (userErr || !userRes?.user) return { ok: false, reason: "invalid_jwt" };

  const { data: profile, error: profileErr } = await sb
    .from("users")
    .select("role, active, email")
    .eq("id", userRes.user.id)
    .single();
  if (profileErr || !profile) return { ok: false, reason: "profile_not_found" };
  if (profile.role !== "admin") return { ok: false, reason: "not_admin" };
  if (!profile.active) return { ok: false, reason: "user_inactive" };

  const email = profile.email ?? userRes.user.email ?? "";
  if (!email) return { ok: false, reason: "admin_email_missing" };
  return { ok: true, user_id: userRes.user.id, email };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const auth = await requireAdminWithProfile(req);
  if (!auth.ok) return json({ success: false, error: auth.reason }, 401);

  let body: { newsletter_id?: string; mode?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const newsletterId = String(body.newsletter_id ?? "").trim();
  const mode = body.mode === "test" ? "test" : "send";
  if (!newsletterId) return json({ success: false, error: "missing_newsletter_id" }, 400);

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // 1. Load newsletter
  const { data: nl, error: nlErr } = await sb
    .from("newsletters")
    .select("id, title, slug, subtitle, audience, status, is_public, body_json, sent_at, template_key")
    .eq("id", newsletterId)
    .single();
  if (nlErr || !nl) return json({ success: false, error: "newsletter_not_found" }, 404);

  const rawSections = (nl.body_json?.sections as Array<Partial<NewsletterSection>> | undefined) ?? [];
  if (rawSections.length === 0) {
    return json({ success: false, error: "no_sections" }, 400);
  }

  // 2. Compile HTML (mode email = pas de paywall, tout visible pour abonnés)
  const sections: NewsletterSection[] = rawSections.map((s, i) => ({
    id: s.id ?? `sec-${i}`,
    title: s.title ?? "",
    body_md: s.body_md ?? "",
    is_public: s.is_public !== false,
    position: s.position ?? i + 1,
    emoji: s.emoji ?? "",
    tag_label: s.tag_label ?? "",
    saviez_vous_md: s.saviez_vous_md ?? "",
    saviez_vous_label: s.saviez_vous_label ?? "Le saviez-vous ?",
    show_cta_bilan: s.show_cta_bilan === true,
    paywall_mode: s.paywall_mode === "teaser" ? "teaser" : "none",
  }));

  const html = compileNewsletterHtml({
    title: nl.title,
    subtitle: nl.subtitle,
    slug: nl.slug,
    sections,
    mode: "email",
    bilanCtaUrl: "https://labase360.fr/bilan-online/admin?utm_source=newsletter&utm_medium=email&utm_campaign=" + nl.slug,
    businessUrl: "https://labase360.fr/business?utm_source=newsletter&utm_medium=email&utm_campaign=" + nl.slug + "&leadcapture=1",
    sentAt: nl.sent_at,
    templateKey: nl.template_key,
  });
  const subject = nl.subtitle ? `${nl.title} — ${nl.subtitle}` : nl.title;

  // 3a. MODE TEST : envoie 1 email à l'admin appelant.
  if (mode === "test") {
    const result = await sendOneEmail({
      to: auth.email,
      subject: `[TEST] ${subject}`,
      html,
    });
    if (!result.ok) return json({ success: false, error: result.error }, 502);
    return json({
      success: true,
      mode: "test",
      sent_to: auth.email,
      message_id: result.message_id,
    });
  }

  // 3b. MODE SEND : envoie à tous les destinataires selon audience.
  if (nl.status === "sent") {
    return json({ success: false, error: "already_sent" }, 400);
  }

  // 4. Récupère destinataires selon audience.
  type Recipient = { id: string; email: string; recipient_type: "client" | "distri" };
  const recipients: Recipient[] = [];

  if (nl.audience === "clients" || nl.audience === "all") {
    const { data: clients, error: cliErr } = await sb
      .from("clients")
      .select("id, email")
      .not("email", "is", null)
      .neq("email", "");
    if (cliErr) return json({ success: false, error: `clients_fetch: ${cliErr.message}` }, 500);
    for (const c of clients ?? []) {
      if (c.email && /.+@.+\..+/.test(c.email)) {
        recipients.push({ id: String(c.id), email: c.email, recipient_type: "client" });
      }
    }
  }

  if (nl.audience === "distri" || nl.audience === "all") {
    const { data: users, error: usrErr } = await sb
      .from("users")
      .select("id, email")
      .in("role", ["distributor", "admin", "referent"])
      .eq("active", true)
      .not("email", "is", null)
      .neq("email", "");
    if (usrErr) return json({ success: false, error: `users_fetch: ${usrErr.message}` }, 500);
    for (const u of users ?? []) {
      if (u.email && /.+@.+\..+/.test(u.email)) {
        recipients.push({ id: String(u.id), email: u.email, recipient_type: "distri" });
      }
    }
  }

  if (recipients.length === 0) {
    return json({ success: false, error: "no_recipients" }, 400);
  }

  // Déduplication par email (un distri qui est aussi client = 1 seul envoi)
  const seen = new Set<string>();
  const dedup: Recipient[] = [];
  for (const r of recipients) {
    const k = r.email.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      dedup.push(r);
    }
  }

  // 5. Envoi batch + insert newsletter_recipients
  const sendResults = await sendBatch(dedup, subject, html);
  const successCount = sendResults.filter((r) => r.ok).length;
  const failures = sendResults.filter((r) => !r.ok);

  // Bulk insert recipients (upsert via unique constraint pour idempotence)
  const recipientsRows = sendResults.map((r) => ({
    newsletter_id: newsletterId,
    recipient_type: r.recipient_type,
    recipient_id: r.id,
    email: r.email,
    sent_at: new Date().toISOString(),
    resend_message_id: r.ok ? r.message_id : null,
    bounced_at: r.ok ? null : new Date().toISOString(),
  }));
  // Chunked insert (Supabase limite ~1000/batch)
  for (let i = 0; i < recipientsRows.length; i += 500) {
    const chunk = recipientsRows.slice(i, i + 500);
    const { error: insErr } = await sb
      .from("newsletter_recipients")
      .upsert(chunk, { onConflict: "newsletter_id,recipient_type,recipient_id" });
    if (insErr) {
      console.error("recipients insert error", insErr.message);
    }
  }

  // 6. Update newsletter status
  const { error: updErr } = await sb
    .from("newsletters")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      sent_by_user_id: auth.user_id,
      body_html: html,
    })
    .eq("id", newsletterId);
  if (updErr) {
    console.error("newsletter status update failed:", updErr.message);
  }

  return json({
    success: true,
    mode: "send",
    sent_count: successCount,
    failed_count: failures.length,
    total: dedup.length,
    failures: failures.slice(0, 10).map((f) => ({ email: f.email, error: f.error })),
  });
});
