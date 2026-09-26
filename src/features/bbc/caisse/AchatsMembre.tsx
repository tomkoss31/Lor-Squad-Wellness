// =============================================================================
// « Ses achats au comptoir » — sur sa fiche du club (lot 1, 26/09/2026).
// Volet « Visites & carte » de BbcCrm, sous le bouton de la carte.
//
// Ce que les coachs en caisse lui ont vendu : quoi, quand, par qui, combien.
// Une vente du jour s'annule (erreur de saisie : on annule puis on revend) ;
// après minuit, elle ne bouge plus. « Lui vendre quelque chose » ouvre la même
// feuille que le pointage : une seule caisse.
// Lot 2 (26/09) : en tête, « À la maison · depuis vendredi » — ce qui lui reste
// (un sachet compté par jour sans club), ses derniers jours, et « son F1 arrive
// au bout » quand le club ferme demain ou après-demain.
// Lot 5 (26/09) : un jour où elle a noté son shake dans son journal, la puce dit
// « shake noté » (sinon « chez elle » : l'app compte, elle ne sait pas).
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import type { ReglagesHoraires } from "../agenda/agendaClub";
import { CaisseSheet } from "./CaisseSheet";
import { euro, quandLisible, resumeLignes, type Achat } from "./caisse";
import { depuisLisible, f1AuBout, jourCourt, jourParis, nomDuJour, stockMaison, type DonneesMaison, type Dose, type StockMaison } from "./maison";
import { annulerVente, chargerAchats, chargerMaison } from "./serviceCaisse";

/** Au-delà, « Voir les autres » : la fiche reste courte. */
const VISIBLES = 5;

export function AchatsMembre({ clientId, prenom }: { clientId: string; prenom: string }) {
  const [achats, setAchats] = useState<Achat[] | null>(null);
  const [echec, setEchec] = useState(false);
  const [tout, setTout] = useState(false);
  const [vendre, setVendre] = useState(false);
  /** La vente dont le bouton demande « sûr ? » (geste destructeur : deux temps). */
  const [aConfirmer, setAConfirmer] = useState<string | null>(null);
  const [mot, setMot] = useState<string | null>(null);
  const [maison, setMaison] = useState<{ horaires: ReglagesHoraires | null; donnees: DonneesMaison | null } | null>(null);

  const charger = useCallback(async () => {
    const [a, m] = await Promise.all([chargerAchats(clientId), chargerMaison(clientId)]);
    // « À la maison » est un plus : s'il échoue, ses achats s'affichent quand même.
    setMaison(m);
    if (a === null) {
      setEchec(true);
      return;
    }
    setEchec(false);
    setAchats(a);
  }, [clientId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function annuler(id: string) {
    if (aConfirmer !== id) {
      setAConfirmer(id);
      window.setTimeout(() => setAConfirmer((v) => (v === id ? null : v)), 4000);
      return;
    }
    setAConfirmer(null);
    const ok = await annulerVente(id);
    setMot(ok ? "Vente annulée." : "L'annulation n'est pas passée — réessaie.");
    if (ok) await charger();
  }

  const liste = achats ?? [];
  const visibles = tout ? liste : liste.slice(0, VISIBLES);
  const aujourdhui = jourParis(new Date());
  const stock = stockMaison(maison?.donnees ?? null, aujourdhui);
  const bout = f1AuBout(maison?.donnees ?? null, maison?.horaires, aujourdhui);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 14px" }}>
      {stock ? <ALaMaison stock={stock} aujourdhui={aujourdhui} bout={bout ? nomDuJour(bout.ferme, aujourdhui) : null} /> : null}

      <span style={oeil}>Ses achats au comptoir</span>

      {achats === null && !echec ? <p style={texteDoux}>chargement…</p> : null}
      {echec ? <p role="alert" style={{ ...texteDoux, color: "var(--ls-bbc-coral)" }}>Ses achats n'ont pas pu se charger.</p> : null}
      {achats !== null && liste.length === 0 ? <p style={texteDoux}>Rien d'acheté au comptoir pour l'instant.</p> : null}

      {visibles.map((a) => (
        <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, paddingTop: 8, borderTop: "1px solid var(--ls-bbc-line)" }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 13.5, fontWeight: 600, lineHeight: 1.35 }}>{resumeLignes(a.lignes)}</span>
            <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)" }}>
              {quandLisible(a.quand)} · par {a.vendeur}
            </span>
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{euro(a.total)}</span>
            {a.annulable ? (
              <button
                type="button"
                className="bbc-pression"
                onClick={() => void annuler(a.id)}
                style={{
                  minHeight: 44, padding: "0 12px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12, fontWeight: 700,
                  border: `1px solid ${aConfirmer === a.id ? "var(--ls-bbc-coral)" : "var(--ls-bbc-line2)"}`,
                  background: aConfirmer === a.id ? "color-mix(in srgb, var(--ls-bbc-coral) 14%, transparent)" : "transparent",
                  color: aConfirmer === a.id ? "var(--ls-bbc-coral)" : "var(--ls-bbc-muted)",
                }}
              >
                {aConfirmer === a.id ? "Annuler ?" : "Annuler"}
              </button>
            ) : null}
          </span>
        </div>
      ))}

      {liste.length > VISIBLES ? (
        <button
          type="button"
          className="bbc-pression"
          onClick={() => setTout((v) => !v)}
          style={{ minHeight: 44, padding: "0 4px", border: 0, background: "none", cursor: "pointer", textAlign: "left", fontFamily: "var(--ls-bbc-font-body)", fontSize: 12.5, fontWeight: 700, color: "var(--ls-bbc-orange-text)" }}
        >
          {tout ? "Seulement les derniers" : `Voir les ${liste.length - VISIBLES} autres`}
        </button>
      ) : null}

      {mot ? <p role="status" style={{ ...texteDoux, color: "var(--ls-bbc-text)" }}>{mot}</p> : null}

      <button
        type="button"
        className="bbc-pression"
        onClick={() => {
          setMot(null);
          setVendre(true);
        }}
        style={{
          minHeight: 46, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: 700, textAlign: "left",
          background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-text)",
        }}
      >
        <Sac />
        Lui vendre quelque chose
      </button>

      {vendre ? (
        <CaisseSheet
          clientId={clientId}
          prenom={prenom}
          onClose={() => setVendre(false)}
          onVendu={(total) => {
            setMot(`${euro(total)} notés dans ses achats.`);
            void charger();
          }}
        />
      ) : null}
    </section>
  );
}

const texteDoux = { margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-bbc-muted)" } as const;

const oeil = { fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" } as const;

const LIBELLES: Record<Dose, { nom: string; unite: (n: number) => string }> = {
  f1: { nom: "Sachets Formula 1", unite: () => "" },
  pdm: { nom: "PDM", unite: (n) => (n > 1 ? " doses" : " dose") },
  the: { nom: "Thé", unite: (n) => (n > 1 ? " doses" : " dose") },
  aloe: { nom: "Aloé", unite: (n) => (n > 1 ? " doses" : " dose") },
};

/** « À la maison · depuis vendredi » : ce qui lui reste, et ses derniers jours. */
function ALaMaison({ stock, aujourdhui, bout }: { stock: StockMaison; aujourdhui: string; bout: string | null }) {
  const sortes = (Object.keys(LIBELLES) as Dose[]).filter((k) => stock.sur[k] > 0);
  const f1 = stock.sur.f1 > 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 10, marginBottom: 2, borderBottom: "1px dashed var(--ls-bbc-line2)" }}>
      <span style={oeil}>À la maison · depuis {depuisLisible(stock.depuis, aujourdhui)}</span>
      {sortes.map((k) => {
        const reste = stock.restant[k];
        const part = stock.sur[k] > 0 ? Math.min(1, reste / stock.sur[k]) : 0;
        return (
          <div key={k} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{LIBELLES[k].nom}</span>
              <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                {reste}{LIBELLES[k].unite(reste)} sur {stock.sur[k]}
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--ls-bbc-s3)", overflow: "hidden" }}>
              <div style={{ width: `${Math.round(part * 100)}%`, height: "100%", borderRadius: 999, background: reste <= 1 ? "var(--ls-bbc-amber)" : "var(--ls-bbc-sage)" }} />
            </div>
          </div>
        );
      })}
      {stock.jours.length ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {stock.jours.map((j) => {
            const note = !j.auClub && !!j.note;
            return (
              <span
                key={j.jour}
                style={{
                  fontSize: 12, padding: "4px 9px", borderRadius: 999, border: "1px solid var(--ls-bbc-line)",
                  background: j.auClub
                    ? "color-mix(in srgb, var(--ls-bbc-orange) 12%, transparent)"
                    : note ? "color-mix(in srgb, var(--ls-bbc-sage) 16%, transparent)" : "var(--ls-bbc-s1)",
                  color: j.auClub ? "var(--ls-bbc-orange-text)" : note ? "var(--ls-bbc-text)" : "var(--ls-bbc-muted)",
                }}
              >
                {jourCourt(j.jour)} · {j.auClub ? "au club" : note ? "shake noté" : "chez elle"}
              </span>
            );
          })}
        </div>
      ) : null}
      {f1 ? (
        <p style={{ ...texteDoux, color: "var(--ls-bbc-text)" }}>
          {stock.restant.f1 > 0
            ? `De quoi tenir encore ${stock.restant.f1} jour${stock.restant.f1 > 1 ? "s" : ""} sans club.`
            : "Plus de F1 à la maison."}{" "}
          <span style={{ color: "var(--ls-bbc-muted)" }}>
            {stock.jours.some((j) => j.note) ? "Ses shakes notés dans son journal, sinon un sachet par jour sans club." : "Un sachet compté par jour sans club."}
          </span>
        </p>
      ) : null}
      {bout ? (
        <p role="note" style={{ ...texteDoux, fontWeight: 700, color: "var(--ls-bbc-amber)" }}>
          Club fermé {bout} : son F1 arrive au bout.
        </p>
      ) : null}
    </div>
  );
}

function Sac() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
