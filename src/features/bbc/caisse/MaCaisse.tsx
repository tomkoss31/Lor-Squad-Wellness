// =============================================================================
// « Ma caisse » — ce que la coach en caisse a vendu et gagné (lot 3, 26/09/2026).
// Maquette v3 (SHZYSBaqfgWVqdMncgrcPG), écran 4 « La caisse de Romane ».
//
// Aujourd'hui (le gros chiffre : ce qu'elle a gagné), ses membres du jour, son
// mois (vendu, gagné, PV), et ce qui lui manque pour le rang suivant — la même
// jauge que sa fiche (`get_distributor_qualifications`, fenêtres glissantes).
// Le calcul est dans gains.ts (pur, testé). Elle ne voit que SES ventes ; le club
// entier, c'est le lot 4.
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useDistributorQualifications } from "../../../hooks/useDistributorQualifications";
import { rankProgressionFromWindows, tierPctForRank } from "../../../lib/herbalifeFormulas";
import { BoutonDoux, Carte, Vide } from "../ui";
import { euro } from "./caisse";
import { nomDuMois, parMembre, remiseDuRang, totalVentes, ventesDuJour, type DonneesMaCaisse } from "./gains";
import { jourParis } from "./maison";
import { chargerMaCaisse } from "./serviceCaisse";

/** Au-delà, « N autres membres » : l'écran reste court. */
const MEMBRES_VISIBLES = 5;

export function MaCaisse({ userId }: { userId?: string }) {
  const [donnees, setDonnees] = useState<DonneesMaCaisse | null>(null);
  const [etat, setEtat] = useState<"charge" | "pret" | "echec">("charge");
  const { qualifications } = useDistributorQualifications(userId);

  const charger = useCallback(async () => {
    setEtat("charge");
    const d = await chargerMaCaisse();
    if (!d) {
      setEtat("echec");
      return;
    }
    setDonnees(d);
    setEtat("pret");
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  const aujourdhui = jourParis(new Date());
  const remise = remiseDuRang(donnees?.rang);
  const calcul = useMemo(() => {
    if (!donnees) return null;
    const duJour = ventesDuJour(donnees.ventes, aujourdhui);
    return {
      jour: totalVentes(duJour, donnees.valeurs, remise),
      mois: totalVentes(donnees.ventes, donnees.valeurs, remise),
      membres: parMembre(duJour),
    };
  }, [donnees, aujourdhui, remise]);

  const progression = useMemo(() => {
    if (!qualifications || !donnees) return null;
    return rankProgressionFromWindows(donnees.rang, {
      pv_2m: qualifications.pv_2m,
      pv_3m: qualifications.pv_3m,
      pv_12m: qualifications.pv_12m,
      pv_12m_extended: qualifications.pv_12m_extended,
    });
  }, [qualifications, donnees]);

  if (etat === "charge") return <Vide>Ta caisse arrive…</Vide>;
  if (etat === "echec" || !donnees || !calcul) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "var(--ls-bbc-coral)" }}>Ta caisse n'a pas pu se charger.</p>
        <BoutonDoux onClick={() => void charger()}>Réessayer</BoutonDoux>
      </div>
    );
  }

  const { jour, mois, membres } = calcul;
  const visibles = membres.slice(0, MEMBRES_VISIBLES);
  const autres = membres.slice(MEMBRES_VISIBLES);
  const sansCout = mois.sansCout;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      {/* Le gros chiffre : ce qu'elle a gagné aujourd'hui */}
      <div className="bbc-carte" style={hero}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-orange2)" }}>Aujourd'hui</span>
          <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "color-mix(in srgb, var(--ls-bbc-orange) 22%, transparent)", color: "var(--ls-bbc-orange2)" }}>ta remise {remise}{"\u00a0"}%</span>
        </div>
        <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 44, lineHeight: 1, letterSpacing: ".01em", fontVariantNumeric: "tabular-nums" }}>{euro(jour.gagne)}</div>
        <div style={{ fontSize: 13, opacity: 0.85 }}>
          gagnés aujourd'hui, sur {euro(jour.vendu)} vendus{jour.pv > 0 ? ` · ${Math.round(jour.pv)} PV` : ""}
        </div>
      </div>

      {/* Ses membres du jour */}
      <Carte eye={`Aujourd'hui · ${membres.length} membre${membres.length > 1 ? "s" : ""}`}>
        {membres.length === 0 ? (
          <Vide>Rien vendu aujourd'hui. Au pointage, « Elle prend quelque chose ? » s'ouvre tout seul.</Vide>
        ) : (
          <>
            {visibles.map((m) => (
              <div key={m.cle} style={ligne}>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>{m.membre}</span>
                  <span style={{ display: "block", fontSize: 12, lineHeight: 1.35, color: "var(--ls-bbc-muted)" }}>{m.resume}</span>
                </span>
                <span style={montant}>{euro(m.total)}</span>
              </div>
            ))}
            {autres.length ? (
              <div style={ligne}>
                <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>{autres.length} autre{autres.length > 1 ? "s" : ""} membre{autres.length > 1 ? "s" : ""}</span>
                <span style={montant}>{euro(Math.round(autres.reduce((s, m) => s + m.total, 0) * 100) / 100)}</span>
              </div>
            ) : null}
          </>
        )}
      </Carte>

      {/* Son mois */}
      <Carte eye={nomDuMois(donnees.mois) || "Ce mois-ci"}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, padding: "4px 0 6px" }}>
          <Tuile valeur={euro(mois.vendu)} libelle="vendus" />
          <Tuile valeur={euro(mois.gagne)} libelle="gagnés" fort />
          <Tuile valeur={String(Math.round(mois.pv))} libelle="PV" />
        </div>
      </Carte>

      {/* Vers le rang suivant — la jauge de sa fiche */}
      {progression && progression.nextRank ? (
        <Carte eye={`Vers ${tierPctForRank(progression.nextRank)}\u00a0% · ${progression.windowMonths} mois`} right={`${Math.round(progression.pvCurrent).toLocaleString("fr-FR")} / ${progression.pvNeeded.toLocaleString("fr-FR")} PV`}>
          <div style={{ height: 8, borderRadius: 999, background: "var(--ls-bbc-s3)", overflow: "hidden", margin: "4px 0 10px" }}>
            <div style={{ width: `${progression.pct}%`, height: "100%", borderRadius: 999, background: "var(--ls-bbc-grad)" }} />
          </div>
          <p style={{ margin: "0 0 8px", fontSize: 13, lineHeight: 1.5 }}>
            {progression.remaining > 0 ? (
              <>
                Encore <b>{Math.round(progression.remaining)} PV</b> pour passer {(progression.nextLabel ?? "").replace(/\s*\(\d+\s*%\)\s*$/, "")}.{" "}
              </>
            ) : (
              <>Le palier est atteint : il sera validé avec tes PV du mois. </>
            )}
            <span style={{ color: "var(--ls-bbc-muted)" }}>Ce que tu vends ici, tu le rachètes sur ta plateforme : ce sont tes PV.</span>
          </p>
        </Carte>
      ) : null}

      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--ls-bbc-muted)" }}>
        Gagné = prix du club − prix public × {(1 - remise / 100).toFixed(2).replace(".", ",")} (ta remise de {remise}{"\u00a0"}%). PV estimés d'après le catalogue.
        {sansCout > 0 ? ` ${sansCout} article${sansCout > 1 ? "s" : ""} sans coût connu (accessoires…) : dans le vendu, pas dans le gagné.` : ""}
      </p>
    </div>
  );
}

function Tuile({ valeur, libelle, fort }: { valeur: string; libelle: string; fort?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "10px 8px", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)" }}>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: fort ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-text)" }}>{valeur}</span>
      <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>{libelle}</span>
    </div>
  );
}

const hero: CSSProperties = {
  background: "var(--ls-bbc-text)", color: "var(--ls-bbc-bg)", borderRadius: 20, padding: "14px 16px 16px", display: "grid", gap: 8,
};
const ligne: CSSProperties = {
  display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, padding: "9px 0", borderTop: "1px solid var(--ls-bbc-line)",
};
const montant: CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums",
};
