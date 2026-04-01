import type { AuthSession, Client, FollowUp, User, UserRole } from "../types/domain";

export const SESSION_KEY = "lor-squad-wellness-session";

export function isAdmin(user: User | null | undefined) {
  return user?.role === "admin";
}

export function getRoleLabel(role: UserRole) {
  return role === "admin" ? "Admin" : "Distributeur";
}

export function getRoleScope(user: User) {
  return isAdmin(user) ? "all-clients" : "owned-clients";
}

export function hasRequiredRole(
  user: User | null | undefined,
  allowedRoles: UserRole[]
) {
  return !!user && allowedRoles.includes(user.role);
}

export function getAccessSummary(user: User) {
  return isAdmin(user)
    ? "Acces global aux clients, aux bilans et a l'activite de l'equipe."
    : "Acces reserve a ses propres clients et a leurs bilans.";
}

export function getAccessBoundary(user: User) {
  return isAdmin(user)
    ? "Peut ouvrir tous les dossiers et piloter l'activite d'equipe."
    : "Peut ouvrir uniquement les dossiers qui lui sont attribues.";
}

export function createMockSession(user: User): AuthSession {
  return {
    userId: user.id,
    role: user.role,
    authMode: "mock",
    issuedAt: new Date().toISOString(),
    accessScope: getRoleScope(user)
  };
}

export function canAccessClient(user: User | null | undefined, client: Client) {
  if (!user) {
    return false;
  }

  return isAdmin(user) || client.distributorId === user.id;
}

export function getVisibleClients(user: User | null | undefined, clients: Client[]) {
  return clients.filter((client) => canAccessClient(user, client));
}

export function getVisibleFollowUps(
  user: User | null | undefined,
  followUps: FollowUp[],
  clients: Client[]
) {
  const visibleClientIds = new Set(getVisibleClients(user, clients).map((client) => client.id));
  return followUps.filter((followUp) => visibleClientIds.has(followUp.clientId));
}
