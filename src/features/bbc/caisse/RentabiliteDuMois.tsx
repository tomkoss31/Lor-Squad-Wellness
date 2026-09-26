// =============================================================================
// « Ce mois-ci au club » — ce qui reste au club (lot 4 du comptoir, 26/09/2026).
// Maquette v3 (SHZYSBaqfgWVqdMncgrcPG), écran 5, en tête de « Rentabilité »
// (BbcClub100 : pas de nouvel écran). Pour le propriétaire et les admins
// seulement : `club_rentabilite` ne rend rien aux autres, et la section disparaît.
//
// Cartes encaissées − produits servis (visites × le coût d'une visite calculé
// juste en dessous, par la recette) + vos ventes + les écarts Herbalife estimés.
// Le calcul est dans gains.ts (pur, testé).
// =============================================================================

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { nomDuMois, rentabiliteDuMois, type DonneesRentabilite } from "./gains";
import { chargerRentabilite } from "./serviceCaisse";

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const eur2 = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const signe = (n: number) => `${n < 0 ? "−" : "+"}${eur(Math.abs(n))}`;
const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

interface Props {
  /** Le coût d'une visite (shake + boisson), calculé par la recette de l'écran. */
  coutVisite: number | null;
  /** Le tarif des cartes du club, pour une carte enregistrée sans prix. */
  prixCartes: Partial<Record<"10" | "30", number | null>>;
}

export function RentabiliteDuMois({ coutVisite, prixCartes }: Props) {
  const [donnees, setDonnees] = useState<DonneesRentabilite | null>(null);

  useEffect(() => {
    let annule = false;
    void chargerRentabilite().then((d) => {
      if (!annule) setDonnees(d);
    });
    return () => {
      annule = true;
    };
  }, []);

  if (!donnees) return null;
  const r = rentabiliteDuMois(donnees, coutVisite, prixCartes);
  const cartes = [r.cartes.nb10 ? `${pluriel(r.cartes.nb10, "carte")} 10 visites` : "", r.cartes.nb30 ? `${pluriel(r.cartes.nb30, "carte")} 30 visites` : ""]
    .filter(Boolean)
    .join(" · ");

  return (
    <section style={carte}>
      <span style={oeil}>Ce mois-ci au club · {nomDuMois(donnees.mois)}</span>

      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "4px 12px", margin: "6px 0 14px" }}>
        <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 44, lineHeight: 1, fontVariantNumeric: "tabular-nums", color: r.reste != null && r.reste < 0 ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)" }}>
          {r.reste != null ? eur(r.reste) : "—"}
        </span>
        <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>
          {r.reste != null ? `${r.reste < 0 ? "manquent" : "restent"} au club avant loyer et charges` : "le coût d'une visite manque : règle la recette plus bas"}
        </span>
      </div>

      <Ligne
        titre="Cartes de visites"
        valeur={signe(r.cartes.total)}
        sous={
          (cartes || "aucune carte ce mois-ci") +
          (r.cartes.estimees ? ` · ${pluriel(r.cartes.estimees, "carte")} sans prix, compté${r.cartes.estimees > 1 ? "es" : "e"} au tarif du club` : "")
        }
      />
      <Ligne
        titre="Produits servis"
        valeur={r.produitsServis != null ? signe(-r.produitsServis) : "—"}
        sous={coutVisite != null ? `${r.visites} visites × ${eur2(coutVisite)}` : `${r.visites} visites · coût d'une visite inconnu`}
        tone="coral"
      />
      <Ligne
        titre="Vos ventes"
        valeur={signe(r.vosVentes.gagne)}
        sous={
          r.vosVentes.vendu > 0
            ? `${eur(r.vosVentes.vendu)} d'upgrades et d'à emporter vendus par ${r.vosVentes.prenoms.join(" et ")}`
            : "aucune vente de ta part au comptoir ce mois-ci"
        }
      />
      <Ligne
        titre="Écarts Herbalife, estimés"
        valeur={signe(r.totalEcarts)}
        sous={r.ecarts.length ? undefined : "aucune coach sous 50 % n'a vendu au comptoir ce mois-ci"}
      >
        {r.ecarts.map((e) => (
          <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12.5, color: "var(--ls-bbc-muted)", padding: "2px 0 0 12px" }}>
            <span>
              {e.prenom} · {e.remise}{" "}% · {Math.round(e.pv)} PV
            </span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontVariantNumeric: "tabular-nums" }}>{eur(e.ecart)}</span>
          </div>
        ))}
      </Ligne>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, paddingTop: 10, marginTop: 4, borderTop: "1px solid var(--ls-bbc-line2)" }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Reste au club</span>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 16, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{r.reste != null ? eur(r.reste) : "—"}</span>
      </div>

      <p style={{ margin: "12px 0 0", fontSize: 12, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>
        Écart = PV × écart de remise × 1,78 €, le calcul que l'app fait déjà pour ta lignée. Le vrai montant arrive dans
        Bizworks. Les PV des ventes sont estimés d'après le catalogue.
      </p>
    </section>
  );
}

function Ligne({ titre, valeur, sous, tone, children }: { titre: string; valeur: string; sous?: string; tone?: "coral"; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "9px 0", borderTop: "1px solid var(--ls-bbc-line)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{titre}</span>
        <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: tone === "coral" ? "var(--ls-bbc-coral)" : "var(--ls-bbc-text)" }}>{valeur}</span>
      </div>
      {sous ? <span style={{ fontSize: 12, lineHeight: 1.4, color: "var(--ls-bbc-muted)" }}>{sous}</span> : null}
      {children}
    </div>
  );
}

const carte: CSSProperties = {
  background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 20, padding: "22px 24px",
};
const oeil: CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 600, letterSpacing: "0.14em", color: "var(--ls-bbc-muted)", textTransform: "uppercase",
};
