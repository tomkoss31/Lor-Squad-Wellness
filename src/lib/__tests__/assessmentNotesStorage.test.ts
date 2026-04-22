// Chantier Hotfix fuite notes coach (2026-04-24).
// Tests : garantir que la clé localStorage est scopée par prospectId
// et qu'un bilan neuf (sans prospect) ne persiste rien.

import { describe, it, expect, beforeEach } from "vitest";
import {
  notesStorageKey,
  readCoachNotesDraft,
  writeCoachNotesDraft,
  clearCoachNotesDraft,
  purgeLegacyCoachNotesKey,
  LEGACY_COACH_NOTES_KEY,
  COACH_NOTES_KEY_PREFIX,
} from "../assessmentNotesStorage";

// Vitest config = env 'node' → on installe un mock minimal de
// window/localStorage avant tous les tests.
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number { return this.store.size; }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  key(): string | null { return null; }
}

const mockWindow = { localStorage: new MemoryStorage() };
// @ts-expect-error — injection globale pour le module sous test
globalThis.window = mockWindow;

beforeEach(() => {
  mockWindow.localStorage.clear();
});

describe("notesStorageKey — scope par prospectId", () => {
  it("retourne null si prospectId manquant/vide/undefined", () => {
    expect(notesStorageKey(null)).toBeNull();
    expect(notesStorageKey(undefined)).toBeNull();
    expect(notesStorageKey("")).toBeNull();
    expect(notesStorageKey("   ")).toBeNull();
  });
  it("retourne clé scopée si prospectId défini", () => {
    expect(notesStorageKey("p-123")).toBe(`${COACH_NOTES_KEY_PREFIX}p-123`);
  });
  it("trim le prospectId", () => {
    expect(notesStorageKey("  p-abc  ")).toBe(`${COACH_NOTES_KEY_PREFIX}p-abc`);
  });
});

describe("writeCoachNotesDraft / readCoachNotesDraft", () => {
  it("persiste et relit pour un prospect donné", () => {
    writeCoachNotesDraft("p-A", "Note Mélanie A");
    expect(readCoachNotesDraft("p-A")).toBe("Note Mélanie A");
  });

  it("no-op si pas de prospectId (bilan neuf éphémère)", () => {
    writeCoachNotesDraft(null, "Note fantôme");
    // Rien n'a été persisté
    expect(readCoachNotesDraft(null)).toBe("");
    expect(window.localStorage.length).toBe(0);
  });

  it("isolation parfaite entre 2 prospects (LE BUG CORRIGÉ)", () => {
    writeCoachNotesDraft("p-A", "Note pour Client A");
    writeCoachNotesDraft("p-B", "Note pour Client B");
    expect(readCoachNotesDraft("p-A")).toBe("Note pour Client A");
    expect(readCoachNotesDraft("p-B")).toBe("Note pour Client B");
  });

  it("bilan neuf ne voit pas le draft d'un bilan prospect", () => {
    // Simulation Hyp 2 : Mélanie a un draft pour prospect A...
    writeCoachNotesDraft("p-A", "Note Mélanie A");
    // Puis ouvre un nouveau bilan SANS prospectId...
    expect(readCoachNotesDraft(null)).toBe("");
    // Le draft de A reste bien chez A, pas chez le bilan neuf
    expect(readCoachNotesDraft("p-A")).toBe("Note Mélanie A");
  });
});

describe("clearCoachNotesDraft", () => {
  it("purge la clé scopée + la clé legacy globale", () => {
    window.localStorage.setItem(LEGACY_COACH_NOTES_KEY, "legacy residu");
    writeCoachNotesDraft("p-A", "scoped draft");
    clearCoachNotesDraft("p-A");
    expect(window.localStorage.getItem(LEGACY_COACH_NOTES_KEY)).toBeNull();
    expect(readCoachNotesDraft("p-A")).toBe("");
  });

  it("purge quand même la clé legacy si prospectId null", () => {
    window.localStorage.setItem(LEGACY_COACH_NOTES_KEY, "legacy residu");
    clearCoachNotesDraft(null);
    expect(window.localStorage.getItem(LEGACY_COACH_NOTES_KEY)).toBeNull();
  });
});

describe("purgeLegacyCoachNotesKey — migration", () => {
  it("supprime l'ancienne clé globale au montage (protection users affectés)", () => {
    window.localStorage.setItem(LEGACY_COACH_NOTES_KEY, "bug residu");
    purgeLegacyCoachNotesKey();
    expect(window.localStorage.getItem(LEGACY_COACH_NOTES_KEY)).toBeNull();
  });
});
