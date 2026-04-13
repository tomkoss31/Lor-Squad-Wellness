import type { Bilan, BodyScan, Client, ClientProduit, Suivi } from "./types";

const keys = {
  clients: "lor_demo_clients",
  bilans: "lor_demo_bilans",
  scans: "lor_demo_scans",
  suivis: "lor_demo_suivis",
  clientProduits: "lor_demo_client_produits"
} as const;

function readCollection<T>(key: string): T[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function writeCollection<T>(key: string, data: T[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(data));
}

export function readClients() {
  return readCollection<Client>(keys.clients);
}

export function writeClients(data: Client[]) {
  writeCollection(keys.clients, data);
}

export function readBilans() {
  return readCollection<Bilan>(keys.bilans);
}

export function writeBilans(data: Bilan[]) {
  writeCollection(keys.bilans, data);
}

export function readBodyScans() {
  return readCollection<BodyScan>(keys.scans);
}

export function writeBodyScans(data: BodyScan[]) {
  writeCollection(keys.scans, data);
}

export function readSuivis() {
  return readCollection<Suivi>(keys.suivis);
}

export function writeSuivis(data: Suivi[]) {
  writeCollection(keys.suivis, data);
}

export function readClientProduits() {
  return readCollection<ClientProduit>(keys.clientProduits);
}

export function writeClientProduits(data: ClientProduit[]) {
  writeCollection(keys.clientProduits, data);
}
