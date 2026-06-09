// Chantier #8 étape 8.6 (2026-05-23) — Webhook Resend pour tracking events.
//
// Reçoit les événements Resend (email.delivered / opened / clicked / bounced)
// et met à jour newsletter_recipients + compteurs agrégés sur newsletters.
//
// Sécurité : signature Svix (Resend utilise Svix sous le capot). Si la variable
// RESEND_WEBHOOK_SECRET est définie, on vérifie la signature avant traitement.
// Sinon (dev), on accepte tout en loggant un warning.
//
// Idempotence : on n'incrémente le compteur que si le champ timestamp était NULL
// (premier événement de ce type pour ce destinataire). Resend peut retry.
//
// Setup côté Resend :
//   1. resend.com/webhooks → Add Webhook
//   2. URL : https://<project>.supabase.co/functions/v1/resend-webhook
//   3. Cocher tous les events email.* (delivered, opened, clicked, bounced, complained)
//   4. Copier le signing secret → supabase secrets set RESEND_WEBHOOK_SECRET=<...>
//
// Deploy : supabase functions deploy resend-webhook --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// ─── Svix signature verification ──────────────────────────────────────────────
// Svix headers : svix-id, svix-timestamp, svix-signature
// Signature : v1,<base64 hmac_sha256(secret_decoded, "id.timestamp.body")>
async function verifySvixSignature(
  body: string,
  headers: Headers,
  secret: string,
): Promise<boolean> {
  if (!secret) return true; // dev mode : skip
  const svixId = headers.get("svix-id");
  const svixTs = headers.get("svix-timestamp");
  const svixSig = headers.get("svix-signature");
  if (!svixId || !svixTs || !svixSig) return false;

  // Tolerance 5 min (anti-replay)
  const ts = parseInt(svixTs, 10);
  if (Number.isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  // Secret format : "whsec_<base64>"
  const secretBase64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = Uint8Array.from(atob(secretBase64), (c) => c.charCodeAt(0));
  } catch {
    return false;
  }

  const signedContent = `${svixId}.${svixTs}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBytes = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signedContent),
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));

  // svix-signature header peut contenir plusieurs versions séparées par espace
  // ex: "v1,abc123 v1,xyz789"
  const providedSigs = svixSig.split(" ").map((s) => s.split(",")[1] ?? "");
  return providedSigs.some((s) => s === expected);
}

interface ResendEventData {
  email_id?: string;
  click?: { link?: string };
}

interface ResendEvent {
  type: string;
  created_at: string;
  data: ResendEventData;
}

// ─── Helpers update ───────────────────────────────────────────────────────────
async function findRecipient(
  sb: ReturnType<typeof createClient>,
  emailId: string,
) {
  const { data, error } = await sb
    .from("newsletter_recipients")
    .select("id, newsletter_id, opened_at, clicked_bilan_at, clicked_business_at, delivered_at, bounced_at")
    .eq("resend_message_id", emailId)
    .single();
  if (error || !data) return null;
  return data;
}

// Increment ATOMIQUE via RPC SQL `increment_newsletter_counter` (migration
// 20261130000000). Évite la race condition du lecture-modification précédent
// (sous webhooks concurrents Resend, des events pouvaient être perdus/doublés).
async function incrementCounter(
  sb: ReturnType<typeof createClient>,
  newsletterId: string,
  column: "email_open_count" | "email_click_count" | "bilan_cta_clicks" | "business_cta_clicks",
) {
  const { error } = await sb.rpc("increment_newsletter_counter", {
    p_newsletter_id: newsletterId,
    p_column: column,
  });
  if (error) console.warn("[resend-webhook] increment compteur échoué:", column, error.message);
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const body = await req.text();

  // 1. Signature check
  const sigOk = await verifySvixSignature(body, req.headers, WEBHOOK_SECRET);
  if (!sigOk) {
    console.error("Invalid Svix signature");
    return json({ error: "invalid_signature" }, 401);
  }
  if (!WEBHOOK_SECRET) {
    console.warn("RESEND_WEBHOOK_SECRET not set — signature verification skipped");
  }

  // 2. Parse event
  let event: ResendEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const emailId = event?.data?.email_id;
  if (!emailId) return json({ ignored: true, reason: "no_email_id" });

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const recipient = await findRecipient(sb, emailId);
  if (!recipient) {
    // Pas un email envoyé par notre système (ou message_id pas tracké)
    return json({ ignored: true, reason: "recipient_not_found", email_id: emailId });
  }

  const now = new Date().toISOString();

  switch (event.type) {
    case "email.delivered": {
      if (recipient.delivered_at) break; // idempotent
      await sb
        .from("newsletter_recipients")
        .update({ delivered_at: now })
        .eq("id", recipient.id);
      break;
    }

    case "email.opened": {
      if (recipient.opened_at) break; // idempotent : 1 open par destinataire
      await sb
        .from("newsletter_recipients")
        .update({ opened_at: now })
        .eq("id", recipient.id);
      await incrementCounter(sb, recipient.newsletter_id, "email_open_count");
      break;
    }

    case "email.clicked": {
      const linkUrl = event.data.click?.link ?? "";
      // On classifie : bilan vs business vs autre (juste compteur global)
      const isBilan = /\/bilan-online|utm_campaign=.*&|bilan/i.test(linkUrl);
      const isBusiness = /\/business|opportunite/i.test(linkUrl);

      const patch: Record<string, string> = {};
      let needIncBilan = false;
      let needIncBusiness = false;

      if (isBilan && !recipient.clicked_bilan_at) {
        patch.clicked_bilan_at = now;
        needIncBilan = true;
      }
      if (isBusiness && !recipient.clicked_business_at) {
        patch.clicked_business_at = now;
        needIncBusiness = true;
      }

      if (Object.keys(patch).length > 0) {
        await sb
          .from("newsletter_recipients")
          .update(patch)
          .eq("id", recipient.id);
      }
      // Compteur global click : 1 par event (multi-clicks possibles)
      await incrementCounter(sb, recipient.newsletter_id, "email_click_count");
      if (needIncBilan) {
        await incrementCounter(sb, recipient.newsletter_id, "bilan_cta_clicks");
      }
      if (needIncBusiness) {
        await incrementCounter(sb, recipient.newsletter_id, "business_cta_clicks");
      }
      break;
    }

    case "email.bounced":
    case "email.complained": {
      if (recipient.bounced_at) break; // idempotent
      await sb
        .from("newsletter_recipients")
        .update({ bounced_at: now })
        .eq("id", recipient.id);
      break;
    }

    default:
      // Autres events (email.sent, email.delivery_delayed) : on ignore.
      return json({ ignored: true, reason: "event_type_not_tracked", type: event.type });
  }

  return json({ success: true, type: event.type, recipient_id: recipient.id });
});
