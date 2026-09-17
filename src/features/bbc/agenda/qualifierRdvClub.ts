// =============================================================================
// Qualifier un rendez-vous du club — l'écriture, et les mots qui suivent.
//
// L'écriture passe par `qualifier_rdv_club()` en base, qui écrit exactement ce
// que l'agenda standard écrit (AgendaPage, 16/09) — pour qu'un même fait n'ait
// qu'une vérité, quel que soit l'écran. Les mails d'après-rendez-vous partent
// d'ici, aux MÊMES conditions que l'agenda standard :
//   · « pas venue » (reprends un créneau) → quand elle n'est pas venue et
//     qu'on la garde dans la file ; jamais quand on la sort des relances ;
//   · « démarre »  → quand sa fiche vient d'être créée.
// Un mail qui ne part pas ne fait pas échouer le geste : il est best-effort.
// =============================================================================

import { getSupabaseClient } from "../../../services/supabaseClient";
import { envoyerMailApresRdv, envoyerMailApresRdvProspect } from "../../../services/sb/mailApresRdv";
import { marquerRdvQualifie } from "../../../services/sb/qualifierRdv";
import type { RdvClub } from "./agendaClub";

export type Issue = "membre" | "fait" | "relance" | "pas_venue" | "perdue";

export interface Qualification {
  issue: Issue;
  /** Pour `relance` et `pas_venue` : dans combien de jours elle revient. */
  jours?: number;
  raison?: string;
  /** Pour `membre` : la fiche qui vient d'être créée. */
  clientId?: string;
  /** Pour `pas_venue` : lui envoyer le mot « reprends un créneau ». */
  mailPasVenue?: boolean;
}

export type ResultatQualif = { ok: true } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  rendez_vous_introuvable: "Ce rendez-vous n'existe plus, ou n'est pas dans ton club.",
  issue_inconnue: "Cette réponse n'est pas reconnue.",
  source_inconnue: "Ce type de rendez-vous ne se qualifie pas ici.",
};

export async function qualifierRdvClub(rdv: RdvClub, q: Qualification): Promise<ResultatQualif> {
  if (rdv.source === "suivi") return { ok: false, message: "Un suivi se règle depuis la fiche du membre." };
  try {
    const sb = await getSupabaseClient();
    if (!sb) return { ok: false, message: "Pas de connexion." };
    const { error } = await sb.rpc("qualifier_rdv_club", {
      p_source: rdv.source,
      p_rdv_id: rdv.id,
      p_issue: q.issue,
      p_jours: q.jours ?? null,
      p_raison: q.raison ?? null,
      p_client_id: q.clientId ?? null,
    });
    if (error) {
      const cle = Object.keys(MESSAGES).find((k) => error.message.includes(k));
      return { ok: false, message: cle ? MESSAGES[cle] : "La réponse n'a pas pu être enregistrée." };
    }

    // Les mots qui suivent — best-effort, comme dans l'agenda standard.
    if (q.issue === "pas_venue" && q.mailPasVenue) {
      if (rdv.source === "prospect") void envoyerMailApresRdvProspect(rdv.id, "pas_venue");
      else void envoyerMailApresRdv(rdv.id, "pas_venue");
    }
    if (q.issue === "membre") {
      if (rdv.source === "prospect") void envoyerMailApresRdvProspect(rdv.id, "demarre");
      else {
        void envoyerMailApresRdv(rdv.id, "demarre");
        // Une réservation du site a un lead dans le CRM : on le referme aussi,
        // par la même clé que l'agenda standard (email / téléphone normalisés).
        void marquerRdvQualifie(rdv.id, rdv.telephone);
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "La réponse n'a pas pu être enregistrée. Réessaie." };
  }
}
