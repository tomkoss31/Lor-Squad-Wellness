import { createMockSession, getDefaultUserTitle, getRoleScope } from "../lib/auth";
import { getSupabaseClient } from "./supabaseClient";
import { pvProductCatalog, resolvePvProgram } from "../data/mockPvModule";
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
    lastAccessAt: row.last_access_at ?? undefined
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
    bodyScan: row.body_scan,
    questionnaire: row.questionnaire,
    pedagogicalFocus: row.pedagogical_focus ?? [],
    decisionClient: row.decision_client ?? null,
    typeDeSuite: row.type_de_suite ?? null,
    messageALaisser: row.message_a_laisser ?? null
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
    await client.auth.signOut();
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
  if (!user || !user.active) {
    await client.auth.signOut();
    return {
      ok: false as const,
      error:
        "Le compte existe bien, mais son profil applicatif est absent ou inactif dans la table users."
    };
  }

  await client
    .from("users")
    .update({ last_access_at: new Date().toISOString() })
    .eq("id", user.id);

  return {
    ok: true as const,
    user: { ...user, lastAccessAt: new Date().toISOString() },
    session: createSupabaseSession(user)
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

  if (error || !data) {
    return [] as Client[];
  }

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
      is_fragile: isFragile
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

  if (assessmentError) {
    console.error("Supabase assessment insert error:", assessmentError);
    throw new Error(`Impossible d'enregistrer le bilan : ${assessmentError.message}`);
  }

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
      sponsorId: payload.role === "distributor" ? payload.sponsorId ?? null : null,
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
