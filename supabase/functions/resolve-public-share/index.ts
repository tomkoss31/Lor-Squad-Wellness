// Chantier RGPD partage public (2026-04-24).
// Edge Function : résolution d'un token /partage/:token.
// PAS d'auth requise (page publique). Valide token + consent + expiration
// + révocation. Log la vue (ip_hash SHA256, user_agent) puis retourne des
// données ANONYMISÉES (prénom + stats seulement, pas de PII coach ou client).
//
// Input  : { token: string }
// Output succès : { valid: true, data: {...} }
// Output échec  : { valid: false, reason: "not_found"|"expired"|"revoked"|"consent_revoked" }
//
// Deploy: supabase functions deploy resolve-public-share --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Salt secret stocké dans Supabase Functions secrets (env IP_HASH_SALT).
// Empêche l'attaque par rainbow tables sur les IP hashées (RGPD strict).
// Si la variable n'est pas définie (ex: dev), fallback sur chaîne vide.
const IP_HASH_SALT = Deno.env.get("IP_HASH_SALT") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Classifie un user-agent en device class (mobile/desktop/bot/unknown).
 * RGPD : stocker juste la classe au lieu du UA brut limite l'exposition
 * de données techniques (device, OS, version) tout en gardant l'utilité
 * statistique (compteur de vues par type).
 */
function classifyUserAgent(ua: string | null | undefined): string {
  if (!ua) return "unknown";
  if (/Bot|Crawler|Spider|HeadlessChrome/i.test(ua)) return "bot";
  if (/Mobile|Android|iPhone|iPad|Tablet/i.test(ua)) return "mobile";
  return "desktop";
}

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(IP_HASH_SALT + input);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface ClientRow {
  id: string;
  first_name: string;
  distributor_id: string | null;
  public_share_consent: boolean;
  public_share_revoked_at: string | null;
}

interface UserRow {
  first_name: string | null;
  last_name: string | null;
}

interface BodyScan {
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  hydration?: number | null;
}

interface AssessmentRow {
  date: string | null;
  body_scan: BodyScan | null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ valid: false, reason: "method_not_allowed" }, 405);
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ valid: false, reason: "invalid_json" }, 400);
  }
  const token = (body.token ?? "").trim();
  if (!token) {
    return json({ valid: false, reason: "missing_token" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // 1) Lookup token
    const { data: tokenRow, error: tokenErr } = await sb
      .from("client_public_share_tokens")
      .select("id, client_id, expires_at, revoked_at")
      .eq("token", token)
      .maybeSingle();

    if (tokenErr) throw tokenErr;
    if (!tokenRow) {
      return json({ valid: false, reason: "not_found" }, 404);
    }
    const t = tokenRow as {
      id: string;
      client_id: string;
      expires_at: string;
      revoked_at: string | null;
    };

    if (t.revoked_at) {
      return json({ valid: false, reason: "revoked" }, 410);
    }
    if (new Date(t.expires_at).getTime() < Date.now()) {
      return json({ valid: false, reason: "expired" }, 410);
    }

    // 2) Fetch client + check consent
    const { data: clientRow, error: clientErr } = await sb
      .from("clients")
      .select(
        "id, first_name, distributor_id, public_share_consent, public_share_revoked_at",
      )
      .eq("id", t.client_id)
      .maybeSingle();

    if (clientErr) throw clientErr;
    if (!clientRow) {
      return json({ valid: false, reason: "not_found" }, 404);
    }
    const c = clientRow as ClientRow;

    if (!c.public_share_consent || c.public_share_revoked_at) {
      return json({ valid: false, reason: "consent_revoked" }, 410);
    }

    // 3) Fetch coach (prénom uniquement — pas de PII contact)
    let coachFirstName = "ton coach";
    if (c.distributor_id) {
      const { data: coachRow } = await sb
        .from("users")
        .select("first_name, last_name")
        .eq("id", c.distributor_id)
        .maybeSingle();
      if (coachRow) {
        const u = coachRow as UserRow;
        coachFirstName = (u.first_name ?? "").trim() || "ton coach";
      }
    }

    // 4) Fetch assessments history → body_scan (latest) + metrics_history (all)
    const { data: assessmentsRaw } = await sb
      .from("assessments")
      .select("date, body_scan")
      .eq("client_id", c.id)
      .order("date", { ascending: true });

    const assessments = (assessmentsRaw ?? []) as AssessmentRow[];
    const metricsHistory = assessments
      .filter((a) => a.body_scan && a.date)
      .map((a) => ({
        date: a.date as string,
        weight: a.body_scan?.weight ?? undefined,
        bodyFat: a.body_scan?.bodyFat ?? undefined,
        muscleMass: a.body_scan?.muscleMass ?? undefined,
        hydration: a.body_scan?.hydration ?? undefined,
      }));

    const latest = assessments[assessments.length - 1];
    const bodyScan = latest?.body_scan
      ? {
          weight: latest.body_scan.weight ?? undefined,
          bodyFat: latest.body_scan.bodyFat ?? undefined,
          muscleMass: latest.body_scan.muscleMass ?? undefined,
          hydration: latest.body_scan.hydration ?? undefined,
        }
      : undefined;

    // 5) Fetch program title (non PII) depuis clients.current_program
    let programTitle: string | undefined;
    {
      const { data: programRow } = await sb
        .from("clients")
        .select("current_program")
        .eq("id", c.id)
        .maybeSingle();
      if (programRow) {
        const pt = (programRow as { current_program: string | null }).current_program;
        programTitle = pt ?? undefined;
      }
    }

    // 6) Log view (ip_hash SHA256 + user_agent, best-effort non bloquant)
    try {
      const rawIp =
        req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
        req.headers.get("x-real-ip") ??
        "unknown";
      const ipHash = rawIp !== "unknown" ? await sha256(rawIp) : null;
      const userAgent = classifyUserAgent(req.headers.get("user-agent"));

      await sb.from("client_public_share_views").insert({
        token_id: t.id,
        ip_hash: ipHash,
        user_agent: userAgent,
      });

      // Increment view_count (read-then-write, best effort)
      const { data: current } = await sb
        .from("client_public_share_tokens")
        .select("view_count")
        .eq("id", t.id)
        .maybeSingle();
      const currentCount = (current as { view_count: number } | null)?.view_count ?? 0;
      await sb
        .from("client_public_share_tokens")
        .update({ view_count: currentCount + 1 })
        .eq("id", t.id);
    } catch (logErr) {
      console.error("[resolve-public-share] log view failed (non-blocking):", logErr);
    }

    // 7) Retour payload ANONYMISÉ
    return json({
      valid: true,
      data: {
        client_first_name: c.first_name,
        coach_first_name: coachFirstName,
        program_title: programTitle,
        expires_at: t.expires_at,
        body_scan: bodyScan,
        metrics_history: metricsHistory,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[resolve-public-share]", msg);
    return json({ valid: false, reason: "server_error", error: msg }, 500);
  }
});
