import { mockUsers } from "../data/mockUsers";
import { createMockSession, getDefaultUserTitle, SESSION_KEY } from "../lib/auth";
import type { AuthSession, User } from "../types/domain";

const USERS_KEY = "lor-squad-wellness-users";
const STORAGE_VERSION_KEY = "lor-squad-wellness-storage-version";
const CURRENT_STORAGE_VERSION = "2026-04-beta-3";

interface StoredSession {
  userId: string;
  authMode: AuthSession["authMode"];
  issuedAt: string;
}

export interface MockLoginPayload {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  session: AuthSession;
}

export interface CreateMockUserPayload {
  name: string;
  email: string;
  role: User["role"];
  sponsorId?: string;
  active: boolean;
  mockPassword: string;
}

function ensureStorageVersion() {
  const currentVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

  if (currentVersion === CURRENT_STORAGE_VERSION) {
    return;
  }

  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  window.localStorage.removeItem(SESSION_KEY);
}

export function getStoredUsers(): User[] {
  ensureStorageVersion();
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) {
    return mockUsers;
  }

  try {
    const parsed = JSON.parse(raw) as User[];
    return parsed.length ? parsed : mockUsers;
  } catch {
    return mockUsers;
  }
}

export function persistUsers(users: User[]) {
  ensureStorageVersion();
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function restoreSession(): AuthResult | null {
  ensureStorageVersion();
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    const user = getStoredUsers().find((item) => item.id === parsed.userId) ?? null;
    if (!user || !user.active) {
      clearPersistedSession();
      return null;
    }

    const session = createMockSession(user);
    session.issuedAt = parsed.issuedAt ?? session.issuedAt;

    return { user, session };
  } catch {
    clearPersistedSession();
    return null;
  }
}

export function persistSession(session: AuthSession) {
  ensureStorageVersion();
  const storedSession: StoredSession = {
    userId: session.userId,
    authMode: session.authMode,
    issuedAt: session.issuedAt
  };

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(storedSession));
}

export function clearPersistedSession() {
  window.localStorage.removeItem(SESSION_KEY);
}

export function resetMockAuthData() {
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(USERS_KEY, JSON.stringify(mockUsers));
  window.localStorage.removeItem(SESSION_KEY);
  return mockUsers;
}

export function loginWithMockCredentials({
  email,
  password
}: MockLoginPayload): AuthResult | null {
  const normalizedEmail = email.trim().toLowerCase();
  const user = getStoredUsers().find((item) => item.email.toLowerCase() === normalizedEmail) ?? null;

  if (!user || !user.active) {
    return null;
  }

  if (!password.trim() || (user.mockPassword ?? "demo1234") !== password.trim()) {
    return null;
  }

  const session = createMockSession(user);
  persistSession(session);

  return { user, session };
}

export function createMockUser({
  name,
  email,
  role,
  sponsorId,
  active,
  mockPassword
}: CreateMockUserPayload): { ok: boolean; error?: string; users?: User[] } {
  const nextEmail = email.trim().toLowerCase();
  const nextName = name.trim();
  const nextPassword = mockPassword.trim();

  if (!nextName || !nextEmail || !nextPassword) {
    return { ok: false, error: "Tous les champs doivent etre renseignes." };
  }

  const users = getStoredUsers();
  const sponsor =
    sponsorId && role === "distributor"
      ? users.find((user) => user.id === sponsorId && user.active)
      : null;
  if (users.some((user) => user.email.toLowerCase() === nextEmail)) {
    return { ok: false, error: "Un acces existe deja avec cet email." };
  }

  if (role === "distributor" && sponsorId && !sponsor) {
    return { ok: false, error: "Le sponsor selectionne est introuvable." };
  }

  const newUser: User = {
    id: `u-${role}-${Date.now()}`,
    name: nextName,
    email: nextEmail,
    mockPassword: nextPassword,
    role,
    sponsorId: sponsor?.id,
    sponsorName: sponsor?.name,
    active,
    title: getDefaultUserTitle(role),
    createdAt: new Date().toISOString().slice(0, 10)
  };

  const nextUsers = [newUser, ...users];
  persistUsers(nextUsers);
  return { ok: true, users: nextUsers };
}

export function updateMockUserAccess(
  userId: string,
  payload: {
    role: User["role"];
    sponsorId?: string;
  }
): { ok: boolean; error?: string; users?: User[] } {
  const users = getStoredUsers();
  const targetUser = users.find((user) => user.id === userId);

  if (!targetUser) {
    return { ok: false, error: "Cet acces est introuvable." };
  }

  if (targetUser.role === "admin" && payload.role !== "admin") {
    return { ok: false, error: "Un compte admin ne peut pas etre degrade ici." };
  }

  const sponsor =
    payload.role === "distributor" && payload.sponsorId
      ? users.find(
          (user) =>
            user.id === payload.sponsorId &&
            user.id !== userId &&
            user.active &&
            (user.role === "admin" || user.role === "referent")
        )
      : null;

  if (payload.role === "distributor" && payload.sponsorId && !sponsor) {
    return { ok: false, error: "Le sponsor selectionne est introuvable." };
  }

  const nextUsers = users.map((user) => {
    if (user.id !== userId) {
      return user;
    }

    return {
      ...user,
      role: payload.role,
      sponsorId: payload.role === "distributor" ? sponsor?.id : undefined,
      sponsorName: payload.role === "distributor" ? sponsor?.name : undefined,
      title: getDefaultUserTitle(payload.role)
    };
  });

  persistUsers(nextUsers);
  return { ok: true, users: nextUsers };
}

export function updateMockUserStatus(
  userId: string,
  active: boolean
): { ok: boolean; users?: User[] } {
  const nextUsers = getStoredUsers().map((user) =>
    user.id === userId ? { ...user, active } : user
  );
  persistUsers(nextUsers);
  return { ok: true, users: nextUsers };
}
