// =============================================================================
// EtapesLead — « Quoi faire, dans l'ordre », la colonne de gauche de la fiche.
//
// Demandé par Thomas le 16/08 : « sur la gauche un texte tuto de quoi faire
// avec le lead qui arrive, les étapes ». Le besoin derrière : « moi je
// comprends, Mélanie moins, alors un coach nouveau c'est la quata. »
//
// Le rendu n'invente rien — tout vient de `features/crm/etapes.ts`, qui garantit
// qu'une seule étape porte le badge « à faire ». Ce fichier ne fait que la
// mettre en page.
// =============================================================================

import type { Etape } from "../../features/crm/etapes";

export function EtapesLead({ etapes }: { etapes: Etape[] }) {
  if (etapes.length === 0) return null;

  const restantes = etapes.filter((e) => e.etat !== "faite").length;

  return (
    <section style={carte} aria-label="Quoi faire, dans l'ordre">
      <h2 style={titre}>Quoi faire, dans l'ordre</h2>
      <p style={sousTitre}>
        {restantes <= 1
          ? "Un seul geste, et la fiche se range toute seule."
          : `${restantes} gestes. Le reste se cale tout seul.`}
      </p>

      <ol style={liste}>
        {etapes.map((e, i) => (
          <li key={e.cle} style={ligne(i === 0)}>
            <span style={pastille(e.etat)} aria-hidden="true">
              {e.etat === "faite" ? "✓" : numeroAffiche(etapes, i)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={texteTitre(e.etat)}>
                {e.titre}
                {e.etat === "maintenant" ? <span style={badge}>à faire</span> : null}
              </span>
              <span style={texteDetail}>{e.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Les étapes déjà faites portent une coche, pas un numéro — sinon la colonne
 * commencerait à « 3 » sur un lead avancé, et on chercherait les deux premières.
 */
function numeroAffiche(etapes: Etape[], index: number): number {
  return etapes.slice(0, index + 1).filter((e) => e.etat !== "faite").length;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const carte: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: 18,
};

const titre: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontSize: 16,
  fontWeight: 700,
  color: "var(--ls-text)",
  margin: "0 0 3px",
};

const sousTitre: React.CSSProperties = {
  margin: "0 0 13px",
  fontSize: 12.5,
  lineHeight: 1.5,
  color: "var(--ls-text-muted)",
};

const liste: React.CSSProperties = {
  listStyle: "none",
  margin: 0,
  padding: 0,
};

function ligne(premiere: boolean): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    padding: premiere ? "2px 0 11px" : "11px 0",
    borderTop: premiere ? "none" : "1px solid var(--ls-border)",
  };
}

function pastille(etat: Etape["etat"]): React.CSSProperties {
  const enCours = etat === "maintenant";
  const faite = etat === "faite";
  return {
    width: 25,
    height: 25,
    flex: "none",
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "DM Sans, sans-serif",
    background: enCours
      ? "var(--ls-teal)"
      : faite
        ? "color-mix(in srgb, var(--ls-teal) 12%, transparent)"
        : "var(--ls-surface2)",
    color: enCours ? "var(--ls-teal-contrast, #0B0D11)" : faite ? "var(--ls-teal)" : "var(--ls-text-muted)",
    border: `1px solid ${enCours || faite ? "color-mix(in srgb, var(--ls-teal) 40%, transparent)" : "var(--ls-border)"}`,
  };
}

function texteTitre(etat: Etape["etat"]): React.CSSProperties {
  return {
    display: "block",
    fontSize: 13.5,
    fontWeight: 700,
    lineHeight: 1.35,
    color: etat === "faite" ? "var(--ls-text-muted)" : "var(--ls-text)",
    textDecoration: etat === "faite" ? "line-through" : "none",
    textDecorationThickness: 1,
  };
}

const texteDetail: React.CSSProperties = {
  display: "block",
  marginTop: 3,
  fontSize: 12.5,
  lineHeight: 1.55,
  color: "var(--ls-text-muted)",
};

const badge: React.CSSProperties = {
  display: "inline-block",
  marginLeft: 7,
  padding: "1px 6px",
  borderRadius: 6,
  fontSize: 9.5,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
  color: "var(--ls-teal)",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 40%, transparent)",
};
