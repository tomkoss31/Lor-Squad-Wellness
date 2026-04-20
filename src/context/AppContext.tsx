import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { pvProductCatalog, resolvePvProgram } from "../data/pvCatalog";
import { mockPrograms } from "../data/mockPrograms";
import { canAccessClient, getVisibleClients, getVisibleFollowUps } from "../lib/auth";
import {
  getStoredActivityLogs,
  getStoredPvClientProducts,
  getStoredPvTransactions,
  persistPvClientProducts,
  persistPvTransactions
} from "../services/appDataService";
import { isSupabaseUnavailable, getSupabaseClient } from "../services/supabaseClient";
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
  updateSupabaseClientFreeFollowUp,
  updateSupabaseClientFreePvTracking,
  fetchSupabaseProspects,
  createSupabaseProspect,
  updateSupabaseProspect,
  deleteSupabaseProspect,
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
  Prospect,
  ProspectFormInput,
  User
} from "../types/domain";
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";

interface AppContextValue {
  authReady: boolean;
  bootError: string | null;
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
  prospects: Prospect[];
  createProspect: (input: ProspectFormInput) => Promise<Prospect>;
  updateProspect: (id: string, updates: Partial<Prospect>) => Promise<Prospect>;
  deleteProspect: (id: string) => Promise<void>;
  markMessageRead: (id: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  updateClientInfo: (clientId: string, data: { phone?: string; email?: string; city?: string }) => Promise<void>;
  setClientLifecycleStatus: (clientId: string, newStatus: LifecycleStatus) => Promise<void>;
  setClientFragileFlag: (clientId: string, isFragile: boolean) => Promise<void>;
  setClientFreeFollowUp: (clientId: string, freeFollowUp: boolean) => Promise<void>;
  // Free PV tracking (2026-04-20) : toggle exclusion des listes de réassort
  setClientFreePvTracking: (clientId: string, freePvTracking: boolean) => Promise<void>;
  updateFollowUpStatus: (followUpId: string, status: 'scheduled' | 'pending' | 'completed' | 'dismissed') => Promise<void>;
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
    freeFollowUp?: boolean;
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
  const [authReady, setAuthReady] = useState(false);
  // Hard-fail boot si aucune config Supabase n'est résolue (faille
  // historique : pas de bascule vers un mode mock, dépôt chantier du 2026-04-19)
  const [bootError, setBootError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [pvClientProducts, setPvClientProducts] = useState<PvClientProductRecord[]>([]);
  const [pvTransactions, setPvTransactions] = useState<PvClientTransaction[]>([]);
  const [clientMessages, setClientMessages] = useState<ClientMessage[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);

  async function refreshRemoteData(activeUser?: User | null) {
    const nextUser = activeUser ?? currentUser;
    try {
      const [
        nextClients,
        nextFollowUps,
        nextUsers,
        nextPvTransactions,
        nextPvClientProducts,
        nextActivityLogs,
        nextProspects
      ] = await Promise.all([
        fetchSupabaseClients(),
        fetchSupabaseFollowUps(),
        nextUser ? fetchSupabaseUsers() : Promise.resolve([] as User[]),
        fetchSupabasePvTransactions(),
        fetchSupabasePvClientProducts(),
        fetchSupabaseActivityLogs().catch((error) => {
          console.error("Historique d'activité indisponible pour l'instant.", error);
          return [] as ActivityLog[];
        }),
        fetchSupabaseProspects().catch((error) => {
          console.error("Prospects indisponibles pour l'instant.", error);
          return [] as Prospect[];
        })
      ]);

      setClients(nextClients);
      setFollowUps(nextFollowUps);
      setUsers(nextUsers);
      setPvTransactions(nextPvTransactions);
      setPvClientProducts(nextPvClientProducts);
      setActivityLogs(nextActivityLogs);
      setProspects(nextProspects);

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
      setProspects([]);
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        // HARD FAIL si aucune config Supabase utilisable n'est résolue.
        // Depuis la suppression du mode mock, il n'existe plus aucun fallback
        // local — on bloque le boot et on affiche l'écran d'erreur.
        const unavailable = await isSupabaseUnavailable();
        if (unavailable) {
          setBootError(
            "Configuration Supabase manquante. Cette instance est bloquée pour protéger les données. " +
            "Contactez l'administrateur."
          );
          // authReady reste false → App.tsx bascule sur BootErrorScreen.
          return;
        }

        // Hydratation rapide depuis le cache localStorage avant le fetch Supabase.
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
      } catch (error) {
        console.error("Initialisation de session impossible.", error);
        setUsers([]);
        setClients([]);
        setFollowUps([]);
        setActivityLogs(getStoredActivityLogs());
        setPvClientProducts(getStoredPvClientProducts());
        setPvTransactions(getStoredPvTransactions());
        setCurrentUser(null);
        setCurrentSession(null);
      } finally {
        setAuthReady(true);
      }
    }

    void initialize();
  }, []);

  // Cache localStorage : PV client products et transactions sont persistées
  // en continu pour hydratation rapide au prochain boot.
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

    try {
      const createdEntry = await createSupabaseActivityLog(nextEntry);
      setActivityLogs((previousLogs) => [createdEntry, ...previousLogs].slice(0, 120));
    } catch (error) {
      console.error("Journal d'activité indisponible.", error);
    }
  }

  async function loginWithCredentials(payload: { email: string; password: string }) {
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

  async function logout() {
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
    setProspects([]);
  }

  async function forceResetSession() {
    try {
      await logoutFromSupabase();
    } catch (error) {
      console.error("Impossible de fermer la session distante proprement.", error);
    }

    setCurrentUser(null);
    setCurrentSession(null);
    setUsers([]);
    setClients([]);
    setFollowUps([]);
    setPvClientProducts(getStoredPvClientProducts());
    setPvTransactions(getStoredPvTransactions());
    setProspects([]);
  }

  async function createUserAccess(payload: {
    name: string;
    email: string;
    role: User["role"];
    sponsorId?: string;
    active: boolean;
    mockPassword: string;
  }) {
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

  async function updateUserAccess(
    userId: string,
    payload: {
      role: User["role"];
      sponsorId?: string;
    }
  ) {
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

  async function repairUserAccess(payload: {
    userId?: string;
    email: string;
    name?: string;
    role: User["role"];
    sponsorId?: string;
    active: boolean;
  }) {
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
  }

  async function updateUserPassword(userId: string, password: string) {
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
    freeFollowUp?: boolean;
  }) {
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

  async function addFollowUpAssessment(
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) {
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
  }

  async function deleteClient(clientId: string) {
    const targetClient = clients.find((client) => client.id === clientId);
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
  }

  async function updateAssessment(clientId: string, assessment: AssessmentRecord) {
    const targetClient = clients.find((client) => client.id === clientId);
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
  }

  async function addPvTransaction(transaction: PvClientTransaction) {
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
  }

  async function savePvClientProduct(product: PvClientProductRecord) {
    await upsertSupabasePvClientProduct(product);
    await refreshRemoteData(currentUser);
  }

  const value = useMemo(
    () => ({
      authReady,
      bootError,
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
      // ─── Agenda Prospects ─────────────────────────────────────────────
      prospects: currentUser
        ? prospects.filter(p => currentUser.role === 'admin' || p.distributorId === currentUser.id)
        : [],
      createProspect: async (input: ProspectFormInput) => {
        const created = await createSupabaseProspect(input);
        setProspects(prev => [...prev, created]);
        return created;
      },
      updateProspect: async (id: string, updates: Partial<Prospect>) => {
        const updated = await updateSupabaseProspect(id, updates);
        setProspects(prev => prev.map(p => (p.id === id ? updated : p)));
        return updated;
      },
      deleteProspect: async (id: string) => {
        await deleteSupabaseProspect(id);
        setProspects(prev => prev.filter(p => p.id !== id));
      },
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
        // Site 4 du durcissement audit L1 : on lève l'erreur au caller + toast explicite.
        const sb = await getSupabaseClient();
        if (!sb) {
          throw new Error("Client Supabase indisponible.");
        }
        const updateData: Record<string, string> = {};
        if (data.phone !== undefined) updateData.phone = data.phone;
        if (data.email !== undefined) updateData.email = data.email;
        if (data.city !== undefined) updateData.city = data.city;
        const { error } = await sb.from('clients').update(updateData).eq('id', clientId);
        if (error) {
          throw error;
        }
        await refreshRemoteData(currentUser);
      },
      updateFollowUpStatus: async (followUpId: string, status: 'scheduled' | 'pending' | 'completed' | 'dismissed') => {
        // Site 5 du durcissement audit L1 : on lève l'erreur au caller + toast explicite.
        const sb = await getSupabaseClient();
        if (!sb) {
          throw new Error("Client Supabase indisponible.");
        }
        const { error } = await sb.from('follow_ups').update({ status }).eq('id', followUpId);
        if (error) {
          throw error;
        }
        await refreshRemoteData(currentUser);
      },
      setClientLifecycleStatus: async (clientId: string, newStatus: LifecycleStatus) => {
        if (!currentUser?.id) throw new Error("Not authenticated");

        await updateSupabaseClientLifecycleStatus({ clientId, newStatus, userId: currentUser.id });

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
        await updateSupabaseClientFragileFlag({ clientId, isFragile });
        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, isFragile } : c
        ));
      },
      setClientFreeFollowUp: async (clientId: string, freeFollowUp: boolean) => {
        // Sujet C : si on active le suivi libre, les follow-ups ouverts passent
        // à 'inactive' (comme pour stopped/lost). La DB le fait dans
        // updateSupabaseClientFreeFollowUp ; on réplique ici en optimistic update.
        await updateSupabaseClientFreeFollowUp({ clientId, freeFollowUp });

        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, freeFollowUp } : c
        ));

        if (freeFollowUp) {
          setFollowUps(prev => prev.map(fu =>
            fu.clientId === clientId && (fu.status === 'scheduled' || fu.status === 'pending')
              ? { ...fu, status: 'inactive' as const }
              : fu
          ));
        }
      },
      // Free PV tracking (2026-04-20) : simple toggle + optimistic update.
      // Pas de side-effect sur follow_ups — seulement les listes de réassort
      // côté UI filtrent sur ce flag.
      setClientFreePvTracking: async (clientId: string, freePvTracking: boolean) => {
        await updateSupabaseClientFreePvTracking({ clientId, freePvTracking });
        setClients(prev => prev.map(c =>
          c.id === clientId ? { ...c, freePvTracking } : c
        ));
      },
      loginWithCredentials,
      logout,
      forceResetSession,
      createUserAccess,
      repairUserAccess,
      updateUserAccess,
      updateUserPassword,
      updateUserStatus,
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
      bootError,
      activityLogs,
      clientMessages,
      clients,
      currentSession,
      currentUser,
      followUps,
      pvClientProducts,
      pvTransactions,
      prospects,
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
