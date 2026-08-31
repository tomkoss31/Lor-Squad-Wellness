// =============================================================================
// CrmListe — LA liste du CRM. Une seule, pour tous les écrans.
//
// CE QU'ELLE REMPLACE (audit du 28/08, mesuré dans l'app) : la même donnée
// était dessinée TROIS fois — une liste sur ordinateur, un tableau en colonnes,
// une file sur téléphone — par trois codes qui ne se parlaient pas. Chacun
// avait sa propre idée de ce qu'on peut faire d'un lead, d'où des actions
// présentes ici et absentes là. Et sur téléphone, la file ne montrait que les
// gestes du jour : 19 personnes sur 31 étaient INATTEIGNABLES, ni par la jauge,
// ni par la recherche, ni par un filtre.
//
// Les trois règles de cette liste :
//   1. Elle montre TOUT LE MONDE. En haut ce qui presse, en dessous le reste,
//      et un compteur qui dit toujours combien sont affichés sur combien.
//   2. Joindre la personne est sur la ligne, écrit en toutes lettres —
//      « Appeler » et « Écrire », pas deux émojis qu'il faut taper pour savoir.
//   3. Même rendu sur téléphone et sur ordinateur. L'écran large met les
//      actions à droite au lieu de dessous ; il ne change pas de nature.
// =============================================================================

import type { CrmLead } from "../../hooks/useCrmLeads";
import { caseDuLead, demandeUnGeste, LIBELLE_CASE, type CaseLead } from "../../features/crm/caseLead";
// On réutilise la phrase d'état et le score existants : ce sont eux qui
// écrivent déjà « tu devais rappeler il y a 2 jours » ailleurs dans le CRM.
// En réécrire une version ici recréerait le problème qu'on est en train de
// supprimer — la même chose dite différemment selon l'écran.
import { phraseEtat } from "../../features/crm/zones";
import { computeLeadScore } from "../../lib/leadScoring";
import { etatRdvDe } from "../../features/crm/etapes";

interface Props {
  leads: CrmLead[];
  /** Injecté, jamais `new Date()` au fond du rendu : les phrases d'état
   *  dépendent de l'heure, et deux lignes ne doivent pas la lire à deux
   *  instants différents. */
  maintenant: Date;
  /** Le total du périmètre, avant filtre — pour « X affichés sur N ». */
  total: number;
  onOuvrir: (lead: CrmLead) => void;
  onAppeler: (lead: CrmLead) => void;
  onEcrire: (lead: CrmLead) => void;
  /** Le « ⋯ » : tout le reste (caler un RDV, endormir, supprimer…). */
  onPlus: (lead: CrmLead) => void;
  /** Les fiches réunies sous cette personne. La liste montre déjà UNE ligne
   *  par personne (les doublons sont fusionnés) — ce repère dit qu'il y avait
   *  plusieurs fiches, sans quoi l'information disparaissait en silence. */
  doublonsDe?: Map<string, CrmLead[]>;
  messageVide?: string;
}

const TEINTE: Record<CaseLead, string> = {
  nouveau: "var(--ls-lime)",
  contacte: "var(--ls-teal)",
  relance: "var(--ls-coral)",
  rdv: "var(--ls-purple)",
  converti: "var(--ls-amber)",
  perdu: "var(--ls-text-hint)",
  endormi: "var(--ls-text-hint)",
};

export function CrmListe({ leads, total, maintenant, onOuvrir, onAppeler, onEcrire, onPlus, doublonsDe, messageVide }: Props) {
  const urgents = leads.filter((l) => demandeUnGeste(l));
  const reste = leads.filter((l) => !demandeUnGeste(l));

  return (
    <div>
      {/* Le CSS de la ligne vit ici : une seule règle, deux largeurs. Sur grand
          écran les actions passent à droite du texte au lieu de dessous. */}
      <style>{CSS_LIGNE}</style>

      {leads.length === 0 ? (
        <p style={vide}>{messageVide ?? "Personne ne correspond."}</p>
      ) : (
        <>
          {urgents.length > 0 && (
            <Section titre="À faire aujourd'hui" compte={urgents.length} teinte="var(--ls-coral)">
              {urgents.map((l) => (
                <Ligne key={l.key} lead={l} urgent maintenant={maintenant} fiches={doublonsDe?.get(l.key)?.length ?? 0} {...{ onOuvrir, onAppeler, onEcrire, onPlus }} />
              ))}
            </Section>
          )}
          {reste.length > 0 && (
            <Section titre="Le reste de ta liste" compte={reste.length} teinte="var(--ls-text-hint)">
              {reste.map((l) => (
                <Ligne key={l.key} lead={l} compact maintenant={maintenant} fiches={doublonsDe?.get(l.key)?.length ?? 0} {...{ onOuvrir, onAppeler, onEcrire, onPlus }} />
              ))}
            </Section>
          )}
        </>
      )}

      {/* Le compteur : on ne peut plus perdre quelqu'un sans le voir. */}
      <p style={compteur}>
        {leads.length} affiché{leads.length > 1 ? "s" : ""} sur {total}
      </p>
    </div>
  );
}

function Section({
  titre, compte, teinte, children,
}: { titre: string; compte: number; teinte: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ ...titreSection, color: teinte }}>
        {titre} <span style={{ color: "var(--ls-text)" }}>· {compte}</span>
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </section>
  );
}

function Ligne({
  lead, urgent, compact, maintenant, fiches, onOuvrir, onAppeler, onEcrire, onPlus,
}: {
  lead: CrmLead; urgent?: boolean; compact?: boolean; maintenant: Date; fiches: number;
  onOuvrir: (l: CrmLead) => void; onAppeler: (l: CrmLead) => void;
  onEcrire: (l: CrmLead) => void; onPlus: (l: CrmLead) => void;
}) {
  const c = caseDuLead(lead);
  const chaud = computeLeadScore(lead).temperature === "hot";
  // `phraseEtat` raisonne sur l'état du créneau (« à venir » / « passé »), pas
  // sur l'objet rendez-vous. Même adaptation que la file : une seule notion.
  const pourPhrase = { ...lead, rdv: etatRdvDe(lead.rdv, maintenant) };
  const tel = lead.phone ?? (lead.contactIsPhone ? lead.contact : null);
  const nom = `${lead.firstName} ${lead.lastName ?? ""}`.trim();

  // ── LIGNE COMPACTE — « le reste de ta liste » ────────────────────────────
  // Mesuré le 31/08 : les lignes riches font ~150 px. Quinze d'entre elles
  // faisaient 2 236 px à elles seules. Or cette zone n'est pas celle où l'on
  // agit — c'est celle où l'on CHERCHE quelqu'un. C'est le partage que font
  // Gmail, Superhuman ou Things : une ligne reste une ligne, et les actions
  // arrivent quand on l'ouvre. « À faire aujourd'hui » garde ses boutons.
  if (compact) {
    return (
      <div style={ligneCompacte}>
        <button type="button" onClick={() => onOuvrir(lead)} style={zoneTexteCompacte} aria-label={`Ouvrir la fiche de ${nom}`}>
          {/* ⚠️ 31/08 — la pastille d'état RÉPÉTAIT la phrase (« RDV CALÉ » au-
              dessus de « Rendez-vous pris ») et poussait la ligne à trois
              lignes, soit 89 px au lieu de 60. On garde la phrase, qui dit la
              même chose en plus précis, et la couleur du point porte l'état. */}
          <span style={ligneNomCompacte}>
            <span style={{ ...pointEtat, background: TEINTE[c] }} aria-hidden="true" />
            <span style={nomCompact}>{nom}</span>
            {chaud && <span aria-label="Chaud" title="Chaud">🔥</span>}
            {fiches > 0 && (
              <span style={marqueDoublon} title={`${fiches + 1} fiches réunies sous cette personne`}>⚠️</span>
            )}
          </span>
          <span style={raisonCompacte}>
            <span className="ls-sr-only">{LIBELLE_CASE[c]} — </span>
            {phraseEtat(pourPhrase, maintenant)}
          </span>
        </button>
        <button type="button" onClick={() => onPlus(lead)} style={plusCompact} aria-label={`Actions pour ${nom}`}>
          ⋯
        </button>
      </div>
    );
  }

  return (
    <div className="crm-ligne" style={{ ...ligne, borderLeftColor: urgent ? "var(--ls-coral)" : "transparent" }}>
      {/* Le texte ouvre la fiche. C'est un bouton, pas un div cliquable :
          il doit être atteignable au clavier. */}
      <button type="button" onClick={() => onOuvrir(lead)} style={zoneTexte} aria-label={`Ouvrir la fiche de ${nom}`}>
        <span style={ligneNom}>
          <span style={styleNom}>{nom}</span>
          {chaud && <span aria-label="Chaud" title="Chaud">🔥</span>}
          <span style={{ ...pastilleEtat, color: TEINTE[c] }}>{LIBELLE_CASE[c]}</span>
          {fiches > 0 && (
            <span style={marqueDoublon} title={`${fiches + 1} fiches réunies sous cette personne`}>
              ⚠️ {fiches + 1} fiches
            </span>
          )}
        </span>
        <span style={{ ...raison, color: urgent ? "var(--ls-coral)" : "var(--ls-text-muted)" }}>
          {phraseEtat(pourPhrase, maintenant)}
        </span>
      </button>

      <div className="crm-ligne-actions" style={actions}>
        {tel && (
          <button type="button" onClick={() => onAppeler(lead)} style={{ ...bouton, ...boutonAppel }}>
            <IconTel /> Appeler
          </button>
        )}
        <button type="button" onClick={() => onEcrire(lead)} style={{ ...bouton, ...boutonEcrire }}>
          <IconMsg /> Écrire
        </button>
        <button type="button" onClick={() => onPlus(lead)} style={{ ...bouton, ...boutonPlus }} aria-label={`Plus d'actions pour ${nom}`}>
          ⋯
        </button>
      </div>
    </div>
  );
}

// ─── Icônes ──────────────────────────────────────────────────────────────────
const svg = {
  width: 15, height: 15, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 2,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  "aria-hidden": true,
};
const IconTel = () => (
  <svg {...svg}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.6 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.1a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.8.6a2 2 0 0 1 1.8 2Z"/></svg>
);
const IconMsg = () => (
  <svg {...svg}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20.5l1.5-4.4A8.4 8.4 0 0 1 3.6 11.5a8.4 8.4 0 0 1 8.4-8.4 8.4 8.4 0 0 1 9 8.4Z"/></svg>
);

// ─── Styles ──────────────────────────────────────────────────────────────────

const CSS_LIGNE = `
.crm-ligne{display:flex;flex-direction:column;gap:10px}
@media(min-width:768px){
  .crm-ligne{flex-direction:row;align-items:center;gap:16px}
  .crm-ligne-actions{flex:none}
}`;

const ligne: React.CSSProperties = {
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderLeft: "3px solid transparent",
  borderRadius: 14,
  padding: "12px 14px",
};

const zoneTexte: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 4,
  background: "transparent",
  border: 0,
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
};

const ligneNom: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 8,
  flexWrap: "wrap",
};

const styleNom: React.CSSProperties = {
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 16,
  color: "var(--ls-text)",
  letterSpacing: "-0.01em",
};

const pastilleEtat: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 9.5,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "2px 7px",
  borderRadius: 999,
  border: "1px solid currentColor",
};

const raison: React.CSSProperties = { fontSize: 13, lineHeight: 1.45 };

const ligneCompacte: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "var(--ls-surface)",
  border: "1px solid var(--ls-border)",
  borderRadius: 12,
  padding: "8px 10px",
};

const zoneTexteCompacte: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: "flex",
  flexDirection: "column",
  gap: 2,
  background: "transparent",
  border: 0,
  padding: 0,
  textAlign: "left",
  cursor: "pointer",
  color: "inherit",
  font: "inherit",
};

/** Nom + repères sur UNE seule ligne, jamais deux. */
const ligneNomCompacte: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  minWidth: 0,
  whiteSpace: "nowrap",
  overflow: "hidden",
};

/** L'état, réduit à un point coloré : la phrase juste en dessous le dit déjà
 *  en toutes lettres, et un lecteur d'écran l'entend via `sr-only`. */
const pointEtat: React.CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: "50%",
  flex: "none",
};

const nomCompact: React.CSSProperties = {
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontFamily: "Syne, sans-serif",
  fontWeight: 700,
  fontSize: 14.5,
  color: "var(--ls-text)",
};

/** Une seule ligne, coupée proprement — on cherche un nom, on ne lit pas. */
const raisonCompacte: React.CSSProperties = {
  fontSize: 12,
  color: "var(--ls-text-muted)",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

const plusCompact: React.CSSProperties = {
  flex: "none",
  width: 44,
  height: 44,
  borderRadius: 999,
  border: "1px solid var(--ls-border2)",
  background: "transparent",
  color: "var(--ls-text-muted)",
  cursor: "pointer",
  fontSize: 15,
};

const marqueDoublon: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 9.5,
  color: "var(--ls-amber)",
};

const actions: React.CSSProperties = { display: "flex", gap: 7, flexWrap: "wrap" };

const bouton: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minHeight: 44,
  padding: "0 13px",
  borderRadius: 999,
  border: "1px solid var(--ls-border2)",
  background: "transparent",
  color: "var(--ls-text)",
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 600,
  fontSize: 13,
  cursor: "pointer",
};

const boutonAppel: React.CSSProperties = {
  background: "var(--ls-teal)",
  color: "#08211D",
  borderColor: "transparent",
  fontWeight: 700,
};

const boutonEcrire: React.CSSProperties = {
  borderColor: "color-mix(in srgb, var(--ls-teal) 45%, transparent)",
  color: "var(--ls-teal)",
};

const boutonPlus: React.CSSProperties = { padding: "0 12px", color: "var(--ls-text-muted)" };

const titreSection: React.CSSProperties = {
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  margin: "0 0 9px 2px",
  fontWeight: 600,
};

const compteur: React.CSSProperties = {
  textAlign: "center",
  margin: "18px 0 6px",
  fontFamily: "var(--lb360-mono, 'JetBrains Mono', monospace)",
  fontSize: 10.5,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  color: "var(--ls-text-hint)",
};

const vide: React.CSSProperties = {
  padding: "26px 4px",
  textAlign: "center",
  color: "var(--ls-text-hint)",
  fontSize: 14,
};
