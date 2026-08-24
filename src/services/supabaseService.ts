import { createMockSession, getDefaultUserTitle, getRoleScope } from "../lib/auth";
import { getSupabaseClient } from "./supabaseClient";
import { pvProductCatalog, resolvePvProgram } from "../data/pvCatalog";
import { computeWaterTarget, computeProteinTarget } from "../lib/calculations";
import { toAppLevel } from "../config/appVisibility";

// Chantier Recommandations nutri (2026-04-25) : helpers safe qui
// retournent null si le poids est absent — compatibles avec les
// colonnes SQL nullable.
function computeWaterTargetSafe(weight?: number): number | null {
  if (!weight || weight <= 0) return null;
  return computeWaterTarget(weight);
}
function computeProteinTargetSafe(weight?: number, objective?: string): number | null {
  if (!weight || weight <= 0) return null;
  return computeProteinTarget(weight, objective);
}
import type {
  ActivityLog,
  AssessmentRecord,
  AuthSession,
  Client,
  DecisionClient,
  FollowUp,
  LifecycleStatus,
  MessageALaisser,
  TypeDeSuite,
  User
} from "../types/domain";
import { deriveLifecycleFromAssessment } from "../lib/lifecycleMapping";
import { getRecommendableProductById } from "../lib/assessmentRecommendations";
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";
import { viderTout } from "../lib/cacheFraicheur";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User["role"];
  sponsor_id?: string | null;
  sponsor_name?: string | null;
  active: boolean;
  title: string;
  created_at?: string | null;
  last_access_at?: string | null;
  herbalife_id?: string | null;
  coach_referent_user_id?: string | null;
  monthly_pv_target?: number | null;
  avatar_url?: string | null;
  bio?: string | null;
  current_rank?: string | null;
  rank_set_at?: string | null;
  formation_beta_access?: boolean | null;
  /** Chantier Simplification (2026-07-27) : 'essentiel' | 'complet'. */
  app_level?: string | null;
  /** Agenda V2 (2026-07-27) : couleur du coach dans l'agenda (#RRGGBB). */
  calendar_color?: string | null;
  /** Agenda V2 (2026-07-27) : duree par defaut d'un RDV, en minutes. */
  default_rdv_minutes?: number | null;
  city?: string | null;
  phone?: string | null;
  coaching_since?: string | null;
  rdv_location?: string | null;
  frozen_at?: string | null;
  frozen_by?: string | null;
  frozen_reason?: string | null;
  monthly_pv_override?: number | null;
  monthly_pv_override_month?: string | null;
  monthly_pv_override_set_by?: string | null;
  monthly_pv_override_set_at?: string | null;
};

type AssessmentRow = {
  id: string;
  date: string;
  type: AssessmentRecord["type"];
  objective: AssessmentRecord["objective"];
  program_id?: string | null;
  program_title: string;
  summary: string;
  notes: string;
  next_follow_up?: string | null;
  body_scan: AssessmentRecord["bodyScan"];
  questionnaire: AssessmentRecord["questionnaire"];
  decision_client?: DecisionClient | null;
  type_de_suite?: TypeDeSuite | null;
  message_a_laisser?: MessageALaisser | null;
  coach_notes_draft?: string | null;
  coach_notes_initial?: string | null;
  pedagogical_focus: string[] | null;
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  sex: Client["sex"];
  phone: string;
  email: string;
  age: number;
  /** Chantier birth_date 2026-04-25 — date de naissance optionnelle. */
  birth_date?: string | null;
  height: number;
  job: string;
  city?: string | null;
  distributor_id: string;
  distributor_name: string;
  status: Client["status"];
  objective: Client["objective"];
  current_program: string;
  pv_program_id?: string | null;
  started: boolean;
  start_date?: string | null;
  next_follow_up: string;
  notes: string;
  lifecycle_status?: LifecycleStatus | null;
  is_fragile?: boolean | null;
  lifecycle_updated_at?: string | null;
  lifecycle_updated_by?: string | null;
  free_follow_up?: boolean | null;
  free_pv_tracking?: boolean | null;
  general_note?: string | null;
  // V2 (2026-04-24) : après migration, la colonne est renommée. On lit
  // les deux pour la transition (avant/après migration SQL).
  general_note_deprecated?: string | null;
  onboarding_checks?: { telegram?: boolean; photo_before?: boolean; measurements?: boolean } | null;
  public_share_consent?: boolean | null;
  public_share_consent_at?: string | null;
  public_share_revoked_at?: string | null;
  // Programme Client VIP Herbalife (Tier B 2026-04-28).
  vip_herbalife_id?: string | null;
  vip_sponsor_client_id?: string | null;
  vip_started_at?: string | null;
  vip_status?: string | null;
  // Pop-up business bilan (2026-11-03)
  business_curiosity?: string | null;
  business_interest_amount?: number | null;
  business_interest_date?: string | null;
  business_interest_note?: string | null;
  business_plan_sent_at?: string | null;
  assessments?: AssessmentRow[] | null;
};

type FollowUpRow = {
  id: string;
  client_id: string;
  client_name: string;
  due_date: string;
  /** Agenda V2 (2026-07-27) : NULL = duree par defaut du coach. */
  duration_min?: number | null;
  /** false = RDV modifie en silence, aucun rappel au client. */
  notify_client?: boolean | null;
  type: string;
  status: FollowUp["status"];
  program_title: string;
  last_assessment_date: string;
};

type PvClientProductRow = {
  id: string;
  client_id: string;
  responsible_id: string;
  responsible_name: string;
  program_id: string;
  product_id: string;
  product_name: string;
  quantity_start: number;
  start_date: string;
  duration_reference_days: number;
  pv_per_unit: number;
  price_public_per_unit: number;
  quantite_label: string;
  note_metier?: string | null;
  active: boolean;
};

type PvTransactionRow = {
  id: string;
  date: string;
  client_id: string;
  client_name: string;
  responsible_id: string;
  responsible_name: string;
  product_id: string;
  product_name: string;
  quantity: number;
  pv: number;
  price: number;
  type: PvClientTransaction["type"];
  note: string;
};

type ActivityLogRow = {
  id: string;
  created_at: string;
  action: ActivityLog["action"];
  actor_id: string;
  actor_name: string;
  owner_user_id?: string | null;
  client_id?: string | null;
  client_name?: string | null;
  target_user_id?: string | null;
  target_user_name?: string | null;
  summary: string;
  detail?: string | null;
};

function hasStoredTime(value: string | null | undefined) {
  return typeof value === "string" && /(?:T|\s)\d{2}:\d{2}/.test(value);
}

async function requireSupabase() {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  return supabase;
}

function isMissingColumnError(error: { message?: string } | null | undefined, column: string) {
  return Boolean(error?.message?.toLowerCase().includes(column.toLowerCase()));
}

/**
 * La table n'existe VRAIMENT pas.
 *
 * Remplace l'ancien `isMissingTableError`, qui se contentait de chercher le nom
 * de la table dans le message : Postgres l'y met dans presque toutes ses
 * erreurs, donc « refus de droits » et « table absente » etaient confondus.
 *
 * 42P01 = undefined_table cote Postgres · PGRST205 = PostgREST ne trouve pas la
 * table dans son cache de schema (le cas d'`activity_logs`, supprimee).
 */
function tableAbsente(error: { code?: string } | null | undefined): boolean {
  return error?.code === "42P01" || error?.code === "PGRST205";
}

/**
 * Ce qu'il faut dire a quelqu'un dont une ecriture Suivi PV vient d'echouer.
 *
 * ⚠️ NE JAMAIS revenir a « le message contient le nom de la table ». C'etait la
 * regle jusqu'au 21/08, et elle etait fausse par construction : Postgres nomme
 * la table dans PRESQUE TOUTES ses erreurs d'ecriture.
 *
 *   permission denied for table "pv_transactions"
 *   new row violates row-level security policy for table "pv_transactions"
 *   new row for relation "pv_transactions" violates check constraint ...
 *   insert or update on table "pv_transactions" violates foreign key ...
 *
 * Les quatre devenaient « le module Suivi PV n'est pas installe, lance le
 * fichier de migration » — un message faux (le module tourne depuis toujours),
 * inapplicable, et surtout qui DETRUISAIT la seule information utile.
 *
 * Vecu le 21/08 : Thomas valide une vente au Panier, sa session Supabase avait
 * expire, la requete part sans jeton donc en `anon`. Or `anon` a INSERT mais
 * pas UPDATE sur `pv_client_products`, et un upsert PostgREST est un
 * `INSERT ... ON CONFLICT DO UPDATE` : il exige les DEUX. D'ou un
 * « permission denied » (HTTP 401) que l'app a traduit par « installe le
 * module ». La vraie reponse tenait en trois mots : reconnecte-toi.
 *
 * On classe donc par CODE SQLSTATE, jamais par le texte. Tout ce qui n'est pas
 * reconnu ici renvoie `null` et l'appelant remonte le message brut de Postgres
 * — mieux vaut un message technique qu'un message faux.
 */
function messageErreurEcriturePv(
  error: { message?: string; code?: string } | null | undefined,
): string | null {
  const code = error?.code;

  // 42P01 = la relation n'existe pas · PGRST205 = absente du cache de schema
  // PostgREST. Ce sont les DEUX seuls cas ou « pas installe » est vrai.
  if (code === "42P01" || code === "PGRST205") {
    return "Le module Suivi PV n'est pas installe sur cette base. Lance supabase/pv-module-migration.sql dans le SQL Editor, puis recharge l'application.";
  }

  return messageSessionExpiree(error);
}

/**
 * 42501 = privilege insuffisant.
 *
 * En pratique la requete est partie SANS session valide : PostgREST l'execute
 * alors en `anon`, qui n'a le droit d'ecrire nulle part. Vaut pour n'importe
 * quelle table, d'ou l'extraction hors du classifieur PV.
 *
 * On previent qu'une partie a pu passer : le Panier ecrit ligne par ligne,
 * donc une expiration en cours de route laisse un panier a moitie enregistre.
 */
function messageSessionExpiree(
  error: { message?: string; code?: string } | null | undefined,
): string | null {
  if (error?.code !== "42501") return null;
  return "Ta session a expire : la base a refuse l'ecriture. Reconnecte-toi, puis verifie la fiche du client avant de refaire la vente — une partie a pu passer.";
}

function getTeamHierarchySetupError(
  error: { message?: string; error?: string } | null | undefined
) {
  const message = String(error?.message ?? error?.error ?? "").toLowerCase();

  if (!message) {
    return null;
  }

  if (message.includes("sponsor_id") || message.includes("sponsor_name")) {
    return "Le rattachement d'equipe n'est pas encore active sur cette base Supabase. Lance le fichier supabase/fix-team-hierarchy.sql dans SQL Editor, puis recharge l'application.";
  }

  return null;
}

async function readApiResult<T extends { ok?: boolean; error?: string }>(response: Response) {
  const raw = await response.text();

  if (!raw) {
    return { ok: response.ok } as T;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    const cleanedMessage = raw
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    return {
      ok: false,
      error:
        cleanedMessage ||
        "Le serveur a renvoye une reponse invalide. Recharge l'application puis recommence."
    } as T;
  }
}

function buildSeedPvProducts(payload: {
  clientId: string;
  distributorId: string;
  distributorName: string;
  programTitle: string;
  startDate: string;
  selectedProductIds?: string[];
  selectedProductQuantities?: Record<string, number>;
}) {
  const program = resolvePvProgram(payload.programTitle);
  const selectedProductIds = (payload.selectedProductIds ?? []).filter(
    (productId, index, array) =>
      array.indexOf(productId) === index &&
      pvProductCatalog.some((item) => item.id === productId)
  );
  // Fix bug 2026-05-05 : avant on faisait `selected OR program.included`,
  // donc si le coach ajoutait UN booster (ex: multifibres), on perdait
  // les 4 produits routine du programme (F1, PDM, Aloe, The). Maintenant
  // UNION : routine programme + addons selectionnes.
  const productIds = Array.from(new Set([
    ...program.includedProductIds,
    ...selectedProductIds,
  ]));

  return productIds.flatMap((productId) => {
    const product = pvProductCatalog.find((item) => item.id === productId);
    if (!product) {
      return [];
    }

    return [
      {
        client_id: payload.clientId,
        responsible_id: payload.distributorId,
        responsible_name: payload.distributorName,
        program_id: program.id,
        product_id: product.id,
        product_name: product.name,
        quantity_start: Math.max(1, Math.round(payload.selectedProductQuantities?.[product.id] ?? 1)),
        start_date: payload.startDate,
        duration_reference_days: product.dureeReferenceJours,
        pv_per_unit: product.pv,
        price_public_per_unit: product.pricePublic,
        quantite_label: product.quantiteLabel,
        note_metier: product.noteMetier ?? null,
        active: true
      }
    ];
  });
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    sponsorId: row.sponsor_id ?? undefined,
    sponsorName: row.sponsor_name ?? undefined,
    active: row.active,
    title: row.title,
    createdAt: row.created_at ?? undefined,
    lastAccessAt: row.last_access_at ?? undefined,
    herbalifeId: row.herbalife_id ?? null,
    coachReferentUserId: row.coach_referent_user_id ?? null,
    monthly_pv_target: row.monthly_pv_target ?? undefined,
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
    currentRank: (row.current_rank ?? "distributor_25") as User["currentRank"],
    rankSetAt: row.rank_set_at ?? null,
    isExternal: (row as { is_external?: boolean }).is_external ?? false,
    isPassiveSupervisor: (row as { is_passive_supervisor?: boolean }).is_passive_supervisor ?? false,
    formationBetaAccess: row.formation_beta_access ?? false,
    // Chantier Simplification (2026-07-27) : défaut 'essentiel' si la colonne
    // n'est pas encore là (migration pas encore passée sur cet environnement).
    appLevel: toAppLevel(row.app_level),
    calendarColor: row.calendar_color ?? null,
    defaultRdvMinutes:
      typeof row.default_rdv_minutes === "number" ? row.default_rdv_minutes : undefined,
    city: row.city ?? null,
    // ⚠️ Sans cette ligne, `currentUser.phone` restait toujours vide : le champ
    // Téléphone des Paramètres serait parti à blanc et aurait EFFACÉ le numéro
    // existant à la première sauvegarde (repéré avant livraison, 12/08/2026).
    phone: row.phone ?? undefined,
    coachingSince: row.coaching_since ?? null,
    rdvLocation: row.rdv_location ?? null,
    frozenAt: row.frozen_at ?? null,
    frozenBy: row.frozen_by ?? null,
    frozenReason: row.frozen_reason ?? null,
    monthlyPvOverride:
      typeof row.monthly_pv_override === "number" ? row.monthly_pv_override : null,
    monthlyPvOverrideMonth: row.monthly_pv_override_month ?? null,
    monthlyPvOverrideSetAt: row.monthly_pv_override_set_at ?? null,
    monthlyPvOverrideSetBy: row.monthly_pv_override_set_by ?? null,
  };
}

/**
 * Durcissement import client (2026-04-21) : normalise les sous-champs
 * tableau du questionnaire qui peuvent arriver null/absents depuis un
 * INSERT SQL brut (import Mélanie / CSV / restore). Le reste du code
 * app suppose que ces champs sont des tableaux ([]) — sans ça, un
 * simple `.length` crash la page "Nouveau body scan".
 */
function normalizeQuestionnaire(
  raw: AssessmentRecord["questionnaire"] | null | undefined
): AssessmentRecord["questionnaire"] {
  const q = (raw ?? {}) as AssessmentRecord["questionnaire"];
  return {
    ...q,
    recommendations: Array.isArray(q.recommendations) ? q.recommendations : [],
    selectedProductIds: Array.isArray(q.selectedProductIds) ? q.selectedProductIds : [],
    detectedNeedIds: Array.isArray(q.detectedNeedIds) ? q.detectedNeedIds : []
  };
}

/**
 * Durcissement import (2026-04-21) : garantit un BodyScanMetrics complet
 * même si le JSONB importé est null ou manque des clés. Toutes les valeurs
 * manquantes deviennent 0 — le reste du code peut calculer / afficher sans
 * crash (0 est interprété comme "pas encore mesuré" dans l'UI).
 */
function normalizeBodyScan(
  raw: AssessmentRecord["bodyScan"] | null | undefined
): AssessmentRecord["bodyScan"] {
  const b = (raw ?? {}) as Partial<AssessmentRecord["bodyScan"]>;
  return {
    weight: typeof b.weight === "number" ? b.weight : 0,
    bodyFat: typeof b.bodyFat === "number" ? b.bodyFat : 0,
    muscleMass: typeof b.muscleMass === "number" ? b.muscleMass : 0,
    hydration: typeof b.hydration === "number" ? b.hydration : 0,
    boneMass: typeof b.boneMass === "number" ? b.boneMass : 0,
    visceralFat: typeof b.visceralFat === "number" ? b.visceralFat : 0,
    bmr: typeof b.bmr === "number" ? b.bmr : 0,
    metabolicAge: typeof b.metabolicAge === "number" ? b.metabolicAge : 0
  };
}

function mapAssessment(row: AssessmentRow): AssessmentRecord {
  return {
    id: row.id,
    date: row.date,
    type: row.type,
    objective: row.objective,
    programId: row.program_id ?? undefined,
    programTitle: row.program_title,
    summary: row.summary,
    notes: row.notes,
    nextFollowUp: row.next_follow_up ?? undefined,
    bodyScan: normalizeBodyScan(row.body_scan),
    questionnaire: normalizeQuestionnaire(row.questionnaire),
    pedagogicalFocus: row.pedagogical_focus ?? [],
    decisionClient: row.decision_client ?? null,
    typeDeSuite: row.type_de_suite ?? null,
    messageALaisser: row.message_a_laisser ?? null,
    coachNotesDraft: row.coach_notes_draft ?? null,
    coachNotesInitial: row.coach_notes_initial ?? null
  };
}

function mapClient(row: ClientRow): Client {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    sex: row.sex,
    phone: row.phone,
    email: row.email,
    age: row.age,
    birthDate: row.birth_date ?? null,
    birthdaySentAt: (row as { birthday_sent_at?: string | null }).birthday_sent_at ?? null,
    height: row.height,
    job: row.job,
    city: row.city ?? undefined,
    distributorId: row.distributor_id,
    distributorName: row.distributor_name,
    herbalifeUplinkUserId: (row as { herbalife_uplink_user_id?: string | null }).herbalife_uplink_user_id ?? null,
    herbalifeUplinkLabel: (row as { herbalife_uplink_label?: string | null }).herbalife_uplink_label ?? null,
    herbalifeUplinkRank: ((row as { herbalife_uplink_rank?: string | null }).herbalife_uplink_rank ?? null) as import("../types/domain").HerbalifeRank | null,
    status: row.status,
    objective: row.objective,
    currentProgram: row.current_program,
    pvProgramId: row.pv_program_id ?? undefined,
    started: row.started,
    startDate: row.start_date ?? undefined,
    nextFollowUp: row.next_follow_up,
    notes: row.notes,
    lifecycleStatus: row.lifecycle_status ?? undefined,
    isFragile: row.is_fragile ?? false,
    lifecycleUpdatedAt: row.lifecycle_updated_at ?? undefined,
    lifecycleUpdatedBy: row.lifecycle_updated_by ?? null,
    freeFollowUp: row.free_follow_up ?? false,
    freePvTracking: row.free_pv_tracking ?? false,
    generalNote: row.general_note ?? row.general_note_deprecated ?? undefined,
    onboardingChecks: row.onboarding_checks ?? undefined,
    publicShareConsent: row.public_share_consent ?? false,
    publicShareConsentAt: row.public_share_consent_at ?? undefined,
    publicShareRevokedAt: row.public_share_revoked_at ?? undefined,
    // Tier B Premium VIP (2026-04-28) : programme client privilégié Herbalife.
    vipHerbalifeId: row.vip_herbalife_id ?? null,
    vipSponsorClientId: row.vip_sponsor_client_id ?? null,
    vipStartedAt: row.vip_started_at ?? null,
    vipStatus: (row.vip_status as Client["vipStatus"]) ?? "none",
    // Lien fiche cliente <-> compte coach/distri (chantier 2026-06-24). Lecture
    // tolérante : si la colonne n'existe pas encore (migration non appliquée),
    // le champ est simplement absent -> null (pas d'erreur, select * ).
    linkedUserId: (row as { linked_user_id?: string | null }).linked_user_id ?? null,
    // Pop-up business bilan (2026-11-03)
    businessCuriosity: (row.business_curiosity as Client["businessCuriosity"]) ?? null,
    businessInterestAmount: row.business_interest_amount ?? null,
    businessInterestDate: row.business_interest_date ?? null,
    businessInterestNote: row.business_interest_note ?? null,
    businessPlanSentAt: row.business_plan_sent_at ?? null,
    assessments: (row.assessments ?? []).map(mapAssessment)
  };
}

function mapFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    dueDate: row.due_date,
    durationMin: row.duration_min ?? undefined,
    notifyClient: row.notify_client ?? undefined,
    type: row.type,
    status: row.status,
    programTitle: row.program_title,
    lastAssessmentDate: row.last_assessment_date
  };
}

function mapPvClientProduct(row: PvClientProductRow): PvClientProductRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    responsibleId: row.responsible_id,
    responsibleName: row.responsible_name,
    programId: row.program_id,
    productId: row.product_id,
    productName: row.product_name,
    quantityStart: row.quantity_start,
    startDate: row.start_date,
    durationReferenceDays: row.duration_reference_days,
    pvPerUnit: row.pv_per_unit,
    pricePublicPerUnit: row.price_public_per_unit,
    quantiteLabel: row.quantite_label,
    noteMetier: row.note_metier ?? undefined,
    active: row.active
  };
}

function mapPvTransaction(row: PvTransactionRow): PvClientTransaction {
  return {
    id: row.id,
    date: row.date,
    clientId: row.client_id,
    clientName: row.client_name,
    responsibleId: row.responsible_id,
    responsibleName: row.responsible_name,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    pv: row.pv,
    price: row.price,
    type: row.type,
    note: row.note
  };
}

function mapActivityLog(row: ActivityLogRow): ActivityLog {
  return {
    id: row.id,
    createdAt: row.created_at,
    action: row.action,
    actorId: row.actor_id,
    actorName: row.actor_name,
    ownerUserId: row.owner_user_id ?? undefined,
    clientId: row.client_id ?? undefined,
    clientName: row.client_name ?? undefined,
    targetUserId: row.target_user_id ?? undefined,
    targetUserName: row.target_user_name ?? undefined,
    summary: row.summary,
    detail: row.detail ?? undefined
  };
}

async function getProfile(userId: string) {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("id", userId)
    .single<UserRow>();

  if (error || !data) {
    return null;
  }

  return mapUser(data);
}

function createSupabaseSession(user: User): AuthSession {
  const base = createMockSession(user);
  return {
    ...base,
    authMode: "supabase",
    accessScope: getRoleScope(user)
  };
}

export async function restoreSupabaseSession() {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.user?.id) {
    return null;
  }

  const user = await getProfile(session.user.id);
  if (!user || !user.active) {
    // Hotfix PWA login client (2026-04-24) : on NE signout PAS ici.
    // Un user auth valide sans profil public.users peut être un client
    // (lié via client_app_accounts.auth_user_id). Signer out casserait
    // sa session Supabase et forcerait un re-login manuel à chaque
    // ouverture de l'app. On retourne juste null → AppContext.currentUser
    // reste null, le ProtectedRoute redirige vers /login si l'user tente
    // d'accéder à une route coach, et la session reste disponible pour
    // les RPC anon token-based de /client/:token.
    return null;
  }

  return {
    user,
    session: createSupabaseSession(user)
  };
}

export async function loginWithSupabaseCredentials(payload: {
  email: string;
  password: string;
}) {
  const client = await requireSupabase();
  const { data, error } = await client.auth.signInWithPassword(payload);

  if (error || !data.user) {
    return {
      ok: false as const,
      error:
        error?.message ??
        "La connexion Supabase a ete refusee. Verifie l'email, le mot de passe et la confirmation du compte."
    };
  }

  const user = await getProfile(data.user.id);

  if (user && user.active) {
    // Coach / admin / referent : profil dans public.users, flow classique.
    await client
      .from("users")
      .update({ last_access_at: new Date().toISOString() })
      .eq("id", user.id);

    return {
      ok: true as const,
      kind: "coach" as const,
      user: { ...user, lastAccessAt: new Date().toISOString() },
      session: createSupabaseSession(user)
    };
  }

  // Hotfix PWA login client (2026-04-24) : l'auth a réussi mais aucun
  // profil coach trouvé. On check si c'est un compte client lié via
  // client_app_accounts.auth_user_id — dans ce cas on renvoie le token
  // magic-link pour rediriger vers /client/:token.
  //
  // ⚠️ Fix 2026-07-28 : la lecture DOIT passer par la RPC SECURITY DEFINER
  // get_my_client_app_token (lit `where auth_user_id = auth.uid()` en bypass
  // RLS). La requête directe échouait pour TOUT client : la seule policy SELECT
  // de client_app_accounts est réservée aux COACHES (is_active_user()), donc un
  // client ne peut pas lire sa propre ligne → data vide → « compte pas lié à un
  // espace », alors que le lien existait bien (cas Virgile Famibelle).
  const { data: clientToken } = await client.rpc("get_my_client_app_token");

  if (clientToken) {
    return {
      ok: true as const,
      kind: "client" as const,
      clientToken: String(clientToken),
      clientId: "",
    };
  }

  // Aucun profil nulle part. Sign out pour éviter une session zombie.
  // `scope: "local"` — voir `logoutFromSupabase` ci-dessous : sans lui, ce
  // nettoyage local déconnecterait la personne de TOUS ses appareils.
  await client.auth.signOut({ scope: "local" });
  if (user && !user.active) {
    return {
      ok: false as const,
      error: "Ton compte est désactivé. Contacte ton parrain ou l'administrateur.",
    };
  }
  return {
    ok: false as const,
    error:
      "Ton compte n'est pas encore lié à un espace. Contacte ton coach pour qu'il te regénère un lien d'accès.",
  };
}

export async function logoutFromSupabase() {
  const client = await requireSupabase();
  // ⚠️ `scope: "local"` — NE PAS RETIRER (22/08).
  //
  // `signOut()` sans argument utilise la portée **globale**, c'est le défaut de
  // la bibliothèque, écrit dans son code :
  //   « By default, signOut() uses the global scope, which signs out all other
  //     sessions that the user is logged into as well. »
  //
  // Autrement dit : se déconnecter sur son téléphone révoquait la session du PC
  // du club et celle de la borne, à la seconde, sans un mot. Personne n'attend
  // ça de « Sortir ».
  //
  // Mesuré le 22/08 : Thomas était le SEUL de l'équipe dont aucune session ne
  // survivait à la journée — 2 sessions, toutes deux du matin — quand celles de
  // Mélanie duraient depuis le 27 juillet et celles d'Alexis depuis le 24 juin.
  // Son PC n'expirait pas : il était révoqué depuis un autre de ses appareils.
  // Il a perdu un bilan client en plein rendez-vous à cause de ça.
  //
  // Une déconnexion ne concerne QUE l'appareil sur lequel on l'a demandée.
  await client.auth.signOut({ scope: "local" });
  // Le cache de fraîcheur garde des données jusqu'à une semaine, et le
  // localStorage survit à la déconnexion : sans ce vidage, le coach suivant
  // qui se connecte sur le même navigateur verrait les chiffres du précédent.
  viderTout();
}

export async function fetchSupabaseUsers() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [] as User[];
  }

  return data.map((row) => mapUser(row as UserRow));
}

/** Les colonnes des bilans SAUF `questionnaire`.
 *
 *  MESURÉ le 2026-08-12 : le démarrage transférait 2,17 Mo de JSON, dont
 *  1,53 Mo pour « tous les clients avec tous leurs bilans ». À elle seule, la
 *  colonne `questionnaire` en pèse 586 Ko — 35 % du total, la suivante fait
 *  55 Ko. Or elle n'est lue que par cinq PAGES (fiche client, suivi, édition
 *  de bilan, panier, portefeuille) : personne n'en a besoin pour afficher une
 *  liste ou le Co-pilote.
 *
 *  ⚠️ Une nouvelle colonne ajoutée à `assessments` doit être ajoutée ICI,
 *  sinon elle ne sera pas chargée au démarrage. C'est volontairement le sens
 *  le plus sûr : on oublie de charger, on ne casse pas.
 */
const COLONNES_BILAN_SANS_QUESTIONNAIRE =
  "id, client_id, date, type, objective, program_id, program_title, summary, notes, next_follow_up, body_scan, pedagogical_focus, created_at, decision_client, type_de_suite, message_a_laisser, coach_notes_draft, coach_notes_initial, water_target_l, protein_target_g, sport_frequency, sport_types, sport_sub_objective, current_intake";

export async function fetchSupabaseClients() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("clients")
    .select(`*, assessments(${COLONNES_BILAN_SANS_QUESTIONNAIRE})`)
    .order("created_at", { ascending: false });

  if (error) {
    // Garde-fou (2026-04-25) : NE JAMAIS swallow silencieusement une erreur
    // sur SELECT clients. Un RLS qui plante (cast ::uuid invalide, policy
    // foireuse, etc.) renvoyait [] sans un mot → app semblait vide pour
    // admin + coach. Désormais on log PARTOUT + on re-throw pour que le
    // catch de refreshRemoteData affiche un toast visible à l'utilisateur.
    console.error("[fetchSupabaseClients] Supabase error", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      `Lecture des clients impossible (Supabase) : ${error.message}${
        error.hint ? " — " + error.hint : ""
      }`,
    );
  }
  if (!data) return [] as Client[];

  return (data as ClientRow[]).map(mapClient);
}

/** Les `questionnaire` seuls, chargés en SECOND — voir le commentaire de
 *  `COLONNES_BILAN_SANS_QUESTIONNAIRE`.
 *
 *  Pourquoi une seconde passe plutôt qu'un chargement à la demande dans les
 *  cinq pages qui en ont besoin : à la demande, chacune devrait gérer son
 *  attente, et une page oubliée afficherait un bilan VIDE sans prévenir. Ici,
 *  l'app démarre sans les 586 Ko, puis les reçoit une seconde plus tard —
 *  bien avant que quiconque ait eu le temps d'ouvrir une fiche client. Aucune
 *  page à modifier, aucun écran qui peut mentir.
 *
 *  ⚠️ PAGINÉ, et ça n'est pas une précaution de style (2026-08-14). PostgREST
 *  plafonne toute requête à `db-max-rows` (1000 par défaut sur Supabase cloud)
 *  et **tronque en SILENCE** : pas d'erreur, pas d'indice dans la réponse. Les
 *  bilans au-delà du plafond resteraient donc sans questionnaire pour toute la
 *  session — cette passe ne tourne qu'au démarrage.
 *
 *  Mesuré le 2026-08-14 : 679 bilans en base, soit sous le plafond ; la
 *  troncature n'avait pas encore commencé. La table ne fait que grandir, et
 *  ici on ne la verrait pas passer.
 *
 *  Le tri est **obligatoire** : sans `order`, Postgres ne garantit aucun ordre
 *  stable entre deux requêtes, donc deux pages successives pourraient répéter
 *  un bilan et en sauter un autre. `id` est la clé primaire — unique et stable.
 */
export async function fetchAssessmentQuestionnaires(): Promise<Map<string, unknown>> {
  const client = await requireSupabase();
  const TAILLE_PAGE = 1000;
  const par = new Map<string, unknown>();

  for (let debut = 0; ; debut += TAILLE_PAGE) {
    const { data, error } = await client
      .from("assessments")
      .select("id, questionnaire")
      .not("questionnaire", "is", null)
      .order("id", { ascending: true })
      .range(debut, debut + TAILLE_PAGE - 1);

    if (error) {
      // Non bloquant : l'app fonctionne sans, seules les 5 pages qui lisent le
      // questionnaire seraient incomplètes. On le dit fort dans la console, et
      // on rend les pages déjà obtenues — mieux vaut une partie que rien.
      console.error(
        `[fetchAssessmentQuestionnaires] échec à partir du bilan n°${debut} — ${par.size} questionnaires chargés, les fiches au-delà seront incomplètes`,
        error,
      );
      return par;
    }

    const lignes = (data ?? []) as Array<{ id: string; questionnaire: unknown }>;
    for (const ligne of lignes) {
      par.set(ligne.id, ligne.questionnaire);
    }

    // Une page incomplète = la dernière. Une page pleine peut être la dernière
    // aussi (total multiple de 1000) : le tour suivant revient vide et sort.
    if (lignes.length < TAILLE_PAGE) return par;
  }
}

export async function fetchSupabaseFollowUps() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("follow_ups")
    .select("*")
    .order("due_date", { ascending: true });

  if (error || !data) {
    return [] as FollowUp[];
  }

  return (data as FollowUpRow[]).map(mapFollowUp);
}

export async function fetchSupabasePvClientProducts() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_client_products")
    .select("*")
    .eq("active", true)
    .order("start_date", { ascending: false });

  if (error || !data) {
    // Les deux branches d'avant renvoyaient [] : le `if` ne servait a rien et
    // l'echec disparaissait sans laisser de trace. On rend toujours une liste
    // vide (l'app doit continuer de s'afficher), mais on l'ECRIT dans la
    // console avec le code SQLSTATE — sinon un refus de droits ressemble a
    // « ce coach n'a aucun produit actif », ce qui est indiscernable.
    if (error) {
      console.warn("[pv_client_products] lecture refusee :", error.code, error.message);
    }
    return [] as PvClientProductRecord[];
  }

  return (data as PvClientProductRow[]).map(mapPvClientProduct);
}

export async function fetchSupabasePvTransactions() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_transactions")
    .select("*")
    .order("date", { ascending: false });

  if (error || !data) {
    // Meme remarque que pour pv_client_products ci-dessus : liste vide pour ne
    // pas casser l'affichage, mais l'echec est trace.
    if (error) {
      console.warn("[pv_transactions] lecture refusee :", error.code, error.message);
    }
    return [] as PvClientTransaction[];
  }

  return (data as PvTransactionRow[]).map(mapPvTransaction);
}

export async function fetchSupabaseActivityLogs() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("activity_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    if (tableAbsente(error)) {
      return [] as ActivityLog[];
    }

    throw error;
  }

  return (data as ActivityLogRow[] | null)?.map(mapActivityLog) ?? [];
}

export async function createSupabaseClientWithInitialAssessment(payload: {
  client: Omit<Client, "id" | "status" | "currentProgram" | "started" | "startDate" | "nextFollowUp" | "notes" | "assessments">;
  assessment: AssessmentRecord;
  clientStatus: Client["status"];
  currentProgram: string;
  pvProgramId?: string;
  started: boolean;
  nextFollowUp: string;
  followUpType: string;
  followUpStatus: FollowUp["status"];
  notes: string;
  afterAssessmentAction?: "started" | "pending";
  // Sujet C — étape 13 "Suivi libre" : si true, client créé avec free_follow_up=true
  // ET aucun follow-up auto n'est inséré. La colonne next_follow_up reste posée
  // (elle est NOT NULL dans le schema) mais sera masquée côté UI.
  freeFollowUp?: boolean;
}) {
  const client = await requireSupabase();

  // ─── Lifecycle (Matrice B) ──────────────────────────────────────────
  const { lifecycleStatus, isFragile } = deriveLifecycleFromAssessment({
    decisionClient: payload.assessment.decisionClient ?? null,
    afterAssessmentAction:
      payload.afterAssessmentAction ?? (payload.started ? "started" : "pending"),
  });

  const clientInsertPayload = {
      first_name: payload.client.firstName,
      last_name: payload.client.lastName,
      sex: payload.client.sex,
      phone: payload.client.phone,
      email: payload.client.email,
      age: payload.client.age,
      birth_date: payload.client.birthDate ?? null,
      height: payload.client.height,
      job: payload.client.job,
      city: payload.client.city ?? null,
      distributor_id: payload.client.distributorId,
      distributor_name: payload.client.distributorName,
      status: payload.clientStatus,
      objective: payload.client.objective,
      current_program: payload.currentProgram,
      pv_program_id: payload.pvProgramId ?? null,
      started: payload.started,
      start_date: payload.started ? payload.assessment.date : null,
      next_follow_up: payload.nextFollowUp,
      notes: payload.notes,
      lifecycle_status: lifecycleStatus,
      is_fragile: isFragile,
      free_follow_up: payload.freeFollowUp ?? false
    };
  let { data: insertedClient, error: clientError } = await client
    .from("clients")
    .insert(clientInsertPayload)
    .select("id")
    .single<{ id: string }>();

  if (clientError && isMissingColumnError(clientError, "pv_program_id")) {
    ({ data: insertedClient, error: clientError } = await client
      .from("clients")
      .insert({
        ...clientInsertPayload,
        pv_program_id: undefined
      })
      .select("id")
      .single<{ id: string }>());
  }

  // Fallback : migration lifecycle pas encore exécutée → retry sans ces champs
  if (
    clientError &&
    (isMissingColumnError(clientError, "lifecycle_status") ||
      isMissingColumnError(clientError, "is_fragile"))
  ) {
    const { lifecycle_status: _ls, is_fragile: _if, ...withoutLifecycle } = clientInsertPayload;
    void _ls; void _if;
    ({ data: insertedClient, error: clientError } = await client
      .from("clients")
      .insert(withoutLifecycle)
      .select("id")
      .single<{ id: string }>());
  }

  // Fallback : migration free_follow_up pas encore exécutée → retry sans ce champ
  if (clientError && isMissingColumnError(clientError, "free_follow_up")) {
    const { free_follow_up: _ff, ...withoutFreeFollow } = clientInsertPayload;
    void _ff;
    ({ data: insertedClient, error: clientError } = await client
      .from("clients")
      .insert(withoutFreeFollow)
      .select("id")
      .single<{ id: string }>());
  }

  if (clientError || !insertedClient) {
    console.error("Supabase client insert error:", clientError);
    throw new Error(`Impossible de créer le client : ${clientError?.message ?? 'réponse vide'}`);
  }

  const clientId = insertedClient.id;

  const assessmentInsertPayload = {
    id: payload.assessment.id,
    client_id: clientId,
    date: payload.assessment.date,
    type: payload.assessment.type,
    objective: payload.assessment.objective,
    program_id: payload.assessment.programId ?? null,
    program_title: payload.assessment.programTitle,
    summary: payload.assessment.summary,
    notes: payload.assessment.notes,
    next_follow_up: payload.assessment.nextFollowUp ?? null,
    body_scan: payload.assessment.bodyScan,
    questionnaire: payload.assessment.questionnaire,
    pedagogical_focus: payload.assessment.pedagogicalFocus,
    decision_client: payload.assessment.decisionClient ?? null,
    type_de_suite: payload.assessment.typeDeSuite ?? null,
    message_a_laisser: payload.assessment.messageALaisser ?? null,
    // Chantier Polish Vue complète (2026-04-24)
    coach_notes_draft: payload.assessment.coachNotesDraft ?? null,
    coach_notes_initial: payload.assessment.coachNotesInitial ?? null,
    // Chantier Recommandations nutri (2026-04-25) : persister eau +
    // protéines cible au moment du bilan. Migration 20260425220000
    // rendue ces 2 colonnes disponibles. Fallback si encore absente.
    water_target_l: computeWaterTargetSafe(payload.assessment.bodyScan?.weight),
    protein_target_g: computeProteinTargetSafe(
      payload.assessment.bodyScan?.weight,
      payload.assessment.objective,
    ),
  };
  let { error: assessmentError } = await client.from("assessments").insert(assessmentInsertPayload);

  // Fallback : colonnes étape 13 pas encore présentes → retry sans
  if (
    assessmentError &&
    (isMissingColumnError(assessmentError, "decision_client") ||
      isMissingColumnError(assessmentError, "type_de_suite") ||
      isMissingColumnError(assessmentError, "message_a_laisser"))
  ) {
    const { decision_client: _dc, type_de_suite: _ts, message_a_laisser: _ma, ...withoutStep13 } = assessmentInsertPayload;
    void _dc; void _ts; void _ma;
    ({ error: assessmentError } = await client.from("assessments").insert(withoutStep13));
  }

  // Fallback : colonnes coach_notes_* pas encore présentes → retry sans
  if (
    assessmentError &&
    (isMissingColumnError(assessmentError, "coach_notes_draft") ||
      isMissingColumnError(assessmentError, "coach_notes_initial"))
  ) {
    const { coach_notes_draft: _cd, coach_notes_initial: _ci, ...withoutNotes } = assessmentInsertPayload;
    void _cd; void _ci;
    ({ error: assessmentError } = await client.from("assessments").insert(withoutNotes));
  }

  // Fallback : colonnes water_target_l / protein_target_g pas encore
  // présentes (migration 20260425220000 pas déployée) → retry sans.
  if (
    assessmentError &&
    (isMissingColumnError(assessmentError, "water_target_l") ||
      isMissingColumnError(assessmentError, "protein_target_g"))
  ) {
    const { water_target_l: _wt, protein_target_g: _pt, ...withoutNutriTargets } = assessmentInsertPayload;
    void _wt; void _pt;
    ({ error: assessmentError } = await client.from("assessments").insert(withoutNutriTargets));
  }

  if (assessmentError) {
    console.error("Supabase assessment insert error:", assessmentError);
    throw new Error(`Impossible d'enregistrer le bilan : ${assessmentError.message}`);
  }

  // Sujet C : si suivi libre → on ne crée AUCUN follow-up auto. Le client est
  // actif mais hors agenda. Le coach pourra créer un RDV manuel plus tard
  // depuis la fiche (ce qui nécessitera de désactiver le suivi libre d'abord).
  if (!payload.freeFollowUp) {
    // Chantier simplification fin de bilan (2026-07-30, demande Thomas) :
    // au bilan initial, la date de RDV est encore un défaut auto-rempli, pas
    // un vrai créneau confirmé avec le client — on crée donc ce follow_up en
    // SILENCE (notify_client: false). Aucun email de confirmation ni de
    // rappel J-1 ne part tant que le coach n'a pas confirmé le VRAI RDV
    // depuis la fiche client (Actions > Modifier le rendez-vous), qui écrit
    // alors notify_client explicitement (cf. EditScheduleModal).
    const { error: followUpError } = await client.from("follow_ups").insert({
      client_id: clientId,
      client_name: `${payload.client.firstName} ${payload.client.lastName}`,
      due_date: payload.nextFollowUp,
      type: payload.followUpType,
      status: payload.followUpStatus,
      program_title: payload.currentProgram || payload.assessment.programTitle,
      last_assessment_date: payload.assessment.date,
      notify_client: false
    });

    if (followUpError) {
      throw new Error("Impossible de creer le premier suivi.");
    }
  }

  // Regle metier (Thomas, 2026-07-16) : on seede des que le client demarre OU
  // qu'il repart avec des produits retenus. Avant, la garde etait
  // `started && currentProgram` : un client "À l'unité" (currentProgram = ""
  // a cause du bug de resolution) n'avait JAMAIS ses produits crees, meme
  // avec F1 + PDM au ticket (cas Aline) -> Co-pilote "sans programme", PV et
  // rentabilite a zero.
  // Le garde-fou anti-fantomes n'est plus ici mais dans le catalogue PV :
  // "À l'unité" a une routine VIDE, donc un client sans produit retenu ne peut
  // pas se voir injecter la routine d'un programme qu'il n'a pas pris.
  const hasSelectedProducts =
    (payload.assessment.questionnaire.selectedProductIds ?? []).length > 0;
  const seedProducts = (payload.started || hasSelectedProducts) && payload.currentProgram
    ? buildSeedPvProducts({
        clientId,
        distributorId: payload.client.distributorId,
        distributorName: payload.client.distributorName,
        programTitle: payload.currentProgram,
        startDate: payload.assessment.date,
        selectedProductIds: payload.assessment.questionnaire.selectedProductIds,
        selectedProductQuantities: payload.assessment.questionnaire.selectedProductQuantities,
      })
    : [];

  if (seedProducts.length) {
    const { error: pvSeedError } = await client.from("pv_client_products").insert(seedProducts);
    // ⚠️ On ne tolere le silence QUE si la table n'existe pas. Avant le 21/08 la
    // condition testait « le message contient pv_client_products » : un refus de
    // droits (session expirée) ou un refus RLS passait donc pour une absence de
    // table et etait AVALE. La fiche se creait sans ses produits, sans un mot —
    // exactement la perte silencieuse que CLAUDE.md interdit sur cette table.
    if (pvSeedError && !tableAbsente(pvSeedError)) {
      console.error("[pv_client_products] socle non cree :", pvSeedError.code, pvSeedError.message);
      throw new Error(
        messageErreurEcriturePv(pvSeedError) ??
          `Le client a ete cree, mais pas le socle de suivi PV : ${pvSeedError.message}`,
      );
    }
  }

  return clientId;
}

export async function addSupabaseFollowUpAssessment(
  clientId: string,
  assessment: AssessmentRecord,
  followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
) {
  const client = await requireSupabase();
  const pvProgram = resolvePvProgram(assessment.programTitle);

  const { error: assessmentError } = await client.from("assessments").insert({
    id: assessment.id,
    client_id: clientId,
    date: assessment.date,
    type: assessment.type,
    objective: assessment.objective,
    program_id: assessment.programId ?? null,
    program_title: assessment.programTitle,
    summary: assessment.summary,
    notes: assessment.notes,
    next_follow_up: assessment.nextFollowUp ?? null,
    body_scan: assessment.bodyScan,
    questionnaire: assessment.questionnaire,
    pedagogical_focus: assessment.pedagogicalFocus
  });

  if (assessmentError) {
    throw new Error("Impossible d'ajouter ce suivi.");
  }

  let { error: clientError } = await client
    .from("clients")
    .update({
      current_program: assessment.programTitle,
      pv_program_id: pvProgram.id,
      next_follow_up: followUpMeta.dueDate,
      status: "follow-up"
    })
    .eq("id", clientId);

  if (clientError && isMissingColumnError(clientError, "pv_program_id")) {
    ({ error: clientError } = await client
      .from("clients")
      .update({
        current_program: assessment.programTitle,
        next_follow_up: followUpMeta.dueDate,
        status: "follow-up"
      })
      .eq("id", clientId));
  }

  if (clientError) {
    throw new Error("Impossible de mettre a jour le dossier client.");
  }

  const { error: followUpError } = await client.from("follow_ups").upsert(
    {
      client_id: clientId,
      due_date: followUpMeta.dueDate,
      type: followUpMeta.type,
      status: followUpMeta.status,
      program_title: assessment.programTitle,
      last_assessment_date: assessment.date
    },
    { onConflict: "client_id" }
  );

  if (followUpError) {
    throw new Error("Impossible de mettre a jour le suivi.");
  }
}

export async function upsertSupabasePvClientProduct(product: PvClientProductRecord) {
  const client = await requireSupabase();
  const payload = {
    client_id: product.clientId,
    responsible_id: product.responsibleId,
    responsible_name: product.responsibleName,
    program_id: product.programId,
    product_id: product.productId,
    product_name: product.productName,
    quantity_start: product.quantityStart,
    start_date: product.startDate,
    duration_reference_days: product.durationReferenceDays,
    pv_per_unit: product.pvPerUnit,
    price_public_per_unit: product.pricePublicPerUnit,
    quantite_label: product.quantiteLabel,
    note_metier: product.noteMetier ?? null,
    active: product.active
  };

  const { data, error } = await client
    .from("pv_client_products")
    .upsert(payload, { onConflict: "client_id,product_id" })
    .select("*")
    .single<PvClientProductRow>();

  if (error || !data) {
    // ⚠️ `.upsert()` = INSERT ... ON CONFLICT DO UPDATE cote PostgREST : il
    // exige INSERT **et** UPDATE. Une requete partie sans session tombe donc
    // ici avec 42501, meme quand aucune ligne n'existait a mettre a jour.
    console.error("[pv_client_products] ecriture refusee :", error?.code, error?.message);
    throw new Error(
      messageErreurEcriturePv(error) ??
        error?.message ??
        "Impossible de mettre a jour ce produit actif dans le suivi PV."
    );
  }

  return mapPvClientProduct(data);
}

/**
 * Vente rapide hors-app (chantier Panier → Rentabilité 2026-06-15).
 *
 * Crée un client léger (non-app, non-VIP) + enregistre les produits du panier
 * comme ventes (pv_client_products) → remontent AUTOMATIQUEMENT dans la
 * rentabilité (marge directe + nombre de clients) via la même RPC que les
 * ventes du bilan. AUCUNE logique de calcul PV/paliers touchée : on écrit juste
 * des lignes pv_client_products standard (prix + PV catalogue).
 *
 * Champs obligatoires du schéma `clients` couverts avec des valeurs sûres ;
 * `sex` est NOT NULL CHECK (female|male) sans défaut → 'female' par défaut
 * (invisible pour un client de vente rapide, pas de body-scan).
 */
export async function recordQuickSale(payload: {
  clientName: string;
  distributorId: string;
  distributorName: string;
  lines: { id: string; name: string; price: number; pv: number; quantity: number }[];
  /** Date de la commande (YYYY-MM-DD). Défaut = aujourd'hui. Permet de saisir
   *  une vente rétroactive (ex. clôturer les commandes du mois précédent). */
  saleDate?: string;
}): Promise<{ clientId: string }> {
  const client = await requireSupabase();
  const today = (payload.saleDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.saleDate))
    ? payload.saleDate
    : new Date().toISOString().slice(0, 10);
  const nextFollowUp = new Date(Date.now() + 21 * 24 * 3600 * 1000).toISOString();
  const rawName = payload.clientName.trim();
  const name = rawName || "Client direct";

  // ── Anti-doublon (2026-06-15) : si une vente existe déjà pour ce MÊME nom
  // chez ce distributeur, on RÉUTILISE le client (pas de 2e ligne au même nom)
  // et on ADDITIONNE les quantités produit. On ne dédoublonne QUE si un vrai
  // nom est fourni (sinon deux "Client direct" anonymes fusionneraient à tort).
  let clientId: string | null = null;
  if (rawName) {
    const { data: existing } = await client
      .from("clients")
      .select("id")
      .eq("distributor_id", payload.distributorId)
      .ilike("first_name", rawName)
      .limit(1)
      .maybeSingle();
    if (existing?.id) clientId = existing.id as string;
  }

  if (!clientId) {
    const { data: inserted, error } = await client
      .from("clients")
      .insert({
        first_name: name,
        last_name: "",
        sex: "female",
        distributor_id: payload.distributorId,
        distributor_name: payload.distributorName,
        status: "active",
        objective: "weight-loss",
        started: true,
        start_date: today,
        next_follow_up: nextFollowUp,
      })
      .select("id")
      .single<{ id: string }>();
    if (error || !inserted) {
      throw new Error(`Création du client impossible : ${error?.message ?? "réponse vide"}`);
    }
    clientId = inserted.id;
  }

  // Produits déjà enregistrés pour ce client (pour additionner les quantités).
  const { data: existingProds } = await client
    .from("pv_client_products")
    .select("id, product_id, quantity_start")
    .eq("client_id", clientId);
  const byProduct = new Map<string, { id: string; quantity_start: number }>();
  for (const p of existingProds ?? []) {
    byProduct.set(p.product_id as string, {
      id: p.id as string,
      quantity_start: Number(p.quantity_start) || 0,
    });
  }

  const toInsert: Record<string, unknown>[] = [];
  for (const l of payload.lines.filter((l) => l.quantity > 0)) {
    const qty = Math.max(1, Math.round(l.quantity));
    const existing = byProduct.get(l.id);
    if (existing) {
      // Même produit déjà pris ce mois → on additionne (rachat).
      const { error: upErr } = await client
        .from("pv_client_products")
        .update({
          quantity_start: existing.quantity_start + qty,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (upErr) console.warn("[recordQuickSale] update qty:", upErr.message);
    } else {
      toInsert.push({
        client_id: clientId,
        responsible_id: payload.distributorId,
        responsible_name: payload.distributorName,
        program_id: "custom",
        product_id: l.id,
        product_name: l.name,
        quantity_start: qty,
        start_date: today,
        pv_per_unit: l.pv,
        price_public_per_unit: l.price,
        active: true,
      });
    }
  }

  if (toInsert.length > 0) {
    const { error: pErr } = await client.from("pv_client_products").insert(toInsert);
    if (pErr) {
      console.error("[pv_client_products] insertion refusee :", pErr.code, pErr.message);
      throw new Error(
        messageErreurEcriturePv(pErr) ?? `Enregistrement des produits impossible : ${pErr.message}`,
      );
    }
  }

  return { clientId };
}

// ─── Ventes comptoir / conso (chantier « panier conso » 2026-07-10) ───────────
// Répertoire de commandes SANS fiche client (table consumption_orders). Remplace
// le mode « Client direct » qui créait une fiche fantôme. Écriture via RPC
// SECURITY DEFINER (totaux recalculés serveur). Cf. migration 20261205080000.
export interface ConsumptionOrderLine {
  product_id: string;
  name: string;
  quantity: number;
  pv_per_unit: number;
  price_per_unit: number;
}
export interface ConsumptionOrder {
  id: string;
  distributorId: string;
  distributorName: string | null;
  customerLabel: string | null;
  saleDate: string; // YYYY-MM-DD
  saleType: "comptoir" | "commande";
  lines: ConsumptionOrderLine[];
  totalPrice: number;
  totalPv: number;
  note: string | null;
  createdAt: string;
}

function mapConsumptionOrder(r: Record<string, unknown>): ConsumptionOrder {
  return {
    id: r.id as string,
    distributorId: r.distributor_id as string,
    distributorName: (r.distributor_name as string | null) ?? null,
    customerLabel: (r.customer_label as string | null) ?? null,
    saleDate: r.sale_date as string,
    saleType: (r.sale_type as "comptoir" | "commande") ?? "comptoir",
    lines: Array.isArray(r.lines) ? (r.lines as ConsumptionOrderLine[]) : [],
    totalPrice: Number(r.total_price) || 0,
    totalPv: Number(r.total_pv) || 0,
    note: (r.note as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function recordConsumptionOrder(payload: {
  distributorId?: string | null;
  customerLabel?: string | null;
  saleDate?: string; // YYYY-MM-DD
  saleType?: "comptoir" | "commande";
  lines: ConsumptionOrderLine[];
  note?: string | null;
}): Promise<string> {
  const client = await requireSupabase();
  const { data, error } = await client.rpc("record_consumption_order", {
    p_distributor_id: payload.distributorId ?? null,
    p_customer_label: payload.customerLabel ?? null,
    p_sale_date: payload.saleDate ?? null,
    p_sale_type: payload.saleType ?? "comptoir",
    p_lines: payload.lines,
    p_note: payload.note ?? null,
  });
  if (error) {
    console.error("[record_consumption_order] refusee :", error.code, error.message);
    throw new Error(messageSessionExpiree(error) ?? error.message);
  }
  return data as string;
}

/** Liste les ventes comptoir (RLS : les siennes, ou toutes si admin). Filtre
 *  mois optionnel (YYYY-MM) sur sale_date. */
export async function listConsumptionOrders(params: {
  distributorId?: string | null;
  monthIso?: string;
} = {}): Promise<ConsumptionOrder[]> {
  const client = await requireSupabase();
  let q = client
    .from("consumption_orders")
    .select("*")
    .order("sale_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (params.distributorId) q = q.eq("distributor_id", params.distributorId);
  if (params.monthIso && /^\d{4}-\d{2}$/.test(params.monthIso)) {
    const [y, m] = params.monthIso.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    q = q
      .gte("sale_date", `${params.monthIso}-01`)
      .lte("sale_date", `${params.monthIso}-${String(lastDay).padStart(2, "0")}`);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => mapConsumptionOrder(r as Record<string, unknown>));
}

export async function deleteConsumptionOrder(id: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("delete_consumption_order", { p_id: id });
  if (error) throw new Error(error.message);
}

/**
 * Édition d'une vente depuis Rentabilité → Analyse détaillée (crayon ✏️).
 * Réconcilie le client + ses produits avec l'état désiré :
 *   - renomme le client (corrige un nom oublié),
 *   - met à jour les quantités (valeur directe, pas additive — on édite),
 *   - ajoute les nouveaux produits,
 *   - supprime les lignes retirées.
 * Ici quantity = valeur exacte voulue (contrairement à recordQuickSale qui
 * additionne lors d'une nouvelle commande).
 */
export async function updateQuickSale(payload: {
  clientId: string;
  clientName: string;
  distributorId: string;
  distributorName: string;
  lines: { id: string; name: string; price: number; pv: number; quantity: number }[];
}): Promise<void> {
  const client = await requireSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const name = payload.clientName.trim() || "Client direct";

  const { error: nameErr } = await client
    .from("clients")
    .update({ first_name: name })
    .eq("id", payload.clientId);
  if (nameErr) throw new Error(`Renommage impossible : ${nameErr.message}`);

  // Owner des nouvelles lignes = le distributeur DU CLIENT (pas celui qui édite,
  // pour qu'un admin corrigeant la vente d'un membre garde le bon responsable).
  const { data: clientRow } = await client
    .from("clients")
    .select("distributor_id, distributor_name")
    .eq("id", payload.clientId)
    .maybeSingle();
  const respId = (clientRow?.distributor_id as string) || payload.distributorId;
  const respName = (clientRow?.distributor_name as string) || payload.distributorName;

  const { data: existingProds } = await client
    .from("pv_client_products")
    .select("id, product_id")
    .eq("client_id", payload.clientId);
  const existingByProduct = new Map<string, string>();
  for (const p of existingProds ?? []) existingByProduct.set(p.product_id as string, p.id as string);

  const desired = payload.lines.filter((l) => l.quantity > 0);
  const desiredIds = new Set(desired.map((l) => l.id));

  // Supprime les lignes retirées.
  for (const [productId, id] of existingByProduct) {
    if (!desiredIds.has(productId)) {
      const { error: delErr } = await client.from("pv_client_products").delete().eq("id", id);
      if (delErr) console.warn("[updateQuickSale] delete:", delErr.message);
    }
  }

  // Met à jour / insère les lignes désirées.
  const toInsert: Record<string, unknown>[] = [];
  for (const l of desired) {
    const qty = Math.max(1, Math.round(l.quantity));
    const existingId = existingByProduct.get(l.id);
    if (existingId) {
      const { error: upErr } = await client
        .from("pv_client_products")
        .update({
          quantity_start: qty,
          price_public_per_unit: l.price,
          pv_per_unit: l.pv,
          product_name: l.name,
          active: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingId);
      if (upErr) console.warn("[updateQuickSale] update:", upErr.message);
    } else {
      toInsert.push({
        client_id: payload.clientId,
        responsible_id: respId,
        responsible_name: respName,
        program_id: "custom",
        product_id: l.id,
        product_name: l.name,
        quantity_start: qty,
        start_date: today,
        pv_per_unit: l.pv,
        price_public_per_unit: l.price,
        active: true,
      });
    }
  }
  if (toInsert.length > 0) {
    const { error: insErr } = await client.from("pv_client_products").insert(toInsert);
    if (insErr) throw new Error(`Ajout produit impossible : ${insErr.message}`);
  }
}

/**
 * Corrige la date de démarrage d'UN produit actif (fiche Suivi PV).
 * Cas d'usage : erreur de saisie du délai de réception à la commande
 * (ex: "aujourd'hui" au lieu de "+3 jours"). Cible la ligne par son id
 * `pv_client_products.id` (= PvProductUsage.recordId), donc n'impacte que
 * ce produit (contrairement à activateSupabaseClientProgram qui reset tout).
 * @param recordId   pv_client_products.id
 * @param startDateIso  YYYY-MM-DD
 */
/**
 * Lie (ou délie) une fiche cliente à un compte coach/distri (chantier
 * 2026-06-24). userId null = retire le lien. Si la colonne linked_user_id
 * n'existe pas encore (migration non appliquée), Supabase renvoie une erreur
 * explicite "column ... does not exist" -> remontée au front pour un toast clair.
 */
export async function setSupabaseClientLinkedUser(
  clientId: string,
  userId: string | null,
): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client
    .from("clients")
    .update({ linked_user_id: userId })
    .eq("id", clientId);
  if (error) {
    throw new Error(
      /linked_user_id/.test(error.message)
        ? "La colonne linked_user_id n'existe pas encore — applique la migration Supabase."
        : error.message,
    );
  }
}

export async function updateSupabasePvClientProductStartDate(
  recordId: string,
  startDateIso: string,
): Promise<PvClientProductRecord> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_client_products")
    .update({ start_date: startDateIso })
    .eq("id", recordId)
    .select("*")
    .single<PvClientProductRow>();

  if (error || !data) {
    console.error("[pv_client_products] date de demarrage refusee :", error?.code, error?.message);
    throw new Error(
      messageErreurEcriturePv(error) ??
        error?.message ??
        "Impossible de mettre à jour la date de démarrage du produit.",
    );
  }

  return mapPvClientProduct(data);
}

export async function addSupabasePvTransaction(transaction: PvClientTransaction) {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_transactions")
    .insert({
      date: transaction.date,
      client_id: transaction.clientId,
      client_name: transaction.clientName,
      responsible_id: transaction.responsibleId,
      responsible_name: transaction.responsibleName,
      product_id: transaction.productId,
      product_name: transaction.productName,
      quantity: transaction.quantity,
      pv: transaction.pv,
      price: transaction.price,
      type: transaction.type,
      note: transaction.note
    })
    .select("*")
    .single<PvTransactionRow>();

  if (error || !data) {
    console.error("[pv_transactions] ecriture refusee :", error?.code, error?.message);
    throw new Error(
      messageErreurEcriturePv(error) ??
        error?.message ??
        "Impossible d'ajouter ce mouvement produit."
    );
  }

  return mapPvTransaction(data);
}

/**
 * Le bilan tel qu'il est EN BASE, relu entier.
 *
 * À utiliser avant tout `updateSupabaseAssessment` qui ne veut changer qu'un
 * champ : l'API réécrit TOUTES les colonnes du bilan, donc ce qu'on ne lui
 * redonne pas est effacé (body scan, produits retenus…).
 *
 * Et relire ici n'est pas un excès de prudence : `fetchSupabaseClients` charge
 * les bilans SANS leur `questionnaire` (cf. `COLONNES_BILAN_SANS_QUESTIONNAIRE`),
 * hydraté une seconde plus tard par une 2ᵉ passe. Un appelant qui partirait de
 * `client.assessments` en mémoire pourrait donc renvoyer un questionnaire vide.
 *
 * Le filtre porte sur les DEUX clés : un id de bilan qui n'appartient pas à ce
 * client renvoie `null`, jamais le bilan d'un autre.
 */
export async function fetchSupabaseAssessment(
  clientId: string,
  assessmentId: string
): Promise<AssessmentRecord | null> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("assessments")
    .select(`${COLONNES_BILAN_SANS_QUESTIONNAIRE}, questionnaire`)
    .eq("id", assessmentId)
    .eq("client_id", clientId)
    .maybeSingle<AssessmentRow>();

  if (error) {
    throw new Error(`Lecture du bilan impossible : ${error.message}`);
  }

  return data ? mapAssessment(data) : null;
}

/**
 * Modifie un bilan — le SEUL chemin possible. `assessments` n'a aucune policy
 * UPDATE (schema.sql : select / insert / delete uniquement), donc un `update`
 * depuis le navigateur ne remonte pas d'erreur : il ne touche simplement aucune
 * ligne, en silence. L'écriture passe par `/api/update-assessment`
 * (service_role, avec contrôle de session et de propriété côté serveur).
 *
 * ⚠️ L'API réécrit toutes les colonnes du bilan : lui redonner le bilan ENTIER,
 * relu via `fetchSupabaseAssessment`, jamais un payload partiel.
 *
 * `syncClientFromInitial: false` pour un changement qui ne re-déclare pas le
 * programme (cf. le commentaire côté API) : sans ça, éditer un détail d'un bilan
 * initial ferait régresser le programme et le statut de la fiche client.
 */
export async function updateSupabaseAssessment(
  clientId: string,
  assessment: AssessmentRecord,
  options?: { syncClientFromInitial?: boolean }
) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error("La session est introuvable. Reconnecte-toi puis recommence.");
  }

  const response = await fetch("/api/update-assessment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      clientId,
      assessment,
      syncClientFromInitial: options?.syncClientFromInitial !== false
    })
  });

  const result = await readApiResult<{ ok: boolean; error?: string }>(response);
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de modifier ce bilan.");
  }
}

export async function updateSupabaseClientSchedule(
  clientId: string,
  payload: {
    nextFollowUp: string;
    followUpId?: string;
    followUpType?: string;
    followUpStatus?: FollowUp["status"];
    /** false = modifier le RDV en silence (aucune notif client). Défaut true. */
    notifyClient?: boolean;
  }
) {
  const client = await requireSupabase();
  const clientUpdatePayload = { next_follow_up: payload.nextFollowUp };
  const followUpUpdatePayload = {
    due_date: payload.nextFollowUp,
    ...(payload.followUpType ? { type: payload.followUpType } : {}),
    ...(payload.followUpStatus ? { status: payload.followUpStatus } : {}),
    ...(payload.notifyClient === undefined ? {} : { notify_client: payload.notifyClient })
  };

  const { error: directClientError } = await client
    .from("clients")
    .update(clientUpdatePayload)
    .eq("id", clientId);

  let directFollowUpError = null as { message?: string } | null;

  if (!directClientError) {
    let followUpQuery = client.from("follow_ups").update(followUpUpdatePayload);
    followUpQuery = payload.followUpId
      ? followUpQuery.eq("id", payload.followUpId)
      : followUpQuery.eq("client_id", clientId);

    const { error } = await followUpQuery;
    directFollowUpError = error;
  }

  if (!directClientError && !directFollowUpError) {
    const [{ data: clientRow }, { data: followUpRow }] = await Promise.all([
      client
        .from("clients")
        .select("next_follow_up")
        .eq("id", clientId)
        .maybeSingle<{ next_follow_up: string }>(),
      client
        .from("follow_ups")
        .select("due_date")
        .eq("client_id", clientId)
        .maybeSingle<{ due_date: string }>()
    ]);

    const persistedClientDate = clientRow?.next_follow_up;
    const persistedFollowUpDate = followUpRow?.due_date;
    const schedulePreserved =
      hasStoredTime(persistedClientDate) || hasStoredTime(persistedFollowUpDate);

    if (!schedulePreserved) {
      throw new Error(
        "La base enregistre encore le rendez-vous sans heure. Il faut appliquer la migration Supabase des colonnes de planning en timestamptz."
      );
    }

    return;
  }

  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error(
      directClientError?.message ??
        directFollowUpError?.message ??
        "La session est introuvable. Reconnecte-toi puis recommence."
    );
  }

  const response = await fetch("/api/update-client-schedule", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ clientId, ...payload })
  });

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !result.ok) {
    throw new Error(
      result.error ??
        directClientError?.message ??
        directFollowUpError?.message ??
        "Impossible de modifier ce rendez-vous."
    );
  }
}

export async function createSupabaseActivityLog(log: ActivityLog) {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("activity_logs")
    .insert({
      action: log.action,
      actor_id: log.actorId,
      actor_name: log.actorName,
      owner_user_id: log.ownerUserId ?? null,
      client_id: log.clientId ?? null,
      client_name: log.clientName ?? null,
      target_user_id: log.targetUserId ?? null,
      target_user_name: log.targetUserName ?? null,
      summary: log.summary,
      detail: log.detail ?? null
    })
    .select("*")
    .single<ActivityLogRow>();

  if (error || !data) {
    if (tableAbsente(error)) {
      throw new Error(
        "La table activity_logs n'existe pas encore sur Supabase. Lance la migration equipe pour activer l'historique."
      );
    }

    throw new Error(
      messageSessionExpiree(error) ?? error?.message ?? "Impossible d'enregistrer cette action.",
    );
  }

  return mapActivityLog(data);
}

export async function reassignSupabaseClientOwner(clientId: string, distributorId: string) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error("La session est introuvable. Reconnecte-toi puis recommence.");
  }

  const response = await fetch("/api/reassign-client-owner", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ clientId, distributorId })
  });

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de reattribuer ce dossier.");
  }
}

export async function deleteSupabaseClient(clientId: string) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error("La session admin est introuvable. Reconnecte-toi puis recommence.");
  }

  const response = await fetch("/api/admin-delete-client", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ clientId })
  });

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de supprimer ce dossier client.");
  }
}

export async function createSupabaseUserAccess(payload: {
  name: string;
  email: string;
  role: User["role"];
  sponsorId?: string;
  active: boolean;
  mockPassword: string;
}) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return {
      ok: false as const,
      error: "La session admin est introuvable. Reconnecte-toi puis recommence."
    };
  }

  const response = await fetch("/api/admin-create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  const result = await readApiResult<{ ok: boolean; error?: string }>(response);
  const teamHierarchyError = getTeamHierarchySetupError(result);

  if (teamHierarchyError) {
    return { ok: false as const, error: teamHierarchyError };
  }

  return result;
}

export async function updateSupabaseUserAccess(
  userId: string,
  payload: {
    role: User["role"];
    sponsorId?: string;
  }
) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error("La session admin est introuvable. Reconnecte-toi puis recommence.");
  }

  const response = await fetch("/api/admin-update-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      userId,
      role: payload.role,
      // Fix Thomas (2026-04-30) : referent peut aussi avoir un sponsor (chaine
      // Herbalife). Avant : seulement les distributeurs. Resultat : passer un
      // distri en referent supprimait son rattachement.
      sponsorId: payload.role !== "admin" ? payload.sponsorId ?? null : null,
      title: getDefaultUserTitle(payload.role)
    })
  });

  const result = await readApiResult<{ ok: boolean; error?: string }>(response);
  const teamHierarchyError = getTeamHierarchySetupError(result);

  if (teamHierarchyError) {
    throw new Error(teamHierarchyError);
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de mettre a jour cet acces.");
  }
}

export async function repairSupabaseUserAccess(payload: {
  userId?: string;
  email: string;
  name?: string;
  role: User["role"];
  sponsorId?: string;
  active: boolean;
}) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return {
      ok: false as const,
      error: "La session admin est introuvable. Reconnecte-toi puis recommence."
    };
  }

  const response = await fetch("/api/admin-repair-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify(payload)
  });

  const result = await readApiResult<{ ok: boolean; error?: string }>(response);
  const teamHierarchyError = getTeamHierarchySetupError(result);

  if (teamHierarchyError) {
    return { ok: false as const, error: teamHierarchyError };
  }

  return result;
}

// ─── Chantier « Promouvoir en distributeur » (2026-08-05) ───────────────────
// Réutilise le compte auth d'un membre existant (client PWA / BBC) pour lui
// ajouter la casquette distributeur, SANS créer de 2e compte. Fusionné dans
// /api/admin-repair-user (admin only) via action:lookup|promote — pour rester
// sous le plafond de 12 fonctions serverless du plan Vercel Hobby.

export type PromoteLookupResult = {
  ok: boolean;
  error?: string;
  hasAuth?: boolean;
  isCoach?: boolean;
  coachRole?: string | null;
  suggestedName?: string;
  fiche?: { clientId: string; name: string | null; currentOwnerId: string | null } | null;
};

export type PromoteResult = {
  ok: boolean;
  error?: string;
  code?: "no_account" | "already_coach" | "slug_collision";
  mode?: "promoted";
  ficheReassigned?: boolean;
  name?: string;
};

async function callPromoteMember<T extends { ok: boolean; error?: string }>(
  body: Record<string, unknown>
): Promise<T> {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    return {
      ok: false,
      error: "La session admin est introuvable. Reconnecte-toi puis recommence."
    } as T;
  }

  try {
    const response = await fetch("/api/admin-repair-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(body)
    });
    return await readApiResult<T>(response);
  } catch {
    return { ok: false, error: "Le serveur n'a pas répondu. Réessaie." } as T;
  }
}

export function lookupPromotableMember(email: string) {
  return callPromoteMember<PromoteLookupResult>({ action: "lookup", email });
}

export function promoteMemberToDistributor(payload: {
  email?: string;
  userId?: string;
  sponsorId: string;
  name?: string;
  ficheOwner: "keep" | "sponsor";
  herbalifeId?: string;
}) {
  return callPromoteMember<PromoteResult>({ action: "promote", ...payload });
}

export async function updateSupabaseUserStatus(userId: string, active: boolean) {
  const client = await requireSupabase();
  const { error } = await client.from("users").update({ active }).eq("id", userId);

  if (error) {
    throw new Error("Impossible de modifier le statut de cet acces.");
  }
}

export async function updateSupabaseUserPassword(userId: string, password: string) {
  const client = await requireSupabase();
  const {
    data: { session }
  } = await client.auth.getSession();

  if (!session?.access_token) {
    throw new Error("La session admin est introuvable. Reconnecte-toi puis recommence.");
  }

  const response = await fetch("/api/admin-update-user-password", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ userId, password })
  });

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de redefinir ce mot de passe.");
  }
}

// ─── Freeze / Unfreeze user accounts (Chantier 2026-05-06) ──────────────
/**
 * Gele le compte d'un user (admin only). Effets en cascade :
 *   - users.frozen_at = now(), frozen_by = admin, frozen_reason = note
 *   - L'user est exclu du sub-tree dans get_team_engagement (XP / podium)
 *   - Au prochain login, il est redirige sur /frozen au lieu de /dashboard
 *
 * RPC SECURITY DEFINER : check admin cote serveur. Le caller ne peut PAS
 * geler son propre compte (clause id <> v_caller dans la migration).
 */
export async function freezeUserAccount(params: {
  userId: string;
  reason?: string | null;
}): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("freeze_user", {
    p_target_user_id: params.userId,
    p_reason: params.reason ?? null,
  });
  if (error) {
    throw new Error(`Impossible de geler le compte : ${error.message}`);
  }
}

export async function unfreezeUserAccount(userId: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("unfreeze_user", {
    p_target_user_id: userId,
  });
  if (error) {
    throw new Error(`Impossible de reactiver le compte : ${error.message}`);
  }
}

// ─── PV override Bizworks + Rang admin (Chantier 2026-11-07) ─────────────
/**
 * Set ou clear l'override PV mensuel d'un user (admin only).
 * @param userId  cible
 * @param month   YYYY-MM (Europe/Paris)
 * @param pv      total PV declare ; null = clear l override (re-bascule auto)
 */
export async function setUserPvOverride(
  userId: string,
  month: string,
  pv: number | null,
): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("set_user_pv_override", {
    p_user_id: userId,
    p_month: month,
    p_pv: pv,
  });
  if (error) {
    throw new Error(`Impossible d'enregistrer l'override PV : ${error.message}`);
  }
  // Même event que setUserPvBreakdown : refresh des jauges/rentabilité sans reload.
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lor-squad:pv-breakdown-updated"));
  }
}

/**
 * Set le breakdown PV mensuel d'un user (admin only). Met aussi a jour
 * users.monthly_pv_override = somme cote SQL (RPC). Calibre fiche RO 2026-03.
 *
 * Dispatch un event global apres save pour que toutes les instances
 * usePvBreakdowns (Co-pilote widget, RentabilitePage, modale rent, etc.)
 * refetch automatiquement sans reload.
 */
export async function setUserPvBreakdown(params: {
  userId: string;
  month: string;
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  pv25IsVip?: boolean;
  pv35IsVip?: boolean;
}): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("set_user_pv_breakdown", {
    p_user_id: params.userId,
    p_month: params.month,
    p_pv_15: params.pv15,
    p_pv_25: params.pv25,
    p_pv_35: params.pv35,
    p_pv_42: params.pv42,
    p_pv_royalty: params.pvRoyalty,
    p_pv_25_is_vip: params.pv25IsVip ?? false,
    p_pv_35_is_vip: params.pv35IsVip ?? false,
  });
  if (error) {
    throw new Error(`Impossible d'enregistrer le breakdown PV : ${error.message}`);
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("lor-squad:pv-breakdown-updated"));
  }
}

/**
 * Charge tous les breakdowns du mois courant (fetched une seule fois au boot
 * AppContext puis re-fetched apres chaque save). Volume max ~50 lignes.
 */
export async function loadPvBreakdownsForMonth(
  month: string,
): Promise<Array<{
  userId: string;
  month: string;
  pv15: number;
  pv25: number;
  pv35: number;
  pv42: number;
  pvRoyalty: number;
  pvRealTotal: number | null;
  pv25IsVip: boolean;
  pv35IsVip: boolean;
  declaredBy: string | null;
  declaredAt: string | null;
}>> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_monthly_breakdown")
    .select("user_id, month, pv_15, pv_25, pv_35, pv_42, pv_royalty, pv_real_total, pv_25_is_vip, pv_35_is_vip, declared_by, declared_at")
    .eq("month", month);
  if (error || !data) return [];
  return data.map((r: {
    user_id: string;
    month: string;
    pv_15: number | null;
    pv_25: number | null;
    pv_35: number | null;
    pv_42: number | null;
    pv_royalty: number | null;
    pv_real_total: number | null;
    pv_25_is_vip: boolean | null;
    pv_35_is_vip: boolean | null;
    declared_by: string | null;
    declared_at: string | null;
  }) => ({
    userId: r.user_id,
    month: r.month,
    pv15: Number(r.pv_15 ?? 0),
    pv25: Number(r.pv_25 ?? 0),
    pv35: Number(r.pv_35 ?? 0),
    pv42: Number(r.pv_42 ?? 0),
    pvRoyalty: Number(r.pv_royalty ?? 0),
    pvRealTotal: r.pv_real_total == null ? null : Number(r.pv_real_total),
    pv25IsVip: !!r.pv_25_is_vip,
    pv35IsVip: !!r.pv_35_is_vip,
    declaredBy: r.declared_by ?? null,
    declaredAt: r.declared_at ?? null,
  }));
}

/** Saisie du PV réel Bizworks d'un distri pour un mois (RPC admin). 0/null efface. */
export async function setUserPvRealTotal(params: {
  userId: string;
  month: string;
  value: number | null;
}): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("set_user_pv_real_total", {
    p_user_id: params.userId,
    p_month: params.month,
    p_value: params.value ?? 0,
  });
  if (error) throw error;
}

// ─── Distributor qualifications (fenêtres glissantes 2/3/6/12 mois) ──────
/**
 * Appelle la RPC `get_distributor_qualifications` qui retourne les PV perso
 * du distri sur les 4 fenêtres glissantes Herbalife + les booleans qualifs.
 * Voir migration 20261118000000_distributor_qualifications.sql.
 */
export async function fetchDistributorQualifications(
  userId: string,
  asOfMonth: string,
): Promise<{
  pv_2m: number;
  pv_3m: number;
  pv_6m: number;
  pv_12m: number;
  pv_12m_extended: number;
  qualified_senior_consultant: boolean;
  qualified_success_builder: boolean;
  qualified_qp: boolean;
  qualified_supervisor: boolean;
  rank_calculated: string;
} | null> {
  const client = await requireSupabase();
  const { data, error } = await client.rpc("get_distributor_qualifications", {
    p_user_id: userId,
    p_as_of_month: asOfMonth,
  });
  if (error || !data) {
    if (error) console.warn("[fetchDistributorQualifications] rpc error", error);
    return null;
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    pv_2m: Number(row.pv_2m ?? 0),
    pv_3m: Number(row.pv_3m ?? 0),
    pv_6m: Number(row.pv_6m ?? 0),
    pv_12m: Number(row.pv_12m ?? 0),
    // V2 (migration 20261118200000) : si la RPC vieille version est encore
    // en place (avant apply), pv_12m_extended sera undefined → fallback
    // sur pv_12m pour ne pas casser l'UI le temps de l'apply.
    pv_12m_extended: Number(row.pv_12m_extended ?? row.pv_12m ?? 0),
    qualified_senior_consultant: !!row.qualified_senior_consultant,
    qualified_success_builder: !!row.qualified_success_builder,
    qualified_qp: !!row.qualified_qp,
    qualified_supervisor: !!row.qualified_supervisor,
    rank_calculated: String(row.rank_calculated ?? "distributor_25"),
  };
}

// ─── Conflit agenda RDV (quality fix Thomas 2026-05-18) ───────────────────
/**
 * Vérifie si un coach a déjà un RDV planifié dans une fenêtre ±30 min
 * autour de `dueDateIso`. Retourne le 1er conflit trouvé (clientName + date)
 * ou null si aucun.
 *
 * Utilisé dans NewAssessmentPage (validation bilan initial) et
 * NewFollowUpPage (validation suivi) pour avertir le coach AVANT le save.
 */
export async function checkAgendaConflict(
  coachUserId: string,
  dueDateIso: string,
  excludeFollowUpId?: string | null,
  excludeProspectId?: string | null,
): Promise<{ id: string; clientName: string; dueDate: string } | null> {
  if (!coachUserId || !dueDateIso) return null;
  const due = new Date(dueDateIso);
  if (Number.isNaN(due.getTime())) return null;
  const windowMs = 30 * 60 * 1000;
  const startIso = new Date(due.getTime() - windowMs).toISOString();
  const endIso = new Date(due.getTime() + windowMs).toISOString();

  const sb = await requireSupabase();
  // On lit follow_ups dans la fenêtre + filtre côté front sur distributor_id
  // pour éviter de devoir joindre côté SQL (RLS gère déjà le scope coach).
  let q = sb
    .from("follow_ups")
    .select("id, due_date, client_id, client_name, status, clients!inner(distributor_id)")
    .gte("due_date", startIso)
    .lte("due_date", endIso)
    .in("status", ["scheduled", "pending"]);
  if (excludeFollowUpId) q = q.neq("id", excludeFollowUpId);
  const { data, error } = await q;
  if (error || !data) return null;

  const match = (data as Array<{
    id: string;
    due_date: string;
    client_name: string;
    clients: { distributor_id: string } | { distributor_id: string }[] | null;
  }>).find((row) => {
    const clientLink = Array.isArray(row.clients) ? row.clients[0] : row.clients;
    return clientLink?.distributor_id === coachUserId;
  });

  if (match) {
    return {
      id: match.id,
      clientName: match.client_name ?? "client",
      dueDate: match.due_date,
    };
  }

  // Cross-table (chantier 2026-06-04) : un créneau peut aussi être pris par un
  // RDV prospect/lead. On scanne la table prospects sur la même fenêtre, pour
  // le même coach, statut 'scheduled' uniquement (RDV à venir — done/cold/
  // converted/cancelled/lost/no_show n'occupent plus le créneau).
  let pq = sb
    .from("prospects")
    .select("id, rdv_date, first_name, last_name, distributor_id, status")
    .gte("rdv_date", startIso)
    .lte("rdv_date", endIso)
    .eq("distributor_id", coachUserId)
    .eq("status", "scheduled");
  if (excludeProspectId) pq = pq.neq("id", excludeProspectId);
  const { data: pData, error: pError } = await pq;
  if (pError || !pData || pData.length === 0) return null;
  const p = pData[0] as { id: string; rdv_date: string; first_name: string; last_name: string };
  return {
    id: p.id,
    clientName: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "prospect",
    dueDate: p.rdv_date,
  };
}

// ─── Manual PV entries V3 (distri hors-app) ───────────────────────────────
export async function setUserRankAdmin(userId: string, rank: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.rpc("set_user_rank_admin", {
    p_user_id: userId,
    p_rank: rank,
  });
  if (error) {
    throw new Error(`Impossible de mettre a jour le rang : ${error.message}`);
  }
}

/**
 * Cree une demande de reactivation. Appele par le user gele depuis /frozen.
 * RLS : self-insert autorise.
 */
export async function requestUnfreeze(message: string): Promise<void> {
  const client = await requireSupabase();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) {
    throw new Error("Non authentifie.");
  }
  const { error } = await client.from("unfreeze_requests").insert({
    user_id: user.id,
    message: message.trim() || null,
  });
  if (error) {
    throw new Error(`Impossible d'envoyer la demande : ${error.message}`);
  }
}

// ─── Activator démarrage produits (Chantier 2026-05-05) ─────────────────
/**
 * Active le programme d'un client à une date donnée (par défaut : aujourd'hui).
 *
 * Cas d'usage : le coach a fait le bilan le 29/04, mais la cliente reçoit
 * et démarre les produits seulement le 05/05. Sans cet activator, le
 * compteur protocole J+1/J+7/J+14/J+21 part du 29/04 → la cliente est
 * déjà en "J+7" alors qu'elle vient à peine de commencer. Pareil pour
 * `pv_client_products.start_date` qui détermine l'usure du produit (et
 * donc les alertes réassort).
 *
 * Effets :
 *   1. clients.start_date = startDateIso, started = true,
 *      lifecycle_status = 'active' (sauf si déjà 'paused'/'stopped'/'lost')
 *   2. pv_client_products.start_date = startDateIso pour TOUS les
 *      produits actifs du client (active = true)
 */
export async function activateSupabaseClientProgram(params: {
  clientId: string;
  startDateIso: string; // YYYY-MM-DD
  userId: string;
}): Promise<void> {
  const { clientId, startDateIso, userId } = params;
  const client = await requireSupabase();

  // 1. Update clients
  const { error: clientError } = await client
    .from("clients")
    .update({
      start_date: startDateIso,
      started: true,
      lifecycle_status: "active",
      lifecycle_updated_at: new Date().toISOString(),
      lifecycle_updated_by: userId,
    })
    .eq("id", clientId);

  if (clientError) {
    throw new Error(
      `Impossible d'activer le programme du client : ${clientError.message}`
    );
  }

  // 2. Update pv_client_products actifs : reset start_date pour
  //    réaligner l'usure et les alertes réassort.
  const { error: pvError } = await client
    .from("pv_client_products")
    .update({ start_date: startDateIso })
    .eq("client_id", clientId)
    .eq("active", true);

  if (pvError) {
    // Non-fatal : on loggue, le client est activé même si certains
    // produits n'ont pas pu être réalignés (rare).
    console.warn(
      "[activateSupabaseClientProgram] pv_client_products update warning:",
      pvError
    );
  }
}

// ─── Lifecycle setters (Chantier 1 — Matrice B) ──────────────────────────
export async function updateSupabaseClientLifecycleStatus(params: {
  clientId: string;
  newStatus: LifecycleStatus;
  userId: string;
}): Promise<void> {
  const { clientId, newStatus, userId } = params;
  const client = await requireSupabase();

  const { error: clientError } = await client
    .from("clients")
    .update({
      lifecycle_status: newStatus,
      lifecycle_updated_at: new Date().toISOString(),
      lifecycle_updated_by: userId,
    })
    .eq("id", clientId);

  if (clientError) {
    throw new Error(`Impossible de mettre à jour le statut du client : ${clientError.message}`);
  }

  // Si le client bascule en "mort" → tous ses follow-ups ouverts deviennent inactifs
  if (newStatus === "stopped" || newStatus === "lost") {
    const { error: fuError } = await client
      .from("follow_ups")
      .update({ status: "inactive" })
      .eq("client_id", clientId)
      .in("status", ["scheduled", "pending"]);

    if (fuError) {
      // Non-fatal : on loggue et on continue
      console.warn("[updateSupabaseClientLifecycleStatus] follow_ups update warning:", fuError);
    }
  }
}

export async function updateSupabaseClientFragileFlag(params: {
  clientId: string;
  isFragile: boolean;
}): Promise<void> {
  const { clientId, isFragile } = params;
  const client = await requireSupabase();

  const { error } = await client
    .from("clients")
    .update({ is_fragile: isFragile })
    .eq("id", clientId);

  if (error) {
    throw new Error(`Impossible de mettre à jour le flag fragile : ${error.message}`);
  }
}

// ─── Suivi libre (Sujet C — 2026-04-19) ──────────────────────────────────
export async function updateSupabaseClientFreeFollowUp(params: {
  clientId: string;
  freeFollowUp: boolean;
}): Promise<void> {
  const { clientId, freeFollowUp } = params;
  const client = await requireSupabase();

  const { error: clientError } = await client
    .from("clients")
    .update({ free_follow_up: freeFollowUp })
    .eq("id", clientId);

  if (clientError) {
    throw new Error(`Impossible de mettre à jour le mode de suivi : ${clientError.message}`);
  }

  // Règle métier : activer le suivi libre → désactiver tous les follow-ups
  // ouverts du client (comme pour stopped/lost). Si on repasse en false,
  // le coach recréera un RDV manuel via le modal planning.
  if (freeFollowUp) {
    const { error: fuError } = await client
      .from("follow_ups")
      .update({ status: "inactive" })
      .eq("client_id", clientId)
      .in("status", ["scheduled", "pending"]);

    if (fuError) {
      // Non-fatal : on loggue et on continue.
      console.warn("[updateSupabaseClientFreeFollowUp] follow_ups update warning:", fuError);
    }
  }
}

// ─── General Note (Chantier bilan updates 2026-04-20) ────────────────────
// Note libre "À savoir sur ce client" — anecdotes, préférences, loisirs.
/**
 * Met à jour l'uplink Herbalife réel du client (chantier 2026-05-21).
 * uplinkUserId = NULL → on retombe sur distributor_id (cas standard).
 * label = texte libre informatif (nom de l'uplink hors-app).
 */
/**
 * Crée un distri externe (hors-app) — chantier 2026-05-21.
 * Pas d'auth utilisable, juste un user "fantôme" pour l'arborescence HL.
 */
export async function createSupabaseExternalDistributor(payload: {
  name: string;
  currentRank: import("../types/domain").HerbalifeRank;
  sponsorId?: string | null;
}): Promise<{ ok: true; userId: string } | { ok: false; error: string }> {
  const client = await requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) {
    return { ok: false, error: "Session admin introuvable." };
  }
  let response: Response;
  try {
    response = await fetch("/api/admin-create-external-distributor", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch (netErr) {
    console.error("[createExternalDistributor] network", netErr);
    return { ok: false, error: `Réseau : ${netErr instanceof Error ? netErr.message : "indisponible"}` };
  }
  let body: { ok?: boolean; error?: string; userId?: string } = {};
  try {
    body = await response.json();
  } catch {
    // Endpoint a probablement retourné HTML (404 Vercel) ou texte brut
    const txt = await response.text().catch(() => "");
    console.error("[createExternalDistributor] non-json", response.status, txt.slice(0, 200));
    return { ok: false, error: `HTTP ${response.status} : endpoint inaccessible (déploiement ?).` };
  }
  if (!response.ok || !body.ok || !body.userId) {
    console.error("[createExternalDistributor] error response", response.status, body);
    return {
      ok: false,
      error: body.error ?? `Échec création (HTTP ${response.status}).`,
    };
  }
  return { ok: true, userId: body.userId };
}

/**
 * Crée un distri Supervisor passif + token magic link.
 * Chantier passive_supervisor 2026-05-22.
 */
/**
 * Convertit un Supervisor passif en distri actif (chantier Light V2 2026-05-22).
 * Admin only. RPC SECURITY DEFINER fait le toggle des flags is_external +
 * is_passive_supervisor + active.
 */
export async function upgradePassiveToActive(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await requireSupabase();
  const { error } = await client.rpc("upgrade_passive_to_active", { p_user_id: userId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function createSupabasePassiveSupervisor(payload: {
  name: string;
  email: string;
  currentRank: import("../types/domain").HerbalifeRank;
  sponsorId?: string | null;
}): Promise<
  | { ok: true; userId: string; email: string; password: string; loginUrl: string; linkedExisting: boolean }
  | { ok: false; error: string }
> {
  const client = await requireSupabase();
  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Session admin introuvable." };
  let response: Response;
  try {
    response = await fetch("/api/admin-create-external-distributor", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ ...payload, mode: "passive_supervisor" }),
    });
  } catch (netErr) {
    return { ok: false, error: `Réseau : ${netErr instanceof Error ? netErr.message : "indisponible"}` };
  }
  let body: { ok?: boolean; error?: string; userId?: string; email?: string; password?: string; loginUrl?: string; linkedExisting?: boolean } = {};
  try { body = await response.json(); } catch {
    const txt = await response.text().catch(() => "");
    console.error("[createPassiveSupervisor] non-json", response.status, txt.slice(0, 200));
    return { ok: false, error: `HTTP ${response.status} : endpoint inaccessible.` };
  }
  if (!response.ok || !body.ok || !body.userId || !body.email) {
    return { ok: false, error: body.error ?? `Échec (HTTP ${response.status}).` };
  }
  return {
    ok: true,
    userId: body.userId,
    email: body.email,
    password: body.password ?? "",
    loginUrl: body.loginUrl ?? "/connexion",
    linkedExisting: body.linkedExisting === true,
  };
}

/**
 * Update un distri externe (admin/référent only). 2026-05-22.
 */
export async function updateSupabaseExternalDistributor(payload: {
  userId: string;
  name: string;
  currentRank: import("../types/domain").HerbalifeRank;
  sponsorId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Session admin introuvable." };
  // Endpoint fusionné (limite Vercel 12 functions) : flag action=update.
  const response = await fetch("/api/admin-create-external-distributor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ ...payload, action: "update" }),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!response.ok || !body.ok) {
    return { ok: false, error: body.error ?? "Échec mise à jour." };
  }
  return { ok: true };
}

/**
 * Delete un distri externe (admin only). Refuse si enfants ou uplink utilisé.
 */
export async function deleteSupabaseExternalDistributor(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = await requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session?.access_token) return { ok: false, error: "Session admin introuvable." };
  // Endpoint fusionné (limite Vercel 12 functions) : flag action=delete.
  const response = await fetch("/api/admin-create-external-distributor", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ userId, action: "delete" }),
  });
  const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!response.ok || !body.ok) {
    return { ok: false, error: body.error ?? "Échec suppression." };
  }
  return { ok: true };
}

/**
 * Charge les entries manual_pv distinctes (par name) pour un viewer.
 * Chantier #9 polish — assistant de migration vers distri externes.
 */
export async function loadDistinctManualEntries(
  viewerUserId: string,
): Promise<Array<{
  name: string;
  tierPct: number;
  monthsCount: number;
  totalPv: number;
  entryIds: string[];
}>> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("manual_pv_entries")
    .select("id, name, own_tier_pct, month, pv_15, pv_25, pv_35, pv_42, pv_royalty")
    .eq("viewer_user_id", viewerUserId);
  if (error || !data) return [];

  // Groupe par name
  const map = new Map<string, { tierPct: number; months: Set<string>; totalPv: number; ids: string[] }>();
  for (const row of data as Array<{
    id: string;
    name: string;
    own_tier_pct: number;
    month: string;
    pv_15: number | null;
    pv_25: number | null;
    pv_35: number | null;
    pv_42: number | null;
    pv_royalty: number | null;
  }>) {
    const key = row.name.trim();
    if (!key) continue;
    const entry = map.get(key) ?? { tierPct: row.own_tier_pct, months: new Set<string>(), totalPv: 0, ids: [] };
    entry.months.add(row.month);
    entry.totalPv +=
      Number(row.pv_15 ?? 0) +
      Number(row.pv_25 ?? 0) +
      Number(row.pv_35 ?? 0) +
      Number(row.pv_42 ?? 0) +
      Number(row.pv_royalty ?? 0);
    entry.ids.push(row.id);
    map.set(key, entry);
  }
  return Array.from(map.entries())
    .map(([name, v]) => ({
      name,
      tierPct: v.tierPct,
      monthsCount: v.months.size,
      totalPv: v.totalPv,
      entryIds: v.ids,
    }))
    .sort((a, b) => b.totalPv - a.totalPv);
}

/**
 * Migre toutes les entries manual_pv pour un name donné vers un nouveau
 * distri externe + persiste les PV mensuels dans pv_monthly_breakdown.
 *
 * Étapes :
 *   1. Charge les manual entries pour (viewerId, name) → groupées par mois
 *   2. Crée le distri externe via endpoint (sponsorId = viewer par défaut)
 *   3. Pour chaque mois, INSERT dans pv_monthly_breakdown via setUserPvBreakdown
 *   4. Delete les manual_pv_entries originales
 */
export async function migrateManualToExternal(params: {
  viewerUserId: string;
  name: string;
  currentRank: import("../types/domain").HerbalifeRank;
  sponsorId?: string | null;
}): Promise<{ ok: true; userId: string; monthsMigrated: number } | { ok: false; error: string }> {
  const client = await requireSupabase();

  // 1. Charge les entries
  const { data: entries, error: loadErr } = await client
    .from("manual_pv_entries")
    .select("id, month, pv_15, pv_25, pv_35, pv_42, pv_royalty")
    .eq("viewer_user_id", params.viewerUserId)
    .eq("name", params.name);
  if (loadErr || !entries) {
    return { ok: false, error: loadErr?.message ?? "Aucune entry trouvée." };
  }

  // 2. Crée l'externe
  const createResult = await createSupabaseExternalDistributor({
    name: params.name,
    currentRank: params.currentRank,
    sponsorId: params.sponsorId ?? params.viewerUserId,
  });
  if (!createResult.ok) {
    return { ok: false, error: createResult.error };
  }
  const userId = createResult.userId;

  // 3. Agrège par mois (au cas où plusieurs entries même mois) et upsert breakdown
  const byMonth = new Map<string, { pv15: number; pv25: number; pv35: number; pv42: number; pvRoyalty: number }>();
  for (const e of entries as Array<{ month: string; pv_15: number | null; pv_25: number | null; pv_35: number | null; pv_42: number | null; pv_royalty: number | null }>) {
    const cur = byMonth.get(e.month) ?? { pv15: 0, pv25: 0, pv35: 0, pv42: 0, pvRoyalty: 0 };
    cur.pv15 += Number(e.pv_15 ?? 0);
    cur.pv25 += Number(e.pv_25 ?? 0);
    cur.pv35 += Number(e.pv_35 ?? 0);
    cur.pv42 += Number(e.pv_42 ?? 0);
    cur.pvRoyalty += Number(e.pv_royalty ?? 0);
    byMonth.set(e.month, cur);
  }

  let monthsMigrated = 0;
  for (const [month, pv] of byMonth.entries()) {
    try {
      await setUserPvBreakdown({ userId, month, ...pv });
      monthsMigrated += 1;
    } catch (err) {
      console.warn(`[migrateManualToExternal] mois ${month} échec:`, err);
    }
  }

  // 4. Delete les entries originales (best-effort)
  const ids = (entries as Array<{ id: string }>).map((e) => e.id);
  if (ids.length > 0) {
    await client.from("manual_pv_entries").delete().in("id", ids);
  }

  return { ok: true, userId, monthsMigrated };
}

/**
 * Charge les N derniers mois de breakdown PV pour un user.
 */
export async function loadUserPvHistory(
  userId: string,
  months: number = 6,
): Promise<Array<{ month: string; pv15: number; pv25: number; pv35: number; pv42: number; pvRoyalty: number; total: number }>> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("pv_monthly_breakdown")
    .select("month, pv_15, pv_25, pv_35, pv_42, pv_royalty")
    .eq("user_id", userId)
    .order("month", { ascending: false })
    .limit(Math.max(1, Math.min(36, months)));
  if (error || !data) return [];
  return data.map((r: { month: string; pv_15: number | null; pv_25: number | null; pv_35: number | null; pv_42: number | null; pv_royalty: number | null }) => {
    const pv15 = Number(r.pv_15 ?? 0);
    const pv25 = Number(r.pv_25 ?? 0);
    const pv35 = Number(r.pv_35 ?? 0);
    const pv42 = Number(r.pv_42 ?? 0);
    const pvRoyalty = Number(r.pv_royalty ?? 0);
    return {
      month: r.month,
      pv15,
      pv25,
      pv35,
      pv42,
      pvRoyalty,
      total: pv15 + pv25 + pv35 + pv42 + pvRoyalty,
    };
  });
}

export async function updateSupabaseClientHerbalifeUplink(params: {
  clientId: string;
  uplinkUserId: string | null;
  uplinkLabel: string | null;
  uplinkRank: import("../types/domain").HerbalifeRank | null;
}): Promise<void> {
  const { clientId, uplinkUserId, uplinkLabel, uplinkRank } = params;
  const client = await requireSupabase();
  const { error } = await client
    .from("clients")
    .update({
      herbalife_uplink_user_id: uplinkUserId,
      herbalife_uplink_label: uplinkLabel,
      herbalife_uplink_rank: uplinkRank,
    })
    .eq("id", clientId);
  if (error) throw error;
}

export async function updateSupabaseClientGeneralNote(params: {
  clientId: string;
  generalNote: string;
}): Promise<void> {
  const { clientId, generalNote } = params;
  const client = await requireSupabase();

  // V2 (2026-04-24) : après migration, la colonne est renommée en
  // general_note_deprecated. On tente general_note d'abord, fallback
  // sur general_note_deprecated, pour supporter les deux états.
  let { error } = await client
    .from("clients")
    .update({ general_note: generalNote })
    .eq("id", clientId);

  if (error && isMissingColumnError(error, "general_note")) {
    ({ error } = await client
      .from("clients")
      .update({ general_note_deprecated: generalNote })
      .eq("id", clientId));
  }

  if (error) {
    throw new Error(`Impossible de mettre à jour la note générale : ${error.message}`);
  }
}

// ─── Onboarding Checks (Chantier Polish Vue complète 2026-04-24) ─────────
// 3 checks coach cochables depuis la fiche client (telegram, photo before,
// mensurations). Stocké en jsonb sur clients.onboarding_checks.
export async function updateSupabaseClientOnboardingChecks(params: {
  clientId: string;
  checks: { telegram?: boolean; photo_before?: boolean; measurements?: boolean };
}): Promise<void> {
  const { clientId, checks } = params;
  const client = await requireSupabase();

  const { error } = await client
    .from("clients")
    .update({ onboarding_checks: checks })
    .eq("id", clientId);

  if (error) {
    if (isMissingColumnError(error, "onboarding_checks")) {
      throw new Error(
        "La colonne onboarding_checks n'existe pas encore. Exécute la migration supabase/migrations/20260423090000_client_onboarding_checks.sql."
      );
    }
    throw new Error(`Impossible de mettre à jour les checks onboarding : ${error.message}`);
  }
}

// ─── Free PV Tracking (Chantier 2026-04-20) ──────────────────────────────
// Toggle simple : client sous un autre superviseur → exclu des listes de
// réassort côté dashboard + page Suivi PV. Le reste du dossier (bilans,
// RDV, messages) reste normal — contrairement à `free_follow_up` qui
// désactive aussi les follow-ups automatiques.
export async function updateSupabaseClientFreePvTracking(params: {
  clientId: string;
  freePvTracking: boolean;
}): Promise<void> {
  const { clientId, freePvTracking } = params;
  const client = await requireSupabase();

  const { error: clientError } = await client
    .from("clients")
    .update({ free_pv_tracking: freePvTracking })
    .eq("id", clientId);

  if (clientError) {
    // Fallback : colonne pas encore créée → message explicite
    if (isMissingColumnError(clientError, "free_pv_tracking")) {
      throw new Error(
        "La colonne free_pv_tracking n'existe pas encore. Exécute la migration supabase/migrations/20260420120000_free_pv_tracking.sql."
      );
    }
    throw new Error(`Impossible de mettre à jour le suivi PV : ${clientError.message}`);
  }
}

// ─── Agenda Prospects (Chantier 2026-04-19) ─────────────────────────────

export async function refreshClientRecap(clientId: string): Promise<void> {
  const client = await requireSupabase();

  // 1. Fetch client — coach (distributor_name), prénom/nom, programme, objectif
  const { data: clientRow, error: clientErr } = await client
    .from("clients")
    .select("first_name, last_name, distributor_name, current_program, objective")
    .eq("id", clientId)
    .single<{
      first_name: string;
      last_name: string;
      distributor_name: string | null;
      current_program: string | null;
      objective: string | null;
    }>();

  if (clientErr || !clientRow) {
    throw new Error(
      `Impossible de rafraîchir le récap : ${clientErr?.message ?? "client introuvable"}`
    );
  }

  // 2. Fetch dernier assessment (par date DESC) pour body_scan + questionnaire
  const { data: latestAssessment, error: assessErr } = await client
    .from("assessments")
    .select("date, body_scan, questionnaire")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle<{
      date: string;
      body_scan: AssessmentRecord["bodyScan"] | null;
      questionnaire: AssessmentRecord["questionnaire"] | null;
    }>();

  if (assessErr) {
    throw new Error(`Impossible de lire le dernier bilan : ${assessErr.message}`);
  }

  // Cas limite : client sans aucun bilan (ne devrait pas arriver en pratique
  // car le bilan initial est obligatoire à la création). On skip silencieux.
  if (!latestAssessment) {
    return;
  }

  // 3. Reconstruire les recommendations à partir du questionnaire (top 5)
  const selectedIds: string[] =
    (latestAssessment.questionnaire?.selectedProductIds as string[] | undefined) ?? [];
  const recommendations = selectedIds
    .map((id) => getRecommendableProductById(id))
    .filter((product): product is NonNullable<typeof product> => product != null)
    .slice(0, 5)
    .map((product) => ({ name: product.name, shortBenefit: product.shortBenefit }));

  // 4. INSERT du nouveau snapshot (pas de delete — lecture last-wins)
  const { error: recapError } = await client.from("client_recaps").insert({
    client_id: clientId,
    coach_name: clientRow.distributor_name ?? "Coach",
    client_first_name: clientRow.first_name ?? "",
    client_last_name: clientRow.last_name ?? "",
    assessment_date: latestAssessment.date ?? new Date().toISOString(),
    program_title: clientRow.current_program || null,
    objective: clientRow.objective || null,
    body_scan: latestAssessment.body_scan ?? null,
    recommendations,
    referrals: []
  });

  if (recapError) {
    throw new Error(`Impossible d'écrire le récap : ${recapError.message}`);
  }
}

// ─── Protocole de suivi (Chantier 2026-04-20) ────────────────────────────
// Log simple des messages envoyés : INSERT au marquage, SELECT pour l'état
// des 5 étapes sur la fiche client. Tolère l'absence de la migration via
// un fallback [] (pas de crash si la table n'existe pas encore).


// =============================================================================
// Refacto 2026-05-19 (Phase 3.5 brainstorm Égypte) — barrel pattern.
//
// Les 3 domaines suivants ont été extraits en fichiers dédiés pour faciliter
// la maintenance et réduire les conflits de merge. Ce fichier les re-exporte
// pour préserver l'API publique : tous les call sites continuent d'importer
// depuis "../services/supabaseService" sans changement.
// =============================================================================

export * from "./sb/manual-pv";
export * from "./sb/prospects";
export * from "./sb/follow-up-protocol";
