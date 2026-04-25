// Chantier Migration RLS app client → Edge Function (2026-04-26).
// Architecture OPTION C : l'app client n'interroge plus Supabase directement
// pour les données sensibles (clients, follow_ups, pv_client_products).
// Elle appelle cette function qui :
//   1. Valide le token client contre client_app_accounts.token (uuid)
//   2. Fait les 3 SELECT en service_role → bypass RLS propre
//   3. Renvoie un payload normalisé ISO 8601 pour next_follow_up
//
// Déployée avec --no-verify-jwt : l'auth Supabase classique n'est PAS utilisée,
// le token custom dans ?token=XXX fait foi. Rôle service_role limite la
// surface d'attaque : aucune mutation, juste des SELECT scopés au clientId
// extrait du token validé.
//
// Pattern repris de supabase/functions/resolve-public-share/index.ts.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Chantier observabilité (2026-04-25) : logs JSON structurés pour
// faciliter le filtre dans Supabase Dashboard → Functions → Logs.
// Aucun token complet ni PII (email, nom, téléphone) ne doit fuiter ici.
type LogLevel = "info" | "warn" | "error";
function log(level: LogLevel, event: string, data?: Record<string, unknown>) {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      level,
      fn: "client-app-data",
      event,
      ...data,
    }),
  );
}

/** Hash 8-char d'un secret pour log privacy-safe. */
async function shortHash(value: string): Promise<string> {
  try {
    const buf = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return Array.from(new Uint8Array(digest))
      .slice(0, 4)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return "hash-err";
  }
}

function jsonError(code: string, status: number) {
  return new Response(JSON.stringify({ error: code }), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function toIsoOrNull(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") {
    // Texte stocké tel quel (follow_ups.due_date ou client_app_accounts.next_follow_up).
    // On normalise en ISO pour que le front puisse toujours faire new Date(value).
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (v instanceof Date) return v.toISOString();
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      log("warn", "missing_token");
      return jsonError("missing_token", 400);
    }

    const tokenHash = await shortHash(token);
    log("info", "entry", { tokenHash, method: req.method });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      log("error", "server_misconfigured", { tokenHash });
      return jsonError("server_misconfigured", 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── 1. Validation token + récupération client_id ─────────────────
    // Chantier 3 (2026-04-25) : résolution en CASCADE sur 3 tables.
    //   1. client_app_accounts (canonique, créé via "Envoyer l'accès")
    //   2. client_recaps (snapshot post-bilan, lien partagé en RDV)
    //   3. client_evolution_reports (rapport d'évolution legacy)
    // Avant ce fix, seule la table 1 était inspectée → ~85% des clients
    // qui ouvraient l'app via un lien recap/évolution recevaient
    // "invalid_token" puis le front fallback sur snapshot figé
    // (cas Angélique Carlu, 8 bilans coach mais 1 visible côté client).
    let resolvedClientId: string | null = null;
    let resolvedTable: string | null = null;
    let resolvedExpiresAt: string | null = null;

    // 1a. client_app_accounts
    {
      const { data, error } = await supabase
        .from("client_app_accounts")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) {
        log("error", "account_lookup_error", {
          tokenHash,
          table: "client_app_accounts",
          message: error.message,
          code: (error as { code?: string }).code,
        });
      } else if (data) {
        resolvedClientId = data.client_id as string;
        resolvedTable = "client_app_accounts";
        resolvedExpiresAt = (data.expires_at as string | null) ?? null;
      }
    }

    // 1b. client_recaps (fallback)
    if (!resolvedClientId) {
      const { data, error } = await supabase
        .from("client_recaps")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) {
        log("error", "recaps_lookup_error", {
          tokenHash,
          message: error.message,
          code: (error as { code?: string }).code,
        });
      } else if (data) {
        resolvedClientId = data.client_id as string;
        resolvedTable = "client_recaps";
        resolvedExpiresAt = (data.expires_at as string | null) ?? null;
      }
    }

    // 1c. client_evolution_reports (fallback)
    if (!resolvedClientId) {
      const { data, error } = await supabase
        .from("client_evolution_reports")
        .select("client_id, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (error) {
        log("error", "evolution_reports_lookup_error", {
          tokenHash,
          message: error.message,
          code: (error as { code?: string }).code,
        });
      } else if (data) {
        resolvedClientId = data.client_id as string;
        resolvedTable = "client_evolution_reports";
        resolvedExpiresAt = (data.expires_at as string | null) ?? null;
      }
    }

    if (!resolvedClientId) {
      log("warn", "invalid_token", { tokenHash });
      return jsonError("invalid_token", 401);
    }

    // Expiration commune aux 3 tables (expires_at par défaut = now() + 1 an)
    if (resolvedExpiresAt && new Date(resolvedExpiresAt).getTime() < Date.now()) {
      log("warn", "token_expired", {
        tokenHash,
        table: resolvedTable,
        expiresAt: resolvedExpiresAt,
      });
      return jsonError("token_expired", 401);
    }

    const clientId = resolvedClientId;
    log("info", "token_resolved", {
      tokenHash,
      table: resolvedTable,
      clientId,
      clientIdType: typeof clientId,
    });

    // ─── 2. Fetch des sources en parallèle (service_role = RLS bypass) ─
    // Chantier Conseils (2026-04-24) : ajout assessments_history (limit 20),
    // latest assessment (pour sport_profile / current_intake / coach_advice
    // / recommendations), recompute sport_alerts + recommendations_not_taken.
    const [clientRes, followUpRes, productsRes, assessmentsRes, measurementsRes] = await Promise.all([
      supabase
        .from("clients")
        .select("current_program, notes, objective")
        .eq("id", clientId)
        .maybeSingle(),

      supabase
        .from("follow_ups")
        .select("id, due_date, status, type")
        .eq("client_id", clientId)
        .in("status", ["scheduled", "pending"])
        .gte("due_date", new Date().toISOString())
        .order("due_date", { ascending: true })
        .limit(1)
        .maybeSingle(),

      supabase
        .from("pv_client_products")
        .select(
          "id, product_id, product_name, quantite_label, price_public_per_unit, pv_per_unit, note_metier, start_date, active",
        )
        .eq("client_id", clientId)
        .eq("active", true)
        .order("start_date", { ascending: false }),

      supabase
        .from("assessments")
        .select(
          "id, date, type, objective, program_title, body_scan, questionnaire, sport_frequency, sport_types, sport_sub_objective, current_intake, coach_notes_initial",
        )
        .eq("client_id", clientId)
        .order("date", { ascending: true })
        .limit(20),

      // Chantier MEGA app client v2 (2026-04-25) : ajout mensurations.
      // Schema réel : waist, hips, thigh_left/right, arm_left/right.
      // On normalise vers waist_cm/hips_cm/thigh_cm/arm_cm pour le payload
      // (avg gauche/droite quand pertinent) — les composants front utilisent
      // ces noms normalisés, indépendamment du schema DB.
      supabase
        .from("client_measurements")
        .select("measured_at, waist, hips, thigh_left, thigh_right, arm_left, arm_right")
        .eq("client_id", clientId)
        .order("measured_at", { ascending: true }),
    ]);

    if (clientRes.error) {
      log("error", "client_select_error", {
        clientId,
        message: clientRes.error.message,
        code: (clientRes.error as { code?: string }).code,
      });
    }
    if (followUpRes.error) {
      log("error", "follow_ups_select_error", {
        clientId,
        message: followUpRes.error.message,
        code: (followUpRes.error as { code?: string }).code,
      });
    }
    if (productsRes.error) {
      log("error", "products_select_error", {
        clientId,
        message: productsRes.error.message,
        code: (productsRes.error as { code?: string }).code,
      });
    }
    if (assessmentsRes.error) {
      log("error", "assessments_select_error", {
        clientId,
        message: assessmentsRes.error.message,
        code: (assessmentsRes.error as { code?: string }).code,
      });
    }
    if (measurementsRes.error) {
      log("error", "measurements_select_error", {
        clientId,
        message: measurementsRes.error.message,
        code: (measurementsRes.error as { code?: string }).code,
      });
    }
    log("info", "data_loaded", {
      clientId,
      clientFound: !!clientRes.data,
      nextFollowUp: !!followUpRes.data,
      productsCount: productsRes.data?.length ?? 0,
      assessmentsCount: assessmentsRes.data?.length ?? 0,
      measurementsCount: measurementsRes.data?.length ?? 0,
    });

    // Normalisation mensurations → schéma payload uniforme.
    interface RawMeasurement {
      measured_at: string;
      waist?: number | null;
      hips?: number | null;
      thigh_left?: number | null;
      thigh_right?: number | null;
      arm_left?: number | null;
      arm_right?: number | null;
    }
    const avgPair = (a: number | null | undefined, b: number | null | undefined): number | undefined => {
      const aN = typeof a === "number" ? a : null;
      const bN = typeof b === "number" ? b : null;
      if (aN != null && bN != null) return Math.round(((aN + bN) / 2) * 10) / 10;
      if (aN != null) return aN;
      if (bN != null) return bN;
      return undefined;
    };
    const measurementsPayload = ((measurementsRes.data ?? []) as RawMeasurement[]).map((m) => ({
      measured_at: m.measured_at,
      waist_cm: typeof m.waist === "number" ? m.waist : undefined,
      hips_cm: typeof m.hips === "number" ? m.hips : undefined,
      thigh_cm: avgPair(m.thigh_left, m.thigh_right),
      arm_cm: avgPair(m.arm_left, m.arm_right),
    }));

    // ─── 3. Dérivations Conseils (assessment history + recos + alerts) ─
    // Format assessment_history : tableau normalisé (date + métriques
    // principales du body_scan). On reste permissif (champs optionnels).
    const rawAssessments = (assessmentsRes.data ?? []) as Array<Record<string, unknown>>;
    interface AssessmentRow {
      id?: string;
      date?: string | null;
      type?: string | null;
      objective?: string | null;
      program_title?: string | null;
      body_scan?: Record<string, unknown> | null;
      questionnaire?: Record<string, unknown> | null;
      sport_frequency?: string | null;
      sport_types?: unknown;
      sport_sub_objective?: string | null;
      current_intake?: Record<string, unknown> | null;
      coach_notes_initial?: string | null;
    }
    const typedAssessments = rawAssessments as AssessmentRow[];

    const assessment_history = typedAssessments.map((a) => {
      const bs = (a.body_scan ?? {}) as Record<string, unknown>;
      const num = (v: unknown): number | null =>
        typeof v === "number" && Number.isFinite(v)
          ? v
          : typeof v === "string" && v !== "" && Number.isFinite(Number(v))
            ? Number(v)
            : null;
      return {
        id: a.id ?? null,
        date: a.date ?? null,
        type: a.type ?? null,
        weight: num(bs.weight),
        bodyFat: num(bs.bodyFat),
        muscleMass: num(bs.muscleMass),
        hydration: num(bs.hydration),
        visceralFat: num(bs.visceralFat),
        metabolicAge: num(bs.metabolicAge),
        boneMass: num(bs.boneMass),
        bmr: num(bs.bmr),
      };
    });

    const latestAssessment = typedAssessments.length
      ? typedAssessments[typedAssessments.length - 1]
      : null;

    // Latest recommendations (from questionnaire.recommendations if present)
    const latestRecommendations: Array<{ ref?: string; name?: string; shortBenefit?: string; publicPrice?: number }> =
      (() => {
        if (!latestAssessment?.questionnaire) return [];
        const q = latestAssessment.questionnaire as Record<string, unknown>;
        const recs = q.recommendations;
        if (!Array.isArray(recs)) return [];
        return recs as Array<{ ref?: string; name?: string; shortBenefit?: string; publicPrice?: number }>;
      })();

    // recommendations_not_taken : diff latestRecommendations \ current_products
    const currentProductIds = new Set(
      (productsRes.data ?? []).map((p: { product_id?: string }) => (p.product_id ?? "").toLowerCase()),
    );
    const currentProductNames = new Set(
      (productsRes.data ?? []).map((p: { product_name?: string }) =>
        (p.product_name ?? "").toLowerCase().trim(),
      ),
    );
    const recommendations_not_taken = latestRecommendations
      .filter((r) => {
        const refLower = (r.ref ?? "").toLowerCase();
        const nameLower = (r.name ?? "").toLowerCase().trim();
        if (refLower && currentProductIds.has(refLower)) return false;
        if (nameLower && currentProductNames.has(nameLower)) return false;
        return true;
      })
      .map((r) => ({
        productId: r.ref ?? "",
        name: r.name ?? "",
        price: typeof r.publicPrice === "number" ? r.publicPrice : undefined,
        reason: r.shortBenefit ?? undefined,
      }));

    // sport_profile from latest assessment
    let sport_profile: {
      frequency: string;
      types: string[];
      subObjective: string;
      otherTypeLabel?: string;
    } | null = null;
    if (latestAssessment && latestAssessment.sport_frequency && latestAssessment.sport_sub_objective) {
      const typesRaw = latestAssessment.sport_types;
      const types: string[] = Array.isArray(typesRaw)
        ? typesRaw.filter((t): t is string => typeof t === "string")
        : [];
      sport_profile = {
        frequency: latestAssessment.sport_frequency,
        types,
        subObjective: latestAssessment.sport_sub_objective,
      };
    }

    const current_intake = latestAssessment?.current_intake ?? null;
    // coach_advice : notes figées du bilan (coach_notes_initial), utilisées
    // telles quelles. Choix : notes validées (pas le draft) pour éviter de
    // remonter un brouillon au client.
    const coach_advice = latestAssessment?.coach_notes_initial ?? "";

    // ─── Sport alerts (re-implementation of detectSportAlerts) ─────────
    interface SportAlert {
      id:
        | "hydration-low"
        | "protein-low"
        | "sleep-low"
        | "muscle-low"
        | "no-snack"
        | "frequency-mismatch";
      icon: string;
      title: string;
      detail: string;
      advice: string;
    }
    const sport_alerts: SportAlert[] = [];
    if (sport_profile && latestAssessment) {
      const bs = (latestAssessment.body_scan ?? {}) as Record<string, unknown>;
      const weightKg = typeof bs.weight === "number" ? bs.weight : 0;
      const muscleKg = typeof bs.muscleMass === "number" ? bs.muscleMass : null;
      const musclePct = muscleKg != null && weightKg > 0 ? (muscleKg / weightKg) * 100 : null;

      const q = (latestAssessment.questionnaire ?? {}) as Record<string, unknown>;
      const sleepHours =
        typeof q.sleepHours === "number"
          ? q.sleepHours
          : typeof q.sleep_hours === "number"
            ? q.sleep_hours
            : null;
      const waterIntakeLiters =
        typeof q.waterIntakeLiters === "number"
          ? q.waterIntakeLiters
          : typeof q.water_intake === "number"
            ? q.water_intake
            : null;
      const snackingFrequency =
        typeof q.snackingFrequency === "string"
          ? q.snackingFrequency
          : typeof q.snacking === "string"
            ? q.snacking
            : null;

      const sub = sport_profile.subObjective;
      const freq = sport_profile.frequency;

      // Water target sport
      const waterMultipliers: Record<string, number> = {
        none: 1,
        occasional: 1.1,
        regular: 1.25,
        intensive: 1.4,
      };
      const waterTargetML = Math.max(
        2000,
        Math.min(5000, Math.round(weightKg * 33 * (waterMultipliers[freq] ?? 1))),
      );

      // 1. Hydration low
      if (weightKg > 0 && waterIntakeLiters != null) {
        const actualML = waterIntakeLiters * 1000;
        if (actualML < waterTargetML * 0.7) {
          sport_alerts.push({
            id: "hydration-low",
            icon: "💧",
            title: "Hydratation insuffisante",
            detail: `Tu bois ~${Math.round(actualML / 100) / 10} L/j, cible ${Math.round(waterTargetML / 100) / 10} L/j.`,
            advice:
              "Vise 33 ml/kg/j minimum, plus selon l'intensité. Un rappel visuel (gourde graduée) aide.",
          });
        }
      }

      // 2. Protein low (qualitative only — quantitative per-moment not remapped server-side for simplicity)
      if (weightKg > 0 && latestAssessment.current_intake) {
        const intakeObj = latestAssessment.current_intake as Record<string, unknown>;
        const qualMap: Record<string, number> = { "0": 0, "1": 5, "2": 15, "3": 25, "4": 35 };
        let currentProtein = 0;
        for (const moment of Object.values(intakeObj)) {
          if (!moment || typeof moment !== "object") continue;
          const m = moment as { mode?: string; level?: number; proteinGrams?: number };
          if (m.mode === "qualitative" && m.level != null) {
            currentProtein += qualMap[String(m.level)] ?? 0;
          } else if (m.mode === "quantitative" && typeof m.proteinGrams === "number") {
            currentProtein += m.proteinGrams;
          }
        }
        const proteinRanges: Record<string, [number, number]> = {
          "mass-gain": [1.8, 2.2],
          strength: [1.8, 2.2],
          cutting: [2.2, 2.6],
          endurance: [1.4, 1.8],
          fitness: [1.4, 1.6],
          competition: [2.0, 2.5],
        };
        const range = proteinRanges[sub] ?? [1.6, 2.0];
        const proteinMin = Math.round(weightKg * range[0]);
        if (currentProtein < proteinMin) {
          sport_alerts.push({
            id: "protein-low",
            icon: "🥩",
            title: "Apport protéique sous la cible",
            detail: `Estimé ~${currentProtein} g/j, cible min ${proteinMin} g/j pour « ${sub} ».`,
            advice:
              "Ajoute 1 collation protéinée (Rebuild / skyr / œufs) post-entraînement pour combler l'écart.",
          });
        }
      }

      // 3. Sleep low
      if (sleepHours != null && sleepHours > 0 && sleepHours < 7) {
        sport_alerts.push({
          id: "sleep-low",
          icon: "😴",
          title: "Sommeil insuffisant",
          detail: `${sleepHours} h/nuit — la récupération musculaire démarre pendant la nuit.`,
          advice: "Vise au moins 7h. Night Mode peut aider à améliorer la qualité du sommeil profond.",
        });
      }

      // 4. Muscle low
      if (
        musclePct != null &&
        (sub === "mass-gain" || sub === "strength") &&
        musclePct < 35
      ) {
        sport_alerts.push({
          id: "muscle-low",
          icon: "💪",
          title: "Masse musculaire basse",
          detail: `Masse musculaire à ${musclePct.toFixed(1)}% — plan structuré conseillé.`,
          advice:
            "Protéines 1.8-2.2 g/kg + entraînement progressif 3-4 séances/sem. On ajuste ensemble au prochain bilan.",
        });
      }

      // 5. No snack
      if (sub === "mass-gain" && snackingFrequency && /jamais|rare|aucune/i.test(snackingFrequency)) {
        sport_alerts.push({
          id: "no-snack",
          icon: "🍎",
          title: "Pas de collation",
          detail: "Pour gagner en masse, les collations sont un levier simple.",
          advice: "2 × 20-30 g de protéines entre les repas (Achieve, yaourt grec, barre protéinée).",
        });
      }

      // 6. Frequency mismatch
      if (
        freq === "intensive" &&
        sport_profile.types.length &&
        !sport_profile.types.some((t) =>
          ["musculation", "crossfit-hiit", "combat-sport"].includes(t),
        )
      ) {
        sport_alerts.push({
          id: "frequency-mismatch",
          icon: "⚡",
          title: "Fréquence à préciser",
          detail: "5+ séances/sem annoncées mais sans type haute intensité identifié.",
          advice: "On ajuste le plan ensemble pour que le volume colle à tes types d'entraînement réels.",
        });
      }
    }

    // ─── 4. Normalisation + response ──────────────────────────────────
    const nextFollowUpIso = followUpRes.data?.due_date
      ? toIsoOrNull(followUpRes.data.due_date)
      : null;

    const payload = {
      client: clientRes.data
        ? {
            current_program: (clientRes.data as { current_program?: string | null }).current_program ?? null,
            notes: (clientRes.data as { notes?: string | null }).notes ?? null,
            objective: (clientRes.data as { objective?: string | null }).objective ?? null,
          }
        : null,
      next_follow_up: followUpRes.data
        ? {
            id: (followUpRes.data as { id: string }).id,
            due_date: nextFollowUpIso,
            status: (followUpRes.data as { status: string }).status,
            type: (followUpRes.data as { type?: string | null }).type ?? null,
          }
        : null,
      current_products: productsRes.data ?? [],
      // Chantier MEGA app client v2 (2026-04-25) : mensurations normalisées.
      measurements: measurementsPayload,
      // Chantier Conseils (2026-04-24) : nouvelles clés sans toucher à l'existant.
      assessment_history,
      recommendations_not_taken,
      sport_alerts,
      sport_profile,
      current_intake,
      coach_advice,
      fetched_at: new Date().toISOString(),
    };

    const body = JSON.stringify(payload);
    log("info", "success", {
      clientId,
      durationMs: Date.now() - t0,
      payloadKb: Math.round(body.length / 1024),
      sportAlerts: sport_alerts.length,
      recommendationsNotTaken: recommendations_not_taken.length,
    });

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        // 30s cache navigateur : absorbe les multi-renders sans masquer une
        // vraie modif coach (SELECT refresh au window focus dès 30s passés).
        "Cache-Control": "private, max-age=30",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    log("error", "uncaught", {
      durationMs: Date.now() - t0,
      message: msg,
      stack: stack ? stack.split("\n").slice(0, 5).join(" | ") : undefined,
    });
    return jsonError("internal_error", 500);
  }
});
