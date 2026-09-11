// Chantier Module Mensurations (2026-04-24).
// Tests des helpers mensurations : total cm perdus, parsing input,
// delta par zone.

import { describe, it, expect } from "vitest";
import {
  calculateTotalCmLost,
  countFilledKeys,
  parseMeasurementInput,
  getLatestSession,
  getInitialSession,
  getZoneDelta,
  mergeLatestPerZone,
  mergeInitialPerZone,
  zonesToSnapshot,
  type ClientMeasurement,
} from "../measurementCalculations";

function makeSession(
  date: string,
  values: Partial<ClientMeasurement>,
): ClientMeasurement {
  return {
    id: `s-${date}`,
    client_id: "c1",
    neck: null,
    chest: null,
    waist: null,
    hips: null,
    thigh_left: null,
    thigh_right: null,
    arm_left: null,
    arm_right: null,
    calf_left: null,
    calf_right: null,
    measured_at: date,
    measured_by_type: "coach",
    measured_by_user_id: null,
    notes: null,
    created_at: date,
    ...values,
  };
}

describe("calculateTotalCmLost", () => {
  it("retourne 0 si initial null", () => {
    expect(calculateTotalCmLost(null, { waist: 70 })).toBe(0);
  });
  it("retourne 0 si current null", () => {
    expect(calculateTotalCmLost({ waist: 80 }, null)).toBe(0);
  });
  it("calcule correctement avec toutes valeurs", () => {
    const init = { waist: 80, hips: 100, arm_left: 30 };
    const curr = { waist: 75, hips: 97, arm_left: 29 };
    expect(calculateTotalCmLost(init, curr)).toBeCloseTo(9, 2);
  });
  it("ignore les zones dont l'une des 2 valeurs manque", () => {
    const init = { waist: 80, hips: 100 };
    const curr = { waist: 75 };
    // Seule waist compte : 80 - 75 = 5
    expect(calculateTotalCmLost(init, curr)).toBeCloseTo(5, 2);
  });
  it("retour négatif si prise de cm", () => {
    const init = { waist: 75 };
    const curr = { waist: 80 };
    expect(calculateTotalCmLost(init, curr)).toBeCloseTo(-5, 2);
  });
});

describe("countFilledKeys", () => {
  it("0 sur session vide", () => {
    expect(countFilledKeys(null)).toBe(0);
    expect(countFilledKeys({})).toBe(0);
  });
  it("compte correctement", () => {
    expect(countFilledKeys({ waist: 78, hips: 100 })).toBe(2);
  });
});

describe("parseMeasurementInput", () => {
  it("parse integer", () => {
    expect(parseMeasurementInput("78")).toBe(78);
  });
  it("parse décimal anglo", () => {
    expect(parseMeasurementInput("78.5")).toBe(78.5);
  });
  it("parse décimal fr (virgule)", () => {
    expect(parseMeasurementInput("78,5")).toBe(78.5);
  });
  it("rejette vide", () => {
    expect(parseMeasurementInput("")).toBeNull();
    expect(parseMeasurementInput("   ")).toBeNull();
  });
  it("rejette non numérique", () => {
    expect(parseMeasurementInput("abc")).toBeNull();
  });
  it("rejette hors bornes (<=0 ou >300)", () => {
    expect(parseMeasurementInput("0")).toBeNull();
    expect(parseMeasurementInput("-5")).toBeNull();
    expect(parseMeasurementInput("301")).toBeNull();
  });
  it("accepte bornes valides", () => {
    expect(parseMeasurementInput("1")).toBe(1);
    expect(parseMeasurementInput("250")).toBe(250);
  });
});

describe("getLatestSession / getInitialSession", () => {
  const s1 = makeSession("2026-01-01", { waist: 80 });
  const s2 = makeSession("2026-03-15", { waist: 78 });
  const s3 = makeSession("2026-04-22", { waist: 75 });

  it("latest = plus récente", () => {
    expect(getLatestSession([s1, s2, s3])?.id).toBe("s-2026-04-22");
  });
  it("initial = plus ancienne", () => {
    expect(getInitialSession([s1, s2, s3])?.id).toBe("s-2026-01-01");
  });
  it("null si vide", () => {
    expect(getLatestSession([])).toBeNull();
    expect(getInitialSession([])).toBeNull();
  });
});

describe("mergeLatestPerZone / mergeInitialPerZone — le cas Catherine DAUMAIL (11/09/2026)", () => {
  // Reconstitution fidèle de sa fiche : la 1ère session porte les 10 zones,
  // puis elle mesure une zone à la fois sur plusieurs passages — exactement
  // le motif qui a fait remonter "Dernière mesure : 42 cm · 07 juin" alors
  // que son tour de cou avait été mesuré à 40,5 cm le 27/08.
  const session1erJuin = makeSession("2026-06-07T13:55:00Z", {
    neck: 42, chest: 102, waist: 110, hips: 115,
    thigh_left: 55, thigh_right: 55, arm_left: 30, arm_right: 30, calf_left: 22, calf_right: 22,
  });
  const waist27aout = makeSession("2026-08-27T19:35:00Z", { waist: 97, measured_by_type: "client" });
  const neck27aout = makeSession("2026-08-27T16:55:00Z", { neck: 40.5, measured_by_type: "client" });
  const hips27aout = makeSession("2026-08-27T17:03:00Z", { hips: 110, measured_by_type: "client" });
  const toutesLesLignes = [session1erJuin, waist27aout, neck27aout, hips27aout];

  it("« dernière mesure » d'une zone = la ligne la plus RÉCENTE qui la porte, pas la ligne la plus récente tout court", () => {
    const parZone = mergeLatestPerZone(toutesLesLignes);
    // AVANT le fix : lire juste la ligne la plus récente (waist27aout,
    // 19:35) aurait rendu neck=null → repli sur la 1ère session (42, 07/06).
    expect(parZone.neck.value).toBe(40.5);
    expect(parZone.neck.measuredAt).toBe("2026-08-27T16:55:00Z");
  });

  it("une zone jamais retouchée depuis la 1ère session garde sa valeur d'origine", () => {
    const parZone = mergeLatestPerZone(toutesLesLignes);
    expect(parZone.chest.value).toBe(102);
    expect(parZone.thigh_left.value).toBe(55);
  });

  it("mergeInitialPerZone reste la toute première valeur connue par zone", () => {
    const parZone = mergeInitialPerZone(toutesLesLignes);
    expect(parZone.neck.value).toBe(42);
    expect(parZone.neck.measuredAt).toBe("2026-06-07T13:55:00Z");
  });

  it("le compteur « X/10 zones » compte l'historique fusionné, pas la seule dernière ligne", () => {
    // AVANT le fix : `countFilledKeys(getLatestSession(...))` lisait la
    // ligne la plus récente (waist27aout) telle quelle → 1/10, alors que
    // 10 zones sont réellement connues (7 depuis la 1ère session, 3
    // rafraîchies fin août).
    expect(countFilledKeys(waist27aout)).toBe(1); // ce qu'affichait l'ancien code, à tort
    const snapshot = zonesToSnapshot(mergeLatestPerZone(toutesLesLignes));
    expect(countFilledKeys(snapshot)).toBe(10); // ce que l'app doit vraiment afficher
  });

  it("zone jamais mesurée : value et measuredAt restent null des deux côtés", () => {
    const uneSeuleLigne = [makeSession("2026-01-01", { waist: 80 })];
    expect(mergeLatestPerZone(uneSeuleLigne).neck).toEqual({ value: null, measuredAt: null });
    expect(mergeInitialPerZone(uneSeuleLigne).neck).toEqual({ value: null, measuredAt: null });
  });

  it("liste vide : toutes les zones à null, pas de crash", () => {
    const parZone = mergeLatestPerZone([]);
    expect(parZone.waist).toEqual({ value: null, measuredAt: null });
  });
});

describe("getZoneDelta", () => {
  it("négatif si perte", () => {
    expect(getZoneDelta({ waist: 80 }, { waist: 75 }, "waist")).toBe(-5);
  });
  it("positif si prise", () => {
    expect(getZoneDelta({ waist: 75 }, { waist: 80 }, "waist")).toBe(5);
  });
  it("null si donnée manquante", () => {
    expect(getZoneDelta({ waist: 80 }, {}, "waist")).toBeNull();
    expect(getZoneDelta(null, { waist: 75 }, "waist")).toBeNull();
  });
});
