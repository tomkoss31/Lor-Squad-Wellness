import type { ActivityLog } from "../types/domain";
import type { PvClientProductRecord, PvClientTransaction } from "../types/pv";

// ─────────────────────────────────────────────────────────────────────────────
// Cache localStorage utilisé comme hydratation rapide au boot avant le fetch
// Supabase. Seules les collections lourdes (PV, activity logs) sont cachées :
// les clients et follow-ups viennent toujours frais de Supabase.
// Après la suppression du mode mock (chantier du 2026-04-19), ce module ne sert
// plus qu'à ce rôle de cache — toute la partie seed mockClients/mockFollowUps
// a disparu avec les fichiers data/mockClients + data/mockUsers.
// ─────────────────────────────────────────────────────────────────────────────

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

  // Nouvelle version de cache → on réinitialise les entrées cache
  // (pas de seed de données mock : tout vient de Supabase au boot).
  window.localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  window.localStorage.setItem(ACTIVITY_LOGS_KEY, JSON.stringify([]));
  window.localStorage.setItem(PV_TRANSACTIONS_KEY, JSON.stringify([]));
  window.localStorage.setItem(PV_CLIENT_PRODUCTS_KEY, JSON.stringify([]));
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
