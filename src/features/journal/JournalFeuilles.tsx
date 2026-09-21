// =============================================================================
// Journal nutritionnel — les feuilles du bas (maquette v7).
// Ajouter · voir/corriger un repas · modifier un aliment · sport et humeur ·
// conseils du jour. Chaque feuille se ferme au fond, à la croix ou à Échap.
// Lot 2 (21/09, maquette v8) : « Écris ton repas, Noaly calcule » dans l'ajout,
// les lignes estimées par Noaly (hors catalogue) se corrigent au poids, et
// « Le mot de Noaly » ouvre les conseils du jour.
// =============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { JournalIcone } from "./JournalIcone";
import type { LigneProposee, PropositionNoaly } from "./journalApi";
import {
  ACTIVITES,
  HUMEURS,
  NOM_CRENEAU,
  chercher,
  eauAtteinte,
  formatLitres,
  frequenceHabituel,
  habituelsDuCreneau,
  litres,
  planFinDeJournee,
  protAliment,
  protHabituel,
  protJour,
  resume,
  suggestions,
  variantes,
  type Activite,
  type Aliment,
  type Creneau,
  type EtatJour,
  type Habituel,
  type Humeur,
  type Ligne,
  type LignePlan,
} from "./journalCalculs";

export interface AlerteSport {
  id: string;
  title: string;
  detail?: string;
  advice?: string;
}

// ─── Le cadre commun ──────────────────────────────────────────────────────────
function Feuille({ titre, surTitre, surTitreNoaly, onFermer, children }: {
  titre: string; surTitre?: string; surTitreNoaly?: boolean; onFermer: () => void; children: ReactNode;
}) {
  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const echap = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    document.addEventListener("keydown", echap);
    return () => {
      document.body.style.overflow = avant;
      document.removeEventListener("keydown", echap);
    };
  }, [onFermer]);
  return (
    <div className="jr-voile" onClick={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="jr-feuille" role="dialog" aria-modal="true" aria-label={titre}>
        <div className="jr-fhead">
          <div className="jr-grow">
            {surTitre ? (
              <div className={`jr-eye${surTitreNoaly ? " nly" : ""}`}>
                {surTitreNoaly ? <JournalIcone nom="etincelle" taille={13} /> : null}
                {surTitre}
              </div>
            ) : null}
            <h3>{titre}</h3>
          </div>
          <button type="button" className="jr-fermer" onClick={onFermer} aria-label="Fermer">
            <JournalIcone nom="croix" taille={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function valeurAliment(a: Aliment): string {
  return a.prot_portion != null ? `${String(a.prot_portion).replace(".", ",")} g` : `${String(a.prot_100g ?? 0).replace(".", ",")} g / 100 g`;
}

function BoutonAliment({ a, onClick }: { a: Aliment; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}>
      <span>
        {a.nom}
        {a.herbalife ? <span className="jr-herb">Herbalife</span> : null}
        {a.indice || a.unite ? <span className="jr-sous">{a.indice ?? a.unite}</span> : null}
      </span>
      <small>{valeurAliment(a)}</small>
    </button>
  );
}

// ─── Choisir la quantité (partagé : ajouter et modifier) ─────────────────────
function Quantite({ a, grammes, quantite, onGrammes, onQuantite }: {
  a: Aliment; grammes: number | null; quantite: number;
  onGrammes: (g: number | null) => void; onQuantite: (q: number) => void;
}) {
  const [libre, setLibre] = useState("");
  if (a.prot_portion != null) {
    return (
      <div className="jr-puces" role="group" aria-label="Combien ?">
        {[1, 2, 3].map((n) => (
          <button key={n} type="button" className={`jr-puce${n === quantite ? " on" : ""}`} aria-pressed={n === quantite} onClick={() => onQuantite(n)}>
            × {n}
          </button>
        ))}
      </div>
    );
  }
  const portions = [...new Set([...(a.portions ?? [100]), ...(grammes && !(a.portions ?? []).includes(grammes) ? [grammes] : [])])].sort((x, y) => x - y);
  return (
    <>
      <div className="jr-puces" role="group" aria-label="Quelle quantité ?">
        {portions.map((g) => (
          <button key={g} type="button" className={`jr-puce${g === grammes ? " on" : ""}`} aria-pressed={g === grammes} onClick={() => { setLibre(""); onGrammes(g); }}>
            {g} g
          </button>
        ))}
      </div>
      <label className="jr-row" style={{ gap: 8 }}>
        <span className="jr-tiny" style={{ fontSize: 12.5 }}>Autre quantité :</span>
        <input
          className="jr-cherche"
          style={{ width: 110, minHeight: 44 }}
          inputMode="numeric"
          placeholder="g"
          value={libre}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            setLibre(v);
            const n = Number(v);
            onGrammes(n >= 1 && n <= 2000 ? n : null);
          }}
          aria-label="Quantité en grammes"
        />
        <span className="jr-tiny" style={{ fontSize: 12.5 }}>g</span>
      </label>
      {a.unite ? <div className="jr-tiny">{a.unite}</div> : null}
    </>
  );
}

// ─── Noaly travaille ──────────────────────────────────────────────────────────
// Thomas, 21/09 : « 5 s c'est peut-être long, faut dire travail en cours… ou une
// icône qui travaille, que l'on comprenne ». Le rond de Noaly tourne, une ligne
// dit ce qu'elle fait (elle change toutes les 1,6 s), une barre avance.
export const ETAPES_REPAS = ["Elle lit ton repas", "Elle cherche chaque aliment", "Elle estime les quantités", "Elle calcule tes protéines", "Presque fini…"];
export const ETAPES_MOT = ["Elle regarde ta journée", "Elle prépare la suite de ta journée", "Elle écrit ton mot", "Presque fini…"];

export function NoalyTravaille({ titre, etapes }: { titre: string; etapes: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setI((x) => Math.min(x + 1, etapes.length - 1)), 1600);
    return () => window.clearInterval(t);
  }, [etapes.length]);
  return (
    <div className="jr-travail" role="status" aria-live="polite">
      <div className="jr-travail-l">
        <span className="jr-orbe" aria-hidden="true"><JournalIcone nom="etincelle" taille={18} /></span>
        <span className="jr-grow">
          <b>{titre}</b>
          <small><span key={i}>{etapes[i]}</span></small>
        </span>
      </div>
      <div className="jr-barre" aria-hidden="true"><i /></div>
    </div>
  );
}

// ─── Ajouter ──────────────────────────────────────────────────────────────────
const fmtProt = (g: number) => (g >= 10 ? String(Math.round(g)) : String(Math.round(g * 10) / 10).replace(".", ","));

/** Un habituel : un toucher et c'est noté, avec SA quantité (bloc B, 6). */
function BoutonHabituel({ h, creneau, aliments, occupe, onClick }: {
  h: Habituel; creneau: Creneau; aliments: Aliment[]; occupe: boolean; onClick: () => void;
}) {
  const a = h.aliment ? aliments.find((x) => x.cle === h.aliment) : undefined;
  const quantite = h.grammes ? `${Math.round(h.grammes)} g` : h.quantite > 1 ? `× ${h.quantite}` : "1 portion";
  return (
    <button type="button" className="jr-hab" disabled={occupe} onClick={onClick}>
      <span className="jr-grow">
        <b>
          {a?.nom ?? h.libelle}
          {a?.herbalife ? <span className="jr-herb">Herbalife</span> : null}
          {h.aliment == null ? <span className="jr-tag nly">estimé</span> : null}
        </b>
        <small>{quantite} · {frequenceHabituel(h.jours, creneau)}</small>
      </span>
      <span className="jr-g">{fmtProt(protHabituel(h, aliments))} g</span>
      <span className="jr-hab-plus" aria-hidden="true"><JournalIcone nom="plus" taille={18} /></span>
    </button>
  );
}

export function FeuilleAjout({ creneau, etat, aliments, occupe, onFermer, onAjouter, onReprendreVeille, onLireRepas, onAjouterLot, onAjouterHabituel }: {
  creneau: Creneau; etat: EtatJour; aliments: Aliment[]; occupe: boolean;
  onFermer: () => void;
  onAjouter: (a: Aliment, grammes: number | null, quantite: number) => void;
  onReprendreVeille: () => void;
  /** Un habituel, noté d'un toucher (bloc B, 6) — absent : pas de section « Tes habituels ». */
  onAjouterHabituel?: (h: Habituel) => void;
  /** Noaly lit un repas écrit (edge journal-noaly) — absent : pas d'écriture libre. */
  onLireRepas?: (texte: string) => Promise<PropositionNoaly>;
  onAjouterLot?: (lignes: LigneProposee[]) => void;
}) {
  const [q, setQ] = useState("");
  const [choisi, setChoisi] = useState<Aliment | null>(null);
  const [grammes, setGrammes] = useState<number | null>(null);
  const [quantite, setQuantite] = useState(1);
  // « Écris ton repas, Noaly calcule »
  const [ecrire, setEcrire] = useState(false);
  const [texte, setTexte] = useState("");
  const [attente, setAttente] = useState(false);
  const [proposition, setProposition] = useState<PropositionNoaly | null>(null);
  const [erreurNoaly, setErreurNoaly] = useState<string | null>(null);
  const champ = useRef<HTMLInputElement>(null);
  const veille = etat.jour === etat.aujourdhui && !etat.lignes.some((l) => l.creneau === creneau)
    ? etat.veille.filter((l) => l.creneau === creneau) : [];
  const habituels = useMemo(() => (onAjouterHabituel ? habituelsDuCreneau(etat, creneau) : []), [onAjouterHabituel, etat, creneau]);
  // Un habituel n'est pas reproposé plus bas parmi les idées.
  const idees = useMemo(() => {
    const s = suggestions(aliments, creneau);
    const pris = new Set(habituels.map((h) => h.aliment));
    return { herbalife: s.herbalife.filter((a) => !pris.has(a.cle)), autres: s.autres.filter((a) => !pris.has(a.cle)) };
  }, [aliments, creneau, habituels]);
  const trouves = useMemo(() => chercher(aliments, q), [aliments, q]);
  const titre = `Ajouter : ${NOM_CRENEAU[creneau].toLowerCase()}`;

  function choisir(a: Aliment) {
    if (a.prot_portion != null && !a.famille) {
      // Portion fixe (barre, chips…) : un geste suffit, « × 2 » se règle après.
      onAjouter(a, null, 1);
      return;
    }
    setChoisi(a);
    setQuantite(1);
    setGrammes(a.prot_portion != null ? null : (a.portions?.[1] ?? a.portions?.[0] ?? 100));
  }

  function ouvrirEcriture(depart = "") {
    setEcrire(true);
    setTexte(depart);
    setProposition(null);
    setErreurNoaly(null);
  }

  async function calculer() {
    if (!onLireRepas || !texte.trim()) return;
    setAttente(true);
    setErreurNoaly(null);
    setProposition(null);
    try {
      setProposition(await onLireRepas(texte.trim()));
    } catch (e) {
      setErreurNoaly((e as Error).message);
    } finally {
      setAttente(false);
    }
  }

  if (choisi) {
    const prot = protAliment(choisi, grammes, quantite);
    const pret = choisi.prot_portion != null || (grammes != null && grammes >= 1);
    const vars = variantes(aliments, choisi);
    return (
      <Feuille titre={choisi.nom} surTitre={titre} onFermer={onFermer}>
        {vars.length > 1 ? (
          <div className="jr-puces" role="group" aria-label="Quelle version ?">
            {vars.map((v) => (
              <button key={v.cle} type="button" className={`jr-puce${v.cle === choisi.cle ? " on" : ""}`} aria-pressed={v.cle === choisi.cle} onClick={() => setChoisi(v)}>
                {v.nom.replace(/^Shake |^PDM · /, "")}
              </button>
            ))}
          </div>
        ) : (
          <Quantite a={choisi} grammes={grammes} quantite={quantite} onGrammes={setGrammes} onQuantite={setQuantite} />
        )}
        <div className="jr-grand">+{Math.round(prot)} g</div>
        <div className="jr-tiny" style={{ textAlign: "center", marginTop: -8 }}>de protéines</div>
        <button type="button" className="jr-cta" disabled={!pret || occupe} onClick={() => onAjouter(choisi, choisi.prot_portion != null ? null : grammes, quantite)}>
          Ajouter
        </button>
        <button type="button" className="jr-lien" onClick={() => setChoisi(null)}>Autre aliment</button>
      </Feuille>
    );
  }

  if (ecrire && onLireRepas) {
    const lignes = proposition?.lignes ?? [];
    const total = lignes.reduce((s, l) => s + l.prot_g, 0);
    return (
      <Feuille titre={titre} onFermer={onFermer}>
        <div className="jr-tiny" style={{ fontSize: 12.5, color: "var(--jr-mut)" }}>
          Écris comme tu parles, avec les quantités si tu les connais. Un plat préparé ? Dis ce qu'il y a dedans.
        </div>
        <textarea
          className="jr-texte"
          value={texte}
          maxLength={400}
          placeholder="ex. une demi-pizza au thon, une salade verte"
          onChange={(e) => { setTexte(e.target.value); setProposition(null); }}
          aria-label="Ton repas en quelques mots"
        />
        {!proposition && !attente ? (
          <button type="button" className="jr-nly-btn" disabled={!texte.trim()} onClick={() => void calculer()}>
            <JournalIcone nom="etincelle" taille={18} />Calculer avec Noaly
          </button>
        ) : null}
        {attente ? <NoalyTravaille titre="Noaly travaille sur ton repas" etapes={ETAPES_REPAS} /> : null}
        {erreurNoaly ? <div className="jr-vide">{erreurNoaly}</div> : null}
        {proposition ? (
          <>
            <div className="jr-mot jr-prop">
              <span className="jr-qui"><JournalIcone nom="etincelle" taille={13} />Noaly a compris</span>
              {lignes.map((l, i) => (
                <div key={`${l.nom}-${i}`} className="jr-prop-l">
                  <span className="jr-grow">
                    <b>{l.nom}</b>
                    {l.grammes ? ` · ${l.grammes} g` : l.quantite > 1 ? ` · × ${l.quantite}` : ""}
                    {l.aliment == null ? (
                      <small>estimé par Noaly{l.estime ? " · quantité à corriger si besoin" : ""}</small>
                    ) : l.estime ? (
                      <small>quantité estimée : tu pourras la corriger</small>
                    ) : null}
                  </span>
                  <span className="jr-g">{fmtProt(l.prot_g)} g</span>
                  <button type="button" className="jr-rm" aria-label={`Retirer ${l.nom}`}
                    onClick={() => setProposition({ ...proposition, lignes: lignes.filter((_, j) => j !== i) })}>
                    <JournalIcone nom="croix" taille={18} />
                  </button>
                </div>
              ))}
              {!lignes.length ? <div className="jr-vide">Plus rien à ajouter.</div> : null}
              {proposition.non_reconnus.length ? (
                <div className="jr-tiny" style={{ padding: "6px 0 8px" }}>
                  Pas compris : {proposition.non_reconnus.map((x) => `« ${x} »`).join(", ")}. Précise-le, ou choisis-le dans la liste.
                </div>
              ) : null}
            </div>
            {lignes.length && onAjouterLot ? (
              <button type="button" className="jr-cta" disabled={occupe} onClick={() => onAjouterLot(lignes)}>
                Ajouter {lignes.length > 1 ? `les ${lignes.length} ` : ""}· {Math.round(total)} g de prot
              </button>
            ) : null}
          </>
        ) : null}
        <button type="button" className="jr-lien" onClick={() => setEcrire(false)}>Choisir dans la liste</button>
      </Feuille>
    );
  }

  const lienNoaly = onLireRepas ? (
    <button type="button" className="jr-nly-lien" onClick={() => ouvrirEcriture(q.trim())}>
      <JournalIcone nom="etincelle" taille={20} />
      <span className="jr-grow">Pas dans la liste ? Écris ton repas<small>Noaly calcule les protéines pour toi</small></span>
      <JournalIcone nom="droite" taille={18} />
    </button>
  ) : null;

  return (
    <Feuille titre={titre} onFermer={onFermer}>
      {habituels.length && onAjouterHabituel && !q.trim() ? (
        <>
          <div className="jr-sec jr-sec-l">Tes habituels<em>un toucher et c'est noté</em></div>
          {habituels.map((h) => (
            <BoutonHabituel key={`${h.aliment ?? h.libelle}-${h.grammes}-${h.quantite}`} h={h} creneau={creneau} aliments={aliments}
              occupe={occupe} onClick={() => onAjouterHabituel(h)} />
          ))}
        </>
      ) : null}
      {veille.length ? (
        <button type="button" className="jr-hier" disabled={occupe} onClick={onReprendreVeille}>
          <JournalIcone nom="refaire" taille={20} />
          <span className="jr-grow">
            <b>Pareil qu'hier</b>
            <small>{resume(veille)}</small>
          </span>
          <span className="jr-g">{Math.round(protJour(veille))} g</span>
        </button>
      ) : null}
      <input
        ref={champ}
        className="jr-cherche"
        type="search"
        placeholder="Tape un aliment… (poulet, skyr, pâtes)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        autoComplete="off"
        aria-label="Chercher un aliment"
      />
      <div className="jr-liste">
        {q.trim() ? (
          trouves.length ? (
            trouves.slice(0, 30).map((a) => <BoutonAliment key={a.cle} a={a} onClick={() => choisir(a)} />)
          ) : (
            <div className="jr-vide">
              {onLireRepas ? "Pas dans la liste : écris-le à Noaly, elle le calcule." : "Pas dans la liste : choisis l'aliment le plus proche, ou demande à ta coach de l'ajouter."}
            </div>
          )
        ) : (
          <>
            {idees.herbalife.length ? <div className="jr-sec">Herbalife</div> : null}
            {idees.herbalife.map((a) => <BoutonAliment key={a.cle} a={a} onClick={() => choisir(a)} />)}
            {idees.autres.length ? <div className="jr-sec">{idees.herbalife.length ? "Autres idées" : "Idées"}</div> : null}
            {idees.autres.map((a) => <BoutonAliment key={a.cle} a={a} onClick={() => choisir(a)} />)}
          </>
        )}
      </div>
      {lienNoaly}
    </Feuille>
  );
}

// ─── Un repas : voir, corriger, ajouter ──────────────────────────────────────
export function FeuilleRepas({ creneau, etat, onFermer, onModifier, onAjouter }: {
  creneau: Creneau; etat: EtatJour; onFermer: () => void; onModifier: (l: Ligne) => void; onAjouter: () => void;
}) {
  const lignes = etat.lignes.filter((l) => l.creneau === creneau);
  return (
    <Feuille titre={`${Math.round(protJour(lignes))} g de protéines`} surTitre={NOM_CRENEAU[creneau]} onFermer={onFermer}>
      <div className="jr-liste">
        {lignes.map((l) => (
          <button key={l.id} type="button" onClick={() => onModifier(l)}>
            <span>
              {l.libelle}
              {l.grammes ? ` · ${Math.round(l.grammes)} g` : ""}
              {l.quantite > 1 ? ` · × ${l.quantite}` : ""}
              {l.origine === "club" ? <span className="jr-tag">pris au club</span> : null}
              {l.aliment == null ? <span className="jr-tag nly">estimé par Noaly</span> : null}
            </span>
            <small>{Math.round(l.prot_g)} g</small>
          </button>
        ))}
      </div>
      <div className="jr-tiny">Touche un aliment pour changer la quantité ou le retirer.</div>
      <button type="button" className="jr-cta" onClick={onAjouter}>
        <JournalIcone nom="plus" taille={18} />
        Ajouter un aliment
      </button>
    </Feuille>
  );
}

// ─── Modifier / retirer ───────────────────────────────────────────────────────
/** Des poids autour de celui noté : la moitié, le même, une fois et demie. */
function portionsAutour(g: number | null): number[] {
  if (!g) return [100];
  return [...new Set([Math.round(g / 2), Math.round(g), Math.round(g * 1.5)])].filter((x) => x >= 1 && x <= 2000);
}

export function FeuilleModifier({ ligne, aliments, occupe, onFermer, onEnregistrer, onRetirer }: {
  ligne: Ligne; aliments: Aliment[]; occupe: boolean; onFermer: () => void;
  /** cle null = une ligne estimée par Noaly : seul son poids change. */
  onEnregistrer: (cle: string | null, grammes: number | null, quantite: number) => void;
  onRetirer: () => void;
}) {
  const estimee = ligne.aliment == null && ligne.prot_100g != null;
  const depart = ligne.aliment ? aliments.find((a) => a.cle === ligne.aliment) ?? null : null;
  const [a, setA] = useState<Aliment | null>(depart);
  const [grammes, setGrammes] = useState<number | null>(ligne.grammes);
  const [quantite, setQuantite] = useState(ligne.quantite);
  // Une ligne estimée garde sa base pour 100 g : elle se corrige comme un aliment pesé.
  const base: Aliment | null = estimee
    ? { cle: "", nom: ligne.libelle, famille: null, herbalife: false, prot_portion: null, prot_100g: Number(ligne.prot_100g),
        portions: portionsAutour(ligne.grammes), unite: null, indice: null, rangs: {} }
    : null;
  const mesure = a ?? base;
  const vars = a ? variantes(aliments, a) : [];
  const prot = mesure ? protAliment(mesure, grammes, quantite) : ligne.prot_g;
  const pret = !!mesure && (mesure.prot_portion != null || (grammes != null && grammes >= 1));
  return (
    <Feuille titre={a?.nom ?? ligne.libelle} surTitre={estimee ? "Modifier · estimé par Noaly" : "Modifier"} onFermer={onFermer}>
      {a && vars.length > 1 ? (
        <div className="jr-puces" role="group" aria-label="Quelle version ?">
          {vars.map((v) => (
            <button key={v.cle} type="button" className={`jr-puce${v.cle === a.cle ? " on" : ""}`} aria-pressed={v.cle === a.cle} onClick={() => setA(v)}>
              {v.nom.replace(/^Shake |^PDM · /, "")}
            </button>
          ))}
        </div>
      ) : mesure ? (
        <Quantite a={mesure} grammes={grammes} quantite={quantite} onGrammes={setGrammes} onQuantite={setQuantite} />
      ) : (
        <div className="jr-tiny">Cet aliment n'est plus dans la liste : tu peux seulement le retirer.</div>
      )}
      {estimee ? (
        <div className="jr-tiny">Noaly l'estime à {String(Number(ligne.prot_100g)).replace(".", ",")} g de protéines pour 100 g.</div>
      ) : null}
      <div className="jr-grand">{Math.round(prot)} g</div>
      <div className="jr-tiny" style={{ textAlign: "center", marginTop: -8 }}>de protéines</div>
      {mesure ? (
        <button type="button" className="jr-cta" disabled={!pret || occupe}
          onClick={() => onEnregistrer(a ? a.cle : null, mesure.prot_portion != null ? null : grammes, quantite)}>
          Enregistrer
        </button>
      ) : null}
      <button type="button" className="jr-danger" disabled={occupe} onClick={onRetirer}>
        <JournalIcone nom="poubelle" taille={18} />
        Retirer
      </button>
    </Feuille>
  );
}

// ─── Ma journée : sport + humeur ──────────────────────────────────────────────
export function FeuilleJournee({ etat, onFermer, onActivite, onHumeur }: {
  etat: EtatJour; onFermer: () => void; onActivite: (a: Activite) => void; onHumeur: (h: Humeur) => void;
}) {
  const estAujourdhui = etat.jour === etat.aujourdhui;
  return (
    <Feuille titre="Ta journée" onFermer={onFermer}>
      <div className="jr-eye">Sport, marche, vélo…</div>
      <div className="jr-puces" role="group" aria-label="Combien de sport ?">
        {ACTIVITES.map((x) => (
          <button key={x.cle} type="button" className={`jr-puce${etat.activite === x.cle ? " on" : ""}`} aria-pressed={etat.activite === x.cle} onClick={() => onActivite(x.cle)}>
            {x.libelle}
          </button>
        ))}
      </div>
      {estAujourdhui ? <div className="jr-tiny">1 h ou plus : +5 XP</div> : null}
      <div className="jr-eye" style={{ marginTop: 4 }}>Comment tu te sens ?</div>
      <div className="jr-humeurs" role="group" aria-label="Ton humeur">
        {HUMEURS.map((h) => (
          <button
            key={h.cle}
            type="button"
            className={`jr-humeur${etat.humeur === h.cle ? " on" : ""}`}
            style={{ ["--jr-hc" as string]: h.couleur }}
            aria-pressed={etat.humeur === h.cle}
            onClick={() => onHumeur(h.cle)}
          >
            <span className="jr-point" style={{ background: h.couleur }} />
            {h.libelle}
          </button>
        ))}
      </div>
      <button type="button" className="jr-cta" onClick={onFermer}>C'est noté</button>
    </Feuille>
  );
}

// ─── Mes conseils du jour ─────────────────────────────────────────────────────
const ASSIETTES: Record<"bbc" | "std", Array<[string, number, string]>> = {
  // Repris de l'ancien onglet Conseils de chaque app (rien ne se perd).
  bbc: [["protéines", 40, "var(--jr-acc)"], ["légumes", 30, "var(--jr-eau)"], ["féculents", 18, "var(--jr-xp)"], ["bons gras", 12, "var(--jr-coral)"]],
  std: [["légumes", 50, "var(--jr-eau)"], ["protéines", 25, "var(--jr-coral)"], ["glucides complets", 25, "var(--jr-m3)"]],
};

export function FeuilleConseils({ etat, aliments, format, coachPrenom, alertes, maintenant, chargerMot, onFermer }: {
  etat: EtatJour; aliments: Aliment[]; format: "bbc" | "std"; coachPrenom: string; alertes?: AlerteSport[];
  /** L'heure : le plan d'aujourd'hui ne propose que des repas encore à venir. */
  maintenant?: Date;
  /** « Le mot de Noaly » (edge journal-noaly) — absent ou en panne : les conseils calculés. */
  chargerMot?: (plan: LignePlan[]) => Promise<string>;
  onFermer: () => void;
}) {
  const p = protJour(etat.lignes);
  const plan = planFinDeJournee(etat, aliments, maintenant);
  const [mot, setMot] = useState<{ etat: "attente" | "ok" | "rien"; texte?: string }>(chargerMot ? { etat: "attente" } : { etat: "rien" });
  useEffect(() => {
    if (!chargerMot) return;
    let vivant = true;
    chargerMot(plan.lignes)
      .then((t) => { if (vivant) setMot(t ? { etat: "ok", texte: t } : { etat: "rien" }); })
      .catch(() => { if (vivant) setMot({ etat: "rien" }); });
    return () => { vivant = false; };
    // Une fois à l'ouverture : le plan est celui qu'on affiche à ce moment-là.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const l = litres(etat.verres, etat.boisson_club);
  const resteL = Math.max(0, etat.objectifs.eau_l - 0.05 - l);
  const verresRestants = Math.ceil(resteL / 0.25 - 1e-9);
  const bravo: string[] = [];
  if (etat.lignes.some((x) => x.creneau === "pdj")) bravo.push("ton petit-déj est noté");
  if (etat.activite && etat.activite !== "repos") bravo.push(`tu as bougé ${ACTIVITES.find((a) => a.cle === etat.activite)?.libelle ?? ""}`);
  if (eauAtteinte(etat.objectifs.eau_l, etat.verres, etat.boisson_club)) bravo.push("ton eau est au top");
  const phraseBravo = bravo.join(", ").replace(/, ([^,]*)$/, " et $1");
  const assiette = ASSIETTES[format];
  const obj = etat.objectifs.proteines;
  // Avec le mot de Noaly, les phrases calculées (eau, bravo) seraient en double.
  const avecNoaly = mot.etat !== "rien";

  const listePlan = plan.lignes.length ? (
    <div className="jr-plan">
      {plan.lignes.map((x) => (
        <div key={x.creneau}>
          <span>
            {x.aliment.nom}{x.grammes ? ` · ${x.grammes} g` : ""}
            {x.aliment.herbalife ? <span className="jr-herb">Herbalife</span> : null}
            <small>{NOM_CRENEAU[x.creneau]}</small>
          </span>
          <b className="jr-g">+{Math.round(x.prot)} g</b>
        </div>
      ))}
      <div className="fin"><span>Tu arrives à</span><b className="jr-g">≈ {Math.round(plan.total)} g</b></div>
    </div>
  ) : null;

  return (
    <Feuille
      titre={obj != null ? `Tu en es à ${Math.round(p)} g sur ${obj}` : `Tu en es à ${Math.round(p)} g`}
      surTitre={chargerMot ? "Noaly · tes conseils du jour" : "Tes conseils du jour"}
      surTitreNoaly={!!chargerMot}
      onFermer={onFermer}
    >
      {mot.etat === "attente" ? (
        <NoalyTravaille titre="Noaly prépare ton mot" etapes={ETAPES_MOT} />
      ) : mot.etat === "ok" ? (
        <div className="jr-mot">
          <JournalIcone nom="etincelle" taille={18} />
          <span><span className="jr-qui">Le mot de Noaly</span>{mot.texte}</span>
        </div>
      ) : null}
      {avecNoaly ? (
        obj != null && plan.manque > 0 ? listePlan : null
      ) : obj == null ? (
        <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span>Ton objectif protéines sera fixé à ton prochain bilan pesé, avec {coachPrenom}.</span></div>
      ) : plan.manque > 0 && plan.lignes.length ? (
        <>
          <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span><b>Il te manque {plan.manque} g de protéines.</b> Voilà une journée simple pour les trouver :</span></div>
          {listePlan}
        </>
      ) : plan.manque > 0 ? (
        <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span><b>Il te manque {plan.manque} g de protéines.</b> Un <b>shake PDM</b><span className="jr-herb">Herbalife</span> en fin de journée t'en apporte 15.</span></div>
      ) : (
        <div className="jr-bloc"><JournalIcone nom="coche" taille={18} /><span><b>Objectif protéines atteint.</b> Garde ce rythme demain.</span></div>
      )}
      {!avecNoaly ? (
        <>
          <div className="jr-bloc">
            <JournalIcone nom="goutte" taille={18} />
            {verresRestants > 0 ? (
              <span><b>Tu es à {formatLitres(l)} L sur {formatLitres(etat.objectifs.eau_l)} L</b> : encore {verresRestants} verre{verresRestants > 1 ? "s" : ""} d'ici ce soir — un en rentrant, un au dîner, le reste en petites gorgées. Astuce : le <b>thé concentré</b><span className="jr-herb">Herbalife</span> dans ta bouteille rend l'eau plus facile à boire.</span>
            ) : (
              <span><b>Hydratation au top :</b> {formatLitres(l)} L, parfait.</span>
            )}
          </div>
          <div className="jr-bloc">
            <JournalIcone nom={bravo.length ? "coche" : "etoile"} taille={18} />
            {bravo.length ? (
              <span><b>Bien joué :</b> {phraseBravo}. Continue comme ça.</span>
            ) : (
              <span><b>On repart :</b> commence par noter ton petit-déj, le reste suit.</span>
            )}
          </div>
        </>
      ) : null}
      {alertes && alertes.length ? (
        <>
          <div className="jr-eye">Tes points d'attention</div>
          {alertes.map((a) => (
            <div key={a.id} className="jr-alerte">
              <b>{a.title}</b>
              {a.detail ? <span>{a.detail}</span> : null}
              {a.advice ? <span>→ {a.advice}</span> : null}
            </div>
          ))}
        </>
      ) : null}
      <div className="jr-card" style={{ background: "var(--jr-s2)", border: 0 }}>
        <div className="jr-eye">Ton assiette idéale</div>
        <div className="jr-assiette" aria-hidden="true">
          {assiette.map(([t, pct, c]) => <span key={t} style={{ width: `${pct}%`, background: c }} />)}
        </div>
        <div className="jr-legende">
          {assiette.map(([t, pct, c]) => (
            <span key={t}><span className="jr-point" style={{ background: c }} />{t} {pct} %</span>
          ))}
        </div>
      </div>
      <div className="jr-tiny">Conseils d'alimentation, pas un avis médical. Une question sur ta santé ? Écris à {coachPrenom}.</div>
      <button type="button" className="jr-cta" onClick={onFermer}>{chargerMot ? "OK, merci Noaly" : "OK, merci"}</button>
    </Feuille>
  );
}
