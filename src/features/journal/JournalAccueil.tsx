// =============================================================================
// Journal nutritionnel — la carte « Mon journal » de l'accueil (maquette v8
// validée par Thomas le 21/09/2026 : « le journal doit être plutôt sur
// l'accueil à la place du poids perdu… on a du mal à le trouver »).
//
// L'accueil est l'écran qu'elles ouvrent chaque jour (le QR du club) : le
// journal s'y voit sans chercher. La carte tient en trois gestes :
//   • l'anneau des protéines et les défis du jour (toucher → l'onglet Journal) ;
//   • l'eau : un toucher = un verre de 25 cl ;
//   • « Noter mon déjeuner » : le repas de l'heure s'il est vide, sinon le
//     suivant ; tout est noté → « Mes conseils du jour » (Noaly).
// Les feuilles (ajouter, écrire à Noaly, conseils) sont celles de l'onglet
// Journal : une seule implémentation, ouverte depuis deux endroits.
// Lot 5 du comptoir (26/09) : au club, « Noter mon petit-déj » propose aussi
// « Shake F1 · tes sachets du club » (le stock n'est lu que le matin, quand le
// petit-déj reste à noter).
// =============================================================================

import "./journal.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { JournalIcone } from "./JournalIcone";
import { FeuilleAjout, FeuilleConseils, type AlerteSport } from "./JournalFeuilles";
import { chargerAliments, journalMembre, noaly, prevenirCoachNiveau, signalerXp } from "./journalApi";
import {
  COURT_CRENEAU,
  LIBELLE_GAIN,
  creneauANoter,
  defisDuJour,
  eauAtteinte,
  formatLitres,
  litres,
  niveauDe,
  protJour,
  resume,
  verresObjectif,
  type Aliment,
  type Creneau,
  type EtatJour,
} from "./journalCalculs";
import { useMaintenant } from "../bbc/agenda/useMaintenant";
import { useALaMaison } from "./useALaMaison";
import { avecLeJournal, phraseSachets, sachetsDuJour, stockMaison } from "../bbc/caisse/maison";

const CIRCONFERENCE = 2 * Math.PI * 50;
const ICONE_CRENEAU: Record<Creneau, string> = { pdj: "cafe", enc1: "pomme", dej: "couverts", enc2: "lait", din: "lune", aut: "plus" };

type Feuille = { type: "ajout"; creneau: Creneau } | { type: "conseils" } | null;

export interface JournalAccueilProps {
  token?: string;
  format: "bbc" | "std";
  coachPrenom?: string;
  /** Ouvre l'onglet Journal (l'en-tête et l'anneau de la carte). */
  onOuvrirJournal: () => void;
  /** Espace standard, objectif sport : les points d'attention du bilan (conseils). */
  alertesSport?: AlerteSport[];
}

export function JournalAccueil({ token, format, coachPrenom, onOuvrirJournal, alertesSport }: JournalAccueilProps) {
  const coach = (coachPrenom ?? "").trim().split(/\s+/)[0] || "ta coach";
  const maintenant = useMaintenant();
  const [etat, setEtat] = useState<EtatJour | null>(null);
  const [aliments, setAliments] = useState<Aliment[]>([]);
  const [occupe, setOccupe] = useState(false);
  const [feuille, setFeuille] = useState<Feuille>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [verreNeuf, setVerreNeuf] = useState<number | null>(null);
  const minuteur = useRef<number | undefined>(undefined);
  // Au club, le stock « à la maison » n'est lu que si le petit-déj reste à noter.
  const pdjANoter = !!etat && creneauANoter(etat.lignes, new Date(maintenant)) === "pdj";
  const aLaMaison = useALaMaison(token, format === "bbc" && pdjANoter);

  const dire = useCallback((txt: string, duree = 2200) => {
    setMessage(txt);
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => setMessage(null), duree);
  }, []);

  const charger = useCallback(async () => {
    if (!token) return;
    try {
      const [e, a] = await Promise.all([journalMembre.jour(token, null), chargerAliments()]);
      setEtat(e);
      setAliments(a);
    } catch {
      /* la carte reste cachée : l'onglet Journal dira ce qui ne va pas */
    }
  }, [token]);
  useEffect(() => { void charger(); }, [charger]);

  // Retour sur l'app : un pointage au club, minuit passé, une saisie ailleurs.
  useEffect(() => {
    const revoir = () => { if (document.visibilityState === "visible") void charger(); };
    document.addEventListener("visibilitychange", revoir);
    return () => document.removeEventListener("visibilitychange", revoir);
  }, [charger]);

  /** `suite` : une phrase dite même quand l'XP tombe (« Il te reste 4 sachets… »). */
  const agir = useCallback(async (appel: () => Promise<EtatJour>, confirmation: string | null, suite?: string) => {
    if (!token || !etat) return;
    const avant = niveauDe(etat.xp_total).courant.level;
    setOccupe(true);
    try {
      const e = await appel();
      setEtat(e);
      const gains = e.gains ?? [];
      if (gains.length) {
        const txt = `+${gains.reduce((s, g) => s + g.xp, 0)} XP · ${gains.map((g) => LIBELLE_GAIN[g.cle] ?? g.cle).join(" + ")}`;
        dire(suite ? `${txt}. ${suite}` : txt, suite ? 3600 : 2200);
        signalerXp();
      } else if (confirmation) {
        dire(suite ? `${confirmation}. ${suite}` : confirmation, suite ? 3600 : 2200);
      }
      // BBC : le journal fête le passage de niveau et prévient la coach
      // (en standard, l'Accueil le fait déjà à partir du signal d'XP).
      const apres = niveauDe(e.xp_total).courant;
      if (format === "bbc" && apres.level > avant) {
        window.setTimeout(() => dire(`${apres.badge} Niveau ${apres.level} : ${apres.title} !`), 2300);
        void prevenirCoachNiveau(token, apres.level);
      }
    } catch (err) {
      dire((err as Error).message);
    } finally {
      setOccupe(false);
    }
  }, [token, etat, format, dire]);

  if (!token || !etat) return null;

  const e = etat;
  const prot = protJour(e.lignes);
  const obj = e.objectifs.proteines;
  const atteint = obj != null && prot >= obj;
  const l = litres(e.verres, e.boisson_club);
  const eauOk = eauAtteinte(e.objectifs.eau_l, e.verres, e.boisson_club);
  const avecGobelet = format === "bbc" && e.boisson_club;
  const nbVerres = Math.min(avecGobelet ? 9 : 10, Math.max(verresObjectif(e.objectifs.eau_l, avecGobelet), e.verres + (eauOk ? 1 : 0)));
  const faits = defisDuJour(e).filter((d) => d.atteint).length;
  const aNoter = creneauANoter(e.lignes, new Date(maintenant));
  // Ses sachets du club (lot 5 du comptoir) : le même calcul que l'onglet Journal.
  const maisonJour = aLaMaison && e.jour === e.aujourdhui ? avecLeJournal(aLaMaison.maison, e.jour, e.lignes) : null;
  const sachets = sachetsDuJour(maisonJour, maisonJour ? stockMaison(maisonJour, e.jour) : null, e.jour, e.lignes);
  const shakeSachets = sachets ? aliments.find((a) => a.cle === sachets.aliment) ?? null : null;

  const boire = () => {
    if (occupe || e.verres >= 20) return;
    const v = e.verres + 1;
    const apres = litres(v, e.boisson_club);
    const reste = Math.max(0, Math.ceil((e.objectifs.eau_l - 0.05 - apres) / 0.25 - 1e-9));
    setEtat({ ...e, verres: v }); // tout de suite à l'écran, la base suit
    setVerreNeuf(v - 1);
    void agir(() => journalMembre.eau(token, e.jour, v, null), reste ? `+1 verre · ${formatLitres(apres)} L, encore ${reste}` : `+1 verre · ${formatLitres(apres)} L`);
  };

  return (
    <section className="jr" data-format={format} aria-label="Mon journal">
      <div className="jr-card jr-acc-carte">
        <button type="button" className="jr-acc-tete" onClick={onOuvrirJournal}>
          <span className="jr-eye jr-grow"><span className="jr-acc-point" />Mon journal</span>
          <span className="jr-niveau">{faits} / 4 défis</span>
          <span className="jr-chev"><JournalIcone nom="droite" taille={18} /></span>
        </button>
        <div className="jr-acc-corps">
          <button type="button" className="jr-acc-anneau" onClick={onOuvrirJournal}
            aria-label={obj != null ? `Protéines : ${Math.round(prot)} sur ${obj} g` : `Protéines : ${Math.round(prot)} g`}>
            <svg viewBox="0 0 120 120" width="90" height="90" aria-hidden="true">
              <circle cx="60" cy="60" r="50" fill="none" strokeWidth="12" style={{ stroke: "var(--jr-s3)" }} />
              <circle
                className="jr-arc"
                cx="60" cy="60" r="50" fill="none" strokeWidth="12" strokeLinecap="round" transform="rotate(-90 60 60)"
                style={{
                  stroke: atteint ? "var(--jr-win)" : "var(--jr-acc)",
                  strokeDasharray: CIRCONFERENCE,
                  strokeDashoffset: obj ? CIRCONFERENCE * (1 - Math.min(1, prot / obj)) : CIRCONFERENCE,
                  transition: "stroke-dashoffset 0.4s cubic-bezier(0.2, 0.7, 0.3, 1)",
                }}
              />
            </svg>
            <span className="jr-ring-t">
              <b>{Math.round(prot)}</b>
              <small>{obj != null ? `/ ${obj} g` : "g"}</small>
            </span>
          </button>
          <button type="button" className="jr-acc-eau" onClick={boire} disabled={occupe} aria-label="Boire un verre d'eau : ajouter 25 cl">
            <span className="jr-eye"><JournalIcone nom="goutte" taille={14} />Eau</span>
            <span className="jr-eau-n">{formatLitres(l)} <small>/ {formatLitres(e.objectifs.eau_l)} L</small></span>
            <span className="jr-acc-verres" aria-hidden="true">
              {avecGobelet ? <i className="gobelet plein" /> : null}
              {Array.from({ length: nbVerres }, (_, i) => (
                <i key={i} className={`${i < e.verres ? "plein" : ""}${i === verreNeuf ? " neuf" : ""}`} />
              ))}
            </span>
            <span className="jr-tiny">touche : +1 verre de 25 cl</span>
          </button>
        </div>
        {aNoter ? (
          <button type="button" className="jr-cta" disabled={occupe} onClick={() => setFeuille({ type: "ajout", creneau: aNoter })}>
            <JournalIcone nom={ICONE_CRENEAU[aNoter]} taille={18} />Noter mon {COURT_CRENEAU[aNoter]}
          </button>
        ) : (
          <button type="button" className="jr-nly-btn" onClick={() => setFeuille({ type: "conseils" })}>
            <JournalIcone nom="etincelle" taille={18} />Mes conseils du jour
          </button>
        )}
      </div>

      <div className={`jr-toast${message ? " on" : ""}`} role="status" aria-live="polite">{message}</div>

      {feuille?.type === "ajout" ? (
        <FeuilleAjout
          creneau={feuille.creneau} etat={e} aliments={aliments} occupe={occupe} onFermer={() => setFeuille(null)}
          onAjouter={(a, g, q) => { setFeuille(null); void agir(() => journalMembre.ajouter(token, e.jour, feuille.creneau, a.cle, g, q), "Noté"); }}
          onPlusUn={(l) => { setFeuille(null); void agir(() => journalMembre.modifier(token, l.id, l.aliment, l.grammes, l.quantite + 1), `${l.libelle} × ${l.quantite + 1}`); }}
          onReprendreVeille={() => { setFeuille(null); void agir(() => journalMembre.reprendreVeille(token, e.jour, feuille.creneau), "Repris d'hier"); }}
          onLireRepas={(texte) => noaly.lireRepas(token, feuille.creneau, texte)}
          onAjouterLot={(lignes) => { setFeuille(null); void agir(() => journalMembre.ajouterLot(token, e.jour, feuille.creneau, lignes), "Noté · calculé par Noaly"); }}
          onAjouterHabituel={(h) => { setFeuille(null); void agir(() => journalMembre.ajouterHabituel(token, e.jour, feuille.creneau, h), `Noté · ${resume([{ libelle: h.libelle, quantite: h.quantite }])}`); }}
          sachets={sachets && shakeSachets ? { aliment: shakeSachets, restant: sachets.f1 } : null}
          onSachets={sachets && shakeSachets ? () => {
            setFeuille(null);
            void agir(() => journalMembre.ajouter(token, e.jour, "pdj", shakeSachets.cle, null, 1), "Noté", phraseSachets(sachets.f1 - 1));
          } : undefined}
        />
      ) : null}
      {feuille?.type === "conseils" ? (
        <FeuilleConseils
          etat={e} aliments={aliments} format={format} coachPrenom={coach} alertes={format === "std" ? alertesSport : undefined}
          maintenant={new Date(maintenant)}
          chargerMot={(plan) => noaly.conseil(token, e.jour, plan.map((x) => ({ creneau: x.creneau, aliment: x.aliment.cle, grammes: x.grammes })))}
          onFermer={() => setFeuille(null)}
        />
      ) : null}
    </section>
  );
}
