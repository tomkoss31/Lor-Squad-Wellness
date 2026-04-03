import { mockClients, mockFollowUps } from "../data/mockClients";
import type { ActivityLog, Client, FollowUp } from "../types/domain";
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";

const CLIENTS_KEY = "lor-squad-wellness-clients";
const FOLLOW_UPS_KEY = "lor-squad-wellness-follow-ups";
const PV_TRANSACTIONS_KEY = "lor-squad-wellness-pv-transactions";
const PV_CLIENT_PRODUCTS_KEY = "lor-squad-wellness-pv-client-products";
const ACTIVITY_LOGS_KEY = "lor-squad-wellness-activity-logs";
const STORAGE_VERSION_KEY = "lor-squad-wellness-app-data-version";
const CURRENT_STORAGE_VERSION = "2026-04-beta-3";

function ensureAppDataVersion() {
  const currentVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

  if (currentVersion === CURRENT_STORAGE_VERSION) {
    return;
  }

  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(mockClients));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(mockFollowUps));
  window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify([]));
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

export function getStoredActivityLogs(): ActivityLog[] {
  ensureAppDataVersion();
  const raw = window.localStorage.getItem(ACTIVITY_LOGS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as ActivityLog[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistActivityLogs(activityLogs: ActivityLog[]) {
  ensureAppDataVersion();
  window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify(activityLogs));
}

export function getStoredPvTransactions(): PvClientTransaction[] {
  ensureAppDataVersion();
  const raw = window.localStorage.getItem(PV_TRANSACTIONS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PvClientTransaction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistPvTransactions(transactions: PvClientTransaction[]) {
  ensureAppDataVersion();
  window.localStorage.setItem(PV_TRANSACTIONS_KEY, JSON.stringify(transactions));
}

export function getStoredPvClientProducts(): PvClientProductRecord[] {
  ensureAppDataVersion();
  const raw = window.localStorage.getItem(PV_CLIENT_PRODUCTS_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PvClientProductRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistPvClientProducts(products: PvClientProductRecord[]) {
  ensureAppDataVersion();
  window.localStorage.setItem(PV_CLIENT_PRODUCTS_KEY, JSON.stringify(products));
}

export function resetStoredAppData() {
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify(mockClients));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify(mockFollowUps));
  window.localStorage.setItem(PV_TRANSACTIONS_KEY, JSON.stringify([]));
  window.localStorage.setItem(PV_CLIENT_PRODUCTS_KEY, JSON.stringify([]));
  window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify([]));

  return {
    clients: mockClients,
    followUps: mockFollowUps
  };
}

export function clearStoredAppData() {
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(CLIENTS_KEY, JSON.stringify([]));
  window.localStorage.setItem(FOLLOW_UPS_KEY, JSON.stringify([]));
  window.localStorage.setItem(PV_TRANSACTIONS_KEY, JSON.stringify([]));
  window.localStorage.setItem(PV_CLIENT_PRODUCTS_KEY, JSON.stringify([]));
  window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify([]));

  return {
    clients: [] as Client[],
    followUps: [] as FollowUp[]
  };
}
