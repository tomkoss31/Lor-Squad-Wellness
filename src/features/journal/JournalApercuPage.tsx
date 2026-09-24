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
import { chiffresApercu, etatBarre, joursDeLaSemaine, nomClient, repartirApercu, resumeApercu, type LigneApercu, type Ton, type TonLigne } from "./apercuJournal";
import { useXpApercu } from "../client-xp/useXpApercu";
import { NiveauPastille } from "../client-xp/NiveauPastille";
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
  // Les filtres de la liste (24/09) : par la couleur de chacune.
  const [filtre, setFiltre] = useState<"toutes" | Ton>("toutes");
  const xp = useXpApercu(currentUser?.id);
  const clientOuvert = params.get("client");
  const isAdmin = currentUser?.role === "admin";

  const { tiennent, autres } = useMemo(
    () => repartirApercu(visibleClients, donnees ?? [], recherche),
    [visibleClients, donnees, recherche],
  );
  const semaine = useMemo(() => joursDeLaSemaine(jour), [jour]);
  const chiffres = useMemo(() => chiffresApercu(donnees ?? []), [donnees]);
  const tons = useMemo(() => {
    const m = new Map<string, TonLigne>();
    for (const l of tiennent) if (l.apercu) m.set(l.client.id, resumeApercu(l.apercu, jour).ton);
    return m;
  }, [tiennent, jour]);
  const compte = (t: Ton) => [...tons.values()].filter((x) => x === t).length;
  const visibles = filtre === "toutes" ? tiennent : tiennent.filter((l) => tons.get(l.client.id) === filtre);

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
            {/* Son nom, son niveau et « chez qui » : dans l'en-tête coloré du journal (24/09). */}
            <JournalCoach
              clientId={client.id}
              prenom={client.firstName || "elle"}
              format="coach"
              titre={nomClient(client)}
              chez={chez(client)}
              niveau={xp.donnees?.get(client.id)}
            />
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

      {charge && chiffres.tiennent > 0 && (
        <div className="jr-ap-kpis" role="group" aria-label="La semaine en trois chiffres">
          <div className="jr-ap-kpi k-acc"><b>{chiffres.tiennent}</b><small>le tiennent · 7 jours</small></div>
          <div className="jr-ap-kpi k-win"><b>{chiffres.protPct != null ? `${chiffres.protPct} %` : "—"}</b><small>des jours à l'objectif protéines</small></div>
          <div className="jr-ap-kpi k-eau"><b>{chiffres.eauPct != null ? `${chiffres.eauPct} %` : "—"}</b><small>des jours à l'objectif eau</small></div>
        </div>
      )}

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
              <div className="jr-ap-filtres" role="group" aria-label="Filtrer">
                {([
                  ["toutes", `Toutes · ${tiennent.length}`],
                  ["ok", `À féliciter · ${compte("ok")}`],
                  ["mid", `Sous l'objectif · ${compte("mid")}`],
                  ["bas", `Décroche · ${compte("bas")}`],
                ] as Array<["toutes" | Ton, string]>).map(([k, t]) => (
                  <button key={k} type="button" className={`jr-ap-filtre f-${k}${filtre === k ? " on" : ""}`} aria-pressed={filtre === k} onClick={() => setFiltre(k)}>{t}</button>
                ))}
              </div>
              {visibles.map((l) => (
                <Rang key={l.client.id} ligne={l} semaine={semaine} chez={chez(l.client)} ouvrir={ouvrir} jour={jour}
                  niveau={xp.donnees?.get(l.client.id)} />
              ))}
              {visibles.length === 0 && <div className="jr-ap-vide">Personne dans ce filtre cette semaine.</div>}
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
              <span><i className="b-ok" /> protéines atteintes</span>
              <span><i className="b-mid" /> à moitié</span>
              <span><i className="b-bas" /> décroche</span>
              <span><i className="b-club" /> passée au club</span>
              <span><i className="b-vide" /> rien noté</span>
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
  jour,
  niveau,
}: {
  ligne: LigneApercu;
  semaine: Semaine;
  chez: string | null;
  ouvrir: (id: string) => void;
  jour?: string;
  niveau?: { total: number; niveau: number };
}) {
  const { client, apercu } = ligne;
  const nom = nomClient(client);

  if (apercu && jour) {
    const r = resumeApercu(apercu, jour);
    const quand =
      r.silence >= 3 ? `rien depuis ${r.silence} jours`
        : r.silence === 0 ? "noté aujourd'hui"
          : r.silence === 1 ? "noté hier"
            : `noté il y a ${r.silence} jours`;
    const pct = r.protPct != null ? `${r.protPct} % de l'objectif` : null;
    return (
      <button
        type="button"
        className={`jr-ap-rang tient t-${r.ton}`}
        onClick={() => ouvrir(client.id)}
        aria-label={`${nom}${chez ? `, ${chez}` : ""} : a noté ${joursSur7(apercu.joursNotes)}${pct ? `, protéines à ${pct}` : ""}. Ouvrir son journal.`}
      >
        <span className={`jr-ap-anneau t-${r.ton}`} style={{ ["--p" as string]: Math.round((apercu.joursNotes / 7) * 100) }} aria-hidden="true">
          <span>{apercu.joursNotes}/7</span>
        </span>
        <span className="jr-grow" aria-hidden="true">
          {/* Le nom se raccourcit, la pastille reste entière (24/09 : « Joëlle F. … » la coupait). */}
          <span className="jr-ap-nom-l">
            <span className="jr-ap-nom">{nom}</span>
            {niveau && niveau.niveau >= 2 ? <NiveauPastille total={niveau.total} niveau={niveau.niveau} xp={false} taille="petit" /> : null}
          </span>
          <span className="jr-ap-info">{chez ? `${chez} · ${quand}` : quand}</span>
          <span className="jr-ap-barres">
            {apercu.jours.map((_, i) => {
              const e = etatBarre(apercu, i);
              const h = e === "vide" ? 4 : Math.max(6, Math.min(24, apercu.objProt ? ((apercu.protJours[i] ?? 0) / apercu.objProt) * 22 : 14));
              return <i key={i} className={`b-${e}`} style={{ height: h }} title={semaine[i]?.nom} />;
            })}
          </span>
        </span>
        <span className="jr-ap-fin" aria-hidden="true">
          <span className={`jr-ap-g${r.protMoy == null ? " vide" : ""}`}>{r.protMoy ?? "—"}<small> g/j</small></span>
          {pct ? <span className={`jr-ap-pct t-${r.ton}`}>{pct}</span> : <span className="jr-ap-gl">sans bilan pesé</span>}
          {r.eauMoy != null ? <span className="jr-ap-eau"><JournalIcone nom="goutte" taille={12} />{String(r.eauMoy).replace(".", ",")} L · {r.eauJoursOk} j sur 7</span> : null}
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
