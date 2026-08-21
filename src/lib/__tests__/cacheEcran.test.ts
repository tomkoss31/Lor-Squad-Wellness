import { beforeEach, describe, expect, it } from "vitest";
import {
  ageCacheEcran,
  ecrireCacheEcran,
  lireCacheEcran,
  oublierCacheEcran,
  viderCacheEcran,
} from "../cacheEcran";

describe("cacheEcran", () => {
  beforeEach(() => viderCacheEcran());

  it("rend null tant qu'on n'a rien mis", () => {
    expect(lireCacheEcran("crm")).toBeNull();
    expect(ageCacheEcran("crm")).toBeNull();
  });

  it("rend ce qu'on a mis, a l'identique", () => {
    const leads = [{ id: "a" }, { id: "b" }];
    ecrireCacheEcran("crm", leads);
    expect(lireCacheEcran<typeof leads>("crm")).toEqual(leads);
  });

  it("une ecriture remplace la precedente", () => {
    ecrireCacheEcran("crm", ["vieux"]);
    ecrireCacheEcran("crm", ["neuf"]);
    expect(lireCacheEcran("crm")).toEqual(["neuf"]);
  });

  it("l'age se compte depuis l'ecriture", () => {
    ecrireCacheEcran("crm", 1, 1_000);
    expect(ageCacheEcran("crm", 3_500)).toBe(2_500);
  });

  it("oublier ne touche QUE la cle visee", () => {
    ecrireCacheEcran("crm", "a");
    ecrireCacheEcran("agenda", "b");
    oublierCacheEcran("crm");
    expect(lireCacheEcran("crm")).toBeNull();
    expect(lireCacheEcran("agenda")).toBe("b");
  });

  it("vider efface tout — c'est ce qui protege a la deconnexion", () => {
    ecrireCacheEcran("crm", "leads de Thomas");
    ecrireCacheEcran("agenda", "rdv de Thomas");
    viderCacheEcran();
    expect(lireCacheEcran("crm")).toBeNull();
    expect(lireCacheEcran("agenda")).toBeNull();
  });
});
