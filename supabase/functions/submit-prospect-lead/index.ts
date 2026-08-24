// Chantier Welcome Page + Magic Links (2026-04-24).
// Edge Function : soumission formulaire prospect depuis la page Welcome.
// Pas d'auth requise. Anti-spam : rate limit in-memory par IP (3/h).
// Notif push aux admins + référents actifs sur un nouveau lead.
//
// Input  : { first_name: string, phone: string, city?: string }
// Output : { success: true, id } ou { success: false, error }
//
// Deploy: supabase functions deploy submit-prospect-lead

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendPushToUser } from "../_shared/push.ts";
import { notifInterneHtml } from "../_shared/rdvEmail.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const TEAM_NOTIFY_EMAIL = "labaseverdun@gmail.com";
const OBJECTIF_LABELS: Record<string, string> = {
  poids: "Perdre du poids",
  muscle: "Reprendre du muscle",
  energie: "Retrouver de l'énergie",
};
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

// Rate limit in-memory (reset au cold start — suffisant pour V1 anti-spam léger)
const RATE_BUCKET = new Map<string, number[]>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1h
const RATE_MAX_PER_WINDOW = 3;

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, error: "method_not_allowed" }, 405);

  // Identifiant IP approximatif (via headers proxy)
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

  let body: {
    first_name?: string;
    phone?: string;
    city?: string;
    referrer_user_id?: string;
    source?: string;
    metadata?: unknown;
    // Chantier #7 V2 (2026-05-17) : popup lead capture sur /business
    referral_source?: string;
    consent_recontact?: boolean;
    coach_slug?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    // Chantier Colis (2026-07-08) : email obligatoire sur ce funnel, optionnel ailleurs.
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: "invalid_json" }, 400);
  }

  const firstName = (body.first_name ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const city = (body.city ?? "").trim() || null;
  // V2 funnel business 2026-11-07 : tracking referrer + source + metadata
  const referrerUserId = body.referrer_user_id ?? null;
  const source = body.source ?? "welcome_page"; // 'opportunite' | 'simulateur' | 'welcome_page' | 'business' | 'business-leadcapture'
  const metadata = body.metadata ?? null;
  // Chantier #7 V2 (2026-05-17) : popup lead capture sur /business
  const referralSource = (body.referral_source ?? "").trim() || null;
  const consentRecontact = body.consent_recontact === true;
  const coachSlug = (body.coach_slug ?? "").trim() || null;
  const utmSource = (body.utm_source ?? "").trim() || null;
  const utmMedium = (body.utm_medium ?? "").trim() || null;
  const utmCampaign = (body.utm_campaign ?? "").trim() || null;
  const email = (body.email ?? "").trim() || null;

  if (firstName.length < 2) {
    return json({ success: false, error: "Prénom trop court." }, 400);
  }
  if (phone.replace(/\D/g, "").length < 6) {
    return json({ success: false, error: "Téléphone invalide." }, 400);
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ success: false, error: "Email invalide." }, 400);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_KEY);

  // Résolution coach_slug → referrer_user_id (chantier #7 V2)
  let effectiveReferrerUserId = referrerUserId;
  if (!effectiveReferrerUserId && coachSlug) {
    const { data: coachMatch } = await sb
      .from("users")
      .select("id")
      .eq("slug", coachSlug)
      .maybeSingle();
    if (coachMatch?.id) {
      effectiveReferrerUserId = coachMatch.id as string;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QUELQU'UN QUI REVIENT REPREND SA FICHE — il n'en crée pas une deuxième.
  //
  // LE CONSTAT (mesure en base du 24/08). Cette fonction faisait un `.insert()`
  // sec, sans aucun contrôle. Chaque passage dans le tunnel du club créait donc
  // une fiche de plus — et comme une personne annule et re-réserve, les fiches
  // s'empilaient. Le pire cas mesuré : **claire dehaese, 3 fiches en 4 minutes**
  // (10:15:52, 10:17:31, 10:19:54), avec des statuts DIVERGENTS (contacted /
  // new / contacted) — donc travaillées comme trois personnes différentes.
  // 3 des 5 groupes de doublons réels venaient de là.
  //
  // Règle de Thomas (24/08) : « si quelqu'un revient on reprend la fiche
  // existante et on la remonte ».
  //
  // ⚠️ NORMALISATION DUPLIQUÉE, ET C'EST ASSUMÉ. Une edge function ne peut pas
  // importer le front : ces deux fonctions sont le jumeau EXACT de
  // `src/features/crm/cleDoublon.ts`. Toute modification de l'une doit être
  // reportée sur l'autre — même règle que le catalogue PV (cf. CLAUDE.md).
  const telNorm = (v: string | null): string | null => {
    if (!v || v.includes("@")) return null; // un email n'est pas un téléphone
    const c = v.replace(/\D/g, "").replace(/^0+/, "").replace(/^33/, "");
    return c.length >= 9 ? c.slice(-9) : null;
  };
  const mailNorm = (v: string | null): string | null => {
    const c = (v ?? "").trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c) ? c : null;
  };

  const monTel = telNorm(phone);
  const monMail = mailNorm(email);

  /** L'id de la fiche — nouvelle, ou reprise. */
  let leadId: string | null = null;
  /** Vrai quand on a repris une fiche existante au lieu d'en créer une. */
  let reprise = false;

  try {
    // On relit un lot borné et on rapproche en JS : la normalisation vit dans
    // UN seul endroit, et le volume le permet largement (~3 leads/semaine).
    const { data: existants } = await sb
      .from("prospect_leads")
      .select("id, phone, email, status, notes, city, last_name")
      .order("created_at", { ascending: false })
      .limit(500);

    const dejaLa = (existants ?? []).find((l) => {
      const t = telNorm((l.phone as string | null) ?? null);
      const m = mailNorm((l.email as string | null) ?? null);
      return (monTel && t && t === monTel) || (monMail && m && m === monMail);
    });

    if (dejaLa) {
      // ── ON LA REMONTE ────────────────────────────────────────────────────
      // Elle redevient à traiter aujourd'hui, elle se réveille si elle dormait,
      // et on complète ce qui manquait. On ne TOUCHE PAS au statut travaillé
      // par le coach — sauf « perdu » : quelqu'un qui revient n'est plus perdu.
      const nom = (() => {
        const m = (metadata ?? {}) as Record<string, unknown>;
        const brut = typeof m.nom === "string" ? m.nom : typeof m.last_name === "string" ? m.last_name : "";
        return brut.trim() || null;
      })();
      const quand = new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
      const trace = `↩︎ Revenu·e le ${quand} (${source})`;
      const notes = [(dejaLa.notes as string | null) ?? "", trace].filter(Boolean).join("\n");

      await sb
        .from("prospect_leads")
        .update({
          relance_due_at: new Date().toISOString(),
          relance_done_at: null,
          status: dejaLa.status === "lost" ? "contacted" : dejaLa.status,
          notes,
          // On enrichit sans jamais écraser ce qui était déjà renseigné.
          email: (dejaLa.email as string | null) ?? email,
          city: (dejaLa.city as string | null) ?? city,
          last_name: (dejaLa.last_name as string | null) ?? nom,
        })
        .eq("id", dejaLa.id);

      // Une personne qui revient se réveille : sinon elle resterait invisible
      // dans « Endormis » malgré sa nouvelle démarche.
      await sb.from("crm_archived_leads").delete().eq("lead_table", "prospect_leads").eq("lead_id", dejaLa.id);

      // ⚠️ PAS de retour anticipé ici. Le premier jet en faisait un, et sautait
      // la notification push au coach : une personne qui revient serait entrée
      // dans le CRM EN SILENCE — précisément le trou de notification déjà payé
      // le 13/08. On poursuit donc jusqu'au bloc de notification.
      reprise = true;
      leadId = dejaLa.id as string;
    }

    if (!reprise) {
    const { data: inserted, error: insertErr } = await sb
      .from("prospect_leads")
      .insert({
        first_name: firstName,
        // Le nom arrive dans `metadata.nom` (site du club) ou `metadata.last_name`
        // (tunnel recrutement). Depuis le 19/08 il a une COLONNE : deux clés
        // selon la provenance, c'était la garantie qu'un troisième tunnel
        // arrive avec une troisième. On continue d'écrire metadata tel quel,
        // on ne fait qu'ajouter l'endroit unique où le lire.
        last_name: (() => {
          const m = (metadata ?? {}) as Record<string, unknown>;
          const brut = typeof m.nom === "string" ? m.nom
            : typeof m.last_name === "string" ? m.last_name : "";
          return brut.trim() || null;
        })(),
        phone,
        email,
        city,
        source,
        status: "new",
        referrer_user_id: effectiveReferrerUserId,
        metadata,
        referral_source: referralSource,
        consent_recontact: consentRecontact,
        coach_slug: coachSlug,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      })
      .select("id")
      .single();

      if (insertErr) throw insertErr;
      leadId = (inserted as { id: string }).id;
    }

    // Chantier colis (2026-07-08) : email de remerciement personnalisé Noaly,
    // fire-and-forget — best-effort, ne bloque jamais la réponse au funnel.
    // Pas de renvoi sur une reprise : la personne l'a déjà reçu.
    if (source === "colis" && email && !reprise) {
      fetch(`${SUPABASE_URL}/functions/v1/send-colis-welcome-email`, {
        signal: AbortSignal.timeout(2500),
        method: "POST",
        headers: {
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prospect_lead_id: leadId }),
      }).catch(() => { /* non bloquant */ });
    }

    // Notif push aux admins actifs + au coach referrer (best-effort, non
    // bloquant). Upgrade VIP-4 V1.1 (2026-06-10) : avant, seuls les admins
    // étaient notifiés — un distri non-admin ne savait pas qu'un lead était
    // arrivé via SON lien.
    try {
      const { data: admins } = await sb
        .from("users")
        .select("id")
        .eq("role", "admin")
        .eq("active", true);

      const targetIds = new Set<string>((admins ?? []).map((a) => (a as { id: string }).id));
      if (effectiveReferrerUserId) targetIds.add(effectiveReferrerUserId);

      if (targetIds.size > 0) {
        // Funnel Opportunité gated (chantier 2026-06) : notif enrichie profil + température.
        const meta = (metadata && typeof metadata === "object") ? metadata as Record<string, unknown> : {};
        const isFunnel = meta.funnel === "opportunite-gated";
        const profileLabel =
          ({ curious: "🔍 Curieux", side_income: "💸 Complément", career_change: "🚀 Reconversion" } as Record<string, string>)[
            String(meta.profile)
          ] ?? "";
        const tempLabel =
          ({ hot: "🔥 chaud", warm: "🟡 tiède", cold: "❄️ froid" } as Record<string, string>)[
            String(meta.temperature)
          ] ?? "";
        const title = reprise
          ? "↩︎ Un prospect revient"
          : isFunnel ? `🚪 Lead opportunité ${tempLabel}`.trim() : "🔥 Nouveau prospect";
        const pushBody = isFunnel
          ? `${firstName}${profileLabel ? ` · ${profileLabel}` : ""} · ${phone}`
          : `${firstName}${city ? " de " + city : ""} · ${phone}`;

        // FIX 2026-07-12 : on utilise le helper sendPushToUser (lookup + envoi
        // web-push par user) au lieu d'un fetch send-push au format
        // { subscriptions, payload } qui était REJETÉ (send-push attend
        // { user_id, title }) → la notif nouveau-lead ne partait jamais.
        await Promise.all(
          [...targetIds].map((uid) =>
            sendPushToUser(sb, {
              userId: uid,
              payload: { title, body: pushBody, url: "/crm", type: "new_lead" },
            }),
          ),
        );
      }
    } catch (notifErr) {
      console.error("[submit-prospect-lead] Notif non critique:", notifErr);
    }

    // ── Mail à l'équipe pour le tunnel « Réserver au club » (2026-08-11) ──
    //
    // Ce tunnel a DEUX écrans : on laisse ses coordonnées, puis on choisit son
    // créneau. Seul le 2e envoyait un mail (book-club-discovery). Donc celui qui
    // s'arrête entre les deux — le plus chaud de tous, il a donné son numéro et
    // il est parti — n'alertait PERSONNE. Cas réel : Laure, le 2026-08-11 à
    // 19 h 58, apparue dans le CRM sans un mot.
    //
    // On n'envoie que pour ce tunnel : le colis a déjà son mail de bienvenue,
    // et /rejoindre passe par book-rdv. Best-effort, jamais bloquant.
    if (source === "site-club" && RESEND_API_KEY) {
      try {
        const m = (metadata ?? {}) as Record<string, unknown>;
        const nom = String(m.nom ?? "").trim();
        const objectif = String(m.objectif ?? "").trim();
        const aDeux = Number(m.people_count ?? 1) === 2;
        const binome = [m.partner_first_name, m.partner_last_name]
          .filter((v): v is string => typeof v === "string" && !!v.trim())
          .join(" ");

        const html = notifInterneHtml({
          theme: "club",
          eyebrow: "🏠 Réserver au club · Coordonnées laissées",
          titre: `${firstName}${nom ? " " + nom : ""} n'a pas encore choisi de créneau`,
          phrase:
            "Elle/il a rempli le premier écran de <b>/reserver</b> puis s'est arrêté" +
            " avant de prendre son heure. C'est le moment de rappeler — les" +
            " coordonnées sont fraîches.",
          lignes: [
            ["Prénom / Nom", `${firstName}${nom ? " " + nom : ""}`],
            ["Téléphone", phone || "—"],
            ["Email", email || "—"],
            ["Ville", city || "—"],
            ["Objectif", objectif ? (OBJECTIF_LABELS[objectif] ?? objectif) : "—"],
            ["Vient à", aDeux ? `deux${binome ? " — avec " + binome : ""}` : "un"],
          ],
          pied: "Si un créneau est pris plus tard, un second mail partira à la réservation.",
        });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "La Base 360 <rdv@labase360.fr>",
            to: [TEAM_NOTIFY_EMAIL],
            subject: `🏠 ${firstName}${nom ? " " + nom : ""} — coordonnées laissées, sans créneau`,
            reply_to: email || undefined,
            html,
          }),
        });
        if (!res.ok) console.warn("[submit-prospect-lead] mail équipe:", res.status);
      } catch (mailErr) {
        console.error("[submit-prospect-lead] Mail non critique:", mailErr);
      }
    }

    return json({ success: true, id: leadId, reprise });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return json({ success: false, error: msg }, 500);
  }
});
