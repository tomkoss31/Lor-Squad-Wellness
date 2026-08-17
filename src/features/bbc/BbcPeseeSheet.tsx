// =============================================================================
// BbcPeseeSheet — peser un membre en dehors du bilan des 10.
//
// POURQUOI ÇA EXISTE (Thomas, 17/08)
// Le seul endroit où l'on saisissait des mesures en mode BBC était l'étape 1 du
// bilan des 10 — donc au 10ᵉ passage, jamais avant. Impossible de reprendre les
// chiffres de quelqu'un entre deux, ni de refaire un départ.
//
// LE CAS QUI L'A RENDU URGENT : le club ouvre le 7 septembre, et les membres
// s'inscrivent dès maintenant. Une pesée du 16 août aura trois semaines le jour
// où la personne commence vraiment. Ajouter simplement une mesure tracerait,
// dans son application, trois semaines de résultats qu'elle n'a jamais faits —
// et l'erreur irait dans le sens qui flatte, donc personne ne la corrigerait.
//
// D'où la question posée à l'enregistrement, et elle n'a pas de valeur par
// défaut : on ne devine pas à la place du coach.
//   • « son vrai départ »  → les pesées d'avant sortent de la référence
//   • « un suivi »         → on compare au départ existant
//
// ⚠️ La feuille porte `className="bbc-mode"` : les jetons `--ls-bbc-*` sont
// définis sur cette classe, et une feuille `fixed` doit la re-déclarer pour que
// les variables résolvent.
// =============================================================================

import { useEffect, useState } from "react";
import { BbcBilan10Scan, type ScanValues } from "./BbcBilan10Scan";
import { chargerContextePesee, type ContextePesee } from "./bilan10Pesee";
import { enregistrerPesee } from "./relevesMembre";

interface Props {
  clientId: string;
  clientName: string;
  /** Combien de pesées existent déjà : décide du libellé et du choix par défaut. */
  nbReleves: number;
  onClose: () => void;
  /** Appelé après une écriture réussie, pour rafraîchir la fiche. */
  onEnregistre: () => void;
}

type Nature = "depart" | "suivi" | null;

export function BbcPeseeSheet({ clientId, clientName, nbReleves, onClose, onEnregistre }: Props) {
  const [contexte, setContexte] = useState<ContextePesee | null>(null);
  const [valeurs, setValeurs] = useState<ScanValues | null>(null);
  const [nature, setNature] = useState<Nature>(null);
  const [busy, setBusy] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    void chargerContextePesee(clientId).then((c) => {
      if (vivant) setContexte(c);
    });
    return () => {
      vivant = false;
    };
  }, [clientId]);

  // Fermer par Échap : une feuille plein écran sans sortie au clavier est une
  // impasse pour qui n'utilise pas la souris.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, busy]);

  const premiere = nbReleves === 0;

  async function enregistrer(v: ScanValues) {
    setValeurs(v);
    // La toute première pesée EST le départ : pas de question à poser.
    if (!premiere && nature === null) {
      setErreur("Dis-nous d'abord si c'est son vrai départ ou un suivi.");
      return;
    }
    setBusy(true);
    setErreur(null);
    try {
      const res = await enregistrerPesee({
        clientId,
        valeurs: v,
        vraiDepart: premiere ? true : nature === "depart",
      });
      if (!res) throw new Error("Impossible de lire sa fiche — sa pesée n'a pas été enregistrée.");
      onEnregistre();
      onClose();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'enregistrement a échoué. Ta saisie est intacte.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="bbc-mode"
      role="dialog"
      aria-modal="true"
      aria-label={`Nouvelle pesée de ${clientName}`}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "var(--ls-bbc-bg)",
        color: "var(--ls-bbc-text)",
        fontFamily: "var(--ls-bbc-font-body)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: "none", padding: "16px 18px 12px", borderBottom: "1px solid var(--ls-bbc-line)", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          disabled={busy}
          style={{ width: 44, height: 44, flex: "none", borderRadius: 12, background: "var(--ls-bbc-s2)", border: "1px solid var(--ls-bbc-line)", color: "var(--ls-bbc-muted)", cursor: busy ? "not-allowed" : "pointer", fontSize: 15 }}
        >
          ✕
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ls-bbc-lime-text)" }}>
            nouvelle pesée
          </div>
          <div style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 20, lineHeight: 1.1, textTransform: "uppercase" }}>{clientName}</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 14px 30px", display: "flex", flexDirection: "column", gap: 14 }}>
        {/* La nature de la pesée se demande AVANT la saisie : elle change ce que
            le coach dit à la personne pendant qu'il la pèse. */}
        {!premiere ? (
          <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "15px 14px" }}>
            <div style={{ fontSize: 14, fontWeight: 700 }}>C'est quoi, cette pesée&nbsp;?</div>
            <div style={{ fontSize: 12.5, color: "var(--ls-bbc-muted)", marginTop: 5, lineHeight: 1.5 }}>
              Sa courbe part du premier relevé. Si elle n'avait pas encore commencé, dis-le —
              sinon on lui montrera des semaines de progrès qu'elle n'a pas faits.
            </div>
            <div role="radiogroup" aria-label="Nature de la pesée" style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 13 }}>
              {([
                { k: "depart" as const, t: "C'est son vrai départ", d: "On repart de zéro — les pesées d'avant sortent de la référence." },
                { k: "suivi" as const, t: "C'est un suivi", d: "On compare au départ existant." },
              ]).map((o) => {
                const on = nature === o.k;
                return (
                  <button
                    key={o.k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => { setNature(o.k); setErreur(null); }}
                    style={{
                      minHeight: 56,
                      textAlign: "left",
                      padding: "12px 15px",
                      borderRadius: 14,
                      cursor: "pointer",
                      fontFamily: "var(--ls-bbc-font-body)",
                      border: `1px solid ${on ? "var(--ls-bbc-lime)" : "var(--ls-bbc-line2)"}`,
                      background: on ? "color-mix(in srgb, var(--ls-bbc-lime) 14%, transparent)" : "var(--ls-bbc-s2)",
                      color: "var(--ls-bbc-text)",
                    }}
                  >
                    <span style={{ display: "block", fontSize: 13.5, fontWeight: on ? 800 : 600 }}>{o.t}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--ls-bbc-muted)", marginTop: 3, lineHeight: 1.45 }}>{o.d}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ background: "var(--ls-bbc-s1)", border: "1px solid var(--ls-bbc-line)", borderRadius: 16, padding: "14px 14px", fontSize: 12.5, lineHeight: 1.55, color: "var(--ls-bbc-muted)" }}>
            <strong style={{ color: "var(--ls-bbc-text)" }}>Première pesée.</strong> Elle devient son point de
            départ — c'est à partir d'elle que tout sera comparé.
          </div>
        )}

        {contexte ? (
          <BbcBilan10Scan
            depart={nature === "depart" || premiere ? null : contexte.depart}
            departDate={nature === "depart" || premiere ? null : contexte.departDate}
            dejaEnregistre={valeurs}
            objectifInitial={contexte.objectifAffiche}
            fait={false}
            onBasculer={() => undefined}
            enCoursEnregistrement={busy}
            enregistreLe={null}
            erreur={erreur}
            onEnregistrer={(v) => void enregistrer(v)}
            numero={1}
            titre={premiere || nature === "depart" ? "Son point de départ" : "Sa pesée du jour"}
            sousTitre={premiere || nature === "depart" ? "tout sera comparé à ces chiffres" : "on compare avec le point de départ"}
          />
        ) : (
          <div style={{ fontSize: 12.5, color: "var(--ls-bbc-hint)" }}>chargement de sa fiche…</div>
        )}
      </div>
    </div>
  );
}

export default BbcPeseeSheet;
