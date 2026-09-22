// =============================================================================
// Le rond « T » de l'en-tête de l'app coach (22/09/2026, maquette validée) :
// SON journal à un toucher de n'importe quel écran. L'anneau montre ses
// protéines du jour ; une pastille rose tant que sa fiche n'est pas reliée.
// =============================================================================

import "./journal.css";
import { useEffect, useState } from "react";
import { journalMembre } from "./journalApi";
import { protJour } from "./journalCalculs";

const RAYON = 19;
const CIRCONFERENCE = 2 * Math.PI * RAYON;

export function RondMonJournal({ token, prenom, cle, onOuvrir }: {
  token: string | null;
  prenom: string;
  /** Change à chaque écran : l'anneau se relit en revenant de « Mon journal ». */
  cle?: string;
  onOuvrir: () => void;
}) {
  const [prot, setProt] = useState<{ p: number; obj: number | null } | null>(null);

  useEffect(() => {
    if (!token) {
      setProt(null);
      return;
    }
    let fini = false;
    const lire = () => {
      journalMembre.jour(token, null)
        .then((e) => { if (!fini) setProt({ p: protJour(e.lignes), obj: e.objectifs.proteines }); })
        .catch(() => { /* l'anneau reste vide : le rond ouvre quand même le journal */ });
    };
    lire();
    const revoir = () => { if (document.visibilityState === "visible") lire(); };
    document.addEventListener("visibilitychange", revoir);
    window.addEventListener("ls:client-xp:refresh", lire);
    return () => {
      fini = true;
      document.removeEventListener("visibilitychange", revoir);
      window.removeEventListener("ls:client-xp:refresh", lire);
    };
  }, [token, cle]);

  const part = prot?.obj ? Math.min(1, prot.p / prot.obj) : 0;
  const libelle = !token
    ? "Mon journal : à ouvrir"
    : prot
      ? `Mon journal : ${Math.round(prot.p)} g de protéines${prot.obj ? ` sur ${prot.obj}` : ""}`
      : "Mon journal";

  return (
    <button type="button" className="jr jr-moi bbc-pression" data-format="bbc" onClick={onOuvrir} aria-label={libelle} title="Mon journal">
      <svg viewBox="0 0 44 44" width="44" height="44" aria-hidden="true">
        <circle cx="22" cy="22" r={RAYON} fill="none" strokeWidth="4" style={{ stroke: "var(--jr-s3)" }} />
        {part > 0 ? (
          <circle
            cx="22" cy="22" r={RAYON} fill="none" strokeWidth="4" strokeLinecap="round" transform="rotate(-90 22 22)"
            style={{ stroke: "var(--jr-acc)", strokeDasharray: CIRCONFERENCE, strokeDashoffset: CIRCONFERENCE * (1 - part), transition: "stroke-dashoffset 0.4s" }}
          />
        ) : null}
      </svg>
      <b>{(prenom.trim()[0] ?? "?").toUpperCase()}</b>
      {!token ? <i className="jr-moi-neuf" aria-hidden="true" /> : null}
    </button>
  );
}
