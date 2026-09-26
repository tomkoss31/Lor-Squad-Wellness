// =============================================================================
// « Ses achats au comptoir » — sur sa fiche du club (lot 1, 26/09/2026).
// Volet « Visites & carte » de BbcCrm, sous le bouton de la carte.
//
// Ce que les coachs en caisse lui ont vendu : quoi, quand, par qui, combien.
// Une vente du jour s'annule (erreur de saisie : on annule puis on revend) ;
// après minuit, elle ne bouge plus. « Lui vendre quelque chose » ouvre la même
// feuille que le pointage : une seule caisse.
// =============================================================================

import { useCallback, useEffect, useState } from "react";
import { CaisseSheet } from "./CaisseSheet";
import { euro, quandLisible, resumeLignes, type Achat } from "./caisse";
import { annulerVente, chargerAchats } from "./serviceCaisse";

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

  const charger = useCallback(async () => {
    const a = await chargerAchats(clientId);
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

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 8, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", borderRadius: 14, padding: "12px 14px" }}>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>
        Ses achats au comptoir
      </span>

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

function Sac() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8h14l-1 12H6L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}
