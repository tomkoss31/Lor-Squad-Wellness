// =============================================================================
// audience-collect — le seul chemin d'écriture des compteurs d'audience.
//
// Elle est appelée depuis le SITE PUBLIC, donc sans JWT, donc par n'importe
// qui. Tout ce qui arrive ici est hostile jusqu'à preuve du contraire.
//
// ── LA PROTECTION QUI COMPTE VRAIMENT ───────────────────────────────────────
//
// Ce n'est pas le volume d'écriture, c'est le nombre de CLÉS DISTINCTES. Le
// schéma tient parce qu'il y a ~40 pages : une ligne par jour et par page.
// Si on acceptait le chemin tel qu'envoyé, un bot qui appelle /a1, /a2, /a3…
// créerait un million de lignes sur une base de 0,5 Go — exactement la panne
// du 2026-07-29, en pire, parce qu'elle serait permanente.
//
// Donc : liste blanche. Un chemin inconnu n'est pas rejeté (on perdrait la
// mesure), il est rangé sous « /autre ». Le nombre de lignes possibles est
// borné par le code, pas par la bonne volonté de l'appelant.
//
// ⚠️ CETTE LISTE EST DUPLIQUÉE dans `src/lib/audience.ts` (une edge Deno ne
// peut pas importer le front). Un test compare les deux fichiers et casse si
// elles divergent — même piège que le catalogue PV, même parade.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Liste blanche des chemins ──────────────────────────────────────────────
// Les segments variables sont écrits `:nom`. Tout le reste doit correspondre
// exactement. L'ordre compte : le premier motif qui matche gagne.
export const CHEMINS = [
  "/", "/welcome", "/decouvrir", "/colis",
  "/club", "/club/le-club", "/club/le-rituel", "/club/comment-ca-se-passe",
  "/club/resultats", "/club/nous", "/club/rejoindre", "/club/rejoindre/rdv",
  "/club/rejoindre/rdv/:coach",
  "/bilan-online", "/bilan-online/formulaire", "/bilan-online/resultats",
  "/bilan-online/merci",
  "/bilan-online/:coach", "/bilan-online/:coach/formulaire",
  "/bilan-online/:coach/resultats", "/bilan-online/:coach/merci",
  "/resultat-bilan/:token", "/qualif/:token",
  "/rdv", "/rdv/:coach", "/rdv/gerer/:token",
  "/reserver", "/reserver/:club",
  "/rejoindre", "/rejoindre/questionnaire",
  "/rejoindre/:coach", "/rejoindre/:coach/questionnaire",
  "/rdv-rejoindre-l-equipe",
  "/coach/:coach", "/vip/:coach",
  "/boutique/:coach", "/boutique/:coach/affiliation",
  "/boutique/:coach/produit/:produit", "/boutique/:coach/infos",
  "/news/:slug",
  "/legal/mentions", "/legal/confidentialite", "/legal/cgv",
] as const;

/** Le chemin rangé sous son motif, ou « /autre ». Jamais l'URL brute. */
export function normaliser(chemin: string): string {
  const propre = (chemin || "/").split("?")[0].split("#")[0].replace(/\/+$/, "") || "/";
  const parts = propre.split("/").filter(Boolean);
  for (const motif of CHEMINS) {
    const mp = motif.split("/").filter(Boolean);
    if (mp.length !== parts.length) continue;
    if (mp.every((seg, i) => seg.startsWith(":") || seg === parts[i])) return motif;
  }
  return "/autre";
}

/** Un nom de bouton : borné, sans surprise, jamais du texte libre d'un tiers. */
function nettoyerCle(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim().slice(0, 60);
  return /^[a-z0-9_.:-]+$/i.test(s) ? s : null;
}

function entier(v: unknown, max: number): number {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, Math.min(n, max));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method" }), { status: 405, headers: cors });
  }

  try {
    const body = await req.json().catch(() => null);
    const brut = Array.isArray(body?.events) ? body.events : [];
    if (brut.length === 0) {
      return new Response(JSON.stringify({ ok: true, ecrits: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Le coach est résolu ICI, à partir du slug envoyé : le navigateur ne
    // choisit pas à qui il attribue du trafic.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // `get_coach_credibility_by_slug` est la résolution CANONIQUE slug → coach
    // dans toute l'app (book-rdv fait pareil). Ne pas réinventer : il n'y a pas
    // de colonne « slug » sur `users`, le slug est dérivé du prénom.
    const slug = typeof body?.coach === "string" ? body.coach.trim().toLowerCase().slice(0, 60) : "";
    let coachId: string | null = null;
    if (slug && /^[a-z0-9-]+$/.test(slug)) {
      const { data } = await supabase.rpc("get_coach_credibility_by_slug", { p_slug: slug });
      coachId = (data as { user_id?: string } | null)?.user_id ?? null;
    }

    const events: Record<string, unknown>[] = [];
    for (const e of brut.slice(0, 40)) {
      if (e?.tunnel) {
        const tunnel = nettoyerCle(e.tunnel);
        const etape = nettoyerCle(e.etape);
        if (!tunnel || !etape) continue;
        events.push({
          tunnel, etape, rang: entier(e.rang, 30), coach_user_id: coachId,
          n: entier(e.n, 1) || 1,
        });
        continue;
      }
      if (e?.type === "clic") {
        const cle = nettoyerCle(e.cle);
        if (!cle) continue;
        events.push({ type: "clic", cle, coach_user_id: coachId, vues: entier(e.n, 20) || 1 });
        continue;
      }
      if (e?.type === "page" && typeof e.cle === "string") {
        const n = entier(e.vues, 20) || 1;
        events.push({
          type: "page",
          cle: normaliser(e.cle),
          coach_user_id: coachId,
          vues: n,
          visites: entier(e.visites, 1),
          sorties: entier(e.sorties, 1),
          // Le plafond définitif est appliqué en base ; ici on borne juste
          // pour éviter qu'un nombre absurde ne déborde le bigint.
          duree_ms: entier(e.duree_ms, 86_400_000),
          duree_n: entier(e.duree_n, 20),
        });
      }
    }

    if (events.length === 0) {
      return new Response(JSON.stringify({ ok: true, ecrits: 0 }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase.rpc("audience_bump", { p_events: events });
    if (error) {
      console.warn("[audience-collect] écriture impossible :", error.message);
      // Une mesure ratée ne doit JAMAIS remonter comme une erreur au visiteur :
      // il est en train de lire une page, pas de nous rendre service.
      return new Response(JSON.stringify({ ok: false }), {
        status: 200, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, ecrits: data ?? 0 }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.warn("[audience-collect] échec :", e instanceof Error ? e.message : e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
