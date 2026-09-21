// extractFunctionError — helper pour extraire le vrai message d erreur
// d un appel sb.functions.invoke().
//
// Probleme : depuis supabase-js v2.101+, quand l Edge function renvoie
// un statut 4xx/5xx avec un body JSON { success: false, error: "..." },
// le SDK ne renvoie PLUS le body dans `data` — il met `data: null` et
// `error: FunctionsHttpError` avec un message generique "Edge Function
// returned a non-2xx status code".
//
// Le vrai message du backend est cache dans error.context : c est la Response
// elle-meme (qu on peut clone() + json()) dans les SDK recents — dans les
// anciens, c etait error.context.response. Cette fonction gere les deux, fait
// le parsing et retourne le 1er message dispo, avec un fallback friendly.
//
// Bug du 21/09/2026 : elle ne lisait QUE error.context.response, donc avec
// supabase-js 2.101 elle retombait toujours sur « Edge Function returned a
// non-2xx status code » — la vraie raison (« Objectif kilos invalide »)
// n arrivait jamais jusqu a l ecran, sur toutes les pages qui l utilisent.
//
// Usage :
//   const { data, error } = await sb.functions.invoke("my-fn", { body });
//   if (error || !data?.success) {
//     const msg = await extractFunctionError(data, error, "Erreur generique");
//     setFormError(msg);
//   }

interface MaybeApiData {
  error?: unknown;
  message?: unknown;
}

interface MaybeFunctionsError {
  message?: string;
  context?: unknown;
}

/** La Response de l erreur : `context` lui-meme (SDK recent) ou
 *  `context.response` (ancien SDK). null si on n en trouve pas. */
function responseOf(e: MaybeFunctionsError | null): Response | null {
  const c = e?.context;
  if (!c || typeof c !== "object") return null;
  if (typeof (c as Response).clone === "function") return c as Response;
  const r = (c as { response?: Response }).response;
  return r && typeof r.clone === "function" ? r : null;
}

/**
 * Tente d extraire le message d erreur depuis :
 *   1. data.error (si la fonction a renvoye 200 avec success:false)
 *   2. body.error de la Response cachee dans error.context (cas non-2xx)
 *   3. error.message (fallback brut SDK)
 *   4. fallback custom (defaut : "Erreur inconnue")
 */
export async function extractFunctionError(
  data: unknown,
  error: unknown,
  fallback: string = "Erreur inconnue, réessaie dans quelques minutes.",
): Promise<string> {
  // 1. data.error si existe (cas 2xx avec success: false)
  const d = data as MaybeApiData | null;
  if (d && typeof d.error === "string" && d.error.trim()) {
    return d.error.trim();
  }

  // 2. Body de la response cachee dans error.context (cas 4xx/5xx)
  const e = error as MaybeFunctionsError | null;
  const resp = responseOf(e);
  if (resp) {
    // 2a. Tenter clone().json() (chemin standard)
    try {
      const cloned = resp.clone();
      const body = (await cloned.json().catch(() => null)) as MaybeApiData | null;
      if (body && typeof body.error === "string" && body.error.trim()) {
        return body.error.trim();
      }
      if (body && typeof body.message === "string" && body.message.trim()) {
        return body.message.trim();
      }
    } catch { /* fallthrough vers 2b */ }

    // 2b. Fallback : clone().text() puis parse manuel JSON (Safari iOS
    // peut planter sur clone().json() dans certains cas)
    try {
      const cloned2 = resp.clone();
      const raw = await cloned2.text().catch(() => "");
      if (raw && raw.trim()) {
        try {
          const parsed = JSON.parse(raw) as MaybeApiData;
          if (typeof parsed.error === "string" && parsed.error.trim()) {
            return parsed.error.trim();
          }
          if (typeof parsed.message === "string" && parsed.message.trim()) {
            return parsed.message.trim();
          }
        } catch {
          // pas du JSON, mais on a du texte brut, on retourne tel quel
          if (raw.length < 500) return raw.trim();
        }
      }
    } catch { /* ignore */ }
  }

  // 3. error.message brut
  if (e && typeof e.message === "string" && e.message.trim()) {
    return e.message.trim();
  }

  // 4. fallback
  return fallback;
}
