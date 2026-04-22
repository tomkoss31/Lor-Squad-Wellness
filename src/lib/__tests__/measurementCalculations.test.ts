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
