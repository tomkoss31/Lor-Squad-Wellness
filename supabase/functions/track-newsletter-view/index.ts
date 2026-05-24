// Chantier #8 étape 8.7 (2026-05-23) — Tracking vues page publique.
// Edge Function : incrémente newsletters.view_count.
//
// Input  : { slug: string }
// Output : { success: true, view_count }
//
// Auth   : public (no JWT). Anti-spam : rate limit IP 1×/min/slug.
//
// Deploy : supabase functions deploy track-newsletter-view --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Rate limit in-memory : 1 vue / IP / slug / 60 secondes.
// (Évite qu'un refresh F5 explose le compteur.)
const seen = new Map<string, number>();
const WINDOW_MS = 60_000;

function shouldCount(ip: string, slug: string): boolean {
  const key = `${ip}|${slug}`;
  const now = Date.now();
  const last = seen.get(key) ?? 0;
  if (now - last < WINDOW_MS) return false;
  seen.set(key, now);
  // Garbage collect old entries
  if (seen.size > 5000) {
    for (const [k, t] of seen.entries()) {
      if (now - t > WINDOW_MS * 10) seen.delete(k);
    }
  }
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let body: { slug?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const slug = String(body.slug ?? "").trim();
  if (!slug) return json({ error: "missing_slug" }, 400);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Fetch view_count actuel
  const { data: nl, error: nlErr } = await sb
    .from("newsletters")
    .select("id, view_count, status, is_public")
    .eq("slug", slug)
    .single();
  if (nlErr || !nl) return json({ error: "not_found" }, 404);
  if (nl.status !== "sent" || !nl.is_public) {
    return json({ error: "not_public" }, 403);
  }

  if (!shouldCount(ip, slug)) {
    return json({ success: true, view_count: nl.view_count, counted: false });
  }

  const newCount = (nl.view_count ?? 0) + 1;
  const { error: updErr } = await sb
    .from("newsletters")
    .update({ view_count: newCount })
    .eq("id", nl.id);
  if (updErr) return json({ error: updErr.message }, 500);

  return json({ success: true, view_count: newCount, counted: true });
});
