import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  buildSeedPvClientProductsForClient,
  pvProductCatalog,
  resolvePvProgram
} from "../data/mockPvModule";
import { mockPrograms } from "../data/mockPrograms";
import { canAccessClient, getVisibleClients, getVisibleFollowUps } from "../lib/auth";
import {
  clearPersistedSession,
  createMockUser,
  getStoredUsers,
  loginWithMockCredentials,
  resetMockAuthData,
  restoreSession,
  updateMockUserAccess,
  updateMockUserPassword,
  updateMockUserStatus
} from "../services/authService";
import {
  clearStoredAppData,
  getStoredActivityLogs,
  getStoredClients,
  getStoredFollowUps,
  getStoredPvClientProducts,
  getStoredPvTransactions,
  persistActivityLogs,
  persistClients,
  persistFollowUps,
  persistPvClientProducts,
  persistPvTransactions
} from "../services/appDataService";
import { resolveStorageMode, getSupabaseClient } from "../services/supabaseClient";
import {
  addSupabaseFollowUpAssessment,
  createSupabaseClientWithInitialAssessment,
  createSupabaseActivityLog,
  createSupabaseUserAccess,
  deleteSupabaseClient,
  fetchSupabaseActivityLogs,
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
  repairSupabaseUserAccess,
  reassignSupabaseClientOwner,
  upsertSupabasePvClientProduct,
  updateSupabaseAssessment,
  updateSupabaseClientSchedule,
  updateSupabaseClientLifecycleStatus,
  updateSupabaseClientFragileFlag,
  updateSupabaseUserAccess,
  updateSupabaseUserPassword,
  updateSupabaseUserStatus
} from "../services/supabaseService";
import type {
  ActivityLog,
  AssessmentRecord,
  AuthSession,
  Client,
  ClientMessage,
  FollowUp,
  LifecycleStatus,
  Program,
  User
} from "../types/domain";
import { deriveLifecycleFromAssessment } from "../lib/lifecycleMapping";
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
  activityLogs: ActivityLog[];
  pvClientProducts: PvClientProductRecord[];
  pvTransactions: PvClientTransaction[];
  programs: Program[];
  clientMessages: ClientMessage[];
  unreadMessageCount: number;
  markMessageRead: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  updateClientInfo: (clientId: string, data: { phone?: string; email?: string; city?: string }) => Promise<void>;
  setClientLifecycleStatus: (clientId: string, newStatus: LifecycleStatus) => Promise<void>;
  setClientFragileFlag: (clientId: string, isFragile: boolean) => Promise<void>;
  updateFollowUpStatus: (followUpId: string, status: 'scheduled' | 'pending' | 'completed' | 'dismissed') => Promise<void>;
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
    sponsorId?: string;
    active: boolean;
    mockPassword: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  repairUserAccess: (payload: {
    userId?: string;
    email: string;
    name?: string;
    role: User["role"];
    sponsorId?: string;
    active: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  updateUserAccess: (
    userId: string,
    payload: {
      role: User["role"];
      sponsorId?: string;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  updateUserPassword: (
    userId: string,
    password: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateUserStatus: (userId: string, active: boolean) => Promise<void>;
  resetAccessData: () => void;
  clearBusinessData: () => void;
  importLocalBusinessData: () => Promise<{ imported: number; skipped: number }>;
  getClientById: (clientId: string) => Client | undefined;
  canAccessClient: (clientId: string) => boolean;
  createClientWithInitialAssessment: (payload: {
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
  reassignClientOwner: (
    clientId: string,
    payload: {
      distributorId: string;
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
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [pvClientProducts, setPvClientProducts] = useState<PvClientProductRecord[]>([]);
  const [pvTransactions, setPvTransactions] = useState<PvClientTransaction[]>([]);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);

  async function refreshRemoteData(activeUser?: User | null) {
    const nextUser = activeUser ?? currentUser;
    try {
      const [
        nextClients,
        nextFollowUps,
        nextUsers,
        nextPvTransactions,
        nextPvClientProducts,
        nextActivityLogs
      ] = await Promise.all([
        fetchSupabaseClients(),
        fetchSupabaseFollowUps(),
        nextUser ? fetchSupabaseUsers() : Promise.resolve([] as User[]),
        fetchSupabasePvTransactions(),
        fetchSupabasePvClientProducts(),
        fetchSupabaseActivityLogs().catch((error) => {
          console.error("Historique d'activité indisponible pour l'instant.", error);
          return [] as ActivityLog[];
        })
      ]);

      setClients(nextClients);
      setFollowUps(nextFollowUps);
      setUsers(nextUsers);
      setPvTransactions(nextPvTransactions);
      setPvClientProducts(nextPvClientProducts);
      setActivityLogs(nextActivityLogs);

      // Fetch messages
      try {
        const sb2 = await getSupabaseClient();
        if (sb2) {
          const { data: msgs } = await sb2.from('client_messages').select('*').order('created_at', { ascending: false }).limit(50);
          setClientMessages((msgs ?? []) as ClientMessage[]);
        }
      } catch { /* messages unavailable */ }
    } catch (error) {
      console.error("Impossible de recharger les donnees distantes.", error);
      setClients([]);
      setFollowUps([]);
      setUsers(nextUser ? [nextUser] : []);
      setPvTransactions([]);
      setPvClientProducts([]);
      setActivityLogs([]);
      setClientMessages([]);
    }
  }

  useEffect(() => {
    async function initialize() {
      let nextStorageMode: StorageMode = "local";

      try {
        nextStorageMode = await resolveStorageMode();
        setStorageMode(nextStorageMode);

        if (nextStorageMode === "supabase") {
          setActivityLogs(getStoredActivityLogs());
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
              setActivityLogs([]);
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
            setActivityLogs([]);
            setPvClientProducts([]);
            setPvTransactions([]);
          }
          return;
        }

        setUsers(getStoredUsers());
        setClients(getStoredClients());
        setFollowUps(getStoredFollowUps());
        setActivityLogs(getStoredActivityLogs());
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
          setActivityLogs(getStoredActivityLogs());
          setPvClientProducts(getStoredPvClientProducts());
          setPvTransactions(getStoredPvTransactions());
        } else {
          setStorageMode("local");
          setUsers(getStoredUsers());
          setClients(getStoredClients());
          setFollowUps(getStoredFollowUps());
          setActivityLogs(getStoredActivityLogs());
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
    if (storageMode === "local") {
      persistActivityLogs(activityLogs);
    }
  }, [activityLogs, storageMode]);

  useEffect(() => {
    persistPvClientProducts(pvClientProducts);
  }, [pvClientProducts]);

  useEffect(() => {
    persistPvTransactions(pvTransactions);
  }, [pvTransactions]);

  async function recordActivity(
    payload: Omit<ActivityLog, "id" | "createdAt" | "actorId" | "actorName">,
    actor = currentUser
  ) {
    if (!actor) {
      return;
    }

    const nextEntry: ActivityLog = {
      id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      ...payload
    };

    if (storageMode === "supabase") {
      try {
        const createdEntry = await createSupabaseActivityLog(nextEntry);
        setActivityLogs((previousLogs) => [createdEntry, ...previousLogs].slice(0, 120));
        return;
      } catch (error) {
        console.error("Journal d'activité indisponible.", error);
        return;
      }
    }

    setActivityLogs((previousLogs) => [nextEntry, ...previousLogs].slice(0, 120));
  }

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
          error: "La connexion Supabase a échoué avant de pouvoir ouvrir la session."
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
    setActivityLogs(getStoredActivityLogs());
    setPvClientProducts(getStoredPvClientProducts());
    setPvTransactions(getStoredPvTransactions());
  }

  async function createUserAccess(payload: {
    name: string;
    email: string;
    role: User["role"];
    sponsorId?: string;
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
        await recordActivity({
          action: "user-created",
          targetUserName: payload.name.trim(),
          summary: `${payload.name.trim()} rejoint l'equipe.`,
          detail: `${payload.role === "admin" ? "Admin" : payload.role === "referent" ? "Référent" : "Distributeur"} cree depuis la page equipe.`
        });
        return { ok: true };
      } catch (error) {
        console.error("Creation d'accès Supabase impossible.", error);
        return {
          ok: false,
          error: "La création du compte a échoué. Verifie la configuration backend."
        };
      }
    }

    const result = createMockUser(payload);
    if (!result.ok || !result.users) {
      return { ok: false, error: result.error };
    }

    setUsers(result.users);
    await recordActivity({
      action: "user-created",
      targetUserName: payload.name.trim(),
      summary: `${payload.name.trim()} rejoint l'equipe.`,
      detail: `${payload.role === "admin" ? "Admin" : payload.role === "referent" ? "Référent" : "Distributeur"} cree en mode local.`
    });
    return { ok: true };
  }

  async function updateUserAccess(
    userId: string,
    payload: {
      role: User["role"];
      sponsorId?: string;
    }
  ) {
    if (storageMode === "supabase") {
      try {
        const targetUser = users.find((user) => user.id === userId);
        await updateSupabaseUserAccess(userId, payload);
        await refreshRemoteData(currentUser);
        await recordActivity({
          action: "user-updated",
          targetUserId: userId,
          targetUserName: targetUser?.name,
          ownerUserId: payload.role === "distributor" ? payload.sponsorId : userId,
          summary: `Acces mis a jour pour ${targetUser?.name ?? "ce compte"}.`,
          detail: `Role passe sur ${payload.role === "referent" ? "Référent" : payload.role === "admin" ? "Admin" : "Distributeur"}.`
        });
        return { ok: true };
      } catch (error) {
        console.error("Mise à jour d'accès Supabase impossible.", error);
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "La mise à jour de cet accès a échoué."
        };
      }
    }

    const result = updateMockUserAccess(userId, payload);
    if (!result.ok || !result.users) {
      return { ok: false, error: result.error };
    }

    setUsers(result.users);
    const targetUser = result.users.find((user) => user.id === userId);
    await recordActivity({
      action: "user-updated",
      targetUserId: userId,
      targetUserName: targetUser?.name,
      ownerUserId: payload.role === "distributor" ? payload.sponsorId : userId,
      summary: `Acces mis a jour pour ${targetUser?.name ?? "ce compte"}.`,
      detail: `Role passe sur ${payload.role === "referent" ? "Référent" : payload.role === "admin" ? "Admin" : "Distributeur"}.`
    });
    return { ok: true };
  }

  async function repairUserAccess(payload: {
    userId?: string;
    email: string;
    name?: string;
    role: User["role"];
    sponsorId?: string;
    active: boolean;
  }) {
    if (storageMode !== "supabase") {
      return {
        ok: false,
        error: "La reparation d'un compte Auth est disponible uniquement avec Supabase."
      };
    }

    try {
      const result = await repairSupabaseUserAccess(payload);
      if (!result.ok) {
        return result;
      }

      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "user-updated",
        targetUserId: payload.userId,
        targetUserName: payload.name?.trim() || payload.email.trim().toLowerCase(),
        ownerUserId: payload.role === "distributor" ? payload.sponsorId : payload.userId,
        summary: `Profil applicatif recréée pour ${payload.name?.trim() || payload.email.trim().toLowerCase()}.`,
        detail: `${payload.role === "admin" ? "Admin" : payload.role === "referent" ? "Référent" : "Distributeur"} répare depuis la page equipe.`
      });
      return { ok: true };
    } catch (error) {
      console.error("Réparation d'accès Supabase impossible.", error);
      return {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Impossible de reparer ce profil applicatif."
      };
    }
  }

  async function updateUserStatus(userId: string, active: boolean) {
    const targetUser = users.find((user) => user.id === userId);
    if (storageMode === "supabase") {
      await updateSupabaseUserStatus(userId, active);
      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "user-status-updated",
        targetUserId: userId,
        targetUserName: targetUser?.name,
        ownerUserId: userId,
        summary: `${targetUser?.name ?? "Le compte"} est ${active ? "reactive" : "desactive"}.`,
        detail: active ? "Le compte peut revenir sur la plateforme." : "Le compte n'a plus accès a l'application."
      });

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
    await recordActivity({
      action: "user-status-updated",
      targetUserId: userId,
      targetUserName: targetUser?.name,
      ownerUserId: userId,
      summary: `${targetUser?.name ?? "Le compte"} est ${active ? "reactive" : "desactive"}.`,
      detail: active ? "Le compte peut revenir sur la plateforme." : "Le compte n'a plus accès a l'application."
    });

    if (currentUser?.id === userId && !active) {
      await logout();
    }
  }

  async function updateUserPassword(userId: string, password: string) {
    if (storageMode === "supabase") {
      try {
        const targetUser = users.find((user) => user.id === userId);
        await updateSupabaseUserPassword(userId, password);
        await recordActivity({
          action: "user-updated",
          targetUserId: userId,
          targetUserName: targetUser?.name,
          ownerUserId: userId,
          summary: `Mot de passe redefini pour ${targetUser?.name ?? "ce compte"}.`,
          detail: "Le nouvel accès peut etre communique directement a la personne."
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          error:
            error instanceof Error
              ? error.message
              : "Impossible de redefinir ce mot de passe."
        };
      }
    }

    const result = updateMockUserPassword(userId, password);
    if (!result.ok || !result.users) {
      return { ok: false, error: result.error };
    }

    setUsers(result.users);
    const targetUser = result.users.find((user) => user.id === userId);
    await recordActivity({
      action: "user-updated",
      targetUserId: userId,
      targetUserName: targetUser?.name,
      ownerUserId: userId,
      summary: `Mot de passe redefini pour ${targetUser?.name ?? "ce compte"}.`,
      detail: "Le nouvel accès peut etre communique directement a la personne."
    });
    return { ok: true };
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
    setActivityLogs([]);
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
    if (!client || !canAccessClient(currentUser, client, users)) {
      return undefined;
    }

    return client;
  }

  function canAccessClientById(clientId: string) {
    const client = clients.find((item) => item.id === clientId);
    return client ? canAccessClient(currentUser, client, users) : false;
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
    const catalogProduct = pvProductCatalog.find((item) => item.id === transaction.productId);

    const syncedProduct: PvClientProductRecord = {
      id: existingProduct?.id ?? `pv-local-${Date.now()}-${transaction.productId}`,
      clientId: transaction.clientId,
      responsibleId: transaction.responsibleId,
      responsibleName: transaction.responsibleName,
      programId: existingProduct?.programId ?? baseProgram.id,
      productId: transaction.productId,
      productName: transaction.productName,
      quantityStart: transaction.quantity,
      startDate: transaction.date,
      durationReferenceDays:
        existingProduct?.durationReferenceDays ?? catalogProduct?.dureeReferenceJours ?? 21,
      pvPerUnit:
        transaction.quantity > 0 ? Number((transaction.pv / transaction.quantity).toFixed(2)) : transaction.pv,
      pricePublicPerUnit:
        transaction.quantity > 0
          ? Number((transaction.price / transaction.quantity).toFixed(2))
          : transaction.price,
      quantiteLabel: existingProduct?.quantiteLabel ?? catalogProduct?.quantiteLabel ?? "1 unite",
      noteMetier: existingProduct?.noteMetier ?? catalogProduct?.noteMetier,
      active: true
    };

    upsertLocalPvClientProduct(syncedProduct);
    return syncedProduct;
  }

  async function createClientWithInitialAssessment(payload: {
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
    if (storageMode === "supabase") {
      const clientId = await createSupabaseClientWithInitialAssessment(payload);
      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "client-created",
        clientId,
        clientName: `${payload.client.firstName} ${payload.client.lastName}`,
        ownerUserId: payload.client.distributorId,
        targetUserId: payload.client.distributorId,
        targetUserName: payload.client.distributorName,
        summary: `${payload.client.firstName} ${payload.client.lastName} entre dans la base.`,
        detail: `Dossier ouvert sur ${payload.assessment.programTitle}.`
      });
      return clientId;
    }

    const clientId = `c-${Date.now()}`;

    // Derive lifecycle from decisionClient × afterAssessmentAction (Matrice B)
    const { lifecycleStatus, isFragile } = deriveLifecycleFromAssessment({
      decisionClient: payload.assessment.decisionClient ?? null,
      afterAssessmentAction:
        payload.afterAssessmentAction ?? (payload.started ? "started" : "pending"),
    });

    const nextClient: Client = {
      ...payload.client,
      id: clientId,
      status: payload.clientStatus,
      currentProgram: payload.currentProgram,
      pvProgramId: payload.pvProgramId,
      started: payload.started,
      startDate: payload.started ? payload.assessment.date : undefined,
      nextFollowUp: payload.nextFollowUp,
      notes: payload.notes,
      lifecycleStatus,
      isFragile,
      lifecycleUpdatedAt: new Date().toISOString(),
      assessments: [payload.assessment]
    };

    const nextFollowUpItem: FollowUp = {
      id: `f-${Date.now()}`,
      clientId,
      clientName: `${nextClient.firstName} ${nextClient.lastName}`,
      dueDate: payload.nextFollowUp,
      type: payload.followUpType,
      status: payload.followUpStatus,
      programTitle: payload.currentProgram || payload.assessment.programTitle,
      lastAssessmentDate: payload.assessment.date
    };

    setClients((previousClients) => [nextClient, ...previousClients]);
    setFollowUps((previousFollowUps) => [nextFollowUpItem, ...previousFollowUps]);
    if (nextClient.started) {
      setPvClientProducts((previousProducts) => [
        ...buildSeedPvClientProductsForClient(nextClient),
        ...previousProducts
      ]);
    }
    await recordActivity({
      action: "client-created",
      clientId,
      clientName: `${nextClient.firstName} ${nextClient.lastName}`,
      ownerUserId: nextClient.distributorId,
      targetUserId: nextClient.distributorId,
      targetUserName: nextClient.distributorName,
      summary: `${nextClient.firstName} ${nextClient.lastName} entre dans la base.`,
      detail: nextClient.started
        ? `Dossier ouvert sur ${payload.currentProgram}.`
        : "Bilan enregistre sans demarrage, relance a prevoir."
    });

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
      const targetClient = clients.find((client) => client.id === clientId);
      await recordActivity({
        action: "assessment-created",
        clientId,
        clientName: targetClient ? `${targetClient.firstName} ${targetClient.lastName}` : undefined,
        ownerUserId: targetClient?.distributorId,
        summary: `Nouveau suivi enregistre pour ${targetClient?.firstName ?? "ce client"}.`,
        detail: `${followUpMeta.type} pose au ${followUpMeta.dueDate}.`
      });
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
    await recordActivity({
      action: "assessment-created",
      clientId,
      clientName: `${targetClient.firstName} ${targetClient.lastName}`,
      ownerUserId: targetClient.distributorId,
      summary: `Nouveau suivi enregistre pour ${targetClient.firstName}.`,
      detail: `${followUpMeta.type} pose au ${followUpMeta.dueDate}.`
    });
  }

  async function deleteClient(clientId: string) {
    const targetClient = clients.find((client) => client.id === clientId);
    if (storageMode === "supabase") {
      await deleteSupabaseClient(clientId);
      await refreshRemoteData(currentUser);
      if (targetClient) {
        await recordActivity({
          action: "client-deleted",
          clientId,
          clientName: `${targetClient.firstName} ${targetClient.lastName}`,
          ownerUserId: targetClient.distributorId,
          summary: `${targetClient.firstName} ${targetClient.lastName} a ete retire de la base.`,
          detail: "Le dossier client et ses suivis ont ete supprimes."
        });
      }
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
    if (targetClient) {
      await recordActivity({
        action: "client-deleted",
        clientId,
        clientName: `${targetClient.firstName} ${targetClient.lastName}`,
        ownerUserId: targetClient.distributorId,
        summary: `${targetClient.firstName} ${targetClient.lastName} a ete retire de la base.`,
        detail: "Le dossier client et ses suivis ont ete supprimes."
      });
    }
  }

  async function updateAssessment(clientId: string, assessment: AssessmentRecord) {
    const targetClient = clients.find((client) => client.id === clientId);
    const nextAssessments = targetClient?.assessments.map((item) =>
      item.id === assessment.id ? assessment : item
    );
    if (storageMode === "supabase") {
      await updateSupabaseAssessment(clientId, assessment);
      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "assessment-updated",
        clientId,
        clientName: targetClient ? `${targetClient.firstName} ${targetClient.lastName}` : undefined,
        ownerUserId: targetClient?.distributorId,
        summary: `Le bilan de ${targetClient?.firstName ?? "ce client"} a ete ajuste.`,
        detail: `Mise à jour du ${assessment.type === "initial" ? "bilan de départ" : "suivi"}.`
      });
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
          currentProgram:
            assessment.type === "initial" && assessment.programId
              ? assessment.programTitle
              : assessment.type === "initial"
                ? ""
                : client.currentProgram,
          pvProgramId:
            assessment.type === "initial"
              ? assessment.programId
                ? resolvePvProgram(assessment.programTitle).id
                : undefined
              : client.pvProgramId,
          started:
            assessment.type === "initial" ? Boolean(assessment.programId) : client.started,
          status:
            assessment.type === "initial"
              ? assessment.programId
                ? "active"
                : "pending"
              : client.status,
          startDate:
            assessment.type === "initial"
              ? assessment.programId
                ? assessment.date
                : undefined
              : client.startDate,
          assessments: nextAssessments
        };
      })
    );

    if (assessment.type === "initial") {
      if (targetClient && assessment.programId) {
        const seededClient: Client = {
          ...targetClient,
          currentProgram: assessment.programTitle,
          pvProgramId: resolvePvProgram(assessment.programTitle).id,
          started: true,
          status: "active",
          startDate: assessment.date,
          assessments: nextAssessments ?? targetClient.assessments
        };
        setPvClientProducts((previousProducts) => [
          ...buildSeedPvClientProductsForClient(seededClient),
          ...previousProducts.filter((item) => item.clientId !== clientId)
        ]);
      } else {
        setPvClientProducts((previousProducts) =>
          previousProducts.filter((item) => item.clientId !== clientId)
        );
      }
    }
    await recordActivity({
      action: "assessment-updated",
      clientId,
      clientName: targetClient ? `${targetClient.firstName} ${targetClient.lastName}` : undefined,
      ownerUserId: targetClient?.distributorId,
      summary: `Le bilan de ${targetClient?.firstName ?? "ce client"} a ete ajuste.`,
      detail: `Mise à jour du ${assessment.type === "initial" ? "bilan de départ" : "suivi"}.`
    });
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
    const targetClient = clients.find((client) => client.id === clientId);
    if (storageMode === "supabase") {
      await updateSupabaseClientSchedule(clientId, payload);
      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "schedule-updated",
        clientId,
        clientName: targetClient ? `${targetClient.firstName} ${targetClient.lastName}` : undefined,
        ownerUserId: targetClient?.distributorId,
        summary: `Le prochain rendez-vous de ${targetClient?.firstName ?? "ce client"} a change.`,
        detail: `Nouvelle date : ${payload.nextFollowUp}.`
      });
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
    await recordActivity({
      action: "schedule-updated",
      clientId,
      clientName: targetClient ? `${targetClient.firstName} ${targetClient.lastName}` : undefined,
      ownerUserId: targetClient?.distributorId,
      summary: `Le prochain rendez-vous de ${targetClient?.firstName ?? "ce client"} a change.`,
      detail: `Nouvelle date : ${payload.nextFollowUp}.`
    });
  }

  async function reassignClientOwner(
    clientId: string,
    payload: {
      distributorId: string;
    }
  ) {
    const targetClient = clients.find((client) => client.id === clientId);
    const nextOwner = users.find((user) => user.id === payload.distributorId && user.active);

    if (!targetClient || !nextOwner) {
      return;
    }

    if (storageMode === "supabase") {
      await reassignSupabaseClientOwner(clientId, payload.distributorId);
      await refreshRemoteData(currentUser);
      await recordActivity({
        action: "client-reassigned",
        clientId,
        clientName: `${targetClient.firstName} ${targetClient.lastName}`,
        ownerUserId: nextOwner.id,
        targetUserId: nextOwner.id,
        targetUserName: nextOwner.name,
        summary: `${targetClient.firstName} ${targetClient.lastName} passe chez ${nextOwner.name}.`,
        detail: `Ancien responsable : ${targetClient.distributorName}.`
      });
      return;
    }

    setClients((previousClients) =>
      previousClients.map((client) =>
        client.id === clientId
          ? {
              ...client,
              distributorId: nextOwner.id,
              distributorName: nextOwner.name
            }
          : client
      )
    );

    setPvClientProducts((previousProducts) =>
      previousProducts.map((product) =>
        product.clientId === clientId
          ? {
              ...product,
              responsibleId: nextOwner.id,
              responsibleName: nextOwner.name
            }
          : product
      )
    );

    await recordActivity({
      action: "client-reassigned",
      clientId,
      clientName: `${targetClient.firstName} ${targetClient.lastName}`,
      ownerUserId: nextOwner.id,
      targetUserId: nextOwner.id,
      targetUserName: nextOwner.name,
      summary: `${targetClient.firstName} ${targetClient.lastName} passe chez ${nextOwner.name}.`,
      detail: `Ancien responsable : ${targetClient.distributorName}.`
    });
  }

  async function addPvTransaction(transaction: PvClientTransaction) {
    if (storageMode === "supabase") {
      const targetClient = clients.find((client) => client.id === transaction.clientId);
      const baseProgram = resolvePvProgram(targetClient?.pvProgramId ?? targetClient?.currentProgram);
      const existingProduct = pvClientProducts.find(
        (item) => item.clientId === transaction.clientId && item.productId === transaction.productId
      );
      const catalogProduct = pvProductCatalog.find((item) => item.id === transaction.productId);

      await upsertSupabasePvClientProduct({
        id: existingProduct?.id ?? `pv-seed-${transaction.clientId}-${transaction.productId}`,
        clientId: transaction.clientId,
        responsibleId: transaction.responsibleId,
        responsibleName: transaction.responsibleName,
        programId: existingProduct?.programId ?? baseProgram.id,
        productId: transaction.productId,
        productName: transaction.productName,
        quantityStart: transaction.quantity,
        startDate: transaction.date,
        durationReferenceDays:
          existingProduct?.durationReferenceDays ?? catalogProduct?.dureeReferenceJours ?? 21,
        pvPerUnit:
          transaction.quantity > 0 ? Number((transaction.pv / transaction.quantity).toFixed(2)) : transaction.pv,
        pricePublicPerUnit:
          transaction.quantity > 0
            ? Number((transaction.price / transaction.quantity).toFixed(2))
            : transaction.price,
        quantiteLabel: existingProduct?.quantiteLabel ?? catalogProduct?.quantiteLabel ?? "1 unite",
        noteMetier: existingProduct?.noteMetier ?? catalogProduct?.noteMetier,
        active: true
      });
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
      visibleClients: getVisibleClients(currentUser, clients, users),
      followUps,
      visibleFollowUps: getVisibleFollowUps(currentUser, followUps, clients, users),
      activityLogs,
      pvClientProducts,
      pvTransactions,
      programs: mockPrograms,
      clientMessages: currentUser
        ? clientMessages.filter(m => m.distributor_id === currentUser.id || m.distributor_id === currentUser.name || currentUser.role === 'admin')
        : [],
      unreadMessageCount: currentUser
        ? clientMessages.filter(m => !m.read && (m.distributor_id === currentUser.id || m.distributor_id === currentUser.name || currentUser.role === 'admin')).length
        : 0,
      markMessageRead: async (id: string) => {
        const sb = await getSupabaseClient();
        if (sb) await sb.from('client_messages').update({ read: true }).eq('id', id);
        setClientMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
      },
      deleteMessage: async (id: string) => {
        const sb = await getSupabaseClient();
        if (sb) await sb.from('client_messages').delete().eq('id', id);
        setClientMessages(prev => prev.filter(m => m.id !== id));
      },
      updateClientInfo: async (clientId: string, data: { phone?: string; email?: string; city?: string }) => {
        if (storageMode === 'supabase') {
          const sb = await getSupabaseClient();
          if (sb) {
            const updateData: Record<string, string> = {};
            if (data.phone !== undefined) updateData.phone = data.phone;
            if (data.email !== undefined) updateData.email = data.email;
            if (data.city !== undefined) updateData.city = data.city;
            await sb.from('clients').update(updateData).eq('id', clientId);
            await refreshRemoteData(currentUser);
          }
        } else {
          setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...data } : c));
        }
      },
      updateFollowUpStatus: async (followUpId: string, status: 'scheduled' | 'pending' | 'completed' | 'dismissed') => {
        if (storageMode === 'supabase') {
          const sb = await getSupabaseClient();
          if (sb) {
            await sb.from('follow_ups').update({ status }).eq('id', followUpId);
            await refreshRemoteData(currentUser);
          }
        } else {
          setFollowUps(prev => prev.map(f => f.id === followUpId ? { ...f, status } : f));
        }
      },
      setClientLifecycleStatus: async (clientId: string, newStatus: LifecycleStatus) => {
        if (!currentUser?.id) throw new Error("Not authenticated");

        if (storageMode === 'supabase') {
          await updateSupabaseClientLifecycleStatus({ clientId, newStatus, userId: currentUser.id });
        }

        // Optimistic local state update
        setClients(prev => prev.map(c =>
          c.id === clientId
            ? {
                ...c,
                lifecycleStatus: newStatus,
                lifecycleUpdatedAt: new Date().toISOString(),
                lifecycleUpdatedBy: currentUser.id,
              }
            : c
        ));

        // Si "mort" → désactiver tous les follow-ups ouverts
        if (newStatus === 'stopped' || newStatus === 'lost') {
          setFollowUps(prev => prev.map(fu =>
            fu.clientId === clientId && (fu.status === 'scheduled' || fu.status === 'pending')
              ? { ...fu, status: 'inactive' as const }
              : fu
          ));
        }
      },
      setClientFragileFlag: async (clientId: string, isFragile: boolean) => {
        if (storageMode === 'supabase') {
          await updateSupabaseClientFragileFlag({ clientId, isFragile });
        }
        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, isFragile } : c
        ));
      },
      loginAs,
      loginWithCredentials,
      logout,
      forceResetSession,
      createUserAccess,
      repairUserAccess,
      updateUserAccess,
      updateUserPassword,
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
      reassignClientOwner,
      addPvTransaction,
      savePvClientProduct,
    }),
    [
      authReady,
      activityLogs,
      clientMessages,
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
