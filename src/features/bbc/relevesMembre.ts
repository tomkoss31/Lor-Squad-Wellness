// =============================================================================
// relevesMembre — les pesées d'un membre, pour sa fiche BBC.
//
// LE MANQUE QUE ÇA COMBLE (Thomas, 17/08 : « la fiche client est assez vide »)
// Thomas Houbert a DIX-NEUF bilans en base, chacun avec ses huit mesures. Sa
// fiche BBC n'en montrait aucun chiffre — pendant que sa propre application lui
// affiche sa courbe et trois jauges. Le membre en savait plus sur son corps que
// le coach en face de lui.
//
// POURQUOI UN MODULE À PART, ET PAS `useBbcMembers`
// La liste charge TOUS les membres d'un coup. Y ajouter les bilans de chacun
// ferait grossir la requête pour une information qu'on ne lit qu'en dépliant
// une fiche. Ce chargement est donc PARESSEUX : il ne part qu'à l'ouverture
// d'un membre.
//
// ⚠️ `excludeFromEvolution` est respecté ici. C'est le drapeau qui permet de
// dire « cette pesée ne compte pas comme référence » — celui qui sert quand un
// membre est inscrit trois semaines avant l'ouverture du club et qu'on refait
// son vrai départ le jour J.
// =============================================================================

import { getSupabaseClient } from "../../services/supabaseClient";
import { addSupabaseFollowUpAssessment } from "../../services/supabaseService";
import { chargerContextePesee, dateDuJour, lireBilan, scanDepuisBodyScan } from "./bilan10Pesee";
import type { AssessmentRecord, BodyScanMetrics } from "../../types/domain";
import type { ScanValues } from "./BbcBilan10Scan";

export interface ReleveMembre {
  id: string;
  /** ISO court (yyyy-mm-dd) tel qu'il est en base. */
  date: string;
  type: string;
  scan: ScanValues;
}

export interface CorpsMembre {
  /** Du plus ancien au plus récent, uniquement ceux qui portent un poids. */
  releves: ReleveMembre[];
  /** Le point de référence : le plus ancien non exclu. */
  depart: ReleveMembre | null;
  /** Le dernier relevé. Vaut `depart` quand il n'y en a qu'un. */
  dernier: ReleveMembre | null;
  /** Combien de pesées ont été écartées de la référence (repères d'avant J). */
  exclus: number;
}

const VIDE: CorpsMembre = { releves: [], depart: null, dernier: null, exclus: 0 };

/**
 * Charge les pesées d'un membre. Ne renvoie JAMAIS d'erreur : une fiche qui
 * n'affiche pas ses chiffres reste utilisable, une fiche qui plante non.
 */
export async function chargerCorpsMembre(clientId: string): Promise<CorpsMembre> {
  try {
    const sb = await getSupabaseClient();
    if (!sb) return VIDE;

    const { data, error } = await sb
      .from("assessments")
      .select("id, date, type, body_scan, questionnaire")
      .eq("client_id", clientId)
      .order("date", { ascending: true });
    if (error || !Array.isArray(data)) return VIDE;

    let exclus = 0;
    const releves: ReleveMembre[] = [];
    for (const row of data as Array<Record<string, unknown>>) {
      const scan = scanDepuisBodyScan(row.body_scan as Record<string, unknown> | null);
      // Sans poids, il n'y a rien à comparer : une ligne de plus qui ne dirait
      // rien vaut moins qu'une ligne de moins.
      if (!scan || scan.weight == null) continue;
      const q = (row.questionnaire ?? {}) as { excludeFromEvolution?: boolean };
      if (q.excludeFromEvolution === true) {
        exclus += 1;
        continue;
      }
      releves.push({
        id: String(row.id),
        date: String(row.date ?? ""),
        type: String(row.type ?? ""),
        scan,
      });
    }

    return {
      releves,
      depart: releves[0] ?? null,
      dernier: releves.length ? releves[releves.length - 1] : null,
      exclus,
    };
  } catch {
    return VIDE;
  }
}

/**
 * Marque une pesée comme ne comptant plus comme référence.
 *
 * Sert au cas « vrai départ » : un membre inscrit le 16 août alors que le club
 * ouvre le 7 septembre est repesé le jour J. Sans ce drapeau, sa courbe
 * tracerait trois semaines de résultats qu'il n'a jamais faits — et l'erreur
 * irait dans le sens qui flatte, donc personne ne la corrigerait.
 *
 * ⚠️ Passe par `/api/update-assessment` : `assessments` n'a AUCUNE policy
 * UPDATE (vérifié sur pg_policies le 16/08), un update navigateur toucherait
 * zéro ligne sans renvoyer d'erreur.
 */
export async function ecarterDeLaReference(clientId: string, assessmentId: string): Promise<boolean> {
  const existant = await lireBilan(clientId, assessmentId);
  // La pesée a disparu entre l'affichage et le clic : il n'y a plus rien à
  // écarter, et c'est déjà le résultat voulu.
  if (!existant) return true;

  const { updateSupabaseAssessment } = await import("../../services/supabaseService");
  const { data } = await (await getSupabaseClient())!
    .from("assessments")
    .select("body_scan")
    .eq("id", assessmentId)
    .maybeSingle();

  await updateSupabaseAssessment(clientId, {
    ...existant,
    // On relit le body scan pour le REDONNER tel quel : l'API réécrit toutes
    // les colonnes, un envoi sans lui remettrait les huit mesures à zéro.
    bodyScan: scanDepuisBodyScan((data as { body_scan?: Record<string, unknown> } | null)?.body_scan ?? null) ?? undefined,
    questionnaire: { ...existant.questionnaire, excludeFromEvolution: true },
  } as never);
  return true;
}

/** Le préfixe des pesées prises hors bilan des 10, depuis la fiche membre. */
const PREFIXE_PESEE = "a-pesee-";

/**
 * Enregistre une pesée prise depuis la fiche, hors bilan des 10.
 *
 * `vraiDepart` répond au cas soulevé par Thomas le 17/08 : un membre inscrit le
 * 16 août alors que le club ouvre le 7 septembre. Sans lui, la courbe tracerait
 * trois semaines de résultats jamais faits — et l'erreur irait dans le sens qui
 * flatte, donc personne ne la corrigerait. Les pesées précédentes sont alors
 * écartées de la référence : gardées dans l'historique, retirées du calcul.
 */
export async function enregistrerPesee(params: {
  clientId: string;
  valeurs: ScanValues;
  vraiDepart: boolean;
}): Promise<{ assessmentId: string } | null> {
  const { clientId, valeurs, vraiDepart } = params;
  const contexte = await chargerContextePesee(clientId);
  if (!contexte) return null;

  const bodyScan: BodyScanMetrics = {
    weight: valeurs.weight ?? 0,
    bodyFat: valeurs.bodyFat ?? 0,
    muscleMass: valeurs.muscleMass ?? 0,
    hydration: valeurs.hydration ?? 0,
    boneMass: valeurs.boneMass ?? 0,
    visceralFat: valeurs.visceralFat ?? 0,
    bmr: valeurs.bmr ?? 0,
    metabolicAge: valeurs.metabolicAge ?? 0,
  };

  const assessment: AssessmentRecord = {
    id: `${PREFIXE_PESEE}${clientId}-${Date.now()}`,
    date: dateDuJour(),
    type: "follow-up",
    objective: contexte.objectifNatif,
    // Programme et RDV redonnés tels quels : le service les réécrit sur la
    // fiche, un vide les effacerait.
    programTitle: contexte.programme,
    summary: vraiDepart ? "Point de départ refait au club." : "Pesée au club.",
    notes: "",
    nextFollowUp: contexte.prochainRdv,
    bodyScan,
    questionnaire: contexte.questionnaire,
    pedagogicalFocus: contexte.pedagogicalFocus,
  };

  await addSupabaseFollowUpAssessment(clientId, assessment, {
    dueDate: contexte.prochainRdv,
    type: contexte.suiviType,
    status: contexte.suiviStatut,
  });

  if (vraiDepart) {
    // On écarte APRÈS avoir écrit la nouvelle : si l'écriture échoue, le membre
    // garde son ancien départ plutôt que de se retrouver sans référence du tout.
    const avant = await chargerCorpsMembre(clientId);
    for (const r of avant.releves) {
      if (r.id === assessment.id) continue;
      await ecarterDeLaReference(clientId, r.id);
    }
  }

  return { assessmentId: assessment.id };
}
