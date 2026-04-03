import { createMockSession, getDefaultUserTitle, getRoleScope } from "../lib/auth";
import { getSupabaseClient } from "./supabaseClient";
import { pvProductCatalog, resolvePvProgram } from "../data/mockPvModule";
import type {
  AssessmentRecord,
  AuthSession,
  Client,
  FollowUp,
  User
} from "../types/domain";
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

function buildSeedPvProducts(payload: {
  clientId: string;
  distributorId: string;
  distributorName: string;
  programTitle: string;
  startDate: string;
}) {
  const program = resolvePvProgram(payload.programTitle);

  return program.includedProductIds.flatMap((productId) => {
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
    pedagogicalFocus: row.pedagogical_focus ?? []
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
    return [] as PvClientTransaction[];
  }

  return (data as PvTransactionRow[]).map(mapPvTransaction);
}

export async function createSupabaseClientWithInitialAssessment(payload: {
  client: Omit<Client, "id" | "status" | "currentProgram" | "started" | "startDate" | "nextFollowUp" | "notes" | "assessments">;
  assessment: AssessmentRecord;
  nextFollowUp: string;
  notes: string;
}) {
  const client = await requireSupabase();
  const pvProgram = resolvePvProgram(payload.assessment.programTitle);
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
      status: "active",
      objective: payload.client.objective,
      current_program: payload.assessment.programTitle,
      pv_program_id: pvProgram.id,
      started: true,
      start_date: payload.assessment.date,
      next_follow_up: payload.nextFollowUp,
      notes: payload.notes
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

  if (clientError || !insertedClient) {
    throw new Error("Impossible de creer le client dans la base.");
  }

  const clientId = insertedClient.id;

  const { error: assessmentError } = await client.from("assessments").insert({
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
    pedagogical_focus: payload.assessment.pedagogicalFocus
  });

  if (assessmentError) {
    throw new Error("Impossible d'enregistrer le premier bilan.");
  }

  const { error: followUpError } = await client.from("follow_ups").insert({
    client_id: clientId,
    client_name: `${payload.client.firstName} ${payload.client.lastName}`,
    due_date: payload.nextFollowUp,
    type: "Premier suivi",
    status: "scheduled",
    program_title: payload.assessment.programTitle,
    last_assessment_date: payload.assessment.date
  });

  if (followUpError) {
    throw new Error("Impossible de creer le premier suivi.");
  }

  const seedProducts = buildSeedPvProducts({
    clientId,
    distributorId: payload.client.distributorId,
    distributorName: payload.client.distributorName,
    programTitle: payload.assessment.programTitle,
    startDate: payload.assessment.date
  });

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

  const isSeedRecord = !product.id || product.id.startsWith("pv-seed-");
  const query = isSeedRecord
    ? client.from("pv_client_products").insert(payload).select("*").single<PvClientProductRow>()
    : client
        .from("pv_client_products")
        .update(payload)
        .eq("id", product.id)
        .select("*")
        .single<PvClientProductRow>();

  const { data, error } = await query;

  if (error || !data) {
    throw new Error("Impossible de mettre a jour ce produit actif.");
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
    throw new Error("Impossible d'ajouter ce mouvement produit.");
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

  const result = (await response.json()) as { ok: boolean; error?: string };
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

export async function importLocalBusinessDataToSupabase(payload: {
  clients: Client[];
  followUps: FollowUp[];
  owner: User;
}) {
  const client = await requireSupabase();
  let imported = 0;
  let skipped = 0;

  for (const localClient of payload.clients) {
    const pvProgram = resolvePvProgram(localClient.pvProgramId ?? localClient.currentProgram);
    const { data: existingClient } = await client
      .from("clients")
      .select("id")
      .eq("email", localClient.email)
      .eq("first_name", localClient.firstName)
      .eq("last_name", localClient.lastName)
      .maybeSingle<{ id: string }>();

    if (existingClient?.id) {
      skipped += 1;
      continue;
    }

    const clientInsertPayload = {
      first_name: localClient.firstName,
      last_name: localClient.lastName,
      sex: localClient.sex,
      phone: localClient.phone,
      email: localClient.email,
      age: localClient.age,
      height: localClient.height,
      job: localClient.job,
      city: localClient.city ?? null,
      distributor_id: payload.owner.id,
      distributor_name: payload.owner.name,
      status: localClient.status,
      objective: localClient.objective,
      current_program: localClient.currentProgram,
      pv_program_id: pvProgram.id,
      started: localClient.started,
      start_date: localClient.startDate ?? null,
      next_follow_up: localClient.nextFollowUp,
      notes: localClient.notes
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

    if (clientError || !insertedClient) {
      throw new Error(
        `Impossible d'importer le dossier de ${localClient.firstName} ${localClient.lastName}.`
      );
    }

    for (const assessment of localClient.assessments) {
      const { error: assessmentError } = await client.from("assessments").insert({
        id: assessment.id,
        client_id: insertedClient.id,
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
        throw new Error(
          `Impossible d'importer un bilan pour ${localClient.firstName} ${localClient.lastName}.`
        );
      }
    }

    const matchingFollowUp = payload.followUps.find(
      (followUp) => followUp.clientId === localClient.id
    );

    const { error: followUpError } = await client.from("follow_ups").insert({
      client_id: insertedClient.id,
      client_name: `${localClient.firstName} ${localClient.lastName}`,
      due_date: matchingFollowUp?.dueDate ?? localClient.nextFollowUp,
      type: matchingFollowUp?.type ?? "Premier suivi",
      status: matchingFollowUp?.status ?? "scheduled",
      program_title: matchingFollowUp?.programTitle ?? localClient.currentProgram,
      last_assessment_date:
        matchingFollowUp?.lastAssessmentDate ??
        localClient.assessments[0]?.date ??
        new Date().toISOString().slice(0, 10)
    });

    if (followUpError) {
      throw new Error(
        `Impossible d'importer le suivi de ${localClient.firstName} ${localClient.lastName}.`
      );
    }

    const seedProducts = buildSeedPvProducts({
      clientId: insertedClient.id,
      distributorId: payload.owner.id,
      distributorName: payload.owner.name,
      programTitle: localClient.currentProgram,
      startDate:
        localClient.startDate ??
        localClient.assessments[0]?.date ??
        new Date().toISOString().slice(0, 10)
    });

    if (seedProducts.length) {
      const { error: pvSeedError } = await client.from("pv_client_products").insert(seedProducts);
      if (pvSeedError && !isMissingTableError(pvSeedError, "pv_client_products")) {
        throw new Error(
          `Impossible d'initialiser le suivi PV pour ${localClient.firstName} ${localClient.lastName}.`
        );
      }
    }

    imported += 1;
  }

  return { imported, skipped };
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

  const result = (await response.json()) as { ok: boolean; error?: string };
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

  const result = (await response.json()) as { ok: boolean; error?: string };
  if (!response.ok || !result.ok) {
    throw new Error(result.error ?? "Impossible de mettre a jour cet acces.");
  }
}

export async function updateSupabaseUserStatus(userId: string, active: boolean) {
  const client = await requireSupabase();
  const { error } = await client.from("users").update({ active }).eq("id", userId);

  if (error) {
    throw new Error("Impossible de modifier le statut de cet acces.");
  }
}
