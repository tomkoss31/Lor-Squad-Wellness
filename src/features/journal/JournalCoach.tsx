// =============================================================================
// Journal nutritionnel — le volet de la coach (maquette v7 validée, 21/09/2026).
//
// BBC : 4e volet de la fiche membre (Visites & carte · Son corps · Journal ·
// Prochaine étape). Standard : une section de l'onglet « Mesures » de la fiche
// client — pas de 6e onglet (règle des 5).
//
// Ce qu'il remplace : le carnet que la membre remplit, puis la recopie sur la
// feuille « Journal nutritionnel », qui se perd. Ici la coach lit les 7 derniers
// jours, ce qu'il faut en retenir, règle le coefficient protéines, et laisse une
// remarque que la membre voit en haut de son journal.
//
// Accès : le RLS de la coach (journal_semaine_coach est SECURITY INVOKER) — elle
// voit le journal des personnes qu'elle voit déjà, rien de plus.
// =============================================================================

import "./journal.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JournalIcone } from "./JournalIcone";
import { Feuille } from "./JournalFeuilles";
import { journalCoach } from "./journalApi";
import {
  ACTIVITES,
  COEFFICIENTS,
  HUMEURS,
  NOM_CRENEAU,
  aRetenir,
  eauAtteinte,
  formatLitres,
  jourRempli,
  litres,
  nomDuJour,
  protJour,
  type Creneau,
  type JourCoach,
  type SemaineCoach,
} from "./journalCalculs";

const CHANGEMENTS: Array<{ cle: string; libelle: string }> = [
  { cle: "calories", libelle: "Calories" },
  { cle: "proteines", libelle: "Protéines" },
  { cle: "eau", libelle: "Eau" },
  { cle: "exercice", libelle: "Exercice" },
  { cle: "autre", libelle: "Autre" },
];
const ICONE_RETENIR = { proteines: "viande", eau: "goutte", encas: "lait", vide: "calendrier" } as const;
const ORDRE: Creneau[] = ["pdj", "enc1", "dej", "enc2", "din", "aut"];

const ORIGINE_TEXTE: Record<string, string> = { club: "pris au club", noaly: "lu par Noaly", coach: "noté par toi" };

/** Le repas en détail (24/09, bloc 6) : aliment par aliment, quantité, protéines, kcal, d'où ça vient. */
function FeuilleRepasCoach({ creneau, jour, prenom, objectif, kcalVisibles, onFermer, onMot }: {
  creneau: Creneau; jour: JourCoach; prenom: string; objectif: number | null; kcalVisibles: boolean;
  onFermer: () => void; onMot: () => void;
}) {
  const ls = jour.lignes.filter((l) => l.creneau === creneau);
  const prot = protJour(ls);
  const kcal = ls.reduce((s, l) => s + (l.kcal ?? 0), 0);
  const kcalConnues = ls.some((l) => l.kcal != null);
  const estime = ls.some((l) => l.estime);
  const totalJour = protJour(jour.lignes);
  const heure = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ") : null);
  return (
    <Feuille titre={`${NOM_CRENEAU[creneau]} · ${Math.round(prot)} g`} surTitre={`${nomDuJour(jour.jour)} ${Number(jour.jour.slice(8))} · ${prenom}`} onFermer={onFermer}>
      <div className="jr-liste">
        {ls.map((l, i) => (
          <div key={i} className="jr-repas-l">
            <span>
              {l.libelle}
              {l.origine !== "membre" && ORIGINE_TEXTE[l.origine] ? <span className={`jr-tag${l.origine === "noaly" ? " nly" : ""}`}>{ORIGINE_TEXTE[l.origine]}</span> : null}
              {l.estime ? <span className="jr-tag nly">estimé par Noaly</span> : null}
              <span className="jr-sous">
                {[l.grammes ? `${Math.round(l.grammes)} g` : l.quantite > 1 ? `× ${l.quantite}` : "1 portion", heure(l.heure) ? `noté à ${heure(l.heure)}` : null].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="jr-repas-g">
              {Math.round(l.prot_g * 10) / 10} g
              {kcalVisibles && l.kcal != null ? <small>{Math.round(l.kcal)} kcal</small> : null}
            </span>
          </div>
        ))}
      </div>
      <div className="jr-repas-tot">
        <span>Ce repas</span>
        <span>{Math.round(prot)} g{kcalVisibles && kcalConnues ? ` · ${estime ? "≈ " : ""}${Math.round(kcal)} kcal` : ""}</span>
      </div>
      <div className="jr-tiny">
        {objectif != null ? `Objectif du jour ${objectif} g · ` : ""}sur la journée elle en est à {Math.round(totalJour)} g.
        {kcalVisibles ? " Les kcal restent une indication, jamais un objectif." : ""}
      </div>
      <button type="button" className="jr-lien" onClick={onMot}>Un mot sur ce repas ›</button>
    </Feuille>
  );
}

export interface JournalCoachProps {
  clientId: string;
  prenom: string;
  format: "bbc" | "coach";
}

export function JournalCoach({ clientId, prenom, format }: JournalCoachProps) {
  const [s, setS] = useState<SemaineCoach | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [choix, setChoix] = useState<number>(-1);
  const [texte, setTexte] = useState("");
  const [changements, setChangements] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  // Le repas ouvert en détail (24/09).
  const [repas, setRepas] = useState<Creneau | null>(null);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      setS(await journalCoach.semaine(clientId));
    } catch (e) {
      setErreur((e as Error).message);
    }
  }, [clientId]);
  useEffect(() => { void charger(); }, [charger]);

  const agir = useCallback(async (appel: () => Promise<SemaineCoach>, confirmation: string) => {
    setOccupe(true);
    try {
      setS(await appel());
      setInfo(confirmation);
      window.setTimeout(() => setInfo(null), 2500);
    } catch (e) {
      setInfo((e as Error).message);
    } finally {
      setOccupe(false);
    }
  }, []);

  const retenir = useMemo(() => (s ? aRetenir(s, prenom) : []), [s, prenom]);

  if (erreur) {
    return (
      <div className="jr" data-format={format}>
        <div className="jr-card">
          <div className="jr-vide">{erreur}</div>
          <button type="button" className="jr-cta" onClick={() => void charger()}>Réessayer</button>
        </div>
      </div>
    );
  }
  if (!s) return <div className="jr" data-format={format}><div className="jr-card jr-vide">Le journal arrive…</div></div>;

  const obj = s.objectifs;
  const remplis = s.jours.filter(jourRempli).length;
  // À l'ouverture : le DERNIER jour noté — un « aujourd'hui » encore vide ne dit rien (24/09).
  const dernierRempli = s.jours.map(jourRempli).lastIndexOf(true);
  const idx = choix >= 0 ? choix : dernierRempli >= 0 ? dernierRempli : s.jours.length - 1;
  const j = s.jours[idx];
  const protJ = protJour(j.lignes);
  const humeur = HUMEURS.find((h) => h.cle === j.humeur);
  const activite = ACTIVITES.find((a) => a.cle === j.activite);

  return (
    <div className="jr" data-format={format}>
      {/* Ses objectifs (le coefficient se règle ici, la membre le voit tout de suite) */}
      <section className="jr-card" aria-label="Ses objectifs">
        <div className="jr-eye">Ses objectifs</div>
        <div className="jr-obj">
          <span><JournalIcone nom="viande" taille={16} />Protéines</span>
          <b>{obj.poids != null && obj.proteines != null ? `${String(obj.poids).replace(".", ",")} kg × ${String(obj.coef).replace(".", ",")} = ${obj.proteines} g` : "au prochain bilan pesé"}</b>
        </div>
        <div className="jr-coefs" role="group" aria-label="Coefficient protéines">
          {COEFFICIENTS.map((c) => {
            const on = Math.abs(c.coef - obj.coef) < 0.01;
            return (
              <button key={c.coef} type="button" className={`jr-coef${on ? " on" : ""}`} aria-pressed={on} disabled={occupe || on}
                onClick={() => void agir(() => journalCoach.reglerCoef(clientId, c.coef), `Objectif de ${prenom} mis à jour`)}>
                <b>× {String(c.coef).replace(".", ",")}</b>
                <small>{c.libelle}</small>
              </button>
            );
          })}
        </div>
        <div className="jr-obj">
          <span><JournalIcone nom="goutte" taille={16} />Eau</span>
          <b>{formatLitres(obj.eau_l)} L</b>
        </div>
        <div className="jr-tiny" style={{ marginTop: 8 }}>
          1 L par 30 kg{obj.poids == null ? " (2 L tant qu'aucun bilan n'est pesé)" : ""}. {prenom} voit son objectif changer tout de suite dans son journal.
        </div>
        {/* Les kcal (bloc B, 9) : affichées en gris par défaut ; la coach peut les masquer. */}
        <div className="jr-obj" style={{ marginTop: 12 }}>
          <span><JournalIcone nom="info" taille={16} />Les kcal dans son journal</span>
        </div>
        <div className="jr-coefs deux" role="group" aria-label="Les kcal dans son journal">
          {[
            { visibles: true, titre: "Affichées", sous: "en gris, sans objectif" },
            { visibles: false, titre: "Masquées", sous: "protéines et eau seulement" },
          ].map((o) => {
            const on = (s.kcal_visibles !== false) === o.visibles;
            return (
              <button key={o.titre} type="button" className={`jr-coef${on ? " on" : ""}`} aria-pressed={on} disabled={occupe || on}
                onClick={() => void agir(() => journalCoach.reglerKcal(clientId, o.visibles), o.visibles ? `Kcal affichées pour ${prenom}` : `Kcal masquées pour ${prenom}`)}>
                <b>{o.titre}</b>
                <small>{o.sous}</small>
              </button>
            );
          })}
        </div>
      </section>

      {/* Les 7 derniers jours */}
      <section className="jr-card" aria-label="7 derniers jours">
        <div className="jr-row">
          <div className="jr-eye jr-grow">7 derniers jours</div>
          <span className="jr-pastille">{remplis} / 7 jours remplis</span>
        </div>
        <div className="jr-semaine">
          {s.jours.map((x, i) => {
            const p = protJour(x.lignes);
            const e = litres(x.verres, x.boisson_club);
            const nom = nomDuJour(x.jour);
            return (
              <button key={x.jour} type="button" className={`jr-jour${i === idx ? " on" : ""}${jourRempli(x) ? "" : " vide"}`} aria-label={`${nom} ${x.jour.slice(8)}`} onClick={() => setChoix(i)}>
                <span>{nom.charAt(0).toUpperCase()}</span>
                <b>{Number(x.jour.slice(8))}</b>
                <span className="jr-mini" aria-hidden="true">
                  <i style={{ height: Math.max(2, Math.min(18, obj.proteines ? (p / obj.proteines) * 18 : 0)), background: "var(--jr-acc)" }} />
                  <i style={{ height: Math.max(2, Math.min(18, (e / obj.eau_l) * 18)), background: "var(--jr-eau)" }} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="jr-legende-mini">
          <span><i style={{ background: "var(--jr-acc)" }} />protéines</span>
          <span><i style={{ background: "var(--jr-eau)" }} />eau</span>
          <span className="jr-legende-aide">touche un jour pour le lire</span>
        </div>
      </section>

      {/* À retenir */}
      <section className="jr-card" aria-label="À retenir">
        <div className="jr-eye" style={{ color: "var(--jr-acc-tx)" }}>À retenir</div>
        <div style={{ marginTop: 6 }}>
          {retenir.map((r, i) => (
            <div key={i} className={`jr-retenir${r.faible ? " faible" : ""}`}>
              <JournalIcone nom={ICONE_RETENIR[r.icone]} taille={18} />
              <span>{r.gras ? <><b>{r.gras}</b>{r.texte ? ` · ${r.texte}` : ""}</> : r.texte}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Le jour choisi */}
      <section className="jr-card" aria-label="Détail du jour">
        <div className="jr-eye jr-jour-tete">
          {idx > 0 ? (
            <button type="button" className="jr-jour-nav" onClick={() => setChoix(idx - 1)} aria-label="Jour précédent">‹ {nomDuJour(s.jours[idx - 1].jour)}</button>
          ) : <span />}
          <span>{nomDuJour(j.jour)} {Number(j.jour.slice(8))}{j.jour === s.aujourdhui ? " · aujourd'hui" : ""}</span>
          {idx < s.jours.length - 1 ? (
            <button type="button" className="jr-jour-nav" onClick={() => setChoix(idx + 1)} aria-label="Jour suivant">{nomDuJour(s.jours[idx + 1].jour)} ›</button>
          ) : <span />}
        </div>
        {!jourRempli(j) ? (
          <div className="jr-vide">{j.jour === s.aujourdhui ? "Rien de noté pour l'instant." : "Rien de noté ce jour-là."}</div>
        ) : (
          <>
            <div className="jr-stats">
              <div className="jr-stat">
                <b style={{ color: obj.proteines != null && protJ >= obj.proteines ? "var(--jr-win-tx)" : "var(--jr-tx)" }}>{Math.round(protJ)} g</b>
                <small>{obj.proteines != null ? `/ ${obj.proteines} g prot` : "protéines"}</small>
              </div>
              <div className="jr-stat">
                <b style={{ color: eauAtteinte(obj.eau_l, j.verres, j.boisson_club) ? "var(--jr-eau)" : "var(--jr-tx)" }}>{formatLitres(litres(j.verres, j.boisson_club))} L</b>
                <small>/ {formatLitres(obj.eau_l)} L eau</small>
              </div>
              <div className="jr-stat"><b>{activite ? activite.libelle.replace(" et plus", " +") : "—"}</b><small>activité</small></div>
              <div className="jr-stat">
                <b style={{ fontFamily: "var(--jr-fb)", fontSize: 12 }}>
                  {humeur ? <><span className="jr-point" style={{ background: humeur.couleur, marginRight: 4 }} />{humeur.libelle}</> : "—"}
                </b>
                <small>humeur</small>
              </div>
            </div>
            {/* Chaque repas se touche (24/09) : la feuille dit tout ce qu'elle a mangé. */}
            {ORDRE.map((c) => {
              const ls = j.lignes.filter((l) => l.creneau === c);
              if (!ls.length) return null;
              return (
                <button key={c} type="button" className="jr-detail jr-detail-btn" onClick={() => setRepas(c)} aria-label={`${NOM_CRENEAU[c]} en détail`}>
                  <span>
                    <b>{NOM_CRENEAU[c]}</b>
                    <br />
                    <span style={{ fontSize: 12.5 }}>
                      {ls.map((l) => `${l.libelle}${l.grammes ? ` ${Math.round(l.grammes)} g` : ""}${l.quantite > 1 ? ` × ${l.quantite}` : ""}${l.origine === "club" ? " (club)" : ""}${l.estime ? " (estimé par Noaly)" : ""}`).join(" · ")}
                    </span>
                  </span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "var(--jr-fm)", color: "var(--jr-acc-tx)", fontWeight: 700 }}>{Math.round(protJour(ls))} g</span>
                    <JournalIcone nom="droite" taille={16} />
                  </span>
                </button>
              );
            })}
          </>
        )}
      </section>

      {repas ? (
        <FeuilleRepasCoach
          creneau={repas}
          jour={j}
          prenom={prenom}
          objectif={obj.proteines ?? null}
          kcalVisibles={s.kcal_visibles !== false}
          onFermer={() => setRepas(null)}
          onMot={() => {
            const debut = `Ton ${NOM_CRENEAU[repas].toLowerCase()} de ${nomDuJour(j.jour)} : `;
            setTexte((t) => (t.trim() ? t : debut));
            setRepas(null);
            window.setTimeout(() => document.querySelector<HTMLTextAreaElement>(".jr-texte")?.focus(), 50);
          }}
        />
      ) : null}

      {/* Ta remarque */}
      <section className="jr-card" aria-label="Ta remarque">
        <div className="jr-eye">Ta remarque</div>
        {s.remarque ? (
          <div className="jr-tiny" style={{ marginTop: 6 }}>Dernière envoyée : « {s.remarque.texte} »</div>
        ) : null}
        <textarea className="jr-texte" style={{ marginTop: 8 }} value={texte} maxLength={1000}
          placeholder={`Un mot pour ${prenom}… (ex. pense à ton encas protéiné l'après-midi)`}
          onChange={(e) => setTexte(e.target.value)} aria-label={`Ta remarque pour ${prenom}`} />
        <div className="jr-eye" style={{ marginTop: 11 }}>Changement à faire</div>
        <div className="jr-puces" style={{ marginTop: 8 }} role="group" aria-label="Changement à faire">
          {CHANGEMENTS.map((c) => {
            const on = changements.includes(c.cle);
            return (
              <button key={c.cle} type="button" className={`jr-puce${on ? " on" : ""}`} aria-pressed={on}
                onClick={() => setChangements((v) => (on ? v.filter((x) => x !== c.cle) : [...v, c.cle]))}>
                {c.libelle}
              </button>
            );
          })}
        </div>
        <button type="button" className="jr-cta" style={{ marginTop: 12 }} disabled={occupe || !texte.trim()}
          onClick={() => void agir(async () => {
            const r = await journalCoach.envoyerRemarque(clientId, texte.trim(), changements);
            setTexte(""); setChangements([]);
            return r;
          }, `Envoyé à ${prenom}`)}>
          Envoyer à {prenom}
        </button>
        <div className="jr-tiny" style={{ marginTop: 7, textAlign: "center" }}>
          {info ?? `${prenom} le voit en haut de son journal.`}
        </div>
      </section>
    </div>
  );
}
