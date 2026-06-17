// Chantier #1 Bilan Online — étape 1.2 (2026-05-17).
// Edge Function : soumission du bilan online publique (formulaire 5 étapes).
// Pas d'auth requise. Anti-spam : rate limit in-memory par IP (5/h).
// Résolution coach : coach_slug (prénom normalisé) → users.first_name.
// Notif push : déléguée au trigger Postgres + edge function dédiée (étape 1.7).
//
// Input :
//   {
//     coach_slug?: string,         // depuis l'URL (ex: "thomas") — peut être absent
//     first_name: string,          // étape 1 — requis
//     age?: number,
//     height_cm?: number,
//     city?: string,
//     objectives: string[],        // étape 2 — au moins 1
//     weight_loss_target_kg?: number,
//     motivation_score?: number,   // 1-10
//     payload: object,             // étapes 3-5 sérialisées
//     consent: boolean             // case RGPD étape 5 — doit être true
//   }
//
// Output : { success: true, id } ou { success: false, error }
//
// Deploy: supabase functions deploy submit-online-bilan --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// Noaly (ONLINE-A 2026-06-10) : analyse IA du bilan. Même secret modèle que
// l'edge noaly. Sans ANTHROPIC_API_KEY → analyse non générée (non bloquant).
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const NOALY_MODEL =
  Deno.env.get("NOALY_MODEL") ?? Deno.env.get("LORSQUAD_AI_MODEL") ?? "claude-opus-4-8";

const NOALY_BILAN_SYSTEM = `Tu es Noaly, l'assistante bien-être de La Base 360. Un prospect vient de remplir un bilan nutrition en ligne et attend un retour personnalisé à l'écran.
Tu lui écris une analyse CARRÉE et chaleureuse, structurée en 3 temps :
1) Ce que tu observes de positif chez lui (1-2 points concrets tirés de ses réponses).
2) LA priorité nutrition n°1 pour lui — une direction claire et actionnable (pas une liste).
3) Une phrase qui donne envie d'aller plus loin : son coach va le recontacter pour construire ça ensemble.
RÈGLES STRICTES : angle 100% nutrition/bien-être ; JAMAIS de marque ni de nom de produit (pas d'Herbalife, pas de complément nommé) ; JAMAIS de promesse de perte de poids chiffrée, de diagnostic ou de conseil médical (si un point semble médical, invite à en parler à un professionnel) ; tutoiement, bienveillant, 6 à 9 lignes, 2-3 emojis max.
Termine en orientant vers « ton coach te recontacte très vite pour construire ton plan ensemble ».
Tu réponds UNIQUEMENT avec le texte de l'analyse (pas de préambule, pas de titre).`;

async function generateNoalyBilanAnalysis(summary: string): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: AbortSignal.timeout(12000),
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: NOALY_MODEL,
        max_tokens: 700,
        system: NOALY_BILAN_SYSTEM,
        messages: [{ role: "user", content: summary }],
      }),
    });
    if (!res.ok) {
      console.warn("[submit-online-bilan] Noaly", res.status, (await res.text()).slice(0, 120));
      return null;
    }
    const data = (await res.json()) as { content?: { type: string; text?: string }[] };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    return text || null;
  } catch (e) {
    console.warn("[submit-online-bilan] Noaly non critique:", e instanceof Error ? e.message : e);
    return null;
  }
}

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

// Rate limit in-memory (reset au cold start — suffisant pour V1)
const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_MAX_PER_WINDOW = 5;

function checkRateLimit(ip: string): { ok: true } | { ok: false; retry_after: number } {
  const now = Date.now();
  const history = (RATE_BUCKET.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (history.length >= RATE_MAX_PER_WINDOW) {
    const oldest = history[0];
    return { ok: false, retry_after: Math.ceil((oldest + RATE_WINDOW_MS - now) / 1000) };
  }
  history.push(now);
  RATE_BUCKET.set(ip, history);
  return { ok: true };
}

const OBJECTIVE_LABELS: Record<string, string> = {
  weight_loss: "Perte de poids",
  mass_gain: "Prise de masse",
  energy: "Énergie",
  sleep: "Sommeil",
  wellbeing: "Bien-être",
};
function objectiveLabel(o: string): string {
  return OBJECTIVE_LABELS[o] ?? o;
}

// Normalise un slug coach (depuis URL) : lowercase, sans accents, trim.
function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

interface SubmitBody {
  coach_slug?: string | null;
  first_name?: string;
  age?: number | null;
  height_cm?: number | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  objectives?: string[];
  weight_loss_target_kg?: number | null;
  current_weight_kg?: number | null;
  motivation_score?: number | null;
  payload?: Record<string, unknown>;
  consent?: boolean;
  // ONLINE-B (Curieux) : draft=true → capture étape 1 (pas de consent/objectifs).
  // draft_id → soumission finale qui complète le draft (au lieu d'un nouvel insert).
  draft?: boolean;
  draft_id?: string;
  last_step?: number;
}

// Validation email simple (pas RFC-strict, juste sain).
function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

// Validation téléphone : accepte chiffres, espaces, +, -, parenthèses, point.
// 6-20 caractères après nettoyage.
function isValidPhone(s: string): boolean {
  const cleaned = s.replace(/[\s.\-()]/g, "");
  return /^\+?\d{6,20}$/.test(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  const rl = checkRateLimit(ip);
  if (!rl.ok) {
    return json(
      { success: false, error: "rate_limited", retry_after_seconds: rl.retry_after },
      429,
    );
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const firstName = (body.first_name ?? "").trim();
  if (firstName.length < 2 || firstName.length > 50) {
    return json({ success: false, error: "Prénom invalide (2-50 caractères)." }, 400);
  }

  // Un draft (Curieux) n'a ni consent ni objectif (étape 1 seulement).
  if (body.draft !== true && body.consent !== true) {
    return json({ success: false, error: "Consentement RGPD obligatoire." }, 400);
  }

  const objectives = Array.isArray(body.objectives) ? body.objectives.filter(
    (o): o is string => typeof o === "string" && o.length > 0,
  ) : [];
  if (body.draft !== true && objectives.length === 0) {
    return json({ success: false, error: "Au moins un objectif requis." }, 400);
  }

  const age = body.age != null ? Number(body.age) : null;
  if (age != null && (!Number.isFinite(age) || age < 16 || age > 99)) {
    return json({ success: false, error: "Âge invalide." }, 400);
  }

  const heightCm = body.height_cm != null ? Number(body.height_cm) : null;
  if (heightCm != null && (!Number.isFinite(heightCm) || heightCm < 100 || heightCm > 220)) {
    return json({ success: false, error: "Taille invalide." }, 400);
  }

  const weightLossKg = body.weight_loss_target_kg != null
    ? Number(body.weight_loss_target_kg)
    : null;
  if (weightLossKg != null && (!Number.isFinite(weightLossKg) || weightLossKg < 1 || weightLossKg > 50)) {
    return json({ success: false, error: "Objectif kilos invalide." }, 400);
  }

  const motivation = body.motivation_score != null ? Number(body.motivation_score) : null;
  if (motivation != null && (!Number.isFinite(motivation) || motivation < 1 || motivation > 10)) {
    return json({ success: false, error: "Score motivation invalide." }, 400);
  }

  // Poids actuel optionnel (chantier poids 2026-06-03). Jamais bloquant côté
  // public : on valide la plage seulement s'il est fourni.
  const currentWeightKg = body.current_weight_kg != null ? Number(body.current_weight_kg) : null;
  if (currentWeightKg != null && (!Number.isFinite(currentWeightKg) || currentWeightKg < 20 || currentWeightKg > 400)) {
    return json({ success: false, error: "Poids actuel invalide." }, 400);
  }

  const city = (body.city ?? "").trim() || null;

  // V2 (2026-05-27) : phone et email — colonnes first-class.
  // Backward compat : l'edge ne *requiert* PAS au moins un des deux,
  // car le front V1 (legacy, encore en prod) ne les envoie pas. Le front V2
  // applique la règle "tél OU email requis" côté navigateur.
  // L'edge se contente de valider le format si fourni.
  const phoneRaw = (body.phone ?? "").toString().trim();
  const emailRaw = (body.email ?? "").toString().trim().toLowerCase();
  const phone = phoneRaw || null;
  const email = emailRaw || null;
  if (phone && !isValidPhone(phone)) {
    return json({ success: false, error: "Téléphone invalide." }, 400);
  }
  if (email && !isValidEmail(email)) {
    return json({ success: false, error: "Email invalide." }, 400);
  }

  const coachSlugRaw = (body.coach_slug ?? "").toString().trim();
  const coachSlug = coachSlugRaw ? normalizeSlug(coachSlugRaw) : null;

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Résolution coach (bugfix 2026-05-20) : on cherche un user actif
  // distri/admin/referent dont le 1er mot du `name` normalisé matche
  // le slug. Avant on cherchait `first_name` mais la colonne n'existe
  // pas dans la table users — la query crashait silencieusement et
  // tous les leads finissaient avec coach_user_id=NULL → leak RLS.
  // Si plusieurs match → on prend le premier (V1, edge case rare).
  let coachUserId: string | null = null;
  if (coachSlug) {
    const { data: candidates, error: lookupErr } = await sb
      .from("users")
      .select("id, name")
      .in("role", ["distributor", "admin", "referent"])
      .eq("active", true);

    if (lookupErr) {
      console.error("[submit-online-bilan] Lookup coach failed:", lookupErr);
    } else if (candidates) {
      const match = (candidates as Array<{ id: string; name: string | null }>)
        .find((u) => {
          if (!u.name) return false;
          // Compare le 1er mot du nom complet ("Thomas Koss" → "thomas")
          const firstWord = u.name.split(/\s+/)[0] ?? "";
          return normalizeSlug(firstWord) === coachSlug;
        });
      if (match) coachUserId = match.id;
    }
  }

  // Fallback ADMIN (2026-06-16, décision Thomas) : un lien /bilan-online SANS
  // slug (ou slug introuvable) ne doit JAMAIS produire un lead orphelin — sinon
  // la page ne sert à rien. On rattache alors le lead à l'admin (le plus ancien
  // compte admin actif = compte « maison »), qui pourra le dispatcher.
  if (!coachUserId) {
    const { data: admin } = await sb
      .from("users")
      .select("id")
      .eq("role", "admin")
      .eq("active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (admin) coachUserId = (admin as { id: string }).id;
  }

  // ── ONLINE-B : capture « Curieux » (draft étape 1, bilan non terminé) ──────
  if (body.draft === true) {
    if (!phone && !email) {
      return json({ success: false, error: "Un moyen de te recontacter (tél ou email)." }, 400);
    }
    const { data: draftRow, error: draftErr } = await sb
      .from("online_bilans")
      .insert({
        coach_user_id: coachUserId,
        coach_slug: coachSlug,
        first_name: firstName,
        age,
        height_cm: heightCm,
        city,
        phone,
        email,
        objectives: [],
        assigned_to_user_id: coachUserId,
        lead_status: "new",
        completed_at: null, // marqueur Curieux
        last_step: typeof body.last_step === "number" ? body.last_step : 1,
        user_agent: req.headers.get("user-agent") ?? null,
        ip_country: req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? null,
      })
      .select("id")
      .single();
    if (draftErr) {
      console.error("[submit-online-bilan] draft insert:", draftErr.message);
      return json({ success: false, error: "draft_failed" }, 500);
    }
    return json({ success: true, id: (draftRow as { id: string }).id, draft: true });
  }

  const userAgent = req.headers.get("user-agent") ?? null;
  const ipCountry = req.headers.get("cf-ipcountry") ?? req.headers.get("x-vercel-ip-country") ?? null;

  try {
    // Ligne complète. Si un draft « Curieux » existe (draft_id), on le COMPLÈTE
    // (update) au lieu de créer un doublon — sinon insert normal.
    const fullRow = {
      coach_user_id: coachUserId,
      coach_slug: coachSlug,
      first_name: firstName,
      age,
      height_cm: heightCm,
      city,
      phone,
      email,
      objectives,
      weight_loss_target_kg: weightLossKg,
      current_weight_kg: currentWeightKg,
      motivation_score: motivation,
      payload: body.payload ?? {},
      user_agent: userAgent,
      ip_country: ipCountry,
      assigned_to_user_id: coachUserId,
      lead_status: "new",
      completed_at: new Date().toISOString(), // bilan terminé
      last_step: typeof body.last_step === "number" ? body.last_step : null,
    };

    let inserted: { id: string };
    const draftId = typeof body.draft_id === "string" && body.draft_id ? body.draft_id : null;
    if (draftId) {
      const { data: upd, error: updErr } = await sb
        .from("online_bilans")
        .update(fullRow)
        .eq("id", draftId)
        .is("completed_at", null) // ne complète qu'un draft pas déjà terminé
        .select("id")
        .maybeSingle();
      if (updErr) throw updErr;
      if (upd) {
        inserted = upd as { id: string };
      } else {
        const { data: ins, error: insErr } = await sb
          .from("online_bilans").insert(fullRow).select("id").single();
        if (insErr) throw insErr;
        inserted = ins as { id: string };
      }
    } else {
      const { data: ins, error: insErr } = await sb
        .from("online_bilans").insert(fullRow).select("id").single();
      if (insErr) throw insErr;
      inserted = ins as { id: string };
    }

    // Notif push (best-effort, non bloquant). Cible :
    // - Si coach résolu → le coach + tous les admins actifs
    // - Sinon (bilan libre) → tous les admins actifs
    // Étape 1.7 chantier #1 : pattern inline (cf. submit-prospect-lead),
    // évite la dépendance à pg_net + edge function dédiée.
    try {
      const targetUserIds = new Set<string>();
      if (coachUserId) targetUserIds.add(coachUserId);

      const { data: admins } = await sb
        .from("users")
        .select("id")
        .eq("role", "admin")
        .eq("active", true);
      if (admins) {
        for (const a of admins as Array<{ id: string }>) {
          targetUserIds.add(a.id);
        }
      }

      if (targetUserIds.size > 0) {
        const subsPromises = Array.from(targetUserIds).map((uid) =>
          sb
            .from("push_subscriptions")
            .select("endpoint, p256dh, auth")
            .eq("user_id", uid),
        );
        const subsResults = await Promise.all(subsPromises);
        const allSubs = subsResults.flatMap((r) => r.data ?? []);

        if (allSubs.length > 0) {
          const objLabel = objectives.length > 0
            ? ` · ${objectives.length === 1 ? objectiveLabel(objectives[0]) : `${objectives.length} objectifs`}`
            : "";
          const pushBody = `${firstName}${city ? " · " + city : ""}${objLabel}`;
          await fetch(`${SUPABASE_URL}/functions/v1/send-push`, {
            signal: AbortSignal.timeout(2500),
            method: "POST",
            headers: {
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              subscriptions: allSubs,
              payload: {
                title: "🌱 Nouveau Lead bilan online",
                body: pushBody,
                url: "/clients?tab=leads",
                icon: "/icon-192.png",
                badge: "/badge-72.png",
              },
            }),
          }).catch(() => { /* non bloquant */ });
        }
      }
    } catch (notifErr) {
      console.error("[submit-online-bilan] Notif non critique:", notifErr);
    }

    // ── Analyse Noaly (ONLINE-A) : 1× à la soumission, stockée + renvoyée.
    // Non bloquant : si pas de clé / erreur / timeout → null, le bilan reste OK
    // et la page résultats retombe sur le verdict déterministe.
    let aiAnalysis: string | null = null;
    if (ANTHROPIC_API_KEY) {
      const p = (body.payload ?? {}) as Record<string, unknown>;
      const objLabels = objectives.map((o) => objectiveLabel(o)).join(", ");
      const summary =
        `Prénom : ${firstName}\n` +
        (age ? `Âge : ${age}\n` : "") +
        `Objectif(s) : ${objLabels || "non précisé"}\n` +
        (weightLossKg ? `Objectif perte : ${weightLossKg} kg\n` : "") +
        (typeof motivation === "number" ? `Motivation : ${motivation}/10\n` : "") +
        (p.meals_balanced ? `Repas équilibrés : ${p.meals_balanced}\n` : "") +
        (p.water_per_day ? `Eau/jour : ${p.water_per_day}\n` : "") +
        (p.coffee_per_day ? `Cafés/jour : ${p.coffee_per_day}\n` : "") +
        (p.soda_per_day ? `Sodas/jour : ${p.soda_per_day}\n` : "") +
        (p.alcohol_per_week ? `Alcool/semaine : ${p.alcohol_per_week}\n` : "") +
        (p.sleep_quality ? `Qualité sommeil : ${p.sleep_quality}\n` : "") +
        (p.sleep_hours ? `Heures de sommeil : ${p.sleep_hours}\n` : "") +
        (p.stress_level ? `Stress : ${p.stress_level}\n` : "") +
        (p.active_daily !== undefined ? `Actif au quotidien : ${p.active_daily ? "oui" : "non"}\n` : "") +
        (p.sport_frequency ? `Sport : ${p.sport_frequency}\n` : "") +
        (p.current_actions_detail ? `Ce qu'il fait déjà : ${p.current_actions_detail}\n` : "") +
        `\nRédige son analyse personnalisée.`;
      aiAnalysis = await generateNoalyBilanAnalysis(summary);
      if (aiAnalysis) {
        await sb
          .from("online_bilans")
          .update({ ai_analysis: aiAnalysis, ai_analysis_at: new Date().toISOString() })
          .eq("id", (inserted as { id: string }).id)
          .then(({ error }) => {
            if (error) console.warn("[submit-online-bilan] update ai_analysis:", error.message);
          });
      }
    }

    return json({
      success: true,
      id: (inserted as { id: string }).id,
      coach_resolved: !!coachUserId,
      ai_analysis: aiAnalysis,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[submit-online-bilan] Insert failed:", msg);
    return json({ success: false, error: msg }, 500);
  }
});
