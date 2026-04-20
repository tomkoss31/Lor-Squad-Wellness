// Chantier nuit 2026-04-20 — C4 Vitest.
// Couverture : les 4 filtres d'éligibilité + la borne J+10 + la zone de
// contrôle jour d'envoi (overdue vs today vs upcoming).
import { describe, expect, it } from "vitest";
import type {
  AssessmentRecord,
  Client,
  FollowUpProtocolLog
} from "../../types/domain";
import {
  PROTOCOL_MAX_DAYS_ELIGIBLE,
  computeDaysSinceInitial,
  evaluateProtocolEligibility,
  getFollowUpsDue,
  getInitialAssessmentDate
} from "../followUpProtocolScheduler";

// ─── Fixtures ───────────────────────────────────────────────────────────
const COACH_ID = "coach-1";

function makeAssessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    id: overrides.id ?? "a-1",
    date: overrides.date ?? new Date().toISOString(),
    type: overrides.type ?? "initial",
    objective: overrides.objective ?? "weight-loss",
    programId: "programId" in overrides ? overrides.programId : "prog-1",
    programTitle: overrides.programTitle ?? "Programme test",
    summary: overrides.summary ?? "",
    notes: overrides.notes ?? "",
    bodyScan: overrides.bodyScan ?? {
      weight: 80,
      bodyFat: 25,
      muscleMass: 30,
      hydration: 55,
      boneMass: 3,
      visceralFat: 8,
      bmr: 1600,
      metabolicAge: 35
    },
    questionnaire: overrides.questionnaire ?? ({
      selectedProductIds: ["p1"],
      recommendations: [],
      recommendationsContacted: false
    } as unknown as AssessmentRecord["questionnaire"]),
    pedagogicalFocus: overrides.pedagogicalFocus ?? []
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: overrides.id ?? "c-1",
    firstName: overrides.firstName ?? "Jean",
    lastName: overrides.lastName ?? "Test",
    sex: overrides.sex ?? "male",
    phone: overrides.phone ?? "0600000000",
    email: overrides.email ?? "j@t.fr",
    age: overrides.age ?? 35,
    height: overrides.height ?? 180,
    job: overrides.job ?? "",
    distributorId: overrides.distributorId ?? COACH_ID,
    distributorName: overrides.distributorName ?? "Coach",
    status: overrides.status ?? "active",
    objective: overrides.objective ?? "weight-loss",
    currentProgram: overrides.currentProgram ?? "Programme test",
    started: overrides.started ?? true,
    nextFollowUp: overrides.nextFollowUp ?? "",
    notes: overrides.notes ?? "",
    assessments: overrides.assessments ?? [makeAssessment()],
    lifecycleStatus: overrides.lifecycleStatus,
    freeFollowUp: overrides.freeFollowUp,
    freePvTracking: overrides.freePvTracking
  } as Client;
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── evaluateProtocolEligibility ────────────────────────────────────────
describe("evaluateProtocolEligibility", () => {
  it("accepte un client standard J+3", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(3) })] });
    const r = evaluateProtocolEligibility(c);
    expect(r.eligible).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it("accepte pile à la borne J+0", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(0) })] });
    expect(evaluateProtocolEligibility(c).eligible).toBe(true);
  });

  it("accepte pile à la borne J+10", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(10) })] });
    expect(evaluateProtocolEligibility(c).eligible).toBe(true);
  });

  it("exclut J+11 (trop vieux)", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(11) })] });
    const r = evaluateProtocolEligibility(c);
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("too_old");
  });

  it("exclut J+206 (cas client historique)", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(206) })] });
    expect(evaluateProtocolEligibility(c).reasons).toContain("too_old");
  });

  it("exclut un client sans bilan initial", () => {
    const c = makeClient({ assessments: [] });
    const r = evaluateProtocolEligibility(c);
    expect(r.eligible).toBe(false);
    expect(r.reasons).toContain("no_initial_assessment");
  });

  it.each(["stopped", "lost", "paused"] as const)(
    "exclut un client lifecycle '%s'",
    (status) => {
      const c = makeClient({
        assessments: [makeAssessment({ date: daysAgo(3) })],
        lifecycleStatus: status
      });
      expect(evaluateProtocolEligibility(c).reasons).toContain("lifecycle_inactive");
    }
  );

  it("exclut sans programme et sans produits", () => {
    const assessment = makeAssessment({
      date: daysAgo(3),
      programId: undefined,
      questionnaire: {
        selectedProductIds: [],
        recommendations: [],
        recommendationsContacted: false
      } as unknown as AssessmentRecord["questionnaire"]
    });
    const c = makeClient({ assessments: [assessment] });
    expect(evaluateProtocolEligibility(c).reasons).toContain("no_program");
  });

  it("accepte avec produits mais pas de programId", () => {
    const assessment = makeAssessment({
      date: daysAgo(3),
      programId: undefined,
      questionnaire: {
        selectedProductIds: ["p1", "p2"],
        recommendations: [],
        recommendationsContacted: false
      } as unknown as AssessmentRecord["questionnaire"]
    });
    const c = makeClient({ assessments: [assessment] });
    expect(evaluateProtocolEligibility(c).eligible).toBe(true);
  });

  it("exclut sans body scan (poids 0)", () => {
    const c = makeClient({
      assessments: [
        makeAssessment({
          date: daysAgo(3),
          bodyScan: {
            weight: 0,
            bodyFat: 0,
            muscleMass: 0,
            hydration: 0,
            boneMass: 0,
            visceralFat: 0,
            bmr: 0,
            metabolicAge: 0
          }
        })
      ]
    });
    expect(evaluateProtocolEligibility(c).reasons).toContain("no_body_scan");
  });

  it("PROTOCOL_MAX_DAYS_ELIGIBLE vaut 10", () => {
    expect(PROTOCOL_MAX_DAYS_ELIGIBLE).toBe(10);
  });
});

// ─── computeDaysSinceInitial ─────────────────────────────────────────────
describe("computeDaysSinceInitial", () => {
  it("renvoie 0 si même jour", () => {
    const now = new Date("2026-04-20T14:00:00");
    const initial = new Date("2026-04-20T09:00:00");
    expect(computeDaysSinceInitial(initial, now)).toBe(0);
  });

  it("renvoie 3 pour 3 jours", () => {
    const now = new Date("2026-04-20T14:00:00");
    const initial = new Date("2026-04-17T09:00:00");
    expect(computeDaysSinceInitial(initial, now)).toBe(3);
  });

  it("renvoie un nombre négatif si la date est dans le futur", () => {
    const now = new Date("2026-04-20T00:00:00");
    const initial = new Date("2026-04-22T00:00:00");
    expect(computeDaysSinceInitial(initial, now)).toBeLessThan(0);
  });
});

// ─── getInitialAssessmentDate ────────────────────────────────────────────
describe("getInitialAssessmentDate", () => {
  it("retourne null si pas d'assessment", () => {
    const c = makeClient({ assessments: [] });
    expect(getInitialAssessmentDate(c)).toBeNull();
  });

  it("préfère l'assessment type='initial' même si un follow-up est plus ancien", () => {
    const c = makeClient({
      assessments: [
        makeAssessment({ id: "f1", type: "follow-up", date: daysAgo(50) }),
        makeAssessment({ id: "i1", type: "initial", date: daysAgo(10) })
      ]
    });
    const d = getInitialAssessmentDate(c);
    expect(d).not.toBeNull();
    const expected = new Date(daysAgo(10)).getTime();
    expect(Math.abs((d as Date).getTime() - expected)).toBeLessThan(1000);
  });
});

// ─── getFollowUpsDue ─────────────────────────────────────────────────────
describe("getFollowUpsDue", () => {
  it("retourne vide pour un client d'un autre coach", () => {
    const c = makeClient({
      distributorId: "other-coach",
      assessments: [makeAssessment({ date: daysAgo(3) })]
    });
    expect(getFollowUpsDue([c], COACH_ID, [])).toEqual([]);
  });

  it("retourne des items pour un client J+3 du coach", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(3) })] });
    const items = getFollowUpsDue([c], COACH_ID, []);
    expect(items.length).toBeGreaterThan(0);
  });

  it("exclut les étapes déjà loggées", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(3) })] });
    const all = getFollowUpsDue([c], COACH_ID, []);
    const firstStep = all[0];
    expect(firstStep).toBeDefined();

    const log: FollowUpProtocolLog = {
      id: "log-1",
      clientId: c.id,
      stepId: firstStep.stepId,
      distributorId: COACH_ID,
      sentAt: new Date().toISOString()
    } as unknown as FollowUpProtocolLog;

    const afterLog = getFollowUpsDue([c], COACH_ID, [log]);
    expect(afterLog.find((i) => i.stepId === firstStep.stepId)).toBeUndefined();
  });

  it("exclut les clients au-delà de J+10 entièrement", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(15) })] });
    expect(getFollowUpsDue([c], COACH_ID, [])).toEqual([]);
  });

  it("n'inclut pas 'upcoming' par défaut", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(0) })] });
    const items = getFollowUpsDue([c], COACH_ID, []);
    expect(items.every((i) => i.status !== "upcoming")).toBe(true);
  });

  it("inclut 'upcoming' quand includeUpcoming est true", () => {
    const c = makeClient({ assessments: [makeAssessment({ date: daysAgo(0) })] });
    const items = getFollowUpsDue([c], COACH_ID, [], { includeUpcoming: true });
    expect(items.some((i) => i.status === "upcoming")).toBe(true);
  });
});
