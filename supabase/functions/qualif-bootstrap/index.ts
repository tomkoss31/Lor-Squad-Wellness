// =============================================================================
// qualif-bootstrap — chantier Qualif, parcours post-paiement /qualif/:token
// (2026-07-16).
//
// 2 modes dans le body ({ token, mode?, ... }) :
//   - "status" (défaut) : lecture seule. Résout le token → bilan payé →
//     renvoie l'état actuel (déjà enregistré ou pas encore). Aucune écriture.
//   - "register" : { token, lastName, sex, consent:true }. Crée la fiche
//     client (clients + assessment initial + client_app_accounts +
//     auth.users + client_qualif_onboarding + client_consents), IDEMPOTENT
//     via online_bilans.converted_to_client_id (un rechargement de page ou
//     un double-submit ne recrée jamais 2 fiches).
//
// Pourquoi lastName/sex sont demandés ICI (pas côté front avant) : le bilan
// online ne capture ni l'un ni l'autre, et clients.sex/last_name sont NOT
// NULL sans défaut — impossible de créer la fiche sans ces 2 champs. On les
// demande sur le même écran que le consentement RGPD (cf. QualifConsentStep),
// pas une étape séparée.
//
// Sécurité : la preuve d'achat est TOUJOURS bilan_orders.status='paid' côté
// serveur (jamais un flag envoyé par le client) — mêmes réflexes que
// get-online-bilan-results (preuve serveur, pas ?paid=1 nu).
//
// Déploiement : supabase functions deploy qualif-bootstrap --no-verify-jwt
// =============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

interface OnlineBilanRow {
  id: string;
  first_name: string;
  age: number | null;
  height_cm: number | null;
  current_weight_kg: number | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  objectives: string[] | null;
  weight_loss_target_kg: number | null;
  motivation_score: number | null;
  coach_user_id: string | null;
  converted_to_client_id: string | null;
}

interface QualifStepState {
  consentAt: string | null;
  flavorProductId: string | null;
  flavorSkipped: boolean;
  appOpenedAt: string | null;
  telegramAt: string | null;
  completedAt: string | null;
}

function mapOnlineObjective(objectives: string[] | null): string {
  const o = objectives ?? [];
  if (o.includes("mass_gain")) return "mass-gain";
  return "weight-loss";
}

function objectiveLabel(objective: string): string {
  return objective === "mass-gain" ? "Prise de masse" : "Perte de poids";
}

function buildEmptyBodyScan(weight: number) {
  return {
    weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
    bodyFat: 0,
    muscleMass: 0,
    hydration: 0,
    boneMass: 0,
    visceralFat: 0,
    bmr: 0,
    metabolicAge: 0,
  };
}

function buildEmptyQuestionnaire(overrides: Record<string, unknown>) {
  return {
    healthStatus: "", healthNotes: "", allergies: "", transitStatus: "", pathologyContext: "",
    wakeUpTime: "", bedTime: "", sleepHours: 0, sleepQuality: "", napFrequency: "",
    breakfastFrequency: "", breakfastTime: "", breakfastContent: "", breakfastSatiety: "",
    firstMealTime: "", mealsPerDay: 0, regularMealTimes: "", lunchLocation: "", dinnerTiming: "",
    vegetablesDaily: "", proteinEachMeal: "", sugaryProducts: "", snackingFrequency: "",
    snackingMoment: "", cravingsPreference: "", snackingTrigger: "", waterIntake: 0,
    drinksCoffee: "", coffeePerDay: 0, sweetDrinks: "", alcohol: "", lunchExample: "",
    dinnerExample: "", physicalActivity: "", activityType: "", sessionsPerWeek: 0,
    energyLevel: "", pastAttempts: "", hardestPart: "", mainBlocker: "", objectiveFocus: "",
    motivation: 0, desiredTimeline: "", recommendations: [], recommendationsContacted: false,
    ...overrides,
  };
}

function randomPassword(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function loadState(
  sb: ReturnType<typeof createClient>,
  clientId: string,
): Promise<{ step: QualifStepState; clientToken: string | null }> {
  const [{ data: onboarding }, { data: account }] = await Promise.all([
    sb
      .from("client_qualif_onboarding")
      .select("consent_at, flavor_product_id, flavor_skipped, app_opened_at, telegram_at, completed_at")
      .eq("client_id", clientId)
      .maybeSingle(),
    sb.from("client_app_accounts").select("token").eq("client_id", clientId).maybeSingle(),
  ]);
  return {
    step: {
      consentAt: (onboarding?.consent_at as string | null) ?? null,
      flavorProductId: (onboarding?.flavor_product_id as string | null) ?? null,
      flavorSkipped: Boolean(onboarding?.flavor_skipped),
      appOpenedAt: (onboarding?.app_opened_at as string | null) ?? null,
      telegramAt: (onboarding?.telegram_at as string | null) ?? null,
      completedAt: (onboarding?.completed_at as string | null) ?? null,
    },
    clientToken: (account?.token as string | null) ?? null,
  };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  try {
    const body = (await req.json().catch(() => ({}))) as {
      token?: string;
      mode?: string;
      lastName?: string;
      sex?: string;
      consent?: boolean;
    };
    const token = String(body.token ?? "").trim();
    if (!token) return json({ ok: false, error: "missing_token" }, 400);

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: bilan, error: bErr } = await sb
      .from("online_bilans")
      .select(
        "id, first_name, age, height_cm, current_weight_kg, city, phone, email, objectives, weight_loss_target_kg, motivation_score, coach_user_id, converted_to_client_id",
      )
      .eq("result_token", token)
      .maybeSingle();
    if (bErr) return json({ ok: false, error: "server_error", message: bErr.message }, 500);
    if (!bilan) return json({ ok: false, error: "not_found" }, 200);
    const b = bilan as unknown as OnlineBilanRow;

    // Preuve serveur : la commande la plus récente payée pour ce bilan.
    const { data: order } = await sb
      .from("bilan_orders")
      .select("program_id, program_name")
      .eq("online_bilan_id", b.id)
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!order) return json({ ok: false, error: "not_paid" }, 200);

    let coachName = "ton coach";
    if (b.coach_user_id) {
      const { data: coach } = await sb.from("users").select("name").eq("id", b.coach_user_id).maybeSingle();
      if (coach?.name) coachName = String(coach.name).split(/\s+/)[0];
    }

    const common = {
      firstName: b.first_name,
      coachName,
      programId: order.program_id as string,
      programName: order.program_name as string,
    };

    // ── Déjà enregistré (idempotence — page rechargée, double-submit) ──────
    if (b.converted_to_client_id) {
      const { step, clientToken } = await loadState(sb, b.converted_to_client_id);
      return json({
        ok: true,
        registered: true,
        clientId: b.converted_to_client_id,
        clientToken,
        step,
        ...common,
      });
    }

    // ── Mode status (défaut) : rien à créer, juste l'état "pas encore" ─────
    if (body.mode !== "register") {
      return json({ ok: true, registered: false, ...common });
    }

    // ── Mode register : création de la fiche ────────────────────────────────
    const lastName = String(body.lastName ?? "").trim();
    const sex = body.sex === "male" || body.sex === "female" ? body.sex : "";
    if (!lastName || !sex || body.consent !== true) {
      return json({ ok: false, error: "missing_fields" }, 400);
    }
    if (!b.coach_user_id) {
      // Ne devrait jamais arriver : create-payment-link exige un coach avec
      // encaissement configuré pour générer un lien de paiement payable.
      return json({ ok: false, error: "no_coach", message: "Bilan sans coach attribué." }, 409);
    }

    const { data: coachRow } = await sb.from("users").select("name").eq("id", b.coach_user_id).maybeSingle();
    const distributorName = (coachRow?.name as string | undefined) ?? "La Base 360";
    const objective = mapOnlineObjective(b.objectives);
    const now = new Date();
    const nextFollowUp = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const { data: newClient, error: clientErr } = await sb
      .from("clients")
      .insert({
        first_name: b.first_name.trim(),
        last_name: lastName,
        sex,
        phone: b.phone?.trim() ?? "",
        email: b.email?.trim().toLowerCase() ?? "",
        age: b.age ?? 0,
        height: b.height_cm ?? 0,
        job: "Non renseigné",
        city: b.city?.trim() || null,
        distributor_id: b.coach_user_id,
        distributor_name: distributorName,
        status: "active",
        objective,
        current_program: order.program_name as string,
        started: true,
        start_date: now.toISOString().slice(0, 10),
        next_follow_up: nextFollowUp,
        notes: "Fiche créée automatiquement après paiement du programme (parcours Qualif).",
      })
      .select("id")
      .single();
    if (clientErr || !newClient) {
      return json({ ok: false, error: "server_error", message: clientErr?.message ?? "insert clients" }, 500);
    }
    const clientId = newClient.id as string;

    // Assessment initial minimal — le coach complète le vrai bilan plus tard.
    const targetWeight =
      b.current_weight_kg && b.weight_loss_target_kg
        ? Math.max(0, b.current_weight_kg - b.weight_loss_target_kg)
        : undefined;
    await sb.from("assessments").insert({
      id: `a-${now.getTime()}`,
      client_id: clientId,
      date: now.toISOString().slice(0, 10),
      type: "initial",
      objective,
      program_id: order.program_id as string,
      program_title: order.program_name as string,
      summary: `Fiche créée automatiquement après paiement du programme (parcours Qualif, objectif : ${objectiveLabel(objective).toLowerCase()}).`,
      notes: "",
      body_scan: buildEmptyBodyScan(b.current_weight_kg ?? 0),
      questionnaire: buildEmptyQuestionnaire({
        objectiveFocus: objectiveLabel(objective),
        motivation: b.motivation_score ?? 0,
        ...(targetWeight !== undefined ? { targetWeight } : {}),
      }),
      pedagogical_focus: [],
    });

    // Compte auth.users — fail-open : sans email valide sur le bilan, on
    // n'en crée pas (le lien token /client/:token reste l'accès garanti).
    let authUserId: string | null = null;
    const email = b.email?.trim().toLowerCase() ?? "";
    if (email) {
      const { data: createRes, error: createErr } = await sb.auth.admin.createUser({
        email,
        password: randomPassword(),
        email_confirm: true,
        user_metadata: { client_id: clientId, first_name: b.first_name, origin: "qualif_bootstrap" },
      });
      if (!createErr) authUserId = createRes.user?.id ?? null;
      else console.warn("[qualif-bootstrap] auth.createUser failed (non bloquant):", createErr.message);
    }

    const { data: account } = await sb
      .from("client_app_accounts")
      .insert({
        client_id: clientId,
        coach_id: b.coach_user_id,
        coach_name: distributorName,
        client_first_name: b.first_name,
        client_last_name: lastName,
        auth_user_id: authUserId,
      })
      .select("token")
      .single();

    await sb
      .from("online_bilans")
      .update({ converted_to_client_id: clientId, converted_at: now.toISOString() })
      .eq("id", b.id);

    await sb.from("client_qualif_onboarding").insert({
      client_id: clientId,
      online_bilan_id: b.id,
      coach_user_id: b.coach_user_id,
      consent_at: now.toISOString(),
    });

    await sb.from("client_consents").insert({
      client_id: clientId,
      coach_id: b.coach_user_id,
      consent_version: "v1-qualif-self",
      user_agent: req.headers.get("user-agent")?.slice(0, 200) ?? null,
    });

    return json({
      ok: true,
      registered: true,
      clientId,
      clientToken: (account?.token as string | undefined) ?? null,
      step: {
        consentAt: now.toISOString(),
        flavorProductId: null,
        flavorSkipped: false,
        appOpenedAt: null,
        telegramAt: null,
        completedAt: null,
      },
      ...common,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ ok: false, error: "server_error", message: msg }, 500);
  }
});
