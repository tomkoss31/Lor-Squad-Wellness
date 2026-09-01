// =============================================================================
// LES CRÉNEAUX LIBRES — une erreur d'une minute fait réserver sur quelqu'un.
//
// C'est la règle qui permet à Maria de poser un rendez-vous chez Mélanie sans
// jamais voir un nom de client. Le serveur ne rend que des plages [début, fin] ;
// tout ce que l'écran affiche sort d'ici.
//
// Deux pièges sont testés en toutes lettres parce qu'ils se réintroduisent tout
// seuls : la borne de droite (un RDV 14 h–15 h ne bloque PAS 15 h) et le
// dernier créneau (ne jamais déborder la fermeture).
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  creneauxDuJour,
  compterLibres,
  encoreLibre,
  seChevauchent,
  enMinutes,
  enHeure,
} from "../creneauxLibres";

const JOUR = new Date(2026, 8, 4); // vendredi 4 septembre 2026
const h = (hh: number, mm = 0) => new Date(2026, 8, 4, hh, mm);
const TOT = new Date(2026, 8, 4, 6, 0); // « maintenant » avant l'ouverture

const base = {
  jour: JOUR,
  ouvertureMin: 9 * 60,
  fermetureMin: 12 * 60,
  pasMin: 60,
  maintenant: TOT,
};

describe("découper une journée", () => {
  it("trois créneaux d'une heure entre 9 h et 12 h", () => {
    const c = creneauxDuJour({ ...base, occupees: [] });
    expect(c.map((x) => x.debut.getHours())).toEqual([9, 10, 11]);
    expect(compterLibres(c)).toBe(3);
  });

  it("LE DERNIER CRÉNEAU NE DÉBORDE JAMAIS LA FERMETURE", () => {
    // 9 h → 12 h 30 par pas d'une heure : on ne propose PAS 12 h, qui finirait
    // à 13 h. Promettre une heure qui n'existe pas, c'est un rendez-vous qu'on
    // ne peut pas honorer.
    const c = creneauxDuJour({ ...base, fermetureMin: 12 * 60 + 30, occupees: [] });
    expect(c.map((x) => x.debut.getHours())).toEqual([9, 10, 11]);
  });

  it("des demi-heures quand le pas est de 30", () => {
    const c = creneauxDuJour({ ...base, fermetureMin: 10 * 60 + 30, pasMin: 30, occupees: [] });
    expect(c.map((x) => enHeure(x.debut.getHours() * 60 + x.debut.getMinutes())))
      .toEqual(["09:00", "09:30", "10:00"]);
  });

  it("un pas absurde ne rend rien plutôt que de boucler", () => {
    expect(creneauxDuJour({ ...base, pasMin: 0, occupees: [] })).toEqual([]);
    expect(creneauxDuJour({ ...base, fermetureMin: 8 * 60, occupees: [] })).toEqual([]);
  });
});

describe("ce qui rend un créneau indisponible", () => {
  it("un rendez-vous pile dessus", () => {
    const c = creneauxDuJour({ ...base, occupees: [{ debut: h(10), fin: h(11) }] });
    expect(c.map((x) => x.libre)).toEqual([true, false, true]);
  });

  it("un rendez-vous qui déborde en mange deux", () => {
    const c = creneauxDuJour({ ...base, occupees: [{ debut: h(9, 45), fin: h(10, 15) }] });
    expect(c.map((x) => x.libre)).toEqual([false, false, true]);
  });

  it("⚠️ UN RDV 10 h–11 h NE BLOQUE PAS LE CRÉNEAU DE 11 h", () => {
    // Le piège classique : écrire `<=` au lieu de `<`. Chaque rendez-vous
    // mangerait alors le créneau suivant, et une journée pleine deviendrait
    // impossible à remplir.
    const c = creneauxDuJour({ ...base, occupees: [{ debut: h(10), fin: h(11) }] });
    expect(c[2].libre).toBe(true);
  });

  it("un créneau déjà passé n'est jamais proposé", () => {
    const c = creneauxDuJour({ ...base, occupees: [], maintenant: h(10, 30) });
    expect(c.map((x) => x.libre)).toEqual([false, false, true]);
  });

  it("plusieurs rendez-vous se cumulent", () => {
    const c = creneauxDuJour({
      ...base,
      occupees: [{ debut: h(9), fin: h(10) }, { debut: h(11), fin: h(12) }],
    });
    expect(compterLibres(c)).toBe(1);
    expect(c[1].libre).toBe(true);
  });
});

describe("le chevauchement, dans les deux sens", () => {
  const a = { debut: h(10), fin: h(11) };
  it.each([
    [{ debut: h(10, 30), fin: h(11, 30) }, true, "commence dedans"],
    [{ debut: h(9, 30), fin: h(10, 30) }, true, "finit dedans"],
    [{ debut: h(9), fin: h(12) }, true, "englobe"],
    [{ debut: h(10, 15), fin: h(10, 45) }, true, "est dedans"],
    [{ debut: h(11), fin: h(12) }, false, "commence quand l'autre finit"],
    [{ debut: h(9), fin: h(10) }, false, "finit quand l'autre commence"],
  ])("%#. %s", (b, attendu) => {
    expect(seChevauchent(a, b)).toBe(attendu);
    expect(seChevauchent(b, a)).toBe(attendu); // symétrique, toujours
  });
});

describe("la revérification avant d'écrire", () => {
  // Deux coachs regardent le même agenda : entre l'affichage et le tap, la
  // place peut être prise. Une liste affichée est une photo.
  const voulu = { debut: h(14), fin: h(15) };

  it("libre → on laisse passer", () => {
    expect(encoreLibre(voulu, [{ debut: h(16), fin: h(17) }], TOT)).toBe(true);
  });

  it("quelqu'un vient de prendre la place → on refuse", () => {
    expect(encoreLibre(voulu, [{ debut: h(14, 30), fin: h(15, 30) }], TOT)).toBe(false);
  });

  it("le créneau est passé pendant qu'on hésitait → on refuse", () => {
    expect(encoreLibre(voulu, [], h(14, 1))).toBe(false);
  });
});

describe("heures écrites et heures calculées", () => {
  it.each([
    ["09:00", 540],
    ["9:30", 570],
    ["00:00", 0],
    ["23:59", 1439],
  ])("%s → %s", (txt, min) => {
    expect(enMinutes(txt as string)).toBe(min);
  });

  it.each(["", "9h30", "25:00", "10:75", "midi"])("« %s » n'est pas une heure", (mauvais) => {
    expect(enMinutes(mauvais)).toBeNull();
  });

  it("l'aller-retour ne perd rien", () => {
    for (const t of ["09:00", "13:45", "23:59"]) {
      expect(enHeure(enMinutes(t)!)).toBe(t);
    }
  });
});
