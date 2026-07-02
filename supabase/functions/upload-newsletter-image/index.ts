// Upload d'un visuel de SECTION de newsletter (produit, illustration…).
// Générique : bypass RLS storage via service_role, retourne l'URL publique.
// Contrairement à upload-newsletter-og, ne touche pas newsletters.preview_image_url.
//
// Input  : multipart/form-data { file: Blob }
// Output : { success: true, public_url } ou { success: false, error }
//
// Auth   : admin only (JWT + role check via public.users).
//
// Deploy : supabase functions deploy upload-newsletter-image

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "newsletter-og-images";

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

// Extension sûre depuis le nom de fichier / content-type (defaut jpg).
function pickExtension(fileName: string, contentType: string): string {
  const fromName = fileName.toLowerCase().match(/\.(jpg|jpeg|png|webp|gif)$/)?.[1];
  if (fromName) return fromName === "jpeg" ? "jpg" : fromName;
  if (contentType.includes("png")) return "png";
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("gif")) return "gif";
  return "jpg";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const auth = await requireAdmin(req);
  if (!auth.ok) return json({ success: false, error: auth.reason }, 401);

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return json({ success: false, error: "invalid_multipart" }, 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return json({ success: false, error: "missing_file" }, 400);
  }
  if (file.size > 3 * 1024 * 1024) {
    return json({ success: false, error: "file_too_large_max_3mb" }, 400);
  }

  const contentType = file.type || "image/jpeg";
  const fileName = file instanceof File ? file.name : "upload";
  const ext = pickExtension(fileName, contentType);
  const path = `sections/${crypto.randomUUID()}.${ext}`;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadErr } = await sb.storage
    .from(BUCKET)
    .upload(path, arrayBuffer, {
      contentType,
      upsert: false,
      cacheControl: "31536000",
    });

  if (uploadErr) {
    return json({ success: false, error: `upload_failed: ${uploadErr.message}` }, 500);
  }

  const { data: pubData } = sb.storage.from(BUCKET).getPublicUrl(path);
  return json({ success: true, public_url: pubData.publicUrl });
});
