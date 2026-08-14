// =============================================================================
// BandeauDemarrage — l'accès au démarrage, réduit à une barre.
//
// Thomas : « pour démarrage je vois bien, comment faire autrement plus
// minimaliste à l'écran, là ça nous prend de la place surtout sur mobile iOS ?
// juste une barre simple avec un déroulant si on clique dessus qui rouvre
// salle ops et formation ? »
//
// MESURÉ AVANT : 187 px de haut, posés AU-DESSUS de la zone 1. Sur un iPhone
// (844 px), c'est près d'un quart de l'écran consommé avant d'arriver à ce qui
// compte vraiment. Deux boutons empilés, un sous-titre, et une jauge à sept
// segments — pour une chose qu'on ne fait pas tous les jours.
//
// APRÈS : une barre repliée. La jauge n'est plus un bloc, elle EST le liseré du
// bas de la barre — l'information reste lisible d'un coup d'œil sans coûter une
// ligne. Un tap déroule les deux vraies portes : le parcours et la formation.
//
// ── POURQUOI REPLIÉ PAR DÉFAUT, TOUJOURS ───────────────────────────────────
//
// On ne mémorise PAS l'état ouvert. Un bloc qu'on rouvre chaque matin
// redeviendrait ce qu'il était : un meuble permanent qu'on cesse de voir. Dix
// coachs sur onze étaient gelés à l'étape 1 alors que le bloc s'affichait tous
// les jours en entier. La taille n'était pas le problème — la permanence, si.
// =============================================================================

import { useState } from "react";

export interface BandeauDemarrageProps {
  /** Étape courante (1-based) et total, pour le « 6 / 7 » et la jauge. */
  etape: number;
  total: number;
  /** L'état de chaque étape, dans l'ordre — pilote les segments du liseré. */
  etats: ("done" | "active" | "todo" | "locked")[];
  /** `users.activated_at` : le seul signal fiable, cf. EcranDuJourBranche. */
  activated: boolean;
  /** Libellé de la prochaine étape, montré une fois déroulé. */
  prochaineEtape: string;
  /** Rouvre le cockpit LIVE (pas la maquette /salle-ops). */
  onOuvrirParcours: () => void;
  onOuvrirFormation: () => void;
}

export function BandeauDemarrage({
  etape, total, etats, activated, prochaineEtape, onOuvrirParcours, onOuvrirFormation,
}: BandeauDemarrageProps) {
  const [ouvert, setOuvert] = useState(false);

  const titre = activated ? "Ton démarrage" : "Reprendre mon démarrage";

  return (
    <div style={cadre}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-controls="bandeau-demarrage-contenu"
        style={barre}
      >
        <span aria-hidden="true" style={{ fontSize: 17, flex: "none" }}>🎓</span>
        <span style={libelle}>{titre}</span>
        <span style={compteur}>
          {etape} / {total}
        </span>
        <span
          aria-hidden="true"
          style={{ ...chevron, transform: ouvert ? "rotate(90deg)" : "none" }}
        >
          ›
        </span>
      </button>

      {/* La jauge EST le liseré du bas : l'avancement reste lisible d'un coup
          d'œil sans occuper une ligne à lui seul. */}
      <span style={jauge} aria-hidden="true">
        {etats.map((etat, i) => (
          <span
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 999,
              background:
                etat === "done" ? "var(--ls-teal)"
                  : etat === "active" ? "var(--ls-lime)"
                    : "var(--ls-border)",
            }}
          />
        ))}
      </span>

      {ouvert ? (
        <div id="bandeau-demarrage-contenu" style={contenu}>
          <button type="button" onClick={onOuvrirParcours} style={porte}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={porteTitre}>Mon parcours</span>
              <span style={porteSous}>Prochaine étape : {prochaineEtape}</span>
            </span>
            <span aria-hidden="true" style={fleche}>→</span>
          </button>
          <button type="button" onClick={onOuvrirFormation} style={{ ...porte, ...porteSuivante }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={porteTitre}>Ma formation Herbalife</span>
              <span style={porteSous}>Apprendre en avançant</span>
            </span>
            <span aria-hidden="true" style={fleche}>→</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const cadre: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-teal) 6%, var(--ls-surface))",
  border: "0.5px solid color-mix(in srgb, var(--ls-teal) 32%, var(--ls-border))",
  borderRadius: 14,
  padding: "0 14px 9px",
  overflow: "hidden",
};

const barre: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  // 44 px de haut : la cible tactile minimale, et rien de plus.
  minHeight: 44,
  padding: "0",
  textAlign: "left",
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontFamily: "inherit",
};

const libelle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 13.5,
  fontWeight: 700,
  color: "var(--ls-text)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const compteur: React.CSSProperties = {
  flex: "none",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11.5,
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
};

const chevron: React.CSSProperties = {
  flex: "none",
  fontSize: 17,
  lineHeight: 1,
  color: "var(--ls-teal)",
  transition: "transform .18s ease",
};

const jauge: React.CSSProperties = { display: "flex", gap: 3 };

const contenu: React.CSSProperties = { marginTop: 11 };

const porte: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  width: "100%",
  minHeight: 44,
  textAlign: "left",
  background: "transparent",
  border: "none",
  padding: "8px 0",
  cursor: "pointer",
  fontFamily: "inherit",
};

const porteSuivante: React.CSSProperties = {
  borderTop: "1px solid color-mix(in srgb, var(--ls-teal) 18%, var(--ls-border))",
};

const porteTitre: React.CSSProperties = {
  display: "block",
  fontSize: 13.5,
  fontWeight: 600,
  color: "var(--ls-text)",
};

const porteSous: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "var(--ls-text-muted)",
  marginTop: 2,
};

const fleche: React.CSSProperties = {
  flex: "none",
  color: "var(--ls-teal)",
  fontWeight: 700,
};
