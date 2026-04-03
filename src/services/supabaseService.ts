import { createMockSession, getRoleScope } from "../lib/auth";
import { getSupabaseClient } from "./supabaseClient";
import type {
  AssessmentRecord,
  AuthSession,
  Client,
  FollowUp,
  User
} from "../types/domain";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: User["role"];
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

async function requireSupabase() {
  const supabase = await getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase n'est pas configure.");
  }

  return supabase;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
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

export async function createSupabaseClientWithInitialAssessment(payload: {
  client: Omit<Client, "id" | "status" | "currentProgram" | "started" | "startDate" | "nextFollowUp" | "notes" | "assessments">;
  assessment: AssessmentRecord;
  nextFollowUp: string;
  notes: string;
}) {
  const client = await requireSupabase();
  const { data: insertedClient, error: clientError } = await client
    .from("clients")
    .insert({
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
      started: true,
      start_date: payload.assessment.date,
      next_follow_up: payload.nextFollowUp,
      notes: payload.notes
    })
    .select("id")
    .single<{ id: string }>();

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

  return clientId;
}

export async function addSupabaseFollowUpAssessment(
  clientId: string,
  assessment: AssessmentRecord,
  followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
) {
  const client = await requireSupabase();

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

  const { error: clientError } = await client
    .from("clients")
    .update({
      current_program: assessment.programTitle,
      next_follow_up: followUpMeta.dueDate,
      status: "follow-up"
    })
    .eq("id", clientId);

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

    const { data: insertedClient, error: clientError } = await client
      .from("clients")
      .insert({
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
        started: localClient.started,
        start_date: localClient.startDate ?? null,
        next_follow_up: localClient.nextFollowUp,
        notes: localClient.notes
      })
      .select("id")
      .single<{ id: string }>();

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

    imported += 1;
  }

  return { imported, skipped };
}

export async function createSupabaseUserAccess(payload: {
  name: string;
  email: string;
  role: User["role"];
  active: boolean;
  mockPassword: string;
}) {
  const response = await fetch("/api/admin-create-user", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = (await response.json()) as { ok: boolean; error?: string };
  return result;
}

export async function updateSupabaseUserStatus(userId: string, active: boolean) {
  const client = await requireSupabase();
  const { error } = await client.from("users").update({ active }).eq("id", userId);

  if (error) {
    throw new Error("Impossible de modifier le statut de cet acces.");
  }
}
