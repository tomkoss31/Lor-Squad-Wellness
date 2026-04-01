import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { mockClients, mockFollowUps } from "../data/mockClients";
import { mockPrograms } from "../data/mockPrograms";
import { mockUsers } from "../data/mockUsers";
import {
  canAccessClient,
  getVisibleClients,
  getVisibleFollowUps
} from "../lib/auth";
import {
  clearPersistedSession,
  loginWithMockCredentials,
  restoreSession
} from "../services/authService";
import type {
  AssessmentRecord,
  AuthSession,
  Client,
  FollowUp,
  Program,
  User
} from "../types/domain";

interface AppContextValue {
  authReady: boolean;
  currentUser: User | null;
  currentSession: AuthSession | null;
  users: User[];
  clients: Client[];
  visibleClients: Client[];
  followUps: FollowUp[];
  visibleFollowUps: FollowUp[];
  programs: Program[];
  loginAs: (userId: string) => void;
  loginWithCredentials: (payload: { email: string; password: string }) => boolean;
  logout: () => void;
  getClientById: (clientId: string) => Client | undefined;
  canAccessClient: (clientId: string) => boolean;
  addFollowUpAssessment: (
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren) {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<AuthSession | null>(null);
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [followUps, setFollowUps] = useState<FollowUp[]>(mockFollowUps);

  useEffect(() => {
    const restored = restoreSession();
    if (restored) {
      setCurrentUser(restored.user);
      setCurrentSession(restored.session);
    }
    setAuthReady(true);
  }, []);

  function loginAs(userId: string) {
    const matchedUser = mockUsers.find((user) => user.id === userId);
    if (!matchedUser) {
      return;
    }

    loginWithCredentials({
      email: matchedUser.email,
      password: "demo1234"
    });
  }

  function loginWithCredentials(payload: { email: string; password: string }) {
    const result = loginWithMockCredentials(payload);

    if (!result) {
      return false;
    }

    setCurrentUser(result.user);
    setCurrentSession(result.session);
    return true;
  }

  function logout() {
    setCurrentUser(null);
    setCurrentSession(null);
    clearPersistedSession();
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

  function addFollowUpAssessment(
    clientId: string,
    assessment: AssessmentRecord,
    followUpMeta: Pick<FollowUp, "dueDate" | "type" | "status">
  ) {
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

    const targetClient = clients.find((client) => client.id === clientId);
    if (!targetClient) {
      return;
    }

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
      currentUser,
      currentSession,
      users: mockUsers,
      clients,
      visibleClients: getVisibleClients(currentUser, clients),
      followUps,
      visibleFollowUps: getVisibleFollowUps(currentUser, followUps, clients),
      programs: mockPrograms,
      loginAs,
      loginWithCredentials,
      logout,
      getClientById,
      canAccessClient: canAccessClientById,
      addFollowUpAssessment
    }),
    [authReady, clients, currentSession, currentUser, followUps]
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
