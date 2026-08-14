// =============================================================================
// FeuilleQualification — « Et alors ? », posée là où on vient d'agir.
//
// Elle s'ouvre au RETOUR du message, pas dans un menu déroulant à trois écrans
// de là. C'est tout le point : jusqu'ici, taper « Lui écrire » marquait
// « traité » et passait au suivant — on ne demandait JAMAIS ce qui s'était
// passé, donc la personne disparaissait des radars.
//
// Six réponses, un tap, et la suite est calée. Chaque bouton ANNONCE ce qui va
// se passer (« Revient demain ») : aucun tap ne doit surprendre.
// =============================================================================

import { REPONSES, type Reponse } from "./qualification";

export interface FeuilleQualificationProps {
  /** Prénom, pour que la confirmation parle de quelqu'un et pas d'« un lead ». */
  prenom: string;
  onChoisir: (reponse: Reponse) => void;
  /** Fermer sans qualifier — on ne force jamais la main. */
  onIgnorer: () => void;
}

export function FeuilleQualification({ prenom, onChoisir, onIgnorer }: FeuilleQualificationProps) {
  return (
    <section aria-label="Qualifier ce contact" style={feuille}>
      <h3 style={titre}>Et alors ?</h3>
      <p style={sous}>
        Un tap, et la suite est déjà calée. Tu n'as aucune date à saisir.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {REPONSES.map((r) => (
          <button key={r.cle} type="button" onClick={() => onChoisir(r)} style={choix}>
            <span aria-hidden="true" style={{ ...pastille, background: r.teinte }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={choixTitre}>{r.titre}</span>
              <span style={choixQuand}>{r.quand}</span>
            </span>
            <span aria-hidden="true" style={chevron}>›</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onIgnorer} style={ignorer}>
        Plus tard — garder {prenom.trim() || "cette personne"} en tête de file
      </button>
    </section>
  );
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const feuille: React.CSSProperties = {
  marginTop: 14,
  padding: "18px 17px",
  borderRadius: 20,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border2)",
};

const titre: React.CSSProperties = {
  margin: "0 0 4px",
  fontFamily: "'Anton', sans-serif",
  fontWeight: 400,
  fontSize: 26,
  lineHeight: 1.05,
  textTransform: "uppercase",
  letterSpacing: ".01em",
  color: "var(--ls-text)",
};

const sous: React.CSSProperties = {
  margin: "0 0 15px",
  fontSize: 13.5,
  color: "var(--ls-text-muted)",
  lineHeight: 1.5,
};

const choix: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  width: "100%",
  // 52 px : c'est un choix qu'on fait au pouce, souvent en marchant.
  minHeight: 52,
  padding: "10px 14px",
  borderRadius: 14,
  textAlign: "left",
  cursor: "pointer",
  fontFamily: "inherit",
  background: "var(--ls-surface2)",
  border: "1px solid var(--ls-border)",
};

const pastille: React.CSSProperties = {
  width: 9,
  height: 9,
  borderRadius: "50%",
  flex: "none",
};

const choixTitre: React.CSSProperties = {
  display: "block",
  fontSize: 14.5,
  fontWeight: 700,
  color: "var(--ls-text)",
};

const choixQuand: React.CSSProperties = {
  display: "block",
  marginTop: 2,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "var(--ls-text-hint)",
};

const chevron: React.CSSProperties = { flex: "none", fontSize: 16, color: "var(--ls-text-hint)" };

const ignorer: React.CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: 44,
  marginTop: 12,
  padding: "10px 12px",
  borderRadius: 12,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  background: "transparent",
  border: "1px solid var(--ls-border)",
};
