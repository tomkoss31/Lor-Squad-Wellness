// =============================================================================
// La fenêtre de marquage. Petite règle, grosses conséquences.
//
// `users.last_access_at` a menti pendant des mois (jusqu'à 62 jours de retard)
// parce qu'il n'était écrit qu'à la connexion par mot de passe, sur une app
// qu'on ne quitte jamais. C'est pourtant LE chiffre qu'on lit pour répondre à
// « qui utilise encore l'app ? », donc pour décider de supprimer quelque chose.
//
// Le principe qui gouverne ces tests : EN CAS DE DOUTE, ON APPELLE. Une
// écriture de trop ne coûte rien (la base n'en garde qu'une par heure) ; une
// mesure manquée fait supprimer une fonctionnalité vivante.
// =============================================================================

import { describe, it, expect } from "vitest";
import { doitMarquer, FENETRE_MS } from "../touchLastAccess";

const MAINTENANT = 1_756_700_000_000;

describe("quand redemander au serveur", () => {
  it("jamais marqué → on appelle", () => {
    expect(doitMarquer(null, MAINTENANT)).toBe(true);
  });

  it("marqué à l'instant → on n'appelle pas", () => {
    expect(doitMarquer(String(MAINTENANT - 1000), MAINTENANT)).toBe(false);
  });

  it("juste avant la fenêtre → on n'appelle pas", () => {
    expect(doitMarquer(String(MAINTENANT - FENETRE_MS + 1), MAINTENANT)).toBe(false);
  });

  it("exactement la fenêtre → on appelle", () => {
    expect(doitMarquer(String(MAINTENANT - FENETRE_MS), MAINTENANT)).toBe(true);
  });

  it("hier → on appelle", () => {
    expect(doitMarquer(String(MAINTENANT - 24 * 3600 * 1000), MAINTENANT)).toBe(true);
  });
});

describe("le souvenir du navigateur n'est pas digne de confiance", () => {
  it("valeur illisible → on appelle plutôt que de deviner", () => {
    expect(doitMarquer("hier matin", MAINTENANT)).toBe(true);
    expect(doitMarquer("", MAINTENANT)).toBe(true);
  });

  it("date DANS LE FUTUR → on appelle", () => {
    // Horloge reculée, fuseau bricolé, valeur modifiée à la main : s'y fier
    // bloquerait le marquage pour toujours, et la personne redeviendrait
    // invisible dans les compteurs — exactement le bug qu'on répare.
    expect(doitMarquer(String(MAINTENANT + 10 * 24 * 3600 * 1000), MAINTENANT)).toBe(true);
  });

  it("la fenêtre reste plus courte qu'une journée de travail", () => {
    // Sinon quelqu'un qui ouvre l'app le matin puis le soir n'est compté
    // qu'une fois — et un jour d'écart suffit à le classer « inactif ».
    expect(FENETRE_MS).toBeLessThan(12 * 3600 * 1000);
    expect(FENETRE_MS).toBeGreaterThan(60 * 60 * 1000);
  });
});
