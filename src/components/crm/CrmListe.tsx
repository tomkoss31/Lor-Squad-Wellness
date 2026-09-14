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
//
// ── 14/09/2026 — « BEAUCOUP TROP DENSE » ─────────────────────────────────────
// Capture de Thomas, maquette validée (`_crm-aere-maquette`) avec trois
// ajouts de sa main. Ce qui change :
//
//   · Les groupes disent QUOI FAIRE (maquette du 18/08, perdue depuis) :
//     « Personne ne leur a encore parlé » puis « À relancer ». Un seul tas
//     « À faire aujourd'hui · 29 » mélangeait deux gestes différents.
//   · « Il faut des menus déroulants pour chaque section, pas de surcharge ».
//     La règle 1 tient autrement : l'en-tête garde son COMPTE, une recherche
//     ou un filtre ouvre les sections concernées, et le compteur du bas dit
//     combien de personnes sont dans des sections repliées. Un repli ne cache
//     jamais un chiffre.
//   · Le titre du groupe porte la couleur et l'état. La ligne ne répète plus
//     son badge ni son liseré ; seul le fait qui appelle un geste reste en
//     rouge (« Jamais rappelé·e », « Pas de réponse »).
//   · « Sur les vrais chauds ! froid en froid, glacé pareil » : 🔥, ❄️ ou 🧊
//     selon la température (cf. leadScoring). Rien pour « tiède » — un repère
//     sur chaque ligne ne distingue plus personne.
//   · Les boutons restent en toutes lettres (règle 2), mais calmes. Sur
//     ordinateur, nom et phrase tiennent sur une ligne : 71 → 54 px.
//
// ⚠️ Les dispositions passent par des CLASSES, jamais par `style={{}}` : un
// style en ligne bat la media query et la rend inerte en silence (piège du
// 18/08, barre des relances).
// =============================================================================

import { useState } from "react";
import type { CrmLead } from "../../hooks/useCrmLeads";
import { caseDuLead, LIBELLE_CASE, type CaseLead } from "../../features/crm/caseLead";
import { GROUPES, grouperPourListe, type CleGroupe } from "../../features/crm/groupesListe";
// On réutilise la phrase d'état et le score existants : ce sont eux qui
// écrivent déjà « tu devais rappeler il y a 2 jours » ailleurs dans le CRM.
// En réécrire une version ici recréerait le problème qu'on est en train de
// supprimer — la même chose dite différemment selon l'écran.
import { phraseEtat } from "../../features/crm/zones";
import { computeLeadScore, TEMP_META } from "../../lib/leadScoring";
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
  /** Une recherche, un filtre de jauge ou un filtre du tiroir est posé : on
   *  cherche QUELQU'UN. Toutes les sections qui ont un résultat s'ouvrent. */
  ouvrirTout?: boolean;
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

const TEINTE_GROUPE: Record<CleGroupe, string> = {
  nouveaux: "var(--ls-lime)",
  relance: "var(--ls-coral)",
  reste: "var(--ls-text-hint)",
};

/** Ce qui est replié se retrouve replié le lendemain : c'est un confort de
 *  l'appareil, pas une donnée — localStorage suffit. */
const CLE_STOCKAGE = "crm-sections-ouvertes";
const OUVERTES_PAR_DEFAUT: Record<CleGroupe, boolean> = { nouveaux: true, relance: false, reste: false };

function lireOuvertes(): Record<CleGroupe, boolean> {
  try {
    const brut: unknown = JSON.parse(window.localStorage.getItem(CLE_STOCKAGE) ?? "null");
    if (brut && typeof brut === "object") {
      return { ...OUVERTES_PAR_DEFAUT, ...(brut as Partial<Record<CleGroupe, boolean>>) };
    }
  } catch {
    /* stockage indisponible (navigation privée…) : les défauts suffisent */
  }
  return OUVERTES_PAR_DEFAUT;
}

/** 🔥 / ❄️ / 🧊 — rien pour « tiède ». */
function repereTemperature(lead: CrmLead) {
  const t = computeLeadScore(lead).temperature;
  return t === "warm" ? null : TEMP_META[t];
}

export function CrmListe({
  leads, total, maintenant, onOuvrir, onAppeler, onEcrire, onPlus, doublonsDe, messageVide, ouvrirTout = false,
}: Props) {
  const [ouvertes, setOuvertes] = useState<Record<CleGroupe, boolean>>(lireOuvertes);
  const groupes = grouperPourListe(leads);
  const nonVides = GROUPES.filter((g) => groupes[g.cle].length > 0);
  // Une seule section à l'écran (filtre de jauge, recherche étroite) : la
  // replier ne laisserait qu'un titre. Et quand on cherche quelqu'un, on ne
  // doit pas avoir à deviner dans quelle section il est rangé.
  const forcee = ouvrirTout || nonVides.length === 1;
  const estOuverte = (cle: CleGroupe) => forcee || ouvertes[cle];
  const dansDesRepliees = nonVides.filter((g) => !estOuverte(g.cle)).reduce((n, g) => n + groupes[g.cle].length, 0);

  function basculer(cle: CleGroupe) {
    setOuvertes((prev) => {
      const suivant = { ...prev, [cle]: !prev[cle] };
      try {
        window.localStorage.setItem(CLE_STOCKAGE, JSON.stringify(suivant));
      } catch {
        /* le repli marche quand même, il ne sera juste pas retenu */
      }
      return suivant;
    });
  }

  const actions = { onOuvrir, onAppeler, onEcrire, onPlus };

  return (
    <div>
      <style>{CSS}</style>

      {leads.length === 0 ? (
        <p className="crm-vide">{messageVide ?? "Personne ne correspond."}</p>
      ) : (
        nonVides.map((g) => {
          const liste = groupes[g.cle];
          const ouvert = estOuverte(g.cle);
          const idCorps = `crm-sec-${g.cle}`;
          const tete = (
            <>
              <span className="crm-sec-pt" style={{ background: TEINTE_GROUPE[g.cle] }} aria-hidden="true" />
              <span className="crm-sec-titre">{g.titre}</span>
              <span className="crm-sec-n">· {liste.length}</span>
              <span className="crm-sec-quoi">{g.quoi}</span>
              {forcee ? null : (
                <span className="crm-sec-chevron" aria-hidden="true">{ouvert ? "▾" : "▸"}</span>
              )}
            </>
          );
          return (
            <section key={g.cle} className="crm-sec">
              {/* Ouverte d'office : un titre qui ne se replie pas n'a pas à
                  ressembler à un bouton — un geste sans effet visible fait
                  croire à une panne. */}
              {forcee ? (
                <div className="crm-sec-tete">{tete}</div>
              ) : (
                <button
                  type="button"
                  className="crm-sec-tete"
                  aria-expanded={ouvert}
                  aria-controls={idCorps}
                  onClick={() => basculer(g.cle)}
                >
                  {tete}
                </button>
              )}
              <div id={idCorps} className="crm-sec-corps" hidden={!ouvert}>
                {liste.map((l) =>
                  g.urgent ? (
                    <Ligne key={l.key} lead={l} maintenant={maintenant} fiches={doublonsDe?.get(l.key)?.length ?? 0} {...actions} />
                  ) : (
                    <LigneCompacte key={l.key} lead={l} maintenant={maintenant} fiches={doublonsDe?.get(l.key)?.length ?? 0} {...actions} />
                  ),
                )}
              </div>
            </section>
          );
        })
      )}

      {/* Le compteur : on ne peut plus perdre quelqu'un sans le voir — ni
          derrière un filtre, ni derrière un repli. */}
      <p className="crm-compteur">
        {leads.length} affiché{leads.length > 1 ? "s" : ""} sur {total}
        {dansDesRepliees > 0 ? ` · ${dansDesRepliees} dans des sections repliées` : ""}
      </p>
    </div>
  );
}

type PropsLigne = {
  lead: CrmLead;
  maintenant: Date;
  fiches: number;
  onOuvrir: (l: CrmLead) => void;
  onAppeler: (l: CrmLead) => void;
  onEcrire: (l: CrmLead) => void;
  onPlus: (l: CrmLead) => void;
};

function Ligne({ lead, maintenant, fiches, onOuvrir, onAppeler, onEcrire, onPlus }: PropsLigne) {
  const c = caseDuLead(lead);
  // `phraseEtat` raisonne sur l'état du créneau (« à venir » / « passé »), pas
  // sur l'objet rendez-vous. Même adaptation que la file : une seule notion.
  const pourPhrase = { ...lead, rdv: etatRdvDe(lead.rdv, maintenant) };
  const phrase = phraseEtat(pourPhrase, maintenant);
  // Le premier morceau est le FAIT qui appelle le geste (« Jamais rappelé·e »,
  // « Pas de réponse ») ; la suite dit quand. Seul le fait passe en rouge.
  const [fait, ...suite] = phrase.split(" · ");
  const tel = lead.phone ?? (lead.contactIsPhone ? lead.contact : null);
  const nom = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
  const temp = repereTemperature(lead);

  return (
    <div className="crm-l">
      {/* Le texte ouvre la fiche. C'est un bouton, pas un div cliquable :
          il doit être atteignable au clavier. */}
      <button
        type="button"
        className="crm-l-texte"
        onClick={() => onOuvrir(lead)}
        aria-label={`Ouvrir la fiche de ${nom}${temp ? `, ${temp.label}` : ""} — ${LIBELLE_CASE[c]} : ${phrase}`}
      >
        <span className="crm-l-nom">
          <span className="crm-l-n" title={nom}>{nom}</span>
          {temp ? <span className="crm-l-temp" title={temp.label}>{temp.emoji}</span> : null}
          {fiches > 0 ? (
            <span className="crm-l-doublon" title={`${fiches + 1} fiches réunies sous cette personne`}>
              ⚠️ {fiches + 1} fiches
            </span>
          ) : null}
        </span>
        <span className="crm-l-ph">
          <span className="crm-l-fait">{fait}</span>
          {suite.length > 0 ? ` · ${suite.join(" · ")}` : ""}
        </span>
      </button>

      <div className="crm-l-act">
        {tel && (
          <button type="button" onClick={() => onAppeler(lead)} className="crm-b crm-b-appel">
            <IconTel /> Appeler
          </button>
        )}
        {/* « Écrire » reste là même sans téléphone : c'est alors le SEUL moyen
            de joindre la personne (bloquant de la revue du 01/09). */}
        <button type="button" onClick={() => onEcrire(lead)} className="crm-b crm-b-ecrire">
          <IconMsg /> Écrire
        </button>
        <button type="button" onClick={() => onPlus(lead)} className="crm-b crm-b-plus" aria-label={`Plus d'actions pour ${nom}`}>
          ⋯
        </button>
      </div>
    </div>
  );
}

// ── LIGNE COMPACTE — « le reste de ta liste » ────────────────────────────────
// Mesuré le 31/08 : les lignes riches faisaient ~150 px. Quinze d'entre elles
// faisaient 2 236 px à elles seules. Or cette zone n'est pas celle où l'on
// agit — c'est celle où l'on CHERCHE quelqu'un. C'est le partage que font
// Gmail, Superhuman ou Things : une ligne reste une ligne, et les actions
// arrivent quand on l'ouvre.
function LigneCompacte({ lead, maintenant, fiches, onOuvrir, onPlus }: PropsLigne) {
  const c = caseDuLead(lead);
  const pourPhrase = { ...lead, rdv: etatRdvDe(lead.rdv, maintenant) };
  const nom = `${lead.firstName} ${lead.lastName ?? ""}`.trim();
  const temp = repereTemperature(lead);

  return (
    <div className="crm-lc">
      <button type="button" onClick={() => onOuvrir(lead)} className="crm-lc-texte" aria-label={`Ouvrir la fiche de ${nom}`}>
        {/* ⚠️ 31/08 — la pastille d'état RÉPÉTAIT la phrase (« RDV CALÉ » au-
            dessus de « Rendez-vous pris ») et poussait la ligne à trois
            lignes. On garde la phrase, et la couleur du point porte l'état. */}
        <span className="crm-lc-nom">
          <span className="crm-lc-pt" style={{ background: TEINTE[c] }} aria-hidden="true" />
          <span className="crm-lc-n" title={nom}>{nom}</span>
          {temp ? <span className="crm-l-temp" title={temp.label}>{temp.emoji}</span> : null}
          {fiches > 0 ? (
            <span className="crm-l-doublon" title={`${fiches + 1} fiches réunies sous cette personne`}>⚠️</span>
          ) : null}
        </span>
        <span className="crm-lc-ph">
          <span className="ls-sr-only">{LIBELLE_CASE[c]} — </span>
          {phraseEtat(pourPhrase, maintenant)}
        </span>
      </button>
      <button type="button" onClick={() => onPlus(lead)} className="crm-lc-plus" aria-label={`Actions pour ${nom}`}>
        ⋯
      </button>
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
// Téléphone d'abord, l'écran large en surcouche. Cibles tactiles de 44 px sur
// téléphone ; 36 px sur ordinateur, où l'on vise à la souris.
const CSS = `
.crm-sec{margin-top:16px}
.crm-sec-tete{display:flex;align-items:center;gap:8px;width:100%;min-height:44px;padding:4px 4px;background:transparent;border:0;border-radius:10px;color:var(--ls-text);font-family:"DM Sans",sans-serif;text-align:left}
button.crm-sec-tete{cursor:pointer}
button.crm-sec-tete:hover{background:var(--ls-surface2)}
button.crm-sec-tete:focus-visible{outline:2px solid var(--ls-teal);outline-offset:2px}
.crm-sec-pt{width:8px;height:8px;border-radius:50%;flex:none}
.crm-sec-titre{font-family:Syne,sans-serif;font-weight:700;font-size:15px;min-width:0}
.crm-sec-n{font-size:13px;font-weight:600;color:var(--ls-text-muted);flex:none}
.crm-sec-quoi{margin-left:auto;font-size:12.5px;color:var(--ls-text-hint);white-space:nowrap}
.crm-sec-chevron{flex:none;width:18px;text-align:center;font-size:13px;color:var(--ls-text-muted)}
.crm-sec-corps{margin-top:6px;background:var(--ls-surface);border:1px solid var(--ls-border);border-radius:14px;overflow:hidden}

.crm-l{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border-top:1px solid var(--ls-border)}
.crm-l:first-child{border-top:0}
.crm-l:hover{background:var(--ls-surface2)}
.crm-l-texte{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;background:transparent;border:0;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit}
.crm-l-nom{display:flex;align-items:center;gap:6px;min-width:0}
.crm-l-n{font-family:Syne,sans-serif;font-weight:700;font-size:15px;letter-spacing:-.01em;color:var(--ls-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.crm-l-temp{flex:none;font-size:12px;line-height:1}
.crm-l-doublon{flex:none;font-family:var(--lb360-mono,'JetBrains Mono',monospace);font-size:9.5px;font-weight:600;color:var(--ls-amber)}
.crm-l-ph{font-size:13px;line-height:1.45;color:var(--ls-text-muted)}
.crm-l-fait{color:var(--ls-coral);font-weight:600}
.crm-l-act{display:flex;gap:6px;flex-wrap:wrap}

.crm-b{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 13px;border-radius:999px;border:1px solid transparent;background:transparent;font-family:"DM Sans",sans-serif;font-weight:600;font-size:13px;cursor:pointer}
.crm-b:focus-visible{outline:2px solid var(--ls-teal);outline-offset:2px}
.crm-b-appel{background:color-mix(in srgb,var(--ls-teal) 11%,transparent);color:var(--ls-teal)}
.crm-b-appel:hover{background:color-mix(in srgb,var(--ls-teal) 20%,transparent)}
.crm-b-ecrire{border-color:var(--ls-border2);color:var(--ls-text-muted)}
.crm-b-ecrire:hover{border-color:color-mix(in srgb,var(--ls-teal) 55%,transparent);color:var(--ls-teal)}
.crm-b-plus{width:44px;padding:0;color:var(--ls-text-hint)}

.crm-lc{display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-top:1px solid var(--ls-border)}
.crm-lc:first-child{border-top:0}
.crm-lc:hover{background:var(--ls-surface2)}
.crm-lc-texte{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;background:transparent;border:0;padding:0;text-align:left;cursor:pointer;color:inherit;font:inherit}
.crm-lc-nom{display:flex;align-items:center;gap:7px;min-width:0;white-space:nowrap;overflow:hidden}
.crm-lc-pt{width:7px;height:7px;border-radius:50%;flex:none}
.crm-lc-n{overflow:hidden;text-overflow:ellipsis;font-family:Syne,sans-serif;font-weight:700;font-size:14.5px;color:var(--ls-text)}
.crm-lc-ph{font-size:12px;color:var(--ls-text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.crm-lc-plus{flex:none;width:44px;height:44px;border-radius:999px;border:1px solid var(--ls-border2);background:transparent;color:var(--ls-text-muted);cursor:pointer;font-size:15px}

.crm-vide{padding:26px 4px;text-align:center;color:var(--ls-text-hint);font-size:14px}
.crm-compteur{text-align:center;margin:18px 0 6px;font-family:var(--lb360-mono,'JetBrains Mono',monospace);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ls-text-hint)}

@media (max-width:767.98px){
  .crm-sec-quoi{display:none}
}
@media (min-width:768px){
  .crm-l{flex-direction:row;align-items:center;gap:14px;min-height:54px;padding:0 10px 0 16px}
  .crm-l-texte{flex-direction:row;align-items:baseline;gap:12px}
  .crm-l-nom{flex:0 1 auto;max-width:42%}
  .crm-l-ph{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .crm-l-act{flex:none;flex-wrap:nowrap}
  .crm-b{min-height:36px;padding:0 12px}
  .crm-b-plus{width:36px}
  .crm-lc-plus{width:36px;height:36px}
}
`;
