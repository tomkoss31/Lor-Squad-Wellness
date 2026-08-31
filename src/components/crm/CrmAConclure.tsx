// =============================================================================
// CrmAConclure — « ce rendez-vous est passé. Elle est venue, ou pas ? »
//
// LE MAILLON MANQUANT du cycle de vie (chantier validé par Thomas, 28/08).
// Mesuré en base ce jour-là : 5 rendez-vous encore « confirmed » alors que
// leur créneau était passé, 2 demandes jamais acceptées et passées aussi, et
// UN SEUL `honored` sur 31. L'app ne posait jamais la question, donc personne
// n'y répondait — et ces gens ne revenaient dans aucune file.
//
// Ce bloc se place EN HAUT du CRM et ne descend pas tant qu'il reste quelqu'un
// à solder. Il disparaît de lui-même quand tout est rangé.
//
// Il ne décide rien : la règle est dans `features/crm/aConclure.ts`, l'écriture
// est chez l'appelant. Ici, on demande et on rend la réponse.
// =============================================================================

import { useState } from "react";
import { EFFET_ISSUE, retardEnJours, type IssueRdv, type RdvConcluable } from "../../features/crm/aConclure";

export interface CibleAConclure extends RdvConcluable {
  nom: string;
  /** « présentiel », « visio », ou l'objectif — ce qui aide à se souvenir d'elle. */
  detail?: string | null;
}

interface Props {
  cibles: CibleAConclure[];
  /** Rend la réponse. L'écriture (statut du RDV + échéance de relance) est
   *  faite par l'appelant, qui a les services sous la main. */
  onRepondre: (cible: CibleAConclure, issue: IssueRdv) => void | Promise<void>;
  maintenant: Date;
}

const JOUR_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "Europe/Paris",
  weekday: "long",
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

/** « il y a 3 jours » — un chiffre, jamais « récemment ». */
function retardTexte(cible: CibleAConclure, maintenant: Date): string {
  const j = retardEnJours(cible, maintenant);
  if (j === 0) return "aujourd'hui";
  if (j === 1) return "hier";
  return `il y a ${j} jours`;
}

export function CrmAConclure({ cibles, onRepondre, maintenant }: Props) {
  // On ne verrouille QUE la ligne qu'on est en train de solder : Thomas peut en
  // enchaîner plusieurs, et bloquer tout le bloc à chaque clic donnerait
  // l'impression que l'app a planté.
  const [enCours, setEnCours] = useState<string | null>(null);

  if (cibles.length === 0) return null;

  const repondre = async (cible: CibleAConclure, issue: IssueRdv) => {
    if (enCours) return;
    setEnCours(cible.id);
    try {
      await onRepondre(cible, issue);
    } finally {
      setEnCours(null);
    }
  };

  return (
    <section style={bloc} aria-label="Rendez-vous à conclure">
      <div style={enTete}>
        <span style={pastille} aria-hidden="true" />
        <span style={titre}>
          {cibles.length === 1
            ? "1 rendez-vous attend ta réponse"
            : `${cibles.length} rendez-vous attendent ta réponse`}
        </span>
      </div>
      <p style={sousTitre}>
        Sans réponse, la personne ne revient dans aucune liste. Un tap suffit.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
        {cibles.map((c) => {
          const occupe = enCours === c.id;
          return (
            <div key={c.id} style={carte(occupe)}>
              <div style={ligneNom}>
                <span style={nom}>{c.nom}</span>
                <span style={quand}>passé {retardTexte(c, maintenant)}</span>
              </div>
              <p style={meta}>
                {JOUR_HEURE.format(new Date(c.slotStart))}
                {c.detail ? ` · ${c.detail}` : ""}
              </p>

              <div style={actions}>
                <button
                  type="button"
                  disabled={occupe}
                  onClick={() => void repondre(c, "venue_demarre")}
                  style={{ ...btn, ...btnVictoire }}
                >
                  {EFFET_ISSUE.venue_demarre.libelle}
                </button>
                <button
                  type="button"
                  disabled={occupe}
                  onClick={() => void repondre(c, "venue_pas_demarre")}
                  style={btn}
                >
                  {EFFET_ISSUE.venue_pas_demarre.libelle}
                </button>
                <button
                  type="button"
                  disabled={occupe}
                  onClick={() => void repondre(c, "pas_venue")}
                  style={{ ...btn, ...btnLapin }}
                >
                  {EFFET_ISSUE.pas_venue.libelle}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// ─── Styles (tokens --ls-* uniquement) ───────────────────────────────────────

const bloc: React.CSSProperties = {
  background: "color-mix(in srgb, var(--ls-coral) 8%, var(--ls-surface))",
  border: "1px solid color-mix(in srgb, var(--ls-coral) 34%, transparent)",
  borderRadius: 18,
  padding: "16px 16px 18px",
  margin: "14px 0 0",
};

const enTete: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9 };

const pastille: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  background: "var(--ls-coral)",
  flex: "none",
};

const titre: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 800,
  fontSize: 16,
  color: "var(--ls-text)",
  letterSpacing: "-0.01em",
};

const sousTitre: React.CSSProperties = {
  margin: "6px 0 0",
  fontSize: 13.5,
  color: "var(--ls-text-muted)",
};

const carte = (occupe: boolean): React.CSSProperties => ({
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 14,
  padding: "12px 13px",
  opacity: occupe ? 0.55 : 1,
  transition: "opacity .15s ease",
});

const ligneNom: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 9,
  flexWrap: "wrap",
};

const nom: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--ls-text)",
};

const quand: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 11.5,
  color: "var(--ls-coral)",
};

const meta: React.CSSProperties = {
  margin: "4px 0 0",
  fontSize: 12.5,
  color: "var(--ls-text-muted)",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
};

const actions: React.CSSProperties = {
  display: "flex",
  gap: 7,
  marginTop: 11,
  flexWrap: "wrap",
};

const btn: React.CSSProperties = {
  flex: "1 1 auto",
  minWidth: 118,
  minHeight: 44,
  borderRadius: 999,
  border: "1px solid var(--ls-border2)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: 13.5,
  cursor: "pointer",
  padding: "0 12px",
};

// Le lime ne colore QUE la victoire — la charte le réserve à ça.
const btnVictoire: React.CSSProperties = {
  background: "var(--ls-lime)",
  color: "#132015",
  borderColor: "transparent",
  fontWeight: 700,
};

const btnLapin: React.CSSProperties = {
  borderColor: "color-mix(in srgb, var(--ls-coral) 45%, transparent)",
  color: "var(--ls-coral)",
};
