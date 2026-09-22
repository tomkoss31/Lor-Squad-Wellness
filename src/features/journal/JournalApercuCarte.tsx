// =============================================================================
// JournalApercuCarte — la porte du journal sur le Co-pilote (22/09/2026).
//
// Posée sous le RDV du jour : « N le tiennent ces 7 derniers jours », les
// premières en pastilles, un toucher → /co-pilote/journal. Un seul appel,
// partagé avec l'écran (useJournalApercu). Rien ne s'affiche pour une personne
// sans cliente : la carte n'aurait rien à dire.
// =============================================================================

import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import { JournalIcone } from "./JournalIcone";
import { repartirApercu } from "./apercuJournal";
import { useJournalApercu } from "./useJournalApercu";
import "./journal.css";

const PASTILLES = 5;

export function JournalApercuCarte() {
  const { currentUser, visibleClients } = useAppContext();
  const navigate = useNavigate();
  const { donnees, erreur } = useJournalApercu(currentUser?.id);
  const tiennent = useMemo(
    () => repartirApercu(visibleClients, donnees ?? [], "").tiennent,
    [visibleClients, donnees],
  );

  if (visibleClients.length === 0) return null;

  const n = tiennent.length;
  let sous: ReactNode;
  if (donnees === null) sous = erreur ? "Voir qui tient son journal" : "Le journal arrive…";
  else if (n === 0) sous = "Personne ne l'a tenu ces 7 derniers jours";
  else sous = <><b>{n}</b> {n > 1 ? "le tiennent" : "le tient"} ces 7 derniers jours</>;

  return (
    <div className="jr" data-format="coach">
      <button type="button" className="jr-ap-carte" onClick={() => navigate("/co-pilote/journal")}>
        <span className="jr-ap-carte-ic" aria-hidden="true">
          <JournalIcone nom="salade" taille={22} />
        </span>
        <span className="jr-grow">
          <span className="jr-ap-carte-t">Le journal de tes clientes</span>
          <span className="jr-ap-carte-s">{sous}</span>
          {n > 0 && (
            <span className="jr-ap-pile" aria-hidden="true">
              {tiennent.slice(0, PASTILLES).map((l) => (
                <span key={l.client.id}>{(l.client.firstName || l.client.lastName || "?").trim().charAt(0).toUpperCase()}</span>
              ))}
              {n > PASTILLES && <span className="plus">+{n - PASTILLES}</span>}
            </span>
          )}
        </span>
        <span className="jr-ap-chev" aria-hidden="true">
          <JournalIcone nom="droite" taille={20} />
        </span>
      </button>
    </div>
  );
}
