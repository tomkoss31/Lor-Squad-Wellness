// Chantier Polish Vue complète + refonte bilan (2026-04-24).
// Tests ranges zones de santé par métrique et par sexe.

import { describe, it, expect } from "vitest";
import {
  getZone,
  getMetricRange,
  getPercentOnBar,
  formatMetricDelta,
} from "../bodyCompositionRanges";

describe("bodyCompositionRanges — getZone bodyFat female", () => {
  it("classe 20% en idéal", () => {
    expect(getZone(20, "bodyFat", "female").key).toBe("ideal");
  });
  it("classe 30% en normal", () => {
    expect(getZone(30, "bodyFat", "female").key).toBe("normal");
  });
  it("classe 35% en vigilance", () => {
    expect(getZone(35, "bodyFat", "female").key).toBe("warning");
  });
  it("classe 45% en élevé", () => {
    expect(getZone(45, "bodyFat", "female").key).toBe("high");
  });
});

describe("bodyCompositionRanges — getZone bodyFat male", () => {
  it("classe 15% en idéal", () => {
    expect(getZone(15, "bodyFat", "male").key).toBe("ideal");
  });
  it("classe 22% en normal", () => {
    expect(getZone(22, "bodyFat", "male").key).toBe("normal");
  });
  it("classe 28% en vigilance", () => {
    expect(getZone(28, "bodyFat", "male").key).toBe("warning");
  });
  it("classe 35% en élevé", () => {
    expect(getZone(35, "bodyFat", "male").key).toBe("high");
  });
});

describe("bodyCompositionRanges — getZone hydration female", () => {
  it("classe 40% en insuffisant", () => {
    expect(getZone(40, "hydration", "female").key).toBe("insufficient");
  });
  it("classe 47% en limite", () => {
    expect(getZone(47, "hydration", "female").key).toBe("limit");
  });
  it("classe 55% en idéal", () => {
    expect(getZone(55, "hydration", "female").key).toBe("ideal");
  });
  it("classe 65% en sur-hydraté", () => {
    expect(getZone(65, "hydration", "female").key).toBe("overhydrated");
  });
});

describe("bodyCompositionRanges — getZone muscleMass", () => {
  it("femme 28% = normal", () => {
    expect(getZone(28, "muscleMass", "female").key).toBe("normal");
  });
  it("femme 33% = idéal", () => {
    expect(getZone(33, "muscleMass", "female").key).toBe("ideal");
  });
  it("homme 36% = normal", () => {
    expect(getZone(36, "muscleMass", "male").key).toBe("normal");
  });
  it("homme 42% = idéal", () => {
    expect(getZone(42, "muscleMass", "male").key).toBe("ideal");
  });
});

describe("bodyCompositionRanges — getMetricRange", () => {
  it("retourne un range avec min/max et zones", () => {
    const r = getMetricRange("bodyFat", "female");
    expect(r.min).toBe(0);
    expect(r.zones.length).toBeGreaterThan(0);
    expect(r.higherIsBetter).toBe(false);
  });
  it("muscleMass higherIsBetter", () => {
    expect(getMetricRange("muscleMass", "male").higherIsBetter).toBe(true);
  });
});

describe("bodyCompositionRanges — getPercentOnBar", () => {
  it("clamp inf à 0", () => {
    expect(getPercentOnBar(-5, "bodyFat", "female")).toBe(0);
  });
  it("clamp sup à 100", () => {
    expect(getPercentOnBar(999, "bodyFat", "female")).toBe(100);
  });
  it("valeur médiane proche de 50", () => {
    const r = getMetricRange("bodyFat", "female");
    const mid = (r.min + r.max) / 2;
    expect(getPercentOnBar(mid, "bodyFat", "female")).toBeCloseTo(50, 0);
  });
});

describe("bodyCompositionRanges — formatMetricDelta", () => {
  it("null si données manquantes", () => {
    expect(formatMetricDelta(null, 30, "bodyFat").delta).toBeNull();
  });
  it("bodyFat qui baisse = positif", () => {
    const r = formatMetricDelta(28, 32, "bodyFat");
    expect(r.tone).toBe("positive");
  });
  it("bodyFat qui monte = warning", () => {
    const r = formatMetricDelta(34, 30, "bodyFat");
    expect(r.tone).toBe("warning");
  });
  it("muscleMass qui monte = positif", () => {
    const r = formatMetricDelta(34, 30, "muscleMass");
    expect(r.tone).toBe("positive");
  });
  it("stable = neutre", () => {
    const r = formatMetricDelta(30, 30, "bodyFat");
    expect(r.tone).toBe("neutral");
  });
});
