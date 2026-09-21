// =============================================================================
// Journal nutritionnel — « Ta semaine » (bloc B, 7 ; maquette
// Jt3RNaarpnav5XRGzhrTwz validée par Thomas le 21/09/2026).
//
// La carte : ses 7 jours en pastilles et 3 chiffres (jours notés, protéines par
// jour, eau). En tête du journal le dimanche soir et le lundi, en bas le reste
// de la semaine (`semaineEnTete`). La feuille : les 3 chiffres, ses protéines
// jour par jour contre son objectif, son meilleur jour, et UNE chose à
// travailler, calculée par l'app (`bilanSemaine`, jamais d'IA). Un jour vide est
// un tiret, jamais du rouge. La notification du dimanche 19 h 10 ouvre la
// feuille (`?tab=journal&semaine=1`).
// =============================================================================

import { JournalIcone } from "./JournalIcone";
import { Feuille } from "./JournalFeuilles";
import { JOUR_LETTRE, libelleSemaine, nomJourLong, type BilanSemaine, type SemaineMembre } from "./journalCalculs";

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

export function CarteSemaine({ s, bilan, onOuvrir }: { s: SemaineMembre; bilan: BilanSemaine; onOuvrir: () => void }) {
  const obj = s.objectifs.proteines;
  return (
    <button type="button" className="jr-card jr-sem" onClick={onOuvrir}>
      <span className="jr-row" style={{ width: "100%" }}>
        <span className="jr-eye jr-grow"><JournalIcone nom="calendrier" taille={14} />Ta semaine · {libelleSemaine(s.lundi)}</span>
        <span className="jr-chev"><JournalIcone nom="droite" taille={18} /></span>
      </span>
      <span className="jr-j7s" aria-hidden="true">
        {s.jours.map((j, i) => {
          const ok = j.note && obj != null && j.prot >= obj;
          return (
            <span key={j.jour} className={`jr-j7${j.note ? (ok ? " ok" : " note") : ""}${j.jour > s.aujourdhui ? " avenir" : ""}`}>
              <i>{j.note ? <JournalIcone nom="coche" taille={15} /> : null}</i>
              {JOUR_LETTRE[i]}
            </span>
          );
        })}
      </span>
      <span className="jr-sem-resume">
        <b>{pluriel(bilan.joursNotes, "jour")} noté{bilan.joursNotes > 1 ? "s" : ""}</b>
        {bilan.moyenne != null ? ` · ${Math.round(bilan.moyenne)} g de protéines par jour` : ""}
        {` · l'eau ${pluriel(bilan.joursEau, "jour")} sur 7`}
      </span>
    </button>
  );
}

export function FeuilleSemaine({ s, bilan, onFermer }: { s: SemaineMembre; bilan: BilanSemaine; onFermer: () => void }) {
  const obj = s.objectifs.proteines;
  // L'échelle des barres : 100 g au moins, et toujours de quoi montrer l'objectif.
  const max = Math.max(100, obj ?? 0, ...s.jours.map((j) => Number(j.prot)));
  const H = 90;
  const hObj = obj != null ? Math.round((H * obj) / max) : null;
  const resumeGraphe = s.jours
    .map((j) => `${nomJourLong(j.jour)} ${j.note ? `${Math.round(j.prot)} g` : "rien de noté"}`)
    .join(", ");
  return (
    <Feuille titre="Ta semaine" surTitre={libelleSemaine(s.lundi)} onFermer={onFermer}>
      <div className="jr-trois">
        <div className="jr-chiffre"><b>{bilan.joursNotes}<small>/ 7</small></b><span>jours notés</span></div>
        <div className="jr-chiffre">
          <b>{bilan.moyenne != null ? Math.round(bilan.moyenne) : "–"}<small>g</small></b>
          <span>protéines par jour{obj != null ? ` · objectif ${obj}` : ""}</span>
        </div>
        <div className="jr-chiffre"><b>{bilan.joursEau}<small>/ 7</small></b><span>jours avec ton eau</span></div>
      </div>

      <div className="jr-graphe">
        <div className="jr-eye">Protéines, jour par jour</div>
        <div className="jr-barres" role="img" aria-label={`Protéines par jour : ${resumeGraphe}`}>
          {hObj != null ? <span className="jr-obj-ligne" style={{ bottom: 18 + hObj }} /> : null}
          {s.jours.map((j, i) => {
            const ok = j.note && obj != null && j.prot >= obj;
            return (
              <span key={j.jour} className={`jr-bcol${!j.note ? " vide" : ok ? " ok" : ""}`}>
                <b>{j.note ? Math.round(j.prot) : j.jour > s.aujourdhui ? "" : "–"}</b>
                <i style={{ height: j.note ? Math.max(4, Math.round((H * Number(j.prot)) / max)) : 6 }} />
                <small>{JOUR_LETTRE[i]}</small>
              </span>
            );
          })}
        </div>
        <div className="jr-tiny">{obj != null ? `En pointillés : ton objectif, ${obj} g. ` : ""}Un tiret : rien de noté ce jour-là.</div>
      </div>

      {bilan.meilleur ? (
        <div className="jr-bravo">
          <JournalIcone nom="etoile" taille={18} />
          <span>
            Ton meilleur jour : <b>{nomJourLong(bilan.meilleur.jour)}, {Math.round(bilan.meilleur.prot)} g</b> de protéines.
            {obj != null && bilan.meilleur.prot >= obj ? " Ton objectif, atteint !" : ""}
          </span>
        </div>
      ) : null}

      {bilan.aTravailler ? (
        <div className="jr-atravail">
          <JournalIcone nom="info" taille={18} />
          <span><b>À travailler :</b> {bilan.aTravailler}</span>
        </div>
      ) : bilan.joursNotes >= 3 ? (
        <div className="jr-atravail">
          <JournalIcone nom="coche" taille={18} />
          <span><b>Continue comme ça !</b> Rien à redire cette semaine.</span>
        </div>
      ) : (
        <div className="jr-atravail">
          <JournalIcone nom="crayon" taille={18} />
          <span>Note au moins 3 jours dans la semaine : ton bilan te dira quoi travailler.</span>
        </div>
      )}

      <button type="button" className="jr-cta" onClick={onFermer}>C'est parti pour la semaine</button>
    </Feuille>
  );
}
