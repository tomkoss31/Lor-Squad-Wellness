// =============================================================================
// « La Base, ce sont trois maisons » (22/09/2026, maquette 7pdf4sTkQoHob1axp76vfP).
//
// Les mots sont ceux de Thomas : La Base Nutrition pour ton coaching, The
// Breakfast Club ton club petit-déjeuner, La Base Shakes & Drinks les boissons
// énergisantes et les smoothies protéinés. Les logos sont les vrais, TELS QUELS
// (charte : « le logo du club, on ne le refait pas ») — versions allégées pour
// un téléphone (médaillon 35 Ko au lieu de 645, logo du bar en WebP).
// =============================================================================

import { MAISON_DE, ORDRE_MAISONS, type Maison, type Variante } from "./bienvenue";

const LOGOS: Record<Maison, { src: string; carre?: boolean }> = {
  nutrition: { src: "/brand/labase360/logo-primary.svg", carre: true },
  bbc: { src: "/brand/breakfast-club/logo-medaillon-240.png" },
  shakes: { src: "/brand/shakes-drinks/logo-rond-256.webp" },
};

const NOMS: Record<Maison, string> = {
  nutrition: "La Base Nutrition",
  bbc: "The Breakfast Club",
  shakes: "La Base Shakes & Drinks",
};

const LIGNES: Record<Maison, string> = {
  nutrition: "Pour ton coaching",
  bbc: "Ton club petit-déjeuner",
  shakes: "Les boissons énergisantes et les smoothies protéinés",
};

function sousLigne(maison: Maison, variante: Variante, coach: string): string {
  if (maison === "nutrition") {
    return variante === "coaching"
      ? `Ton bilan, ton programme et ton suivi avec ${coach}, et ton journal.`
      : `Bilan, programme et suivi, avec ${coach}.`;
  }
  if (maison === "bbc") {
    return variante === "club"
      ? "À Verdun : ta carte de membre, tes passages et tes cœurs sont dans ton espace."
      : "À Verdun, le matin : viens le découvrir.";
  }
  return "Commande en ligne, retrait express au club.";
}

export function TroisMaisons({ variante, coach }: { variante: Variante; coach: string }) {
  const sienne = MAISON_DE[variante];
  return (
    <ul className="bv-maisons" aria-label="Les trois maisons de La Base">
      {ORDRE_MAISONS[variante].map((m) => (
        <li key={m} className={`bv-maison${m === sienne ? " sienne" : ""}`}>
          {m === sienne && <span className="bv-puce">{variante === "club" ? "C'est ton club" : "C'est ton coaching"}</span>}
          <span className={`bv-logo${LOGOS[m].carre ? " carre" : ""}`}>
            <img src={LOGOS[m].src} alt="" width={62} height={62} decoding="async" />
          </span>
          <span>
            <span className="bv-maison-nom">{NOMS[m]}</span>
            <span className="bv-maison-ligne">{LIGNES[m]}</span>
            <span className="bv-maison-sous">{sousLigne(m, variante, coach)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Les trois étapes du lien (Découvrir · Mot de passe · Installer). */
export function Progres({ etape }: { etape: 1 | 2 | 3 }) {
  const noms = ["Découvrir", "Mot de passe", "Installer"];
  return (
    <div aria-label={`Étape ${etape} sur 3 : ${noms[etape - 1]}`}>
      <div className="bv-progres" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= etape ? "fait" : ""} />
        ))}
      </div>
      <div className="bv-progres-l" aria-hidden="true" style={{ marginTop: 6 }}>
        {noms.map((n, i) => (
          <span key={n} className={i + 1 === etape ? "ici" : ""}>
            {n}
          </span>
        ))}
      </div>
    </div>
  );
}
