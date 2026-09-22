// =============================================================================
// Co-pilote › Journal — « qui tient son journal ? » (22/09/2026).
//
// Maquette validée par Thomas (artifact XpS9uerQY6M627Zg9vXS99, « c'est pas
// mal comme ça, on essaie, on verra ») : toute la liste des clientes avec une
// recherche ; EN TÊTE et en couleur celles qui notent vraiment (7 derniers
// jours) ; un toucher sur un nom ouvre SON journal — le même composant que la
// fiche (JournalCoach), jamais une deuxième version (règle B9).
//
// La liste est celle de « Dossiers clients » (visibleClients) ; la base n'y
// ajoute que l'état du journal (journal_apercu_coach, SECURITY INVOKER : le RLS
// décide qui la coach voit). Adresse : /co-pilote/journal — `?client=<id>`
// ouvre son journal, et le retour du téléphone ramène à la liste.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import type { Client } from "../../types/domain";
import { JournalCoach } from "./JournalCoach";
import { JournalIcone } from "./JournalIcone";
import { joursDeLaSemaine, nomClient, repartirApercu, type LigneApercu } from "./apercuJournal";
import { useJournalApercu } from "./useJournalApercu";
import "./journal.css";

type Semaine = ReturnType<typeof joursDeLaSemaine>;

function initiale(c: Client): string {
  return (c.firstName || c.lastName || "?").trim().charAt(0).toUpperCase() || "?";
}

function joursSur7(n: number): string {
  return `${n} jour${n > 1 ? "s" : ""} sur 7`;
}

export function JournalApercuPage() {
  const { currentUser, visibleClients } = useAppContext();
  const { donnees, erreur, recharger, jour } = useJournalApercu(currentUser?.id);
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [recherche, setRecherche] = useState("");
  const clientOuvert = params.get("client");
  const isAdmin = currentUser?.role === "admin";

  const { tiennent, autres } = useMemo(
    () => repartirApercu(visibleClients, donnees ?? [], recherche),
    [visibleClients, donnees, recherche],
  );
  const semaine = useMemo(() => joursDeLaSemaine(jour), [jour]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [clientOuvert]);

  // Un admin voit toutes les clientes : on lui dit chez qui elle est suivie.
  const chez = (c: Client): string | null =>
    isAdmin && c.distributorId && c.distributorId !== currentUser?.id && c.distributorName
      ? `chez ${c.distributorName.trim().split(/\s+/)[0]}`
      : null;

  const ouvrir = (id: string) =>
    navigate({ search: `?client=${encodeURIComponent(id)}` }, { state: { depuisListe: true } });
  const fermer = () => {
    if ((location.state as { depuisListe?: boolean } | null)?.depuisListe) navigate(-1);
    else navigate({ search: "" }, { replace: true });
  };

  // ── Son journal ────────────────────────────────────────────────────────────
  if (clientOuvert) {
    const client = visibleClients.find((c) => c.id === clientOuvert);
    return (
      <div className="jr jr-ap" data-format="coach">
        <button type="button" className="jr-ap-retour" onClick={fermer}>
          <JournalIcone nom="gauche" taille={18} /> Toutes les clientes
        </button>
        {client ? (
          <>
            <header className="jr-ap-entete">
              <div className="jr-eye">Son journal</div>
              <h1 className="jr-ap-titre">{nomClient(client)}</h1>
            </header>
            <JournalCoach clientId={client.id} prenom={client.firstName || "elle"} format="coach" />
            <Link className="jr-ap-fiche" to={`/clients/${client.id}?tab=mesures`}>
              Sa fiche complète <JournalIcone nom="droite" taille={16} />
            </Link>
          </>
        ) : (
          <div className="jr-card jr-ap-vide">Cette cliente n'est pas dans ta liste.</div>
        )}
      </div>
    );
  }

  // ── La liste ───────────────────────────────────────────────────────────────
  const charge = donnees !== null;
  const q = recherche.trim();
  return (
    <div className="jr jr-ap" data-format="coach">
      <Link className="jr-ap-retour" to="/co-pilote">
        <JournalIcone nom="gauche" taille={18} /> Co-pilote
      </Link>
      <header className="jr-ap-entete">
        <div className="jr-eye">Co-pilote</div>
        <h1 className="jr-ap-titre">Journal</h1>
        <p className="jr-ap-sous">Ce que tes clientes notent dans leur espace, sur les 7 derniers jours.</p>
      </header>

      <label className="jr-ap-recherche" htmlFor="jr-ap-recherche">
        <JournalIcone nom="loupe" taille={18} />
        <input
          id="jr-ap-recherche"
          type="search"
          placeholder="Chercher une cliente"
          aria-label="Chercher une cliente"
          autoComplete="off"
          enterKeyHint="search"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
      </label>

      {!charge && erreur ? (
        <div className="jr-card jr-ap-vide" role="alert">
          <span>{erreur}</span>
          <button type="button" className="jr-ap-reessayer" onClick={() => void recharger(true)}>
            Réessayer
          </button>
        </div>
      ) : !charge ? (
        <div className="jr-card jr-ap-vide" aria-live="polite">
          Le journal arrive…
        </div>
      ) : (
        <>
          {tiennent.length > 0 && (
            <section className="jr-ap-groupe" aria-label="Elles tiennent leur journal">
              <div className="jr-ap-tete">
                <span className="jr-eye jr-ap-win">Elles le tiennent</span>
                <span className="jr-pastille jr-ap-compte">{tiennent.length}</span>
              </div>
              {tiennent.map((l) => (
                <Rang key={l.client.id} ligne={l} semaine={semaine} chez={chez(l.client)} ouvrir={ouvrir} />
              ))}
            </section>
          )}

          {!q && tiennent.length === 0 && (
            <div className="jr-card jr-ap-vide">
              Aucune cliente n'a noté ces 7 derniers jours. Le journal est tout neuf : tu peux le leur montrer au
              prochain rendez-vous.
            </div>
          )}

          {autres.length > 0 && (
            <section className="jr-ap-groupe" aria-label={q ? "Les autres clientes" : "Pas encore"}>
              <div className="jr-ap-tete">
                <span className="jr-eye">{q ? "Les autres" : "Pas encore — à relancer"}</span>
                <span className="jr-ap-n">{autres.length}</span>
              </div>
              {autres.map((l) => (
                <Rang key={l.client.id} ligne={l} semaine={semaine} chez={chez(l.client)} ouvrir={ouvrir} />
              ))}
            </section>
          )}

          {q && tiennent.length === 0 && autres.length === 0 && (
            <div className="jr-ap-vide">Personne à ce nom.</div>
          )}

          {tiennent.length > 0 && (
            <p className="jr-ap-legende">
              <span><i className="note" /> elle a noté</span>
              <span><i className="club" /> passée au club (pré-rempli)</span>
              <span><i /> rien</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Rang({
  ligne,
  semaine,
  chez,
  ouvrir,
}: {
  ligne: LigneApercu;
  semaine: Semaine;
  chez: string | null;
  ouvrir: (id: string) => void;
}) {
  const { client, apercu } = ligne;
  const nom = nomClient(client);

  if (apercu) {
    const prot = apercu.protMoy != null ? `, ${apercu.protMoy} g de protéines par jour en moyenne` : "";
    return (
      <button
        type="button"
        className="jr-ap-rang tient"
        onClick={() => ouvrir(client.id)}
        aria-label={`${nom}${chez ? `, ${chez}` : ""} : a noté ${joursSur7(apercu.joursNotes)}${prot}. Ouvrir son journal.`}
      >
        <span className="jr-ap-av" aria-hidden="true">{initiale(client)}</span>
        <span className="jr-grow" aria-hidden="true">
          <span className="jr-ap-nom">{nom}</span>
          <span className="jr-ap-sem">
            {apercu.jours.map((v, i) => (
              <span
                key={i}
                className={`jr-ap-case${v === 1 ? " note" : v === 2 ? " club" : ""}`}
                title={semaine[i]?.nom}
              >
                {v === 0 ? semaine[i]?.lettre : ""}
              </span>
            ))}
          </span>
          {chez && <span className="jr-ap-info">{chez}</span>}
        </span>
        <span className="jr-ap-fin" aria-hidden="true">
          <span className={`jr-ap-g${apercu.protMoy == null ? " vide" : ""}`}>{apercu.protMoy ?? "—"}</span>
          <span className="jr-ap-gl">g/j moy.</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      className="jr-ap-rang pas"
      onClick={() => ouvrir(client.id)}
      aria-label={`${nom}${chez ? `, ${chez}` : ""} : rien noté ces 7 jours. Ouvrir son journal.`}
    >
      <span className="jr-ap-av" aria-hidden="true">{initiale(client)}</span>
      <span className="jr-grow" aria-hidden="true">
        <span className="jr-ap-nom">{nom}</span>
        <span className="jr-ap-info">{chez ? `Rien noté ces 7 jours · ${chez}` : "Rien noté ces 7 jours"}</span>
      </span>
      <span className="jr-ap-fin" aria-hidden="true">
        <span className="jr-ap-g vide">—</span>
      </span>
    </button>
  );
}
