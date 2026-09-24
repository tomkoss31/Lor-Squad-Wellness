// =============================================================================
// NiveauPastille — « 🥉 En route · 140 » (24/09/2026).
//
// La même pastille partout où la coach regarde ses membres : liste du club,
// dossiers clients, fiche, Matin. Jetons de la maison qui l'accueille (via le
// conteneur `.jr[data-format]`), jamais de couleur en dur. Les XP sont un
// indicateur de régularité : une pastille, pas un chiffre de plus dans le journal.
// =============================================================================

import { CLIENT_XP_LEVELS } from "./actions";
import { niveauDe } from "../journal/journalCalculs";

export function titreNiveau(niveau: number): string {
  return CLIENT_XP_LEVELS.find((l) => l.level === niveau)?.title ?? "Débutant.e";
}

export function NiveauPastille({ total, niveau, xp = true, up = false, taille = "normal" }: {
  total: number;
  /** Le niveau calculé côté base ; sinon déduit du total. */
  niveau?: number;
  /** Afficher le total à côté du titre. */
  xp?: boolean;
  /** « ↑ » : montée récente. */
  up?: boolean;
  taille?: "normal" | "petit";
}) {
  const n = niveau ?? niveauDe(total).courant.level;
  const titre = titreNiveau(n);
  return (
    <span className={`jr-niv n${n}${taille === "petit" ? " petit" : ""}`} title={`${titre} · ${total} XP`}>
      <i aria-hidden="true" />
      {titre}
      {xp ? <span className="jr-niv-xp">· {total}</span> : null}
      {up ? <span className="jr-niv-up" aria-label="montée récente">↑</span> : null}
    </span>
  );
}
