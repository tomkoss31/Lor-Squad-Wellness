import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { mockPrograms } from "../data/mockPrograms";
import { canAccessClient, getVisibleClients, getVisibleFollowUps } from "../lib/auth";
import {
  clearPersistedSession,
  createMockUser,
  getStoredUsers,
  loginWithMockCredentials,
  resetMockAuthData,
  restoreSession,
  updateMockUserStatus
} from "../services/authService";
import {
  clearStoredAppData,
  getStoredClients,
  getStoredFollowUps,
  persistClients,
  persistFollowUps
} from "../services/appDataService";
import { resolveStorageMode } from "../services/supabaseClient";
import {
  addSupabaseFollowUpAssessment,
  createSupabaseClientWithInitialAssessment,
  createSupabaseUserAccess,
  fetchSupabaseClients,
  fetchSupabaseFollowUps,
  fetchSupabaseUsers,
  importLocalBusinessDataToSupabase,
  loginWithSupabaseCredentials,
  logoutFromSupabase,
  restoreSupabaseSession,
  updateSupabaseUserStatus
} from "../services/supabaseService";
import type {
  AssessmentRecord,
  AuthSession,
  Client,
  FollowUp,
  Program,
  User
} from "../types/domain";

type StorageMode = "local" | "supabase";

interface AppContextValue {
  authReady: boolean;
  storageMode: StorageMode;
  currentUser: User | null;
  currentSession: AuthSession | null;
  users: User[];
  clients: Client[];
  visibleClients: Client[];
  followUps: FollowUp[];
  visibleFollowUps: FollowUp[];
  programs: Program[];
  loginAs: (userId: string) => Promise<void>;
  loginWithCredentials: (payload: { email: string; password: string }) => Promise<boolean>;
  logout: () => Promise<void>;
  createUserAccess: (payload: {
    name: string;
    email: string;
    role: User["role"];
    active: boolean;
    mockPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateUserStatus: (userId: string, active: boolean) => Promise<void>;
  resetAccessData: () => void;
  clearBusinessData: () => void;
  importLocalBusinessData: () => Promise<{ imported: number; skipped: number }>;
  getClientById: (clientId: string) => Client | undefined;
  canAccessClient: (clientId: string) => boolean;
  createClientWithInitialAssessment: (payload: {
    client: Omit<Client, "id" | "status" | "currentProgram" | "started" | "startDate" | "nextFollowUp" | "notes" | "assessments">;
    assessment: AssessmentRecord;
    nextFollowUp: string;
    notes: string;
  }) => Promise<string>;
  addFollowUpAssessment: (
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [storageMode, setStorageMode] = useState<StorageMode>("local");
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  async function refreshRemoteData(activeUser?: User | null) {
    const nextUser = activeUser ?? currentUser;
    const [nextClients, nextFollowUps, nextUsers] = await Promise.all([
      fetchSupabaseClients(),
      fetchSupabaseFollowUps(),
      nextUser ? fetchSupabaseUsers() : Promise.resolve([] as User[])
    ]);

    setClients(nextClients);
    setFollowUps(nextFollowUps);
    setUsers(nextUsers);
  }

  useEffect(() => {
    async function initialize() {
      const nextStorageMode = await resolveStorageMode();
      setStorageMode(nextStorageMode);

      if (nextStorageMode === "supabase") {
        const restored = await restoreSupabaseSession();
        if (restored) {
          setCurrentUser(restored.user);
          setCurrentSession(restored.session);
          await refreshRemoteData(restored.user);
        } else {
          setUsers([]);
          setClients([]);
          setFollowUps([]);
        }
        setAuthReady(true);
        return;
      }

      setUsers(getStoredUsers());
      setClients(getStoredClients());
      setFollowUps(getStoredFollowUps());

      const restored = restoreSession();
      if (restored) {
        setCurrentUser(restored.user);
        setCurrentSession(restored.session);
      }
      setAuthReady(true);
    }

    void initialize();
  }, []);

  useEffect(() => {
    if (storageMode !== "local") {
      return;
    }

    persistClients(clients);
  }, [clients, storageMode]);

  useEffect(() => {
    if (storageMode !== "local") {
      return;
    }

    persistFollowUps(followUps);
  }, [followUps, storageMode]);

  async function loginAs(userId: string) {
    const matchedUser = users.find((user) => user.id === userId);
    if (!matchedUser) {
      return;
    }

    await loginWithCredentials({
      email: matchedUser.email,
      password: "demo1234"
    });
  }

  async function loginWithCredentials(payload: { email: string; password: string }) {
    if (storageMode === "supabase") {
      const result = await loginWithSupabaseCredentials(payload);
      if (!result) {
        return false;
      }

      setCurrentUser(result.user);
      setCurrentSession(result.session);
      await refreshRemoteData(result.user);
      return true;
    }

    const result = loginWithMockCredentials(payload);
    if (!result) {
      return false;
    }

    setCurrentUser(result.user);
    setCurrentSession(result.session);
    return true;
  }

  async function logout() {
    if (storageMode === "supabase") {
      await logoutFromSupabase();
      setCurrentUser(null);
      setCurrentSession(null);
      setUsers([]);
      setClients([]);
      setFollowUps([]);
      return;
    }

    setCurrentUser(null);
    setCurrentSession(null);
    clearPersistedSession();
  }

  async function createUserAccess(payload: {
    name: string;
    email: string;
    role: User["role"];
    active: boolean;
    mockPassword: string;
  }) {
    if (storageMode === "supabase") {
      const result = await createSupabaseUserAccess(payload);
      if (!result.ok) {
        return result;
      }

      await refreshRemoteData(currentUser);
      return { ok: true };
    }

    const result = createMockUser(payload);
    if (!result.ok || !result.users) {
      return { ok: false, error: result.error };
    }

    setUsers(result.users);
    return { ok: true };
  }

  async function updateUserStatus(userId: string, active: boolean) {
    if (storageMode === "supabase") {
      await updateSupabaseUserStatus(userId, active);
      await refreshRemoteData(currentUser);

      if (currentUser?.id === userId && !active) {
        await logout();
      }
      return;
    }

    const result = updateMockUserStatus(userId, active);
    if (!result.users) {
      return;
    }

    setUsers(result.users);

    if (currentUser?.id === userId && !active) {
      await logout();
    }
  }

  function resetAccessData() {
    if (storageMode === "supabase") {
      return;
    }

    const nextUsers = resetMockAuthData();
    setUsers(nextUsers);
    setCurrentUser(null);
    setCurrentSession(null);
  }

  function clearBusinessData() {
    if (storageMode === "supabase") {
      return;
    }

    const cleared = clearStoredAppData();
    setClients(cleared.clients);
    setFollowUps(cleared.followUps);
  }

  async function importLocalBusinessData() {
    if (storageMode !== "supabase" || !currentUser) {
      return { imported: 0, skipped: 0 };
    }

    const localClients = getStoredClients();
    const localFollowUps = getStoredFollowUps();

    const result = await importLocalBusinessDataToSupabase({
      clients: localClients,
      followUps: localFollowUps,
      owner: currentUser
    });

    await refreshRemoteData(currentUser);
    return result;
  }

  function getClientById(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    if (!client || !canAccessClient(currentUser, client)) {
      return undefined;
    }

    return client;
  }

  function canAccessClientById(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    return client ? canAccessClient(currentUser, client) : false;
  }

  async function createClientWithInitialAssessment(payload: {
    client: Omit<Client, "id" | "status" | "currentProgram" | "started" | "startDate" | "nextFollowUp" | "notes" | "assessments">;
    assessment: AssessmentRecord;
    nextFollowUp: string;
    notes: string;
  }) {
    if (storageMode === "supabase") {
      const clientId = await createSupabaseClientWithInitialAssessment(payload);
      await refreshRemoteData(currentUser);
      return clientId;
    }

    const clientId = `c-${Date.now()}`;
    const nextClient: Client = {
      ...payload.client,
      id: clientId,
      status: "active",
      currentProgram: payload.assessment.programTitle,
      started: true,
      startDate: payload.assessment.date,
      nextFollowUp: payload.nextFollowUp,
      notes: payload.notes,
      assessments: [payload.assessment]
    };

    const nextFollowUpItem: FollowUp = {
      id: `f-${Date.now()}`,
      clientId,
      clientName: `${nextClient.firstName} ${nextClient.lastName}`,
      dueDate: payload.nextFollowUp,
      type: "Premier suivi",
      status: "scheduled",
      programTitle: payload.assessment.programTitle,
      lastAssessmentDate: payload.assessment.date
    };

    setClients((previousClients) => [nextClient, ...previousClients]);
    setFollowUps((previousFollowUps) => [nextFollowUpItem, ...previousFollowUps]);

    return clientId;
  }

  async function addFollowUpAssessment(
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) {
    if (storageMode === "supabase") {
      await addSupabaseFollowUpAssessment(clientId, assessment, followUpMeta);
      await refreshRemoteData(currentUser);
      return;
    }

    const targetClient = clients.find((client) => client.id === clientId);
    if (!targetClient) {
      return;
    }

    setClients((previousClients) =>
      previousClients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }

        return {
          ...client,
          currentProgram: assessment.programTitle,
          nextFollowUp: followUpMeta.dueDate,
          status: "follow-up",
          assessments: [assessment, ...client.assessments]
        };
      })
    );

    setFollowUps((previousFollowUps) => {
      const nextItem: FollowUp = {
        id: `f-${Date.now()}`,
        clientId,
        clientName: `${targetClient.firstName} ${targetClient.lastName}`,
        dueDate: followUpMeta.dueDate,
        type: followUpMeta.type,
        status: followUpMeta.status,
        programTitle: assessment.programTitle,
        lastAssessmentDate: assessment.date
      };

      return [nextItem, ...previousFollowUps.filter((item) => item.clientId !== clientId)];
    });
  }

  const value = useMemo(
    () => ({
      authReady,
      storageMode,
      currentUser,
      currentSession,
      users,
      clients,
      visibleClients: getVisibleClients(currentUser, clients),
      followUps,
      visibleFollowUps: getVisibleFollowUps(currentUser, followUps, clients),
      programs: mockPrograms,
      loginAs,
      loginWithCredentials,
      logout,
      createUserAccess,
      updateUserStatus,
      resetAccessData,
      clearBusinessData,
      importLocalBusinessData,
      getClientById,
      canAccessClient: canAccessClientById,
      createClientWithInitialAssessment,
      addFollowUpAssessment
    }),
    [authReady, clients, currentSession, currentUser, followUps, storageMode, users]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
