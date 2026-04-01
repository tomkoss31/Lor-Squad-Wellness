import { mockUsers } from "../data/mockUsers";
import { createMockSession, SESSION_KEY } from "../lib/auth";
import type { AuthSession, User } from "../types/domain";

interface StoredSession {
  userId: string;
  authMode: "mock";
  issuedAt: string;
}

export interface MockLoginPayload {
  userId: string;
  email: string;
  password: string;
}

export interface AuthResult {
  user: User;
  session: AuthSession;
}

export function restoreSession(): AuthResult | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredSession;
    const user = mockUsers.find((item) => item.id === parsed.userId) ?? null;
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

export function loginWithMockCredentials({
  userId,
  email,
  password
}: MockLoginPayload): AuthResult | null {
  const user = mockUsers.find((item) => item.id === userId && item.email === email) ?? null;

  if (!user || !user.active) {
    return null;
  }

  if (!password.trim()) {
    return null;
  }

  const session = createMockSession(user);
  persistSession(session);

  return { user, session };
}
