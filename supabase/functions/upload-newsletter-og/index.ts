// Chantier #8 étape 8.8 fix (2026-05-24).
// Upload image OG newsletter via service_role (bypass RLS storage).
//
// Input  : multipart/form-data { file: Blob, slug: string, newsletter_id: string }
// Output : { success: true, public_url } ou { success: false, error }
//
// Auth   : admin only (JWT + role check via public.users).
//
// Deploy : supabase functions deploy upload-newsletter-og

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

async function requireAdmin(req: Request): Promise<
  | { ok: true; user_id: string }
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
    .select("role, active")
    .eq("id", userRes.user.id)
    .single();
  if (profileErr || !profile) return { ok: false, reason: "profile_not_found" };
  if (profile.role !== "admin") return { ok: false, reason: "not_admin" };
  if (!profile.active) return { ok: false, reason: "user_inactive" };

  return { ok: true, user_id: userRes.user.id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return json({ success: false, error: auth.reason }, 401);

  // Parse multipart
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ success: false, error: "invalid_multipart" }, 400);
  }

  const file = formData.get("file");
  const slug = String(formData.get("slug") ?? "").trim();
  const newsletterId = String(formData.get("newsletter_id") ?? "").trim();

  if (!file || !(file instanceof Blob)) {
    return json({ success: false, error: "missing_file" }, 400);
  }
  if (!slug) return json({ success: false, error: "missing_slug" }, 400);
  if (!newsletterId) return json({ success: false, error: "missing_newsletter_id" }, 400);
  if (file.size > 3 * 1024 * 1024) {
    return json({ success: false, error: "file_too_large_max_3mb" }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const fileName = `${slug}.png`;
  const arrayBuffer = await file.arrayBuffer();

  // Upload bypass RLS via service_role
  const { error: uploadErr } = await sb.storage
    .from("newsletter-og-images")
    .upload(fileName, arrayBuffer, {
      contentType: "image/png",
      upsert: true,
      cacheControl: "3600",
    });

  if (uploadErr) {
    return json({ success: false, error: `upload_failed: ${uploadErr.message}` }, 500);
  }

  // Public URL (cache-buster timestamp pour refresh browser)
  const { data: pubData } = sb.storage
    .from("newsletter-og-images")
    .getPublicUrl(fileName);
  const publicUrl = `${pubData.publicUrl}?v=${Date.now()}`;

  // Update newsletter row
  const { error: updErr } = await sb
    .from("newsletters")
    .update({ preview_image_url: publicUrl })
    .eq("id", newsletterId);
  if (updErr) {
    return json({ success: false, error: `update_failed: ${updErr.message}` }, 500);
  }

  return json({ success: true, public_url: publicUrl });
});
