import type { AuthSession, Client, FollowUp, User, UserRole } from "../types/domain";

export const SESSION_KEY = "lor-squad-wellness-session";

export function isAdmin(user: User | null | undefined) {
  return user?.role === "admin";
}

export function isReferent(user: User | null | undefined) {
  return user?.role === "referent";
}

export function canSponsorDistributors(user: User | null | undefined) {
  return isAdmin(user) || isReferent(user);
}

export function getRoleLabel(role: UserRole) {
  if (role === "admin") {
    return "Admin";
  }

  if (role === "referent") {
    return "Referent";
  }

  return "Distributeur";
}

export function getDefaultUserTitle(role: UserRole) {
  if (role === "admin") {
    return "Pilotage global";
  }

  if (role === "referent") {
    return "Referent d'equipe";
  }

  return "Portefeuille terrain";
}

export function getRoleScope(user: User) {
  if (isAdmin(user)) {
    return "all-clients" as const;
  }

  if (isReferent(user)) {
    return "team-clients" as const;
  }

  return "owned-clients" as const;
}

export function hasRequiredRole(
  user: User | null | undefined,
  allowedRoles: UserRole[]
) {
  return !!user && allowedRoles.includes(user.role);
}

export function getAccessSummary(user: User) {
  if (isAdmin(user)) {
    return "Acces global aux clients, aux bilans et a l'activite de toutes les equipes.";
  }

  if (isReferent(user)) {
    return "Acces a ses clients et a ceux des distributeurs rattaches a son equipe.";
  }

  return "Acces reserve a ses propres clients et a leurs bilans.";
}

export function getAccessBoundary(user: User) {
  if (isAdmin(user)) {
    return "Peut ouvrir tous les dossiers et piloter l'activite complete.";
  }

  if (isReferent(user)) {
    return "Peut ouvrir ses dossiers et suivre l'activite de son equipe directe.";
  }

  return "Peut ouvrir uniquement les dossiers qui lui sont attribues.";
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

export function getAccessibleOwnerIds(
  user: User | null | undefined,
  users: User[],
  scope: "personal" | "team" = "team"
) {
  if (!user) {
    return new Set<string>();
  }

  if (scope === "personal") {
    return new Set([user.id]);
  }

  if (isAdmin(user)) {
    return new Set(users.filter((item) => item.active).map((item) => item.id));
  }

  const ids = new Set([user.id]);

  if (isReferent(user)) {
    users
      .filter((item) => item.active && item.sponsorId === user.id)
      .forEach((item) => ids.add(item.id));
  }

  return ids;
}

export function canAccessPortfolioUser(
  viewer: User | null | undefined,
  targetUser: User | null | undefined,
  users: User[]
) {
  if (!viewer || !targetUser) {
    return false;
  }

  if (isAdmin(viewer) || viewer.id === targetUser.id) {
    return true;
  }

  return isReferent(viewer) && targetUser.sponsorId === viewer.id;
}

export function canAccessClient(
  user: User | null | undefined,
  client: Client,
  users: User[] = []
) {
  if (!user) {
    return false;
  }

  return getAccessibleOwnerIds(user, users).has(client.distributorId);
}

export function getVisibleClients(
  user: User | null | undefined,
  clients: Client[],
  users: User[] = []
) {
  return clients.filter((client) => canAccessClient(user, client, users));
}

export function getVisibleFollowUps(
  user: User | null | undefined,
  followUps: FollowUp[],
  clients: Client[],
  users: User[] = []
) {
  const visibleClientIds = new Set(
    getVisibleClients(user, clients, users).map((client) => client.id)
  );
  return followUps.filter((followUp) => visibleClientIds.has(followUp.clientId));
}
