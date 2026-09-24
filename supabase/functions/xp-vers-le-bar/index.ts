// Le pont vers le Shake Bar (24/09/2026, maquette v2 validée par Thomas :
// « × 5, plafond 750 par mois (= un extra, donc achat de quelque chose) »).
//
// Le bar (commande.labase-nutrition.com, dépôt labase-shakesbar, SON projet
// Supabase) a déjà tout : comptes par e-mail, QR scanné au comptoir, catalogue
// de cadeaux (extra 750 · boisson 1 500 · boisson + gaufre 2 200 · cadeau du
// mois 3 800), et une API qui crédite des XP avec une raison
// (`/api/profile?action=credit-xp-manual`, barrière = mot de passe admin).
// On n'invente donc ni cadeaux, ni bons, ni scanner : on VERSE.
//
// Deux modes :
//   · `verser` (cron du lundi, service_role) — pour chaque cliente que
//     `xp_a_verser_bar()` rend (XP coaching de la semaine × 5 + bonus de
//     niveau, plafond 750 XP bar par mois) : trouver son compte au bar par
//     e-mail, créditer par l'API du bar, tracer dans xp_versements_bar.
//     Sans compte : ligne `sans_compte` (son espace lui propose d'en créer un).
//   · `solde` (la membre par son jeton, ou une coach par son JWT + client_id)
//     — ses XP au bar, le prochain cadeau, et ce qui a été versé.
//
// Secrets (à poser par Thomas, `supabase secrets set …`) :
//   BAR_SUPABASE_URL, BAR_SERVICE_KEY  — lire `profiles` du bar (id, xp) par e-mail
//   BAR_API_URL                        — https://commande.labase-nutrition.com
//   BAR_ADMIN_PASSWORD                 — ADMIN_PASSWORD du bar (Vercel)
// Sans ces secrets, `verser` ne fait rien (il le dit) et `solde` rend `bar: null`.
// Déployer : supabase functions deploy xp-vers-le-bar --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, getServiceClient, jsonResponse } from "../_shared/push.ts";

// Copie du catalogue du bar (src/v2/rewards/catalog.ts) : les coûts sont sa source de vérité.
const CADEAUX = [
  { id: "extra", cout: 750, titre: "Un extra offert" },
  { id: "boisson", cout: 1500, titre: "Boisson energy ou smoothie offerte" },
  { id: "combo-gaufre", cout: 2200, titre: "Boisson + gaufre healthy" },
  { id: "cadeau-mois", cout: 3800, titre: "Le cadeau du mois" },
];
const TAUX = 5;
const PLAFOND_MOIS = 750;

const BAR_SUPABASE_URL = Deno.env.get("BAR_SUPABASE_URL") ?? "";
const BAR_SERVICE_KEY = Deno.env.get("BAR_SERVICE_KEY") ?? "";
const BAR_API_URL = (Deno.env.get("BAR_API_URL") ?? "https://commande.labase-nutrition.com").replace(/\/$/, "");
const BAR_ADMIN_PASSWORD = Deno.env.get("BAR_ADMIN_PASSWORD") ?? "";
const barConfigure = Boolean(BAR_SUPABASE_URL && BAR_SERVICE_KEY);

function isServiceRole(authHeader: string): boolean {
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return false;
  const envKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (envKey && token === envKey) return true;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "service_role";
  } catch {
    return false;
  }
}

function barClient() {
  return createClient(BAR_SUPABASE_URL, BAR_SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Le compte du bar d'une personne : par son id relié (clients.bar_user_id) d'abord, sinon par e-mail. */
async function profilBar(email: string | null | undefined, barUserId?: string | null): Promise<{ id: string; xp: number; first_name: string | null } | null> {
  if (!barConfigure) return null;
  const bar = barClient();
  if (barUserId) {
    const { data } = await bar.from("profiles").select("id, xp, first_name").eq("id", barUserId).maybeSingle();
    if (data) return { id: String(data.id), xp: Number(data.xp ?? 0), first_name: data.first_name ?? null };
  }
  if (!email) return null;
  const { data } = await bar
    .from("profiles")
    .select("id, xp, first_name")
    .ilike("email", email.trim())
    .limit(1);
  const p = data?.[0];
  return p ? { id: String(p.id), xp: Number(p.xp ?? 0), first_name: p.first_name ?? null } : null;
}

async function crediterBar(userId: string, xp: number, reason: string): Promise<{ ok: boolean; newXp?: number; error?: string }> {
  if (!BAR_ADMIN_PASSWORD) return { ok: false, error: "BAR_ADMIN_PASSWORD manquant" };
  try {
    const r = await fetch(`${BAR_API_URL}/api/profile?action=credit-xp-manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${BAR_ADMIN_PASSWORD}` },
      body: JSON.stringify({ userId, xpAmount: xp, reason }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: String(j?.error ?? `HTTP ${r.status}`) };
    return { ok: true, newXp: Number(j?.newXp) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

function prochainCadeau(xp: number) {
  return CADEAUX.find((c) => xp < c.cout) ?? null;
}

// ─── verser ───────────────────────────────────────────────────────────────────
async function verser(dryRun: boolean, lundi: string | null) {
  const sb = getServiceClient({ reessais: true });
  const { data: lignes, error } = await sb.rpc("xp_a_verser_bar", { p_lundi: lundi });
  if (error) return jsonResponse({ error: error.message }, 500);
  const rows = (lignes ?? []) as Array<{
    client_id: string; email: string | null; prenom: string | null; semaine: string;
    xp_coaching: number; bonus_ids: string[] | null; bonus_xp: number; deja_ce_mois: number; a_verser: number; bar_user_id: string | null;
  }>;
  if (!barConfigure) return jsonResponse({ ok: false, skipped: "bar non configuré (BAR_SUPABASE_URL / BAR_SERVICE_KEY)", a_traiter: rows.length });

  const bilan = { verses: 0, sans_compte: 0, plafond: 0, erreurs: 0, xp_bar: 0 };
  const detail: unknown[] = [];
  for (const r of rows) {
    const lundiTxt = new Date(r.semaine + "T00:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    const semaineXp = Math.min(r.xp_coaching * TAUX, r.a_verser);
    const bonusPaye = Math.max(0, r.a_verser - semaineXp);

    if (r.a_verser <= 0) {
      // Plafond du mois atteint : la semaine est notée « plafond », les bonus attendent le mois prochain.
      bilan.plafond++;
      if (!dryRun && r.xp_coaching > 0) {
        await sb.from("xp_versements_bar").insert({
          client_id: r.client_id, motif: "semaine", semaine: r.semaine, xp_coaching: r.xp_coaching, xp_bar: 0,
          statut: "plafond", detail: `Plafond ${PLAFOND_MOIS} XP bar du mois déjà atteint (${r.deja_ce_mois}).`,
        });
      }
      detail.push({ prenom: r.prenom, statut: "plafond" });
      continue;
    }

    const profil = await profilBar(r.email, r.bar_user_id);
    if (!profil) {
      bilan.sans_compte++;
      if (!dryRun) {
        await sb.from("xp_versements_bar").insert({
          client_id: r.client_id, motif: "semaine", semaine: r.semaine, xp_coaching: r.xp_coaching, xp_bar: 0,
          statut: "sans_compte", detail: r.email ? `Aucun compte au bar pour ${r.email}` : "Pas d'e-mail sur la fiche",
        });
      }
      detail.push({ prenom: r.prenom, statut: "sans_compte" });
      continue;
    }

    if (dryRun) {
      bilan.verses++; bilan.xp_bar += r.a_verser;
      detail.push({ prenom: r.prenom, statut: "verse (dry_run)", xp_bar: r.a_verser, bar_xp_avant: profil.xp });
      continue;
    }

    const raison = bonusPaye > 0
      ? `Coaching La Base 360 · semaine du ${lundiTxt} + bonus de niveau`
      : `Coaching La Base 360 · semaine du ${lundiTxt}`;
    const res = await crediterBar(profil.id, r.a_verser, raison);
    if (!res.ok) {
      bilan.erreurs++;
      await sb.from("xp_versements_bar").insert({
        client_id: r.client_id, motif: "semaine", semaine: r.semaine, xp_coaching: r.xp_coaching, xp_bar: 0,
        statut: "erreur", bar_user_id: profil.id, detail: res.error,
      });
      detail.push({ prenom: r.prenom, statut: "erreur", erreur: res.error });
      continue;
    }

    bilan.verses++; bilan.xp_bar += r.a_verser;
    const maintenant = new Date().toISOString();
    await sb.from("xp_versements_bar").insert({
      client_id: r.client_id, motif: "semaine", semaine: r.semaine, xp_coaching: r.xp_coaching, xp_bar: semaineXp,
      statut: "verse", bar_user_id: profil.id, verse_le: maintenant, detail: `Nouveau solde au bar : ${res.newXp ?? "?"} XP`,
    });
    // Les bonus de niveau attendus : payés (dans la limite du plafond), le reste attend.
    let reste = bonusPaye;
    for (const id of r.bonus_ids ?? []) {
      const { data: b } = await sb.from("xp_versements_bar").select("xp_bar").eq("id", id).maybeSingle();
      const du = Number(b?.xp_bar ?? 0);
      if (reste <= 0 || du <= 0) break;
      const paye = Math.min(du, reste);
      reste -= paye;
      await sb.from("xp_versements_bar").update({
        statut: "verse", xp_bar: paye, bar_user_id: profil.id, verse_le: maintenant,
        detail: paye < du ? `Bonus ${du} versé pour ${paye} (plafond du mois), le reste est perdu` : `Bonus de niveau versé`,
      }).eq("id", id);
    }
    detail.push({ prenom: r.prenom, statut: "verse", xp_bar: r.a_verser, nouveau_solde: res.newXp });
  }
  return jsonResponse({ ok: true, dry_run: dryRun, lundi, ...bilan, detail });
}

// ─── solde ────────────────────────────────────────────────────────────────────
async function solde(req: Request, body: { token?: string; client_id?: string }) {
  const sb = getServiceClient({ reessais: true });
  let clientId: string | null = null;
  let resume: unknown = null;

  if (body.token) {
    const { data } = await sb.rpc("xp_bar_resume_membre", { p_token: body.token });
    if (!data) return jsonResponse({ error: "invalid_token" }, 403);
    resume = data;
    const { data: cid } = await sb.rpc("_resolve_client_id_from_token", { p_token: body.token });
    clientId = cid ? String(cid) : null;
  } else if (body.client_id) {
    // Une coach : son JWT, et le RLS de `clients` dit si elle voit cette cliente.
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return jsonResponse({ error: "unauthorized" }, 401);
    const moi = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } }, auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: c } = await moi.from("clients").select("id").eq("id", body.client_id).maybeSingle();
    if (!c) return jsonResponse({ error: "forbidden" }, 403);
    clientId = String(body.client_id);
    const { data: v } = await moi.from("xp_versements_bar").select("motif, xp_bar, statut, verse_le, cree_le")
      .eq("client_id", clientId).order("cree_le", { ascending: false }).limit(5);
    resume = { versements: v ?? [] };
  } else {
    return jsonResponse({ error: "token ou client_id requis" }, 400);
  }

  if (!clientId) return jsonResponse({ error: "invalid_token" }, 403);
  const { data: client } = await sb.from("clients").select("email, bar_user_id").eq("id", clientId).maybeSingle();
  const profil = await profilBar(client?.email, client?.bar_user_id ?? null);
  const bar = profil
    ? { compte: true, xp: profil.xp, prochain: prochainCadeau(profil.xp), cadeaux: CADEAUX }
    : { compte: false, xp: 0, prochain: CADEAUX[0], cadeaux: CADEAUX, configure: barConfigure };
  return jsonResponse({ ok: true, bar, resume, taux: TAUX, plafond: PLAFOND_MOIS });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = (await req.json().catch(() => ({}))) as { mode?: string; dry_run?: boolean; lundi?: string; token?: string; client_id?: string };
  const mode = body.mode ?? "solde";

  if (mode === "verser") {
    if (!isServiceRole(req.headers.get("Authorization") ?? "")) return jsonResponse({ error: "unauthorized" }, 401);
    return verser(Boolean(body.dry_run), body.lundi ?? null);
  }
  // Outil (service_role) : le rapprochement complet — pour chaque cliente qui a des XP, son compte
  // au bar (relié, ou trouvé par e-mail), sinon les comptes du bar au même prénom (e-mails masqués).
  if (mode === "rapprocher") {
    if (!isServiceRole(req.headers.get("Authorization") ?? "")) return jsonResponse({ error: "unauthorized" }, 401);
    if (!barConfigure) return jsonResponse({ error: "bar non configuré" }, 400);
    const sb = getServiceClient({ reessais: true });
    const { data: ev } = await sb.from("client_xp_events").select("client_id");
    const ids = [...new Set((ev ?? []).map((e) => String(e.client_id)))];
    const { data: clients } = await sb.from("clients").select("id, first_name, last_name, email, bar_user_id, lifecycle_status").in("id", ids);
    const { data: profils } = await barClient().from("profiles").select("id, email, first_name, xp");
    const masque = (e: string | null) => (e ? e.replace(/^(.{2}).*(@.*)$/, "$1…$2") : null);
    const norm = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
    const parEmail = new Map<string, { id: string; xp: number }>();
    for (const p of profils ?? []) if (p.email) parEmail.set(norm(p.email), { id: String(p.id), xp: Number(p.xp ?? 0) });
    const relies: unknown[] = [], parMail: unknown[] = [], candidats: unknown[] = [], sans: unknown[] = [];
    for (const c of clients ?? []) {
      const nom = `${c.first_name ?? ""} ${(c.last_name ?? "").charAt(0)}.`.trim();
      if (c.bar_user_id) { relies.push({ nom }); continue; }
      const m = c.email ? parEmail.get(norm(c.email)) : undefined;
      if (m) { parMail.push({ nom, bar_xp: m.xp }); continue; }
      const memePrenom = (profils ?? []).filter((p) => norm(p.first_name) === norm(c.first_name));
      if (memePrenom.length) {
        candidats.push({ client_id: c.id, nom, email_coaching: masque(c.email), statut: c.lifecycle_status,
          candidats: memePrenom.map((p) => ({ bar_user_id: p.id, email_bar: masque(p.email), bar_xp: Number(p.xp ?? 0) })) });
      } else {
        sans.push({ nom, email_coaching: masque(c.email), statut: c.lifecycle_status });
      }
    }
    return jsonResponse({ ok: true, total: (clients ?? []).length, deja_relies: relies.length, par_email: parMail.length, a_trancher: candidats, sans_compte: sans });
  }
  // Outil (service_role) : « elle a un compte au bar, pourquoi rien ne part ? » — les comptes du bar
  // dont le prénom ou l'e-mail ressemble, e-mail masqué (jamais en clair dans une réponse d'outil).
  if (mode === "chercher") {
    if (!isServiceRole(req.headers.get("Authorization") ?? "")) return jsonResponse({ error: "unauthorized" }, 401);
    const q = String((body as { q?: string }).q ?? "").trim();
    if (!barConfigure || q.length < 2) return jsonResponse({ error: "q requis (2 caractères) ou bar non configuré" }, 400);
    const { data, error } = await barClient().from("profiles").select("id, email, first_name, xp, created_at")
      .or(`first_name.ilike.%${q}%,email.ilike.%${q}%`).limit(10);
    if (error) return jsonResponse({ error: error.message }, 500);
    const masque = (e: string | null) => (e ? e.replace(/^(.{2}).*(@.*)$/, "$1…$2") : null);
    return jsonResponse({ ok: true, comptes: (data ?? []).map((p) => ({ id: p.id, prenom: p.first_name, email: masque(p.email), xp: p.xp, depuis: p.created_at })) });
  }
  return solde(req, body);
});
