// =============================================================================
// « La carte du comptoir » — dans Réglages (lot 1, 26/09/2026).
//
// Le propriétaire fixe UN prix par produit pour tout le club (règle de Thomas),
// retire ou remet un produit au tableau, en ajoute un. On ne supprime jamais
// une ligne : les ventes passées la citent. Une coach voit la carte, sans
// pouvoir la changer. Chaque changement s'enregistre tout seul : rien à voir
// avec le bouton « Enregistrer les réglages » (qui écrit clubs.settings).
// =============================================================================

import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { BoutonDoux, BoutonFort } from "../ui";
import { RUBRIQUES, euro, lirePrix, parRubrique, type DonneesCaisse, type ProduitCarte, type Rubrique } from "./caisse";
import { chargerCaisse, enregistrerProduit } from "./serviceCaisse";

interface Brouillon {
  nom: string;
  detail: string;
  prix: string;
  rubrique: Rubrique;
}

const VIDE: Brouillon = { nom: "", detail: "", prix: "", rubrique: "petit_dej" };

/** « 3,80 » : le prix tel qu'on le tape. */
function prixSaisi(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export function CarteReglages() {
  const [donnees, setDonnees] = useState<DonneesCaisse | null>(null);
  const [etat, setEtat] = useState<"charge" | "pret" | "echec">("charge");
  /** L'id du produit ouvert, « nouveau » pour l'ajout, null sinon. */
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(VIDE);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [mot, setMot] = useState<string | null>(null);

  const charger = useCallback(async () => {
    const d = await chargerCaisse(null);
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

  function ouvrir(p: ProduitCarte) {
    if (ouvert === p.id) {
      setOuvert(null);
      return;
    }
    setOuvert(p.id);
    setBrouillon({ nom: p.nom, detail: p.detail ?? "", prix: prixSaisi(p.prix), rubrique: p.rubrique });
    setErreur(null);
    setMot(null);
  }

  function nouveau() {
    setOuvert("nouveau");
    setBrouillon(VIDE);
    setErreur(null);
    setMot(null);
  }

  async function enregistrer(p: ProduitCarte | null) {
    const prix = lirePrix(brouillon.prix);
    const nom = brouillon.nom.trim();
    if (!nom) return setErreur("Le nom du produit, comme au tableau.");
    if (prix === null) return setErreur("Un prix comme 3,80.");
    setEnvoi(true);
    const ok = await enregistrerProduit(
      p
        ? { id: p.id, nom, detail: brouillon.detail.trim() || null, prix }
        : {
            id: null,
            rubrique: brouillon.rubrique,
            nom,
            detail: brouillon.detail.trim() || null,
            prix,
            // Les suppléments se prennent AVEC son shake, sur place ; le reste part avec elle.
            sorte: brouillon.rubrique === "supplement" ? "upgrade" : "emporter",
            actif: true,
          },
    );
    setEnvoi(false);
    if (!ok) return setErreur("Rien n'a été enregistré. Réessaie.");
    setOuvert(null);
    setMot(p ? `${nom} : ${euro(prix)} ✓` : `${nom} est à la carte ✓`);
    await charger();
  }

  async function basculer(p: ProduitCarte) {
    setEnvoi(true);
    const ok = await enregistrerProduit({ id: p.id, actif: !p.actif });
    setEnvoi(false);
    if (!ok) return setErreur("Rien n'a été enregistré. Réessaie.");
    setOuvert(null);
    setMot(p.actif ? `${p.nom} : retiré du tableau.` : `${p.nom} : remis au tableau.`);
    await charger();
  }

  if (etat === "charge") return <p style={texteDoux}>La carte arrive…</p>;
  if (etat === "echec" || !donnees) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p role="alert" style={{ ...texteDoux, color: "var(--ls-bbc-coral)" }}>La carte n'a pas pu se charger.</p>
        <BoutonDoux onClick={() => void charger()}>Réessayer</BoutonDoux>
      </div>
    );
  }
  if (!donnees.club) return <p style={texteDoux}>Pas de club rattaché à ton compte.</p>;

  const modifiable = donnees.modifiable;
  const groupes = parRubrique(donnees.carte, modifiable);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!modifiable ? <p style={texteDoux}>Seul le propriétaire du club change la carte. La voici, telle qu'elle s'affiche en caisse.</p> : null}
      {groupes.length === 0 ? <p style={texteDoux}>La carte est vide.</p> : null}

      {groupes.map((g) => (
        <section key={g.cle} style={{ display: "flex", flexDirection: "column" }}>
          <span style={oeil}>{g.titre}</span>
          {g.produits.map((p) => (
            <div key={p.id} style={{ borderTop: "1px solid var(--ls-bbc-line)" }}>
              {modifiable ? (
                <button
                  type="button"
                  className="bbc-pression"
                  aria-expanded={ouvert === p.id}
                  onClick={() => ouvrir(p)}
                  style={{
                    width: "100%", minHeight: 48, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, padding: "6px 0",
                    border: 0, background: "transparent", color: "var(--ls-bbc-text)", textAlign: "left", cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)",
                    opacity: p.actif ? 1 : 0.5,
                  }}
                >
                  <Produit p={p} />
                </button>
              ) : (
                <div style={{ minHeight: 44, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <Produit p={p} />
                </div>
              )}

              {ouvert === p.id ? (
                <Editeur
                  brouillon={brouillon}
                  onChange={setBrouillon}
                  erreur={erreur}
                  envoi={envoi}
                  onEnregistrer={() => void enregistrer(p)}
                  secondaire={
                    <BoutonDoux large onClick={() => void basculer(p)}>
                      {p.actif ? "Retirer du tableau" : "Remettre au tableau"}
                    </BoutonDoux>
                  }
                />
              ) : null}
            </div>
          ))}
        </section>
      ))}

      {mot ? <p role="status" style={{ ...texteDoux, color: "var(--ls-bbc-teal)", fontWeight: 700 }}>{mot}</p> : null}

      {modifiable ? (
        ouvert === "nouveau" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, borderTop: "1px dashed var(--ls-bbc-line2)", paddingTop: 12 }}>
            <span style={oeil}>Un nouveau produit</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RUBRIQUES.map((r) => {
                const choisi = brouillon.rubrique === r.cle;
                return (
                  <button
                    key={r.cle}
                    type="button"
                    className="bbc-pression"
                    aria-pressed={choisi}
                    onClick={() => setBrouillon({ ...brouillon, rubrique: r.cle })}
                    style={{
                      minHeight: 44, padding: "0 14px", borderRadius: 999, cursor: "pointer", fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: choisi ? 700 : 500,
                      border: `1px solid ${choisi ? "var(--ls-bbc-orange)" : "var(--ls-bbc-line2)"}`,
                      background: choisi ? "color-mix(in srgb, var(--ls-bbc-orange) 14%, transparent)" : "var(--ls-bbc-s2)",
                      color: choisi ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-text)",
                    }}
                  >
                    {r.titre}
                  </button>
                );
              })}
            </div>
            <span style={{ fontSize: 12, color: "var(--ls-bbc-muted)" }}>
              {brouillon.rubrique === "supplement" ? "Se prend avec son shake, sur place." : "Part avec elle."}
            </span>
            <Editeur
              brouillon={brouillon}
              onChange={setBrouillon}
              erreur={erreur}
              envoi={envoi}
              libelle="Ajouter à la carte"
              onEnregistrer={() => void enregistrer(null)}
              secondaire={<BoutonDoux large onClick={() => setOuvert(null)}>Laisser tomber</BoutonDoux>}
            />
          </div>
        ) : (
          <BoutonDoux large dashed onClick={nouveau}>
            Ajouter un produit
          </BoutonDoux>
        )
      ) : null}
    </div>
  );
}

/** Le nom, son détail (sinon où il se prend), et le prix. */
function Produit({ p }: { p: ProduitCarte }) {
  return (
    <>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{p.nom}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)" }}>
          {[p.detail ?? (p.sorte === "upgrade" ? "avec son shake" : "à emporter"), p.actif ? null : "retiré du tableau"].filter(Boolean).join(" · ")}
        </span>
      </span>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{euro(p.prix)}</span>
    </>
  );
}

function Editeur({
  brouillon,
  onChange,
  erreur,
  envoi,
  libelle = "Enregistrer",
  onEnregistrer,
  secondaire,
}: {
  brouillon: Brouillon;
  onChange: (b: Brouillon) => void;
  erreur: string | null;
  envoi: boolean;
  libelle?: string;
  onEnregistrer: () => void;
  secondaire: ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "4px 0 12px" }}>
      <label style={etiquette}>
        Nom au tableau
        <input value={brouillon.nom} maxLength={80} onChange={(e) => onChange({ ...brouillon, nom: e.target.value })} style={champ} />
      </label>
      <label style={etiquette}>
        Détail (facultatif)
        <input value={brouillon.detail} maxLength={80} placeholder="sachet · 2 doses" onChange={(e) => onChange({ ...brouillon, detail: e.target.value })} style={champ} />
      </label>
      <label style={etiquette}>
        Prix affiché au club
        <input
          value={brouillon.prix}
          inputMode="decimal"
          placeholder="3,80"
          onChange={(e) => onChange({ ...brouillon, prix: e.target.value })}
          style={{ ...champ, fontFamily: "var(--ls-bbc-font-mono)", maxWidth: 160 }}
        />
      </label>
      {erreur ? <p role="alert" style={{ ...texteDoux, color: "var(--ls-bbc-coral)" }}>{erreur}</p> : null}
      <BoutonFort large onClick={envoi ? undefined : onEnregistrer}>{envoi ? "Enregistrement…" : libelle}</BoutonFort>
      {secondaire}
    </div>
  );
}

const texteDoux: CSSProperties = { margin: 0, fontSize: 12.5, lineHeight: 1.5, color: "var(--ls-bbc-muted)" };

const oeil: CSSProperties = {
  fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)", padding: "4px 0 6px",
};

const etiquette: CSSProperties = { display: "flex", flexDirection: "column", gap: 4, fontSize: 12, fontWeight: 600, color: "var(--ls-bbc-muted)" };

const champ: CSSProperties = {
  height: 44, borderRadius: 12, border: "1px solid var(--ls-bbc-line2)", background: "var(--ls-bbc-s2)", color: "var(--ls-bbc-text)",
  fontFamily: "var(--ls-bbc-font-body)", fontSize: 16, padding: "0 14px", outline: "none",
};
