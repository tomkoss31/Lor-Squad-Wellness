// =============================================================================
// Journal nutritionnel — les feuilles du bas (maquette v7).
// Ajouter · voir/corriger un repas · modifier un aliment · sport et humeur ·
// conseils du jour. Chaque feuille se ferme au fond, à la croix ou à Échap.
// =============================================================================

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { JournalIcone } from "./JournalIcone";
import {
  ACTIVITES,
  HUMEURS,
  NOM_CRENEAU,
  chercher,
  eauAtteinte,
  formatLitres,
  litres,
  planFinDeJournee,
  protAliment,
  protJour,
  resume,
  suggestions,
  variantes,
  type Activite,
  type Aliment,
  type Creneau,
  type EtatJour,
  type Humeur,
  type Ligne,
} from "./journalCalculs";

export interface AlerteSport {
  id: string;
  title: string;
  detail?: string;
  advice?: string;
}

// ─── Le cadre commun ──────────────────────────────────────────────────────────
function Feuille({ titre, surTitre, onFermer, children }: { titre: string; surTitre?: string; onFermer: () => void; children: ReactNode }) {
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
            {surTitre ? <div className="jr-eye">{surTitre}</div> : null}
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

// ─── Ajouter ──────────────────────────────────────────────────────────────────
export function FeuilleAjout({ creneau, etat, aliments, occupe, onFermer, onAjouter, onReprendreVeille }: {
  creneau: Creneau; etat: EtatJour; aliments: Aliment[]; occupe: boolean;
  onFermer: () => void;
  onAjouter: (a: Aliment, grammes: number | null, quantite: number) => void;
  onReprendreVeille: () => void;
}) {
  const [q, setQ] = useState("");
  const [choisi, setChoisi] = useState<Aliment | null>(null);
  const [grammes, setGrammes] = useState<number | null>(null);
  const [quantite, setQuantite] = useState(1);
  const champ = useRef<HTMLInputElement>(null);
  const veille = etat.jour === etat.aujourdhui && !etat.lignes.some((l) => l.creneau === creneau)
    ? etat.veille.filter((l) => l.creneau === creneau) : [];
  const idees = useMemo(() => suggestions(aliments, creneau), [aliments, creneau]);
  const trouves = useMemo(() => chercher(aliments, q), [aliments, q]);

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

  if (choisi) {
    const prot = protAliment(choisi, grammes, quantite);
    const pret = choisi.prot_portion != null || (grammes != null && grammes >= 1);
    const vars = variantes(aliments, choisi);
    return (
      <Feuille titre={choisi.nom} surTitre={`Ajouter : ${NOM_CRENEAU[creneau].toLowerCase()}`} onFermer={onFermer}>
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

  return (
    <Feuille titre={`Ajouter : ${NOM_CRENEAU[creneau].toLowerCase()}`} onFermer={onFermer}>
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
            <div className="jr-vide">Pas dans la liste : choisis l'aliment le plus proche, ou demande à ta coach de l'ajouter.</div>
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
export function FeuilleModifier({ ligne, aliments, occupe, onFermer, onEnregistrer, onRetirer }: {
  ligne: Ligne; aliments: Aliment[]; occupe: boolean; onFermer: () => void;
  onEnregistrer: (cle: string, grammes: number | null, quantite: number) => void;
  onRetirer: () => void;
}) {
  const depart = aliments.find((a) => a.cle === ligne.aliment) ?? null;
  const [a, setA] = useState<Aliment | null>(depart);
  const [grammes, setGrammes] = useState<number | null>(ligne.grammes);
  const [quantite, setQuantite] = useState(ligne.quantite);
  const vars = a ? variantes(aliments, a) : [];
  const prot = a ? protAliment(a, grammes, quantite) : ligne.prot_g;
  const pret = !!a && (a.prot_portion != null || (grammes != null && grammes >= 1));
  return (
    <Feuille titre={a?.nom ?? ligne.libelle} surTitre="Modifier" onFermer={onFermer}>
      {a && vars.length > 1 ? (
        <div className="jr-puces" role="group" aria-label="Quelle version ?">
          {vars.map((v) => (
            <button key={v.cle} type="button" className={`jr-puce${v.cle === a.cle ? " on" : ""}`} aria-pressed={v.cle === a.cle} onClick={() => setA(v)}>
              {v.nom.replace(/^Shake |^PDM · /, "")}
            </button>
          ))}
        </div>
      ) : a ? (
        <Quantite a={a} grammes={grammes} quantite={quantite} onGrammes={setGrammes} onQuantite={setQuantite} />
      ) : (
        <div className="jr-tiny">Cet aliment n'est plus dans la liste : tu peux seulement le retirer.</div>
      )}
      <div className="jr-grand">{Math.round(prot)} g</div>
      <div className="jr-tiny" style={{ textAlign: "center", marginTop: -8 }}>de protéines</div>
      {a ? (
        <button type="button" className="jr-cta" disabled={!pret || occupe} onClick={() => onEnregistrer(a.cle, a.prot_portion != null ? null : grammes, quantite)}>
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

export function FeuilleConseils({ etat, aliments, format, coachPrenom, alertes, onFermer }: {
  etat: EtatJour; aliments: Aliment[]; format: "bbc" | "std"; coachPrenom: string; alertes?: AlerteSport[]; onFermer: () => void;
}) {
  const p = protJour(etat.lignes);
  const plan = planFinDeJournee(etat, aliments);
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

  return (
    <Feuille titre={obj != null ? `Tu en es à ${Math.round(p)} g sur ${obj}` : `Tu en es à ${Math.round(p)} g`} surTitre="Tes conseils du jour" onFermer={onFermer}>
      {obj == null ? (
        <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span>Ton objectif protéines sera fixé à ton prochain bilan pesé, avec {coachPrenom}.</span></div>
      ) : plan.manque > 0 && plan.lignes.length ? (
        <>
          <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span><b>Il te manque {plan.manque} g de protéines.</b> Voilà une journée simple pour les trouver :</span></div>
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
        </>
      ) : plan.manque > 0 ? (
        <div className="jr-bloc"><JournalIcone nom="viande" taille={18} /><span><b>Il te manque {plan.manque} g de protéines.</b> Un <b>shake PDM</b><span className="jr-herb">Herbalife</span> en fin de journée t'en apporte 15.</span></div>
      ) : (
        <div className="jr-bloc"><JournalIcone nom="coche" taille={18} /><span><b>Objectif protéines atteint.</b> Garde ce rythme demain.</span></div>
      )}
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
      <button type="button" className="jr-cta" onClick={onFermer}>OK, merci</button>
    </Feuille>
  );
}
