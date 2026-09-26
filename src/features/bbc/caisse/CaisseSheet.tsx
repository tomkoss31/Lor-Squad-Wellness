// =============================================================================
// « Elle prend quelque chose ? » — la caisse au pointage (lot 1, 26/09/2026).
// Maquette SHZYSBaqfgWVqdMncgrcPG validée par Thomas.
//
// S'ouvre toute seule après un « +1 visite » réussi, et depuis sa fiche
// (« Lui vendre quelque chose »). Jamais obligatoire : « Rien aujourd'hui ».
// Ce que la coach en caisse vend vient de SES pots et passe sur SON terminal :
// l'app n'encaisse rien, elle enregistre (club_vendre relit les prix en base).
//
// Simple : ses habituels (ou les plus demandés) en gros, les upgrades en une
// rangée, le reste du tableau à un toucher, rangé comme au comptoir.
// =============================================================================

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BoutonDoux, BoutonFort, Feuille } from "../ui";
import {
  ajouter,
  enTete,
  euro,
  nbArticles,
  parRubrique,
  totalPanier,
  upgrades,
  type DonneesCaisse,
  type Panier,
  type ProduitCarte,
} from "./caisse";
import { chargerCaisse, vendre } from "./serviceCaisse";

interface CaisseSheetProps {
  clientId: string;
  prenom: string;
  onClose: () => void;
  /** Après une vente enregistrée : son total, pour le message de l'écran d'origine. */
  onVendu?: (total: number) => void;
}

export function CaisseSheet({ clientId, prenom, onClose, onVendu }: CaisseSheetProps) {
  const [donnees, setDonnees] = useState<DonneesCaisse | null>(null);
  const [etat, setEtat] = useState<"charge" | "pret" | "echec">("charge");
  const [panier, setPanier] = useState<Panier>({});
  const [toutVoir, setToutVoir] = useState(false);
  const [envoi, setEnvoi] = useState<"repos" | "envoi" | "echec">("repos");

  const charger = useCallback(async () => {
    setEtat("charge");
    const d = await chargerCaisse(clientId);
    if (!d) {
      setEtat("echec");
      return;
    }
    setDonnees(d);
    setEtat("pret");
  }, [clientId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const carte = useMemo(() => donnees?.carte ?? [], [donnees]);
  const actifs = useMemo(() => carte.filter((p) => p.actif), [carte]);
  const tete = useMemo(() => (donnees ? enTete(donnees.carte, donnees.habituels, donnees.meilleures) : []), [donnees]);
  /** Ce qu'ELLE prend (et combien la dernière fois) : jamais mélangé aux plus demandés du club. */
  const derniereFois = useMemo(() => new Map((donnees?.habituels ?? []).map((h) => [h.carteId, h.qte])), [donnees]);
  const siens = tete.filter((p) => derniereFois.has(p.id));
  const demandes = tete.filter((p) => !derniereFois.has(p.id));
  const extras = useMemo(() => upgrades(carte), [carte]);
  const groupes = useMemo(() => parRubrique(carte), [carte]);
  const total = totalPanier(panier, carte);
  const nb = nbArticles(panier);

  function changer(id: string, delta: number) {
    setEnvoi("repos");
    setPanier((p) => ajouter(p, id, delta));
  }

  async function payer() {
    if (nb === 0 || envoi === "envoi") return;
    setEnvoi("envoi");
    const r = await vendre(clientId, panier);
    if (!r.ok) {
      setEnvoi("echec");
      return;
    }
    onVendu?.(r.total);
    onClose();
  }

  return (
    <Feuille titre={`${prenom} prend quelque chose ?`} sous="Upgrades et à emporter, payés sur ton terminal." onClose={onClose}>
      {etat === "charge" ? <p style={texteDoux}>La carte du club arrive…</p> : null}

      {etat === "echec" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p role="alert" style={{ ...texteDoux, color: "var(--ls-bbc-coral)" }}>La carte du club n'a pas pu se charger.</p>
          <BoutonDoux large onClick={() => void charger()}>Réessayer</BoutonDoux>
        </div>
      ) : null}

      {etat === "pret" && actifs.length === 0 ? (
        <p style={texteDoux}>La carte du club est vide. Le propriétaire la remplit dans Réglages, « la carte du comptoir ».</p>
      ) : null}

      {etat === "pret" && actifs.length > 0 ? (
        <>
          {siens.length > 0 ? (
            <Bloc titre="Ses habituels">
              {siens.map((p) => (
                <LigneProduit key={p.id} p={p} qte={panier[p.id] ?? 0} onChange={changer} derniere={derniereFois.get(p.id)} />
              ))}
            </Bloc>
          ) : null}

          {demandes.length > 0 ? (
            <Bloc titre="Les plus demandés">
              {demandes.map((p) => (
                <LigneProduit key={p.id} p={p} qte={panier[p.id] ?? 0} onChange={changer} />
              ))}
            </Bloc>
          ) : null}

          {extras.length > 0 ? (
            <Bloc titre="Avec son shake">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {extras.map((p) => {
                  const pris = (panier[p.id] ?? 0) > 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="bbc-pression"
                      aria-pressed={pris}
                      onClick={() => changer(p.id, pris ? -(panier[p.id] ?? 0) : 1)}
                      style={{
                        minHeight: 44, display: "inline-flex", alignItems: "center", gap: 6, padding: "0 14px", borderRadius: 999, cursor: "pointer",
                        fontFamily: "var(--ls-bbc-font-body)", fontSize: 13, fontWeight: pris ? 700 : 500,
                        border: `1px solid ${pris ? "var(--ls-bbc-orange)" : "var(--ls-bbc-line2)"}`,
                        background: pris ? "color-mix(in srgb, var(--ls-bbc-orange) 14%, transparent)" : "var(--ls-bbc-s1)",
                        color: pris ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-text)",
                      }}
                    >
                      {pris ? <Coche /> : null}
                      <span>{p.nom}</span>
                      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: pris ? "var(--ls-bbc-orange-text)" : "var(--ls-bbc-muted)" }}>{euro(p.prix)}</span>
                    </button>
                  );
                })}
              </div>
            </Bloc>
          ) : null}

          <button
            type="button"
            className="bbc-pression"
            aria-expanded={toutVoir}
            onClick={() => setToutVoir((v) => !v)}
            style={{
              minHeight: 46, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "0 14px", borderRadius: 14, cursor: "pointer",
              border: "1px dashed var(--ls-bbc-line2)", background: "transparent", color: "var(--ls-bbc-text)",
              fontFamily: "var(--ls-bbc-font-body)", fontSize: 14, fontWeight: 600,
            }}
          >
            <span>{toutVoir ? "Replier le tableau" : "Tout le tableau"}</span>
            <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 12, color: "var(--ls-bbc-muted)" }}>{actifs.length} produits</span>
          </button>

          {toutVoir
            ? groupes.map((g) => (
                <Bloc key={g.cle} titre={g.titre}>
                  {g.produits.map((p) => (
                    <LigneProduit key={p.id} p={p} qte={panier[p.id] ?? 0} onChange={changer} />
                  ))}
                </Bloc>
              ))
            : null}

          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, paddingTop: 8, borderTop: "1px solid var(--ls-bbc-line)" }}>
            <span style={{ fontSize: 13, color: "var(--ls-bbc-muted)" }}>
              {nb === 0 ? "Rien de choisi" : `${nb} article${nb > 1 ? "s" : ""}, pour toi`}
            </span>
            <span style={{ fontFamily: "var(--ls-bbc-font-display)", fontSize: 30, lineHeight: 1, letterSpacing: ".01em", fontVariantNumeric: "tabular-nums" }}>{euro(total)}</span>
          </div>

          {nb > 0 ? (
            <BoutonFort large onClick={() => void payer()}>
              {envoi === "envoi" ? "Enregistrement…" : `Payé sur mon terminal · ${euro(total)}`}
            </BoutonFort>
          ) : null}
          {envoi === "echec" ? (
            <p role="alert" style={{ ...texteDoux, color: "var(--ls-bbc-coral)" }}>Rien n'a été enregistré. Réessaie.</p>
          ) : null}
          <BoutonDoux large onClick={onClose}>Rien aujourd'hui</BoutonDoux>
        </>
      ) : null}
    </Feuille>
  );
}

const texteDoux = { margin: 0, fontSize: 13, lineHeight: 1.5, color: "var(--ls-bbc-muted)" } as const;

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ fontFamily: "var(--ls-bbc-font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ls-bbc-muted)" }}>{titre}</span>
      {children}
    </section>
  );
}

/** Une ligne du tableau : le produit à gauche, − quantité + à droite. */
function LigneProduit({ p, qte, onChange, derniere }: { p: ProduitCarte; qte: number; onChange: (id: string, delta: number) => void; derniere?: number }) {
  return (
    <div
      style={{
        display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 14,
        background: qte > 0 ? "color-mix(in srgb, var(--ls-bbc-orange) 10%, transparent)" : "var(--ls-bbc-s2)",
        border: `1px solid ${qte > 0 ? "color-mix(in srgb, var(--ls-bbc-orange) 45%, transparent)" : "var(--ls-bbc-line)"}`,
      }}
    >
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.3 }}>{p.nom}</span>
        <span style={{ display: "block", fontSize: 12, color: "var(--ls-bbc-muted)" }}>
          {p.detail ? `${p.detail} · ` : ""}
          <span style={{ fontFamily: "var(--ls-bbc-font-mono)" }}>{euro(p.prix)}</span>
        </span>
        {derniere ? <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ls-bbc-orange-text)" }}>la dernière fois : {derniere}</span> : null}
      </span>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        <button
          type="button"
          className="bbc-pression"
          aria-label={`Retirer : ${p.nom}`}
          disabled={qte === 0}
          onClick={() => onChange(p.id, -1)}
          style={{ ...rond, cursor: "pointer", opacity: qte === 0 ? 0.35 : 1 }}
        >
          <Moins />
        </button>
        <output aria-live="polite" style={{ minWidth: 26, textAlign: "center", fontFamily: "var(--ls-bbc-font-mono)", fontSize: 16, fontWeight: 700 }}>{qte}</output>
        <button
          type="button"
          className="bbc-pression"
          aria-label={`Ajouter : ${p.nom}`}
          onClick={() => onChange(p.id, 1)}
          style={{ ...rond, cursor: "pointer", background: "color-mix(in srgb, var(--ls-bbc-orange) 16%, transparent)", border: "1px solid color-mix(in srgb, var(--ls-bbc-orange) 45%, transparent)", color: "var(--ls-bbc-orange-text)" }}
        >
          <Plus />
        </button>
      </span>
    </div>
  );
}

const rond = {
  width: 44,
  height: 44,
  minHeight: 44,
  borderRadius: 999,
  display: "grid",
  placeItems: "center",
  border: "1px solid var(--ls-bbc-line2)",
  background: "var(--ls-bbc-s1)",
  color: "var(--ls-bbc-text)",
  padding: 0,
} as const;

function Plus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M12 6v12M6 12h12" />
    </svg>
  );
}

function Moins() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M6 12h12" />
    </svg>
  );
}

function Coche() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}
