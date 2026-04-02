import { mockClients, mockFollowUps } from "../data/mockClients";
import type { Client, FollowUp } from "../types/domain";

const CLIENTS_KEY = "lor-squad-wellness-clients";
const FOLLOW_UPS_KEY = "lor-squad-wellness-follow-ups";
const STORAGE_VERSION_KEY = "lor-squad-wellness-app-data-version";
const CURRENT_STORAGE_VERSION = "2026-04-beta-2";

function ensureAppDataVersion() {
  const currentVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

  if (currentVersion === CURRENT_STORAGE_VERSION) {
    return;
  }

  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(mockClients));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(mockFollowUps));
}

export function getStoredClients(): Client[] {
  ensureAppDataVersion();
  const raw = window.localStorage.getItem(CLIENTS_KEY);

  if (!raw) {
    return mockClients;
  }

  try {
    const parsed = JSON.parse(raw) as Client[];
    return parsed.length ? parsed : [];
  } catch {
    return mockClients;
  }
}

export function getStoredFollowUps(): FollowUp[] {
  ensureAppDataVersion();
  const raw = window.localStorage.getItem(FOLLOW_UPS_KEY);

  if (!raw) {
    return mockFollowUps;
  }

  try {
    const parsed = JSON.parse(raw) as FollowUp[];
    return parsed.length ? parsed : [];
  } catch {
    return mockFollowUps;
  }
}

export function persistClients(clients: Client[]) {
  ensureAppDataVersion();
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
}

export function persistFollowUps(followUps: FollowUp[]) {
  ensureAppDataVersion();
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(followUps));
}

export function resetStoredAppData() {
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(mockClients));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(mockFollowUps));

  return {
    clients: mockClients,
    followUps: mockFollowUps
  };
}

export function clearStoredAppData() {
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify([]));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify([]));

  return {
    clients: [] as Client[],
    followUps: [] as FollowUp[]
  };
}
