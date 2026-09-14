// =============================================================================
// leadScoring — les paliers de température, et la capture qui les a changés.
//
// 14/09/2026 : 🔥 sur les six personnes visibles de la liste de Thomas.
// « tout frais » (+4) + « a laissé son numéro » (+3) = 7 = l'ancien seuil :
// tout lead Meta récent avec un téléphone était chaud d'office.
// =============================================================================

import { describe, it, expect } from "vitest";
import { computeLeadScore, JOURS_SANS_ECHANGE_GLACE, TEMP_META } from "../leadScoring";
import type { CrmLead } from "../../hooks/useCrmLeads";

const ilYa = (jours: number) => new Date(Date.now() - jours * 86_400_000).toISOString();

function lead(p: Partial<CrmLead> = {}): CrmLead {
  return {
    source: "meta-ads",
    status: "new",
    createdAt: ilYa(1),
    contactedAt: null,
    contact: "0600000000",
    contactIsPhone: true,
    viaName: null,
    relanceDue: false,
    rdvLabel: null,
    callbackRequestedAt: null,
    abandonAvantCreneau: false,
    bilanMotivation: null,
    funnelScore: null,
    funnelTemperature: null,
    ...p,
  } as unknown as CrmLead;
}

describe("leadScoring — « sur les vrais chauds »", () => {
  it("un lead Meta arrivé hier avec un numéro n'est plus chaud d'office", () => {
    const r = computeLeadScore(lead());
    expect(r.score).toBe(7); // le score ne bouge pas : il sert au tri
    expect(r.temperature).toBe("warm");
  });

  it("il faut un signal de plus qu'un formulaire récent : recommandé → chaud", () => {
    expect(computeLeadScore(lead({ viaName: "Mélanie" })).temperature).toBe("hot");
  });

  it("les trois gestes décisifs restent chauds sans condition", () => {
    expect(computeLeadScore(lead({ rdvLabel: "mar. 15 sept. 11:00" })).temperature).toBe("hot");
    expect(computeLeadScore(lead({ callbackRequestedAt: ilYa(0) })).temperature).toBe("hot");
    expect(computeLeadScore(lead({ abandonAvantCreneau: true })).temperature).toBe("hot");
  });

  it("froid reste froid", () => {
    // Un email seul, arrivé il y a 10 jours : rien ne le réchauffe.
    const r = computeLeadScore(lead({ createdAt: ilYa(10), contact: "a@b.fr", contactIsPhone: false }));
    expect(r.temperature).toBe("cold");
  });
});

describe("leadScoring — « glacé »", () => {
  it(`aucun échange depuis plus de ${JOURS_SANS_ECHANGE_GLACE} jours → glacé, quel que soit le score`, () => {
    // Appelé il y a 45 jours, numéro, relance due : score 6, autrefois « tiède ».
    const r = computeLeadScore(lead({ status: "contacted", createdAt: ilYa(60), contactedAt: ilYa(45), relanceDue: true }));
    expect(r.temperature).toBe("frozen");
    expect(r.raison).toBe("aucun échange depuis 45 jours");
  });

  it("le score ne change pas quand la fiche gèle — le tri ne bouge pas sous les pieds", () => {
    const r = computeLeadScore(lead({ status: "contacted", createdAt: ilYa(60), contactedAt: ilYa(45) }));
    expect(r.score).toBe(5); // +3 numéro +2 déjà contacté
  });

  it("à la limite, pas encore glacé ; un jour de plus, glacé", () => {
    const base = { status: "contacted" as const, createdAt: ilYa(90) };
    expect(computeLeadScore(lead({ ...base, contactedAt: ilYa(JOURS_SANS_ECHANGE_GLACE - 1) })).temperature).not.toBe("frozen");
    expect(computeLeadScore(lead({ ...base, contactedAt: ilYa(JOURS_SANS_ECHANGE_GLACE + 1) })).temperature).toBe("frozen");
  });

  it("jamais contacté : c'est la date d'arrivée qui compte", () => {
    expect(computeLeadScore(lead({ createdAt: ilYa(40) })).temperature).toBe("frozen");
  });

  it("un rendez-vous pris ne gèle pas, même sur une vieille fiche", () => {
    expect(computeLeadScore(lead({ rdvLabel: "jeu. 17 sept.", createdAt: ilYa(80) })).temperature).toBe("hot");
  });

  it("funnel Opportunité : garde sa température, mais le temps la gèle aussi", () => {
    const opp = { source: "opportunite" as const, funnelScore: 15, funnelTemperature: "hot" };
    expect(computeLeadScore(lead({ ...opp, createdAt: ilYa(2) })).temperature).toBe("hot");
    expect(computeLeadScore(lead({ ...opp, createdAt: ilYa(50), contactedAt: ilYa(45) })).temperature).toBe("frozen");
  });

  // Relecture avant prod, 14/09.
  it("funnel Opportunité avec un rendez-vous pris : ne gèle pas non plus", () => {
    const opp = { source: "opportunite" as const, funnelScore: 15, funnelTemperature: "hot" };
    expect(computeLeadScore(lead({ ...opp, createdAt: ilYa(50), rdvLabel: "mar. 15 sept. 17:15" })).temperature).toBe("hot");
    expect(computeLeadScore(lead({ ...opp, createdAt: ilYa(50), callbackRequestedAt: ilYa(40) })).temperature).toBe("hot");
  });

  it("un échange sans date connue (reco passée en « contacté ») ne devient pas « aucun échange »", () => {
    const r = computeLeadScore(lead({ source: "reco-client", status: "contacted", createdAt: ilYa(35), contactedAt: null }));
    expect(r.temperature).not.toBe("frozen");
    expect(r.raison).not.toMatch(/aucun échange/);
  });

  it("une fiche close (convertie, perdue) n'est pas « glacée » : l'Historique ne ment pas", () => {
    expect(computeLeadScore(lead({ status: "converted", createdAt: ilYa(80), contactedAt: ilYa(60) })).temperature).not.toBe("frozen");
    expect(computeLeadScore(lead({ status: "lost", createdAt: ilYa(80), contactedAt: ilYa(60) })).temperature).not.toBe("frozen");
  });

  it("un RDV calé par la qualification (bilan en ligne, sans rdvLabel) ne gèle pas", () => {
    expect(computeLeadScore(lead({ status: "qualified", createdAt: ilYa(80), contactedAt: ilYa(40) })).temperature).not.toBe("frozen");
  });

  it("… mais une reco à qui personne n'a parlé gèle comme les autres", () => {
    expect(computeLeadScore(lead({ source: "reco-client", status: "new", createdAt: ilYa(35) })).temperature).toBe("frozen");
  });
});

describe("TEMP_META", () => {
  it("couvre les quatre paliers, chacun avec son emoji et son libellé", () => {
    expect(Object.keys(TEMP_META).sort()).toEqual(["cold", "frozen", "hot", "warm"]);
    expect(TEMP_META.frozen).toMatchObject({ emoji: "🧊", label: "Glacé" });
  });
});
