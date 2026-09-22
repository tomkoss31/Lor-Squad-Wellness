// =============================================================================
// « Mon journal » dans l'app coach (22/09/2026, maquette GpUrQc511q3sewMXJw96BY,
// écran 1 validé par Thomas : « j'ai hâte de voir et pouvoir noter ça »).
//
// Une seule version du journal : c'est `JournalMembre`, celui des membres, ouvert
// avec le jeton de SA fiche membre. La première fois, la coach dit quelle fiche
// est la sienne (même adresse que son compte, ou une de ses membres à son
// prénom) ; sans fiche, elle fait son évaluation, comme une membre — le journal
// a besoin du poids d'un vrai bilan pesé.
// =============================================================================

import "./journal.css";
import { useEffect, useState } from "react";
import { JournalIcone } from "./JournalIcone";
import { JournalMembre } from "./JournalMembre";
import { journalCoachPerso, type FicheCoach } from "./journalApi";

export function MonJournalCoach({ token, pret, onRelie, onDelie, onEvaluation, onRetour }: {
  token: string | null;
  pret: boolean;
  onRelie: (token: string) => void;
  onDelie: () => Promise<void>;
  onEvaluation: () => void;
  onRetour: () => void;
}) {
  return (
    <div className="jr" data-format="bbc" style={{ maxWidth: 760 }}>
      <button type="button" className="jr-lien jr-retour" onClick={onRetour}>
        <JournalIcone nom="gauche" taille={18} />Le matin
      </button>
      {!pret ? (
        <div className="jr-card"><div className="jr-vide">Un instant…</div></div>
      ) : token ? (
        <>
          <JournalMembre token={token} format="bbc" />
          <ChangerDeFiche onDelie={onDelie} />
        </>
      ) : (
        <PremiereFois onRelie={onRelie} onEvaluation={onEvaluation} />
      )}
    </div>
  );
}

function PremiereFois({ onRelie, onEvaluation }: { onRelie: (token: string) => void; onEvaluation: () => void }) {
  const [fiches, setFiches] = useState<FicheCoach[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState<string | null>(null);

  useEffect(() => {
    let fini = false;
    journalCoachPerso.mesFiches()
      .then((f) => { if (!fini) setFiches(f ?? []); })
      .catch((e: Error) => { if (!fini) { setErreur(e.message); setFiches([]); } });
    return () => { fini = true; };
  }, []);

  const relier = async (f: FicheCoach) => {
    setOccupe(f.client_id);
    setErreur(null);
    try {
      onRelie(await journalCoachPerso.relier(f.client_id));
    } catch (e) {
      setErreur((e as Error).message);
      setOccupe(null);
    }
  };

  return (
    <section className="jr-card jr-perso" aria-label="Ton journal perso">
      <div className="jr-eye"><JournalIcone nom="crayon" taille={14} />Ton journal perso</div>
      <p className="jr-perso-t">Ton journal de membre, dans ton app de coach. La première fois seulement : dis-nous quelle fiche est la tienne.</p>

      {fiches === null ? <div className="jr-vide">On cherche ta fiche…</div> : null}
      {erreur ? <div className="jr-vide" role="alert">{erreur}</div> : null}

      {fiches?.length ? (
        <>
          <div className="jr-sec">{fiches.length > 1 ? "Laquelle est la tienne ?" : "C'est bien ta fiche ?"}</div>
          {fiches.map((f) => (
            <div key={f.client_id} className="jr-fiche">
              <span className="jr-fiche-av" aria-hidden="true">{(f.prenom.trim()[0] ?? "?").toUpperCase()}{f.initiale}</span>
              <span className="jr-grow">
                <b>{f.prenom}{f.initiale ? ` ${f.initiale}.` : ""}</b>
                <small>
                  {f.raison === "mail" ? "même adresse que ton compte" : "dans tes membres"}
                  {f.poids ? ` · dernier bilan pesé : ${String(f.poids).replace(".", ",")} kg` : " · pas encore de bilan pesé"}
                </small>
              </span>
              <button type="button" className="jr-cta" disabled={occupe !== null} onClick={() => void relier(f)}>
                {occupe === f.client_id ? "…" : "C'est moi"}
              </button>
            </div>
          ))}
        </>
      ) : null}

      {fiches !== null ? (
        <>
          <div className="jr-sec">{fiches.length ? "Aucune n'est à toi ?" : "Pas encore de fiche à ton nom"}</div>
          <p className="jr-perso-t">Fais ton évaluation sur toi, comme pour une membre : ton poids donne ton objectif de protéines, et ton journal s'ouvre ici.</p>
          <button type="button" className="jr-lien" onClick={onEvaluation}>Faire mon évaluation</button>
        </>
      ) : null}

      <div className="jr-tiny">Qui voit ton journal : toi, et la coach qui suit ta fiche. Personne d'autre.</div>
    </section>
  );
}

function ChangerDeFiche({ onDelie }: { onDelie: () => Promise<void> }) {
  const [sur, setSur] = useState(false);
  const [occupe, setOccupe] = useState(false);
  if (!sur) {
    return (
      <button type="button" className="jr-lien" style={{ alignSelf: "center" }} onClick={() => setSur(true)}>
        Ce n'est pas ta fiche ? Changer
      </button>
    );
  }
  return (
    <div className="jr-card jr-perso">
      <p className="jr-perso-t">Ton journal ne sera plus relié à cette fiche. Tu pourras choisir la bonne juste après : rien de ce qui est noté n'est effacé.</p>
      <div className="jr-row">
        <button type="button" className="jr-lien jr-grow" onClick={() => setSur(false)}>Garder</button>
        <button type="button" className="jr-danger jr-grow" disabled={occupe} onClick={() => { setOccupe(true); void onDelie().finally(() => setOccupe(false)); }}>
          {occupe ? "…" : "Changer de fiche"}
        </button>
      </div>
    </div>
  );
}
