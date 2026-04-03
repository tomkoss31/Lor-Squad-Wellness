import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { buildSeedPvClientProductsForClient, resolvePvProgram } from "../data/mockPvModule";
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
  getStoredPvClientProducts,
  getStoredPvTransactions,
  persistClients,
  persistFollowUps,
  persistPvClientProducts,
  persistPvTransactions
} from "../services/appDataService";
import { resolveStorageMode } from "../services/supabaseClient";
import {
  addSupabaseFollowUpAssessment,
  createSupabaseClientWithInitialAssessment,
  createSupabaseUserAccess,
  deleteSupabaseClient,
  fetchSupabaseClients,
  fetchSupabaseFollowUps,
  fetchSupabasePvClientProducts,
  fetchSupabasePvTransactions,
  fetchSupabaseUsers,
  importLocalBusinessDataToSupabase,
  loginWithSupabaseCredentials,
  logoutFromSupabase,
  restoreSupabaseSession,
  addSupabasePvTransaction,
  upsertSupabasePvClientProduct,
  updateSupabaseAssessment,
  updateSupabaseClientSchedule,
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
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";

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
  pvClientProducts: PvClientProductRecord[];
  pvTransactions: PvClientTransaction[];
  programs: Program[];
  loginAs: (userId: string) => Promise<void>;
  loginWithCredentials: (
    payload: { email: string; password: string }
  ) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  forceResetSession: () => Promise<void>;
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
  deleteClient: (clientId: string) => Promise<void>;
  addFollowUpAssessment: (
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) => Promise<void>;
  updateAssessment: (clientId: string, assessment: AssessmentRecord) => Promise<void>;
  updateClientSchedule: (
    clientId: string,
    payload: {
      nextFollowUp: string;
      followUpId?: string;
      followUpType?: string;
      followUpStatus?: FollowUp["status"];
    }
  ) => Promise<void>;
  addPvTransaction: (transaction: PvClientTransaction) => Promise<void>;
  savePvClientProduct: (product: PvClientProductRecord) => Promise<void>;
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
  const [pvClientProducts, setPvClientProducts] = useState<PvClientProductRecord[]>([]);
  const [pvTransactions, setPvTransactions] = useState<PvClientTransaction[]>([]);

  async function refreshRemoteData(activeUser?: User | null) {
    const nextUser = activeUser ?? currentUser;
    try {
      const [nextClients, nextFollowUps, nextUsers, nextPvTransactions, nextPvClientProducts] = await Promise.all([
        fetchSupabaseClients(),
        fetchSupabaseFollowUps(),
        nextUser ? fetchSupabaseUsers() : Promise.resolve([] as User[]),
        fetchSupabasePvTransactions(),
        fetchSupabasePvClientProducts()
      ]);

      setClients(nextClients);
      setFollowUps(nextFollowUps);
      setUsers(nextUsers);
      setPvTransactions(nextPvTransactions);
      setPvClientProducts(nextPvClientProducts);
    } catch (error) {
      console.error("Impossible de recharger les donnees distantes.", error);
      setClients([]);
      setFollowUps([]);
      setUsers(nextUser ? [nextUser] : []);
      setPvTransactions([]);
      setPvClientProducts([]);
    }
  }

  useEffect(() => {
    async function initialize() {
      let nextStorageMode: StorageMode = "local";

      try {
        nextStorageMode = await resolveStorageMode();
        setStorageMode(nextStorageMode);

        if (nextStorageMode === "supabase") {
          setPvClientProducts(getStoredPvClientProducts());
          setPvTransactions(getStoredPvTransactions());
          try {
            const restored = await restoreSupabaseSession();
            if (restored) {
              setCurrentUser(restored.user);
              setCurrentSession(restored.session);
              await refreshRemoteData(restored.user);
            } else {
              setCurrentUser(null);
              setCurrentSession(null);
              setUsers([]);
              setClients([]);
              setFollowUps([]);
              setPvClientProducts([]);
              setPvTransactions([]);
            }
          } catch (error) {
            console.error("Initialisation Supabase impossible.", error);
            setCurrentUser(null);
            setCurrentSession(null);
            setUsers([]);
            setClients([]);
            setFollowUps([]);
            setPvClientProducts([]);
            setPvTransactions([]);
          }
          return;
        }

        setUsers(getStoredUsers());
        setClients(getStoredClients());
        setFollowUps(getStoredFollowUps());
        setPvClientProducts(getStoredPvClientProducts());
        setPvTransactions(getStoredPvTransactions());

        const restored = restoreSession();
        if (restored) {
          setCurrentUser(restored.user);
          setCurrentSession(restored.session);
        } else {
          setCurrentUser(null);
          setCurrentSession(null);
        }
      } catch (error) {
        console.error("Initialisation de session impossible.", error);
        if (nextStorageMode === "supabase") {
          setStorageMode("supabase");
          setUsers([]);
          setClients([]);
          setFollowUps([]);
          setPvClientProducts(getStoredPvClientProducts());
          setPvTransactions(getStoredPvTransactions());
        } else {
          setStorageMode("local");
          setUsers(getStoredUsers());
          setClients(getStoredClients());
          setFollowUps(getStoredFollowUps());
          setPvClientProducts(getStoredPvClientProducts());
          setPvTransactions(getStoredPvTransactions());
        }
        setCurrentUser(null);
        setCurrentSession(null);
      } finally {
        setAuthReady(true);
      }
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
    if (storageMode === "local") {
      persistFollowUps(followUps);
    }
  }, [followUps, storageMode]);

  useEffect(() => {
    persistPvClientProducts(pvClientProducts);
  }, [pvClientProducts]);

  useEffect(() => {
    persistPvTransactions(pvTransactions);
  }, [pvTransactions]);

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
      try {
        const result = await loginWithSupabaseCredentials(payload);
        if (!result.ok) {
          return { ok: false, error: result.error };
        }

        setCurrentUser(result.user);
        setCurrentSession(result.session);
        await refreshRemoteData(result.user);
        return { ok: true };
      } catch (error) {
        console.error("Connexion Supabase impossible.", error);
        return {
          ok: false,
          error: "La connexion Supabase a echoue avant de pouvoir ouvrir la session."
        };
      }
    }

    const result = loginWithMockCredentials(payload);
    if (!result) {
      return {
        ok: false,
        error: "Email ou mot de passe non reconnus pour cette version de demonstration."
      };
    }

    setCurrentUser(result.user);
    setCurrentSession(result.session);
    return { ok: true };
  }

  async function logout() {
    if (storageMode === "supabase") {
      try {
        await logoutFromSupabase();
      } catch (error) {
        console.error("Fermeture de session Supabase impossible.", error);
      }

      setCurrentUser(null);
      setCurrentSession(null);
      setUsers([]);
      setClients([]);
      setFollowUps([]);
      setPvClientProducts([]);
      setPvTransactions([]);
      return;
    }

    setCurrentUser(null);
    setCurrentSession(null);
    clearPersistedSession();
  }

  async function forceResetSession() {
    try {
      await logoutFromSupabase();
    } catch (error) {
      console.error("Impossible de fermer la session distante proprement.", error);
    }

    clearPersistedSession();
    setCurrentUser(null);
    setCurrentSession(null);

    if (storageMode === "supabase") {
      setUsers([]);
      setClients([]);
      setFollowUps([]);
      setPvClientProducts(getStoredPvClientProducts());
      setPvTransactions(getStoredPvTransactions());
      return;
    }

    setUsers(getStoredUsers());
    setClients(getStoredClients());
    setFollowUps(getStoredFollowUps());
    setPvClientProducts(getStoredPvClientProducts());
    setPvTransactions(getStoredPvTransactions());
  }

  async function createUserAccess(payload: {
    name: string;
    email: string;
    role: User["role"];
    active: boolean;
    mockPassword: string;
  }) {
    if (storageMode === "supabase") {
      try {
        const result = await createSupabaseUserAccess(payload);
        if (!result.ok) {
          return result;
        }

        await refreshRemoteData(currentUser);
        return { ok: true };
      } catch (error) {
        console.error("Creation d'acces Supabase impossible.", error);
        return {
          ok: false,
          error: "La creation du compte a echoue. Verifie la configuration backend."
        };
      }
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
    setPvClientProducts([]);
    setPvTransactions([]);
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

  function upsertLocalPvClientProduct(product: PvClientProductRecord) {
    setPvClientProducts((previousProducts) => {
      const existingIndex = previousProducts.findIndex(
        (item) => item.clientId === product.clientId && item.productId === product.productId
      );

      if (existingIndex === -1) {
        const nextProduct = product.id.startsWith("pv-seed-")
          ? { ...product, id: `pv-local-${Date.now()}-${product.productId}` }
          : product;
        return [nextProduct, ...previousProducts];
      }

      return previousProducts.map((item, index) =>
        index === existingIndex ? { ...item, ...product } : item
      );
    });
  }

  function syncLocalPvProductFromTransaction(transaction: PvClientTransaction) {
    const targetClient = clients.find((client) => client.id === transaction.clientId);
    const baseProgram = resolvePvProgram(targetClient?.pvProgramId ?? targetClient?.currentProgram);
    const existingProduct = pvClientProducts.find(
      (item) => item.clientId === transaction.clientId && item.productId === transaction.productId
    );

    upsertLocalPvClientProduct({
      id: existingProduct?.id ?? `pv-local-${Date.now()}-${transaction.productId}`,
      clientId: transaction.clientId,
      responsibleId: transaction.responsibleId,
      responsibleName: transaction.responsibleName,
      programId: existingProduct?.programId ?? baseProgram.id,
      productId: transaction.productId,
      productName: transaction.productName,
      quantityStart: transaction.quantity,
      startDate: transaction.date,
      durationReferenceDays: existingProduct?.durationReferenceDays ?? 21,
      pvPerUnit:
        transaction.quantity > 0 ? Number((transaction.pv / transaction.quantity).toFixed(2)) : transaction.pv,
      pricePublicPerUnit:
        transaction.quantity > 0
          ? Number((transaction.price / transaction.quantity).toFixed(2))
          : transaction.price,
      quantiteLabel: existingProduct?.quantiteLabel ?? "1 unite",
      noteMetier: existingProduct?.noteMetier,
      active: true
    });
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
    const pvProgram = resolvePvProgram(payload.assessment.programTitle);
    const nextClient: Client = {
      ...payload.client,
      id: clientId,
      status: "active",
      currentProgram: payload.assessment.programTitle,
      pvProgramId: pvProgram.id,
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
    setPvClientProducts((previousProducts) => [
      ...buildSeedPvClientProductsForClient(nextClient),
      ...previousProducts
    ]);

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
          pvProgramId: resolvePvProgram(assessment.programTitle).id,
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

  async function deleteClient(clientId: string) {
    if (storageMode === "supabase") {
      await deleteSupabaseClient(clientId);
      await refreshRemoteData(currentUser);
      return;
    }

    setClients((previousClients) => previousClients.filter((client) => client.id !== clientId));
    setFollowUps((previousFollowUps) =>
      previousFollowUps.filter((followUp) => followUp.clientId !== clientId)
    );
    setPvClientProducts((previousProducts) =>
      previousProducts.filter((product) => product.clientId !== clientId)
    );
    setPvTransactions((previousTransactions) =>
      previousTransactions.filter((transaction) => transaction.clientId !== clientId)
    );
  }

  async function updateAssessment(clientId: string, assessment: AssessmentRecord) {
    if (storageMode === "supabase") {
      await updateSupabaseAssessment(clientId, assessment);
      await refreshRemoteData(currentUser);
      return;
    }

    setClients((previousClients) =>
      previousClients.map((client) => {
        if (client.id !== clientId) {
          return client;
        }

        const nextAssessments = client.assessments.map((item) =>
          item.id === assessment.id ? assessment : item
        );

        return {
          ...client,
          currentProgram: assessment.type === "initial" ? assessment.programTitle : client.currentProgram,
          pvProgramId:
            assessment.type === "initial"
              ? resolvePvProgram(assessment.programTitle).id
              : client.pvProgramId,
          startDate: assessment.type === "initial" ? assessment.date : client.startDate,
          assessments: nextAssessments
        };
      })
    );

    if (assessment.type === "initial") {
      const targetClient = clients.find((client) => client.id === clientId);
      if (targetClient && !pvClientProducts.some((item) => item.clientId === clientId)) {
        const seededClient: Client = {
          ...targetClient,
          currentProgram: assessment.programTitle,
          pvProgramId: resolvePvProgram(assessment.programTitle).id,
          startDate: assessment.date
        };
        setPvClientProducts((previousProducts) => [
          ...buildSeedPvClientProductsForClient(seededClient),
          ...previousProducts
        ]);
      }
    }
  }

  async function updateClientSchedule(
    clientId: string,
    payload: {
      nextFollowUp: string;
      followUpId?: string;
      followUpType?: string;
      followUpStatus?: FollowUp["status"];
    }
  ) {
    if (storageMode === "supabase") {
      await updateSupabaseClientSchedule(clientId, payload);
      await refreshRemoteData(currentUser);
      return;
    }

    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === clientId
          ? {
              ...client,
              nextFollowUp: payload.nextFollowUp
            }
          : client
      )
    );

    setFollowUps((previousFollowUps) =>
      previousFollowUps.map((followUp) => {
        const matchesById = payload.followUpId ? followUp.id === payload.followUpId : false;
        const matchesByClient = !payload.followUpId && followUp.clientId === clientId;

        if (!matchesById && !matchesByClient) {
          return followUp;
        }

        return {
          ...followUp,
          dueDate: payload.nextFollowUp,
          type: payload.followUpType ?? followUp.type,
          status: payload.followUpStatus ?? followUp.status
        };
      })
    );
  }

  async function addPvTransaction(transaction: PvClientTransaction) {
    if (storageMode === "supabase") {
      await addSupabasePvTransaction(transaction);
      await refreshRemoteData(currentUser);
      return;
    }

    setPvTransactions((previousTransactions) => [transaction, ...previousTransactions]);
    syncLocalPvProductFromTransaction(transaction);
  }

  async function savePvClientProduct(product: PvClientProductRecord) {
    if (storageMode === "supabase") {
      await upsertSupabasePvClientProduct(product);
      await refreshRemoteData(currentUser);
      return;
    }

    upsertLocalPvClientProduct(product);
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
      pvClientProducts,
      pvTransactions,
      programs: mockPrograms,
      loginAs,
      loginWithCredentials,
      logout,
      forceResetSession,
      createUserAccess,
      updateUserStatus,
      resetAccessData,
      clearBusinessData,
      importLocalBusinessData,
      getClientById,
      canAccessClient: canAccessClientById,
      createClientWithInitialAssessment,
      deleteClient,
      addFollowUpAssessment,
      updateAssessment,
      updateClientSchedule,
      addPvTransaction,
      savePvClientProduct
    }),
    [
      authReady,
      clients,
      currentSession,
      currentUser,
      followUps,
      pvClientProducts,
      pvTransactions,
      storageMode,
      users
    ]
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
