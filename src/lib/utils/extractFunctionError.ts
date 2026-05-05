// extractFunctionError — helper pour extraire le vrai message d erreur
// d un appel sb.functions.invoke().
//
// Probleme : depuis supabase-js v2.101+, quand l Edge function renvoie
// un statut 4xx/5xx avec un body JSON { success: false, error: "..." },
// le SDK ne renvoie PLUS le body dans `data` — il met `data: null` et
// `error: FunctionsHttpError` avec un message generique "Edge Function
// returned a non-2xx status code".
//
// Le vrai message du backend est cache dans error.context.response (un
// objet Response qu on peut clone() + json()). Cette fonction fait ce
// parsing et retourne le 1er message dispo, avec un fallback friendly.
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
  context?: { response?: Response };
}

/**
 * Tente d extraire le message d erreur depuis :
 *   1. data.error (si la fonction a renvoye 200 avec success:false)
 *   2. error.context.response.json() body.error (cas non-2xx)
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
  if (e?.context?.response) {
    // 2a. Tenter clone().json() (chemin standard)
    try {
      const cloned = e.context.response.clone();
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
      const cloned2 = e.context.response.clone();
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
