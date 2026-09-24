// =============================================================================
// XpNiveauxCarte — « les niveaux de tes membres » (24/09/2026, maquette v2).
//
// Le Matin (club) et le Co-pilote (standard) : qui vient de monter cette
// semaine, qui n'a rien gagné depuis 14 jours. Un seul appel (useXpApercu),
// partagé avec la liste et la fiche. Rien ne s'affiche sans personne.
// Les XP restent un indicateur de régularité : ce bloc ne dit ni protéines,
// ni eau, ni kcal.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { isDeadLifecycle } from "../../types/domain";
import { NiveauPastille, titreNiveau } from "./NiveauPastille";
import { monteRecemment, silencieuse, useXpApercu } from "./useXpApercu";
import "../journal/journal.css";

export interface PersonneXp {
  id: string;
  nom: string;
}

export function XpNiveauxCarte({ userId, personnes, format, onOuvrir, onTous }: {
  userId: string | null | undefined;
  personnes: PersonneXp[];
  format: "bbc" | "coach";
  onOuvrir: (id: string) => void;
  onTous?: () => void;
}) {
  const { donnees, jour } = useXpApercu(userId);
  const { montees, silencieuses, actives } = useMemo(() => {
    const montees: Array<PersonneXp & { niveau: number; total: number }> = [];
    const silencieuses: PersonneXp[] = [];
    let actives = 0;
    for (const p of personnes) {
      const x = donnees?.get(p.id);
      if (!x) continue;
      if (x.gains7j > 0) actives++;
      if (monteRecemment(x, jour)) montees.push({ ...p, niveau: x.niveau, total: x.total });
      else if (silencieuse(x, jour)) silencieuses.push(p);
    }
    montees.sort((a, b) => b.niveau - a.niveau);
    return { montees, silencieuses, actives };
  }, [personnes, donnees, jour]);

  if (!personnes.length || donnees === null) return null;
  if (!montees.length && !silencieuses.length) return null;

  const initiale = (nom: string) => (nom.trim().charAt(0) || "?").toUpperCase();
  const prenom = (nom: string) => nom.trim().split(/\s+/)[0] || nom;

  return (
    <div className="jr" data-format={format}>
      <section className="jr-card" aria-label="Les niveaux de tes membres">
        <div className="jr-row">
          <div className="jr-eye jr-grow">Les niveaux de tes {format === "bbc" ? "membres" : "clientes"}</div>
          <span className="jr-eye" style={{ color: "var(--jr-acc-tx)" }}>{actives} active{actives > 1 ? "s" : ""} · 7 j</span>
        </div>
        {montees.length ? (
          <>
            <div className="jr-tiny" style={{ marginTop: 8 }}>Ont monté cette semaine</div>
            <div className="jr-xp-pile">
              {montees.map((p) => (
                <button key={p.id} type="button" onClick={() => onOuvrir(p.id)}>
                  <i>{initiale(p.nom)}</i>
                  {prenom(p.nom)} · {titreNiveau(p.niveau)}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {silencieuses.length ? (
          <>
            <div className="jr-tiny" style={{ marginTop: 10 }}>Rien gagné depuis 14 jours</div>
            <div className="jr-xp-pile">
              {silencieuses.slice(0, 6).map((p) => (
                <button key={p.id} type="button" onClick={() => onOuvrir(p.id)}>
                  <i>{initiale(p.nom)}</i>
                  {prenom(p.nom)}
                </button>
              ))}
              {silencieuses.length > 6 ? <button type="button" onClick={onTous}>+{silencieuses.length - 6}</button> : null}
            </div>
          </>
        ) : null}
        {onTous ? (
          <button type="button" className="jr-lien" onClick={onTous}>Voir tout le monde ›</button>
        ) : null}
      </section>
    </div>
  );
}

/** Le Co-pilote (standard) : toutes ses clientes, un toucher → sa fiche. */
export function XpNiveauxCoPilote() {
  const { currentUser, visibleClients } = useAppContext();
  const navigate = useNavigate();
  // Seulement les clientes vivantes : une cliente perdue ou arrêtée n'a rien à gagner,
  // elle ne « stagne » pas — sinon la liste « rien gagné depuis 14 jours » disait tout le monde.
  const personnes = useMemo(
    () => visibleClients
      .filter((c) => !isDeadLifecycle(c.lifecycleStatus ?? "active"))
      .map((c) => ({ id: c.id, nom: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() })),
    [visibleClients],
  );
  return (
    <XpNiveauxCarte userId={currentUser?.id} personnes={personnes} format="coach" onOuvrir={(id) => navigate(`/clients/${id}`)} onTous={() => navigate("/clients")} />
  );
}

/** Pour une fiche : la pastille + « encore N avant … », en une ligne. */
export function NiveauLigne({ total, niveau, up }: { total: number; niveau: number; up?: boolean }) {
  const SEUILS = [0, 100, 300, 700, 1500];
  const suivant = SEUILS.find((s) => s > total) ?? null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <NiveauPastille total={total} niveau={niveau} up={up} />
      {suivant != null ? (
        <span className="jr-tiny" style={{ marginTop: 0 }}>encore {suivant - total} avant {titreNiveau(SEUILS.indexOf(suivant) + 1)}</span>
      ) : null}
    </span>
  );
}
