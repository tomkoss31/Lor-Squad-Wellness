// =============================================================================
// EcranDuJour — un seul écran qui descend.
//
// Thomas, en découvrant les trois maquettes concurrentes : « je pensais que
// c'était trois écrans totalement différents et que c'était un seul co-pilote…
// une seule personne, ensuite ta journée, puis les gens, suivant les besoins ».
//
// Il avait raison : ce n'étaient pas trois produits, mais trois ZONES du même.
//
//   1. UNE SEULE PERSONNE   (ZoneUne — jamais deux, cf. ceQuiCompte)
//   2. TA JOURNÉE           le fil du temps : maintenant / le prochain / après
//   3. TES CLIENTS          la file, celle du haut incluse
//   4. TON ÉQUIPE           (admin) chaque distri avec SON outil
//
// ── CE QUI FAIT QUE C'EST UN SEUL ÉCRAN ────────────────────────────────────
//
// Traiter en zone 1 coche en zone 3, et le compteur descend. Même donnée, deux
// hauteurs. Sans ce lien, ce serait trois pages empilées — et on serait revenu
// exactement d'où on vient.
//
// ── CE QU'ON RETIRE PLUTÔT QUE D'AFFICHER VIDE ─────────────────────────────
//
// Une débutante (Charlène : 0 client, aucun bilan) n'a ni clients ni équipe.
// On ne lui montre pas deux sections vides : on les enlève. L'écran doit être
// court quand la vie l'est.
// =============================================================================

import type { CeQuiCompte } from "../../ceQuiCompte";
import type { Attente } from "../../../../hooks/useFileDuJour";
import { ZoneUne } from "./ZoneUne";

export interface EvenementJournee {
  cle: string;
  /** « Maintenant · 20 h », « Jeudi 14 · 09:00 », « Quand tu veux »… */
  quand: string;
  titre: string;
  detail: string;
  /** now = le point vif (lime) · next = le prochain (teal) · rien = éteint */
  ton: "now" | "next" | "plus-tard";
  chemin?: string;
}

export interface LigneEquipe {
  id: string;
  prenom: string;
  initiale: string;
  /** Le signal, en une phrase : « 10 clients, plus aucun bilan depuis 53 jours. » */
  signal: string;
  /** L'urgence : coral = bloqué, amber = s'essouffle. */
  teinte: string;
  /** L'outil, déjà nommé : « 🚀 Lui faire faire son 1er bilan ». */
  outil: string;
  chemin: string;
}

export interface EcranDuJourProps {
  quoi: CeQuiCompte;
  monPrenom: string;
  journee: EvenementJournee[];
  attentes: Attente[];
  /** Clés des attentes déjà traitées aujourd'hui — elles se barrent en zone 3. */
  traitees: Set<string>;
  equipe: LigneEquipe[];
  equipeTotal: number;
  /** « 627 € · 3 bilans · 17 actifs » — le business, réduit à une ligne. */
  ligneDuMois: string;
  onOuvrir: (chemin: string) => void;
  onFait: () => void;
  onPasser: () => void;
  onRouvrir: (cle: string) => void;
}

export function EcranDuJour({
  quoi, monPrenom, journee, attentes, traitees, equipe, equipeTotal,
  ligneDuMois, onOuvrir, onFait, onPasser, onRouvrir,
}: EcranDuJourProps) {
  // Une débutante n'a ni clients ni équipe : on retire, on n'affiche pas vide.
  const montreClients = attentes.length > 0 || traitees.size > 0;
  const montreEquipe = equipe.length > 0;
  const restants = attentes.filter((a) => !traitees.has(a.cle)).length;

  return (
    // ⚠️ <section> et NON <div> : copilote-v5.css vide le fond, la bordure et
    // le padding de tout `.copilote-v5 > div` en !important sous 1280 px.
    // L'ancien PlanDuJour n'y échappait que parce qu'il était déjà un <section>.
    <section aria-label="Ton écran du jour" style={{ display: "flex", flexDirection: "column", gap: 30 }}>
      <ZoneUne quoi={quoi} monPrenom={monPrenom} onOuvrir={onOuvrir} onFait={onFait} onPasser={onPasser} />

      {journee.length > 0 ? (
        <section aria-label="Ta journée">
          <Titre>Ta journée</Titre>
          <div style={fil}>
            {/* Le trait du fil : en style inline on n'a pas de ::before, donc
                on le pose pour de vrai. Il s'éteint vers le bas — ce qui vient
                après « quand tu veux » n'est plus vraiment de la journée. */}
            <span aria-hidden="true" style={filTrait} />
            {journee.map((e) => (
              <div key={e.cle} style={evenement}>
                <span aria-hidden="true" style={{ ...pastille, ...pastilleTon(e.ton) }} />
                <span style={quand}>{e.quand}</span>
                <span style={evTitre}>{e.titre}</span>
                <span style={evDetail}>{e.detail}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {montreClients ? (
        <section aria-label="Tes clients">
          <Titre compte={restants > 0 ? `${restants} en attente` : "tout est traité"} vert={restants === 0}>
            Tes clients
          </Titre>
          <div>
            {attentes.map((a) => {
              const fait = traitees.has(a.cle);
              return (
                <button
                  key={a.cle}
                  type="button"
                  onClick={() => (fait ? onRouvrir(a.cle) : onOuvrir(a.chemin))}
                  style={{ ...ligne, ...(fait ? ligneFaite : null) }}
                >
                  <span
                    aria-hidden="true"
                    style={{ ...pastilleNom, background: fait ? "var(--ls-surface2)" : a.motif === "suivi-en-retard" ? "var(--ls-amber)" : "var(--ls-coral)", color: fait ? "var(--ls-text-hint)" : "var(--ls-bg)" }}
                  >
                    {fait ? "✓" : (a.qui[0] ?? "?").toUpperCase()}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ ...nom, ...(fait ? nomFait : null) }}>{a.qui}</span>
                    <span style={sousLigne}>
                      {fait ? "Répondu" : `${a.motifCourt} · ${a.jours <= 0 ? "aujourd'hui" : a.jours === 1 ? "hier" : `${a.jours} jours`}`}
                    </span>
                  </span>
                  <span aria-hidden="true" style={chevron}>{fait ? "" : "›"}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {montreEquipe ? (
        <section aria-label="Ton équipe">
          <Titre compte={`${equipe.length} ${equipe.length > 1 ? "ont" : "a"} besoin de toi`}>
            Ton équipe
          </Titre>
          <div>
            {equipe.map((d) => (
              <div key={d.id} style={ligneEquipe}>
                <span aria-hidden="true" style={{ ...pastilleNom, background: d.teinte, color: "var(--ls-bg)", marginTop: 1 }}>
                  {d.initiale}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={nom}>{d.prenom}</span>
                  <span style={sousLigne}>{d.signal}</span>
                  {/* L'outil n'est pas dans une bibliothèque à aller chercher :
                      il est posé sur la personne, le geste déjà nommé. */}
                  <button type="button" onClick={() => onOuvrir(d.chemin)} style={outil}>
                    {d.outil}
                  </button>
                </span>
              </div>
            ))}
          </div>
          {equipeTotal > equipe.length ? (
            <button type="button" onClick={() => onOuvrir("/users")} style={lien}>
              Voir toute l'équipe · {equipeTotal}
            </button>
          ) : null}
        </section>
      ) : null}

      <div style={mois}>
        <span style={moisLabel}>Ce mois</span>
        <span style={moisValeur}>{ligneDuMois}</span>
      </div>
    </section>
  );
}

function Titre({ children, compte, vert }: { children: React.ReactNode; compte?: string; vert?: boolean }) {
  return (
    <div style={titre}>
      {children}
      {compte ? (
        <em style={{ ...titreCompte, ...(vert ? { color: "var(--ls-lime)" } : null) }}>· {compte}</em>
      ) : null}
    </div>
  );
}

function pastilleTon(t: EvenementJournee["ton"]): React.CSSProperties {
  if (t === "now") {
    return { background: "var(--ls-lime)", borderColor: "var(--ls-lime)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--ls-lime) 16%, transparent)" };
  }
  if (t === "next") {
    return { background: "var(--ls-teal)", borderColor: "var(--ls-teal)", boxShadow: "0 0 0 4px color-mix(in srgb, var(--ls-teal) 16%, transparent)" };
  }
  return {};
}

// ─── Styles (tokens --ls-* uniquement) ──────────────────────────────────────

const titre: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 7, marginBottom: 13,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".2em",
  textTransform: "uppercase", color: "var(--ls-text-hint)",
};

const titreCompte: React.CSSProperties = { fontStyle: "normal", color: "var(--ls-coral)", fontWeight: 700 };

const fil: React.CSSProperties = { position: "relative", paddingLeft: 26 };

const filTrait: React.CSSProperties = {
  position: "absolute", left: 4, top: 6, bottom: 12, width: 1,
  background: "linear-gradient(180deg, var(--ls-teal), var(--ls-border2) 45%, transparent)",
};

const evenement: React.CSSProperties = { position: "relative", paddingBottom: 19 };

const pastille: React.CSSProperties = {
  position: "absolute", left: -26, top: 4, width: 9, height: 9, borderRadius: "50%",
  background: "var(--ls-surface2)", border: "2px solid var(--ls-text-hint)", boxSizing: "content-box",
};

const quand: React.CSSProperties = {
  display: "block", fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5,
  letterSpacing: ".13em", textTransform: "uppercase", color: "var(--ls-text-hint)",
};

const evTitre: React.CSSProperties = {
  display: "block", fontSize: 15.5, fontWeight: 700, margin: "3px 0 2px", color: "var(--ls-text)",
};

const evDetail: React.CSSProperties = { display: "block", fontSize: 13, lineHeight: 1.45, color: "var(--ls-text-muted)" };

const ligne: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 12, padding: "11px 0", width: "100%",
  textAlign: "left", background: "none", border: "none",
  borderBottom: "1px solid var(--ls-border)", cursor: "pointer", fontFamily: "inherit",
};

const ligneFaite: React.CSSProperties = { opacity: .62 };

const ligneEquipe: React.CSSProperties = {
  display: "flex", alignItems: "flex-start", gap: 12, padding: "13px 0",
  borderBottom: "1px solid var(--ls-border)",
};

const pastilleNom: React.CSSProperties = {
  width: 41, height: 41, borderRadius: 14, flex: "none", display: "grid", placeItems: "center",
  fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 15.5,
};

const nom: React.CSSProperties = { display: "block", fontSize: 14.5, fontWeight: 600, lineHeight: 1.25, color: "var(--ls-text)" };

const nomFait: React.CSSProperties = { textDecoration: "line-through", color: "var(--ls-text-muted)" };

const sousLigne: React.CSSProperties = { display: "block", fontSize: 12.5, marginTop: 2, lineHeight: 1.4, color: "var(--ls-text-muted)" };

const chevron: React.CSSProperties = { flex: "none", fontSize: 17, color: "var(--ls-text-hint)" };

const outil: React.CSSProperties = {
  marginTop: 9, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px",
  borderRadius: 11, cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
  color: "var(--ls-teal)", background: "color-mix(in srgb, var(--ls-teal) 10%, transparent)",
  border: "1px solid color-mix(in srgb, var(--ls-teal) 30%, transparent)",
};

const lien: React.CSSProperties = {
  marginTop: 14, display: "block", background: "none", border: "none", padding: 0, cursor: "pointer",
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: ".12em",
  textTransform: "uppercase", color: "var(--ls-teal)", textDecoration: "underline",
  textUnderlineOffset: 4,
};

const mois: React.CSSProperties = {
  paddingTop: 15, borderTop: "1px solid var(--ls-border)", display: "flex",
  justifyContent: "space-between", alignItems: "baseline", gap: 10,
};

const moisLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: ".16em",
  textTransform: "uppercase", color: "var(--ls-text-hint)",
};

const moisValeur: React.CSSProperties = {
  fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 16.5, whiteSpace: "nowrap",
  color: "var(--ls-text)",
};
