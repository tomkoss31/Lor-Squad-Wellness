import { createMockSession, getDefaultUserTitle, getRoleScope } from "../lib/auth";
import { getSupabaseClient } from "./supabaseClient";
import { pvProductCatalog, resolvePvProgram } from "../data/pvCatalog";
import { computeWaterTarget, computeProteinTarget } from "../lib/calculations";

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
  FollowUpProtocolLog,
  FollowUpProtocolStepId,
  LifecycleStatus,
  MessageALaisser,
  Prospect,
  ProspectFormInput,
  ProspectSource,
  ProspectStatus,
  TypeDeSuite,
  User
} from "../types/domain";
import { deriveLifecycleFromAssessment } from "../lib/lifecycleMapping";
import { getRecommendableProductById } from "../lib/assessmentRecommendations";
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";

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
  assessments?: AssessmentRow[] | null;
};

type FollowUpRow = {
  id: string;
  client_id: string;
  client_name: string;
  due_date: string;
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

function isMissingTableError(error: { message?: string } | null | undefined, table: string) {
  return Boolean(error?.message?.toLowerCase().includes(table.toLowerCase()));
}

function getPvModuleSetupError(error: { message?: string } | null | undefined) {
  const pvTables = ["pv_client_products", "pv_transactions", "pv_products", "pv_programs"];
  const missingPvTable = pvTables.find((table) => isMissingTableError(error, table));

  if (!missingPvTable) {
    return null;
  }

  return "Le module Suivi PV n'est pas encore installe sur cette base Supabase. Lance d'abord le fichier supabase/pv-module-migration.sql dans SQL Editor, puis recharge l'application.";
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
}) {
  const program = resolvePvProgram(payload.programTitle);
  const selectedProductIds = (payload.selectedProductIds ?? []).filter(
    (productId, index, array) =>
      array.indexOf(productId) === index &&
      pvProductCatalog.some((item) => item.id === productId)
  );
  const productIds = selectedProductIds.length ? selectedProductIds : program.includedProductIds;

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
        quantity_start: 1,
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
    assessments: (row.assessments ?? []).map(mapAssessment)
  };
}

function mapFollowUp(row: FollowUpRow): FollowUp {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName: row.client_name,
    dueDate: row.due_date,
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
  const { data: clientAccount } = await client
    .from("client_app_accounts")
    .select("token, client_id")
    .eq("auth_user_id", data.user.id)
    .maybeSingle();

  if (clientAccount?.token) {
    return {
      ok: true as const,
      kind: "client" as const,
      clientToken: String(clientAccount.token),
      clientId: String(clientAccount.client_id ?? ""),
    };
  }

  // Aucun profil nulle part. Sign out pour éviter une session zombie.
  await client.auth.signOut();
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
  await client.auth.signOut();
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

export async function fetchSupabaseClients() {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("clients")
    .select("*, assessments(*)")
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
    if (getPvModuleSetupError(error)) {
      return [] as PvClientProductRecord[];
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
    if (getPvModuleSetupError(error)) {
      return [] as PvClientTransaction[];
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
    if (isMissingTableError(error, "activity_logs")) {
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
    const { error: followUpError } = await client.from("follow_ups").insert({
      client_id: clientId,
      client_name: `${payload.client.firstName} ${payload.client.lastName}`,
      due_date: payload.nextFollowUp,
      type: payload.followUpType,
      status: payload.followUpStatus,
      program_title: payload.currentProgram || payload.assessment.programTitle,
      last_assessment_date: payload.assessment.date
    });

    if (followUpError) {
      throw new Error("Impossible de creer le premier suivi.");
    }
  }

  const seedProducts = payload.started && payload.currentProgram
    ? buildSeedPvProducts({
        clientId,
        distributorId: payload.client.distributorId,
        distributorName: payload.client.distributorName,
        programTitle: payload.currentProgram,
        startDate: payload.assessment.date,
        selectedProductIds: payload.assessment.questionnaire.selectedProductIds
      })
    : [];

  if (seedProducts.length) {
    const { error: pvSeedError } = await client.from("pv_client_products").insert(seedProducts);
    if (pvSeedError && !isMissingTableError(pvSeedError, "pv_client_products")) {
      throw new Error("Le client a ete cree, mais pas le socle de suivi PV.");
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
    const pvSetupError = getPvModuleSetupError(error);
    if (pvSetupError) {
      throw new Error(pvSetupError);
    }

    throw new Error(
      error?.message ??
        "Impossible de mettre a jour ce produit actif dans le suivi PV."
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
    const pvSetupError = getPvModuleSetupError(error);
    if (pvSetupError) {
      throw new Error(pvSetupError);
    }

    throw new Error(
      error?.message ?? "Impossible d'ajouter ce mouvement produit."
    );
  }

  return mapPvTransaction(data);
}

export async function updateSupabaseAssessment(clientId: string, assessment: AssessmentRecord) {
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
    body: JSON.stringify({ clientId, assessment })
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
  }
) {
  const client = await requireSupabase();
  const clientUpdatePayload = { next_follow_up: payload.nextFollowUp };
  const followUpUpdatePayload = {
    due_date: payload.nextFollowUp,
    ...(payload.followUpType ? { type: payload.followUpType } : {}),
    ...(payload.followUpStatus ? { status: payload.followUpStatus } : {})
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
    if (isMissingTableError(error, "activity_logs")) {
      throw new Error(
        "La table activity_logs n'existe pas encore sur Supabase. Lance la migration equipe pour activer l'historique."
      );
    }

    throw new Error(error?.message ?? "Impossible d'enregistrer cette action.");
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

type ProspectRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  rdv_date: string;
  source: string;
  source_detail?: string | null;
  note?: string | null;
  distributor_id: string;
  status: string;
  converted_client_id?: string | null;
  cold_until?: string | null;
  cold_reason?: string | null;
  created_at: string;
  updated_at: string;
};

function mapProspectFromDb(row: ProspectRow): Prospect {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    rdvDate: row.rdv_date,
    source: row.source as ProspectSource,
    sourceDetail: row.source_detail ?? undefined,
    note: row.note ?? undefined,
    distributorId: row.distributor_id,
    status: row.status as ProspectStatus,
    convertedClientId: row.converted_client_id ?? undefined,
    coldUntil: row.cold_until ?? undefined,
    coldReason: row.cold_reason ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapProspectToDbUpdates(updates: Partial<Prospect>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (updates.firstName !== undefined) out.first_name = updates.firstName;
  if (updates.lastName !== undefined) out.last_name = updates.lastName;
  if (updates.phone !== undefined) out.phone = updates.phone ?? null;
  if (updates.email !== undefined) out.email = updates.email ?? null;
  if (updates.rdvDate !== undefined) out.rdv_date = updates.rdvDate;
  if (updates.source !== undefined) out.source = updates.source;
  if (updates.sourceDetail !== undefined) out.source_detail = updates.sourceDetail ?? null;
  if (updates.note !== undefined) out.note = updates.note ?? null;
  if (updates.distributorId !== undefined) out.distributor_id = updates.distributorId;
  if (updates.status !== undefined) out.status = updates.status;
  if (updates.convertedClientId !== undefined) out.converted_client_id = updates.convertedClientId ?? null;
  if (updates.coldUntil !== undefined) out.cold_until = updates.coldUntil ?? null;
  if (updates.coldReason !== undefined) out.cold_reason = updates.coldReason ?? null;
  // updated_at piloté côté SQL à chaque UPDATE : on force côté appli pour tracking UI
  out.updated_at = new Date().toISOString();
  return out;
}

export async function fetchSupabaseProspects(): Promise<Prospect[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("prospects")
    .select("*")
    .order("rdv_date", { ascending: true });

  if (error) {
    // Fallback : si la table n'existe pas encore (migration pas jouée)
    if (isMissingTableError(error, "prospects")) {
      console.warn("[fetchSupabaseProspects] table prospects absente — migration pas jouée ?");
      return [];
    }
    throw new Error(`Impossible de charger les prospects : ${error.message}`);
  }
  return (data ?? []).map((row) => mapProspectFromDb(row as ProspectRow));
}

export async function createSupabaseProspect(input: ProspectFormInput): Promise<Prospect> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("prospects")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      phone: input.phone ?? null,
      email: input.email ?? null,
      rdv_date: input.rdvDate,
      source: input.source,
      source_detail: input.sourceDetail ?? null,
      note: input.note ?? null,
      distributor_id: input.distributorId,
      status: "scheduled" as ProspectStatus,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Impossible de créer le prospect : ${error?.message ?? "réponse vide"}`);
  }
  return mapProspectFromDb(data as ProspectRow);
}

export async function updateSupabaseProspect(id: string, updates: Partial<Prospect>): Promise<Prospect> {
  const client = await requireSupabase();
  const dbUpdates = mapProspectToDbUpdates(updates);
  const { data, error } = await client
    .from("prospects")
    .update(dbUpdates)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Impossible de mettre à jour le prospect : ${error?.message ?? "réponse vide"}`);
  }
  return mapProspectFromDb(data as ProspectRow);
}

export async function deleteSupabaseProspect(id: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.from("prospects").delete().eq("id", id);
  if (error) {
    throw new Error(`Impossible de supprimer le prospect : ${error.message}`);
  }
}

// ─── Sync client_recaps (Chantier 2026-04-20) ────────────────────────────
// Le snapshot `client_recaps` (vu par le client sur /client/:token) n'est créé
// qu'une fois, à la création du client (NewAssessmentPage). Toutes les autres
// mutations (follow-up, body scan rapide, édition bilan, ajout produit,
// update coordonnées, réassignation coach) laissent le récap figé.
//
// `refreshClientRecap(clientId)` reconstruit un nouveau snapshot à partir de
// l'état courant : clients + dernier assessment + questionnaire.selectedProductIds.
// Les lectures côté client (ClientAppPage, RecapPage, ClientDetailPage)
// font toutes `order by created_at desc limit 1`, donc on INSERT sans delete.
//
// Usage : appeler APRÈS la mutation principale. Les erreurs sont remontées
// au caller pour affichage toast, mais l'appelant doit catch sans bloquer
// le flux principal (l'action utilisateur a déjà réussi).
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

type FollowUpProtocolLogRow = {
  id: string;
  client_id: string;
  coach_id: string;
  step_id: FollowUpProtocolStepId;
  sent_at: string;
  notes?: string | null;
};

function mapFollowUpProtocolLog(row: FollowUpProtocolLogRow): FollowUpProtocolLog {
  return {
    id: row.id,
    clientId: row.client_id,
    coachId: row.coach_id,
    stepId: row.step_id,
    sentAt: row.sent_at,
    notes: row.notes ?? undefined,
  };
}

export async function fetchSupabaseFollowUpProtocolLogs(
  clientId: string
): Promise<FollowUpProtocolLog[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .select("*")
    .eq("client_id", clientId)
    .order("sent_at", { ascending: true });
  if (error) {
    // Migration pas encore exécutée → tolérant (UI affichera 0/5).
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      return [];
    }
    throw new Error(`Impossible de lire le protocole de suivi : ${error.message}`);
  }
  return (data as FollowUpProtocolLogRow[]).map(mapFollowUpProtocolLog);
}

/**
 * Chantier Protocole dans Agenda + Dashboard (2026-04-20)
 * Fetch global des logs protocole — utilisé par Dashboard widget et Agenda
 * onglet Suivis. Tolère l'absence de la migration comme la version par-client.
 * Le filtrage sur le coach courant se fait côté client pour des raisons de
 * compatibilité RLS (can_access_owner couvre la scope admin / référent).
 */
export async function fetchAllSupabaseFollowUpProtocolLogs(): Promise<FollowUpProtocolLog[]> {
  const client = await requireSupabase();
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .select("*")
    .order("sent_at", { ascending: false });
  if (error) {
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      return [];
    }
    throw new Error(`Impossible de lire les logs protocole : ${error.message}`);
  }
  return (data as FollowUpProtocolLogRow[]).map(mapFollowUpProtocolLog);
}

export async function logSupabaseFollowUpProtocolStep(params: {
  clientId: string;
  coachId: string;
  stepId: FollowUpProtocolStepId;
  notes?: string;
}): Promise<FollowUpProtocolLog> {
  const { clientId, coachId, stepId, notes } = params;
  const client = await requireSupabase();

  // UPSERT via la contrainte unique (client_id, step_id) — si l'user ré-envoie
  // le message, on rafraîchit sent_at au lieu de dupliquer.
  const { data, error } = await client
    .from("follow_up_protocol_log")
    .upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        step_id: stepId,
        sent_at: new Date().toISOString(),
        notes: notes ?? null,
      },
      { onConflict: "client_id,step_id" }
    )
    .select("*")
    .single();

  if (error) {
    if (isMissingTableError(error, "follow_up_protocol_log")) {
      throw new Error(
        "La table follow_up_protocol_log n'existe pas encore. Exécute la migration supabase/migrations/20260420160000_follow_up_protocol_log.sql."
      );
    }
    throw new Error(`Impossible d'enregistrer l'envoi : ${error.message}`);
  }

  return mapFollowUpProtocolLog(data as FollowUpProtocolLogRow);
}

export async function deleteSupabaseFollowUpProtocolLog(logId: string): Promise<void> {
  const client = await requireSupabase();
  const { error } = await client.from("follow_up_protocol_log").delete().eq("id", logId);
  if (error) {
    throw new Error(`Impossible d'annuler l'envoi : ${error.message}`);
  }
}
