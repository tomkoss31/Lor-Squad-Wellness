// =============================================================================
// Envoyer « L'agenda du club, mode d'emploi » par mail à UNE coach du club.
//
// Thomas (17/09) : « cet e-mail doit et peut être envoyé à plusieurs reprises
// pour les nouveaux ». C'est donc un geste, pas une campagne : la fonction
// `mail-agenda-club` vérifie que celui qui clique est le propriétaire du club
// ou un admin, et que la destinataire est bien une coach de ce club.
// =============================================================================

import { getSupabaseClient } from "../../../services/supabaseClient";

export type ResultatEnvoi = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  forbidden: "Seuls les responsables du club peuvent envoyer ce mail.",
  email_invalide: "Pas d'adresse mail valide sur ce compte.",
  compte_desactive: "Ce compte est désactivé.",
  pas_dans_un_club: "Cette personne n'est rattachée à aucun club.",
  unauthorized: "Session non reconnue. Reconnecte-toi et réessaie.",
};
const REPLI = "Le mail n'est pas parti — vérifie ta connexion, puis réessaie.";

export async function envoyerModeEmploi(coachId: string): Promise<ResultatEnvoi> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, message: REPLI };
    const { data, error } = await sb.functions.invoke("mail-agenda-club", { body: { user_id: coachId } });
    if (error) {
      // `functions.invoke` range le corps d'une réponse 4xx dans `error.context`.
      let code = "";
      try {
        const corps = await (error as { context?: Response }).context?.json();
        code = String((corps as { error?: string } | undefined)?.error ?? "");
      } catch {
        /* corps illisible : message générique */
      }
      return { ok: false, message: MESSAGES[code] ?? REPLI };
    }
    if ((data as { ok?: boolean } | null)?.ok) return { ok: true };
    return { ok: false, message: MESSAGES[String((data as { error?: string } | null)?.error ?? "")] ?? REPLI };
  } catch {
    return { ok: false, message: REPLI };
  }
}
