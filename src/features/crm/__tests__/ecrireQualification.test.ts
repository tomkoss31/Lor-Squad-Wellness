// =============================================================================
// Ce que la base accepte VRAIMENT — table par table.
//
// Le bug qui a motivé ces tests : le Co-pilote écrivait `{status: …}` sur
// `online_bilans`, qui n'a pas cette colonne (elle s'appelle `lead_status`).
// Postgres rejetait TOUT l'update, donc la date de relance avec. La personne
// paraissait qualifiée à l'écran et ne revenait jamais — et l'erreur ne
// sortait qu'en console.warn.
//
// Les listes ci-dessous sont copiées de `pg_constraint` (vérifiées en base le
// 13/08), pas devinées. Si quelqu'un élargit une contrainte, ces tests doivent
// être mis à jour EN MÊME TEMPS.
// =============================================================================

import { describe, expect, it } from "vitest";
import { REPONSES } from "../qualification";
import {
  colonneStatut,
  estQualifiable,
  patchQualification,
  statutAccepte,
  statutPour,
  type TableQualifiable,
} from "../ecrireQualification";

const T0 = new Date("2026-08-13T09:10:00+02:00");
const TABLES: TableQualifiable[] = ["prospect_leads", "online_bilans"];

describe("où l'on a le droit d'écrire", () => {
  it("n'accepte que les deux tables qui portent les colonnes de relance", () => {
    expect(estQualifiable("prospect_leads")).toBe(true);
    expect(estQualifiable("online_bilans")).toBe(true);
    expect(estQualifiable("client_referrals")).toBe(false);
    expect(estQualifiable("client_referral_intentions")).toBe(false);
  });
});

describe("chaque table a sa colonne de statut", () => {
  it("online_bilans écrit lead_status, jamais status", () => {
    expect(colonneStatut("online_bilans")).toBe("lead_status");
    expect(colonneStatut("prospect_leads")).toBe("status");
  });

  it("le patch ne contient JAMAIS de clé `status` pour online_bilans", () => {
    for (const r of REPONSES) {
      const p = patchQualification("online_bilans", r, T0);
      expect(p).not.toHaveProperty("status");
      expect(p).toHaveProperty("lead_status");
    }
  });
});

describe("les six réponses passent la contrainte des DEUX tables", () => {
  it("aucune ne produit un statut refusé", () => {
    for (const table of TABLES) {
      for (const r of REPONSES) {
        const p = patchQualification(table, r, T0);
        const valeur = p[colonneStatut(table)] as string;
        expect(
          statutAccepte(table, valeur),
          `${r.cle} → « ${valeur} » refusé par ${table}`,
        ).toBe(true);
      }
    }
  });

  it("« RDV calé » ne casse pas prospect_leads, qui ignore « qualified »", () => {
    // C'est la moitié des vrais leads (colis, club, opportunité) : un rejet
    // ici serait invisible et permanent.
    expect(statutPour("prospect_leads", "qualified")).toBe("contacted");
    expect(statutAccepte("prospect_leads", "qualified")).toBe(false);
  });

  it("« contacté » se dit « contact » côté bilan en ligne", () => {
    expect(statutPour("online_bilans", "contacted")).toBe("contact");
    expect(statutAccepte("online_bilans", "contacted")).toBe(false);
  });

  it("« to_recontact » passe tel quel des deux côtés — c'est le cas courant", () => {
    for (const table of TABLES) {
      expect(statutPour(table, "to_recontact")).toBe("to_recontact");
      expect(statutAccepte(table, "to_recontact")).toBe(true);
    }
  });
});

describe("le reste du patch survit à la traduction", () => {
  it("garde l'échéance, la dernière réponse et la date de contact", () => {
    const p = patchQualification("online_bilans", REPONSES[0], T0);
    expect(p.relance_due_at).toBeTruthy();
    expect(p.relance_done_at).toBeNull();
    expect(p.derniere_reponse).toBe("pas_de_reponse");
    expect(p.contacted_at).toBe(T0.toISOString());
  });

  it("referme bien quand la personne ne revient pas", () => {
    for (const table of TABLES) {
      const p = patchQualification(table, REPONSES[4], T0); // plus intéressé
      expect(p.relance_due_at).toBeNull();
      expect(p.relance_done_at).toBe(T0.toISOString());
    }
  });
});
